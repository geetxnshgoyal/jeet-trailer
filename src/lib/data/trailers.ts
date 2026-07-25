import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import {
  COLLECTIONS,
  TRAILER_HISTORY_SUBCOLLECTION,
  CHASSIS_CODE_PREFIX,
} from "@/lib/domain/constants";
import { nextCode } from "@/lib/data/counters";
import { nowIso } from "@/lib/utils";
import { DomainError } from "@/lib/api/response";
import type {
  TrailerRecord,
  TrailerStage,
  TrailerHistoryEvent,
  TrailerStatus,
  Role,
} from "@/lib/domain/types";

/**
 * Workshop trailer data-access.
 *
 * A trailer's pipeline is an embedded `stages` array. Stages are independent:
 * any pending stage can be started at any time, so painting may begin before
 * body fabrication finishes and levels can run in parallel. Each stage moves
 * pending -> in_progress -> completed, and transitions run in a transaction
 * against the live doc so two workers can never both claim the same stage.
 *
 * Because there is no single cursor to advance, `currentStageIndex` is derived
 * after every transition (see deriveProgress): whatever is being worked on,
 * else the first stage still waiting. The trailer is `completed` only once
 * every stage is done, never merely because the last-indexed one finished.
 *
 * Every transition also appends an immutable event to the trailer's `history`
 * subcollection, the audit trail the admin timeline renders.
 */

function trailersCol() {
  return adminDb().collection(COLLECTIONS.trailers);
}

interface Actor {
  id: string;
  name: string;
  role: Role;
}

export interface CreateTrailerData {
  chassisNumber?: string;
  model?: string;
  description?: string;
  stages: { name: string; workerId?: string; workerName?: string }[];
}

export async function createTrailer(
  input: CreateTrailerData,
  actor: Actor,
): Promise<TrailerRecord> {
  const ref = trailersCol().doc();
  const histRef = ref.collection(TRAILER_HISTORY_SUBCOLLECTION).doc();

  return adminDb().runTransaction(async (tx) => {
    // Custom chassis numbers must stay unique; auto ones are counter-minted.
    let chassisNumber = input.chassisNumber?.trim().toUpperCase() || "";
    if (chassisNumber) {
      const dup = await tx.get(
        trailersCol().where("chassisNumber", "==", chassisNumber).limit(1),
      );
      if (!dup.empty) {
        throw new DomainError(
          "DUPLICATE_CHASSIS",
          `Chassis number ${chassisNumber} already exists.`,
          409,
        );
      }
    } else {
      chassisNumber = await nextCode(tx, CHASSIS_CODE_PREFIX);
    }

    const now = nowIso();
    const stages: TrailerStage[] = input.stages.map((s, index) => ({
      index,
      name: s.name,
      status: "pending",
      ...(s.workerId
        ? { workerId: s.workerId, workerName: s.workerName ?? "" }
        : {}),
    }));

    const record: TrailerRecord = {
      id: ref.id,
      chassisNumber,
      status: "in_progress",
      currentStageIndex: 0,
      currentStageName: stages[0].name,
      ...(stages[0].workerId
        ? {
            currentWorkerId: stages[0].workerId,
            currentWorkerName: stages[0].workerName,
          }
        : {}),
      stages,
      createdById: actor.id,
      createdByName: actor.name,
      createdAt: now,
      updatedAt: now,
      ...(input.model?.trim() ? { model: input.model.trim() } : {}),
      ...(input.description?.trim()
        ? { description: input.description.trim() }
        : {}),
    };

    const event: TrailerHistoryEvent = {
      id: histRef.id,
      type: "created",
      stageIndex: 0,
      stageName: stages[0].name,
      actorId: actor.id,
      actorName: actor.name,
      note: `Trailer ${chassisNumber} entered the workshop with ${stages.length} stages`,
      createdAt: now,
    };

    tx.set(ref, record);
    tx.set(histRef, event);
    return record;
  });
}

/**
 * Start a stage. Stages are independent, any pending stage can be started at
 * any time, so painting can begin before body fabrication finishes and two
 * levels can run in parallel. A worker can start a stage assigned to them or
 * one that is unassigned (which claims it); admins can start any stage.
 */
export async function startStage(
  trailerId: string,
  stageIndex: number | undefined,
  actor: Actor,
): Promise<TrailerRecord> {
  return stageTransition(trailerId, stageIndex, actor, (trailer, stage) => {
    if (stage.status !== "pending") {
      throw new DomainError(
        "STAGE_NOT_PENDING",
        `${stage.name} has already been started.`,
        409,
      );
    }
    if (
      actor.role !== "admin" &&
      stage.workerId &&
      stage.workerId !== actor.id
    ) {
      throw new DomainError(
        "STAGE_ASSIGNED_ELSEWHERE",
        `${stage.name} is assigned to ${stage.workerName}.`,
        403,
      );
    }

    const now = nowIso();
    const worker =
      actor.role === "admin" && stage.workerId
        ? { id: stage.workerId, name: stage.workerName ?? "" }
        : { id: actor.id, name: actor.name };

    const updated: TrailerStage = {
      ...stage,
      status: "in_progress",
      workerId: worker.id,
      workerName: worker.name,
      startedAt: now,
    };
    return {
      stage: updated,
      trailerPatch: {},
      events: [
        {
          type: "stage_started",
          note: `${worker.name} started ${stage.name} on ${trailer.chassisNumber}`,
        },
      ],
    };
  });
}

/**
 * Complete a stage. Only the worker on it (or an admin) may complete it.
 * The trailer finishes once every stage is complete, not merely when the
 * last one is, since stages can be worked out of order.
 */
export async function completeStage(
  trailerId: string,
  stageIndex: number | undefined,
  actor: Actor,
  notes?: string,
): Promise<TrailerRecord> {
  return stageTransition(trailerId, stageIndex, actor, (trailer, stage) => {
    if (stage.status !== "in_progress") {
      throw new DomainError(
        "STAGE_NOT_STARTED",
        `${stage.name} must be started before it can be completed.`,
        409,
      );
    }
    if (actor.role !== "admin" && stage.workerId !== actor.id) {
      throw new DomainError(
        "NOT_STAGE_WORKER",
        `Only ${stage.workerName} or an admin can complete ${stage.name}.`,
        403,
      );
    }

    const now = nowIso();
    const updated: TrailerStage = {
      ...stage,
      status: "completed",
      completedAt: now,
      ...(notes?.trim() ? { notes: notes.trim() } : {}),
    };

    // What is left once this stage lands, the next thing awaiting work.
    const remaining = trailer.stages.filter(
      (s) => s.index !== stage.index && s.status !== "completed",
    );
    const next = remaining.find((s) => s.status === "in_progress") ?? remaining[0];
    const allDone = remaining.length === 0;

    let completedNote = `${updated.workerName} completed ${stage.name} on ${trailer.chassisNumber}`;
    if (next) {
      completedNote += next.workerName
        ? `, next up ${next.name} (${next.workerName})`
        : `, next up ${next.name}`;
    }
    const events: EventSeed[] = [
      { type: "stage_completed", note: completedNote },
    ];
    if (allDone) {
      events.push({
        type: "completed",
        note: `Trailer ${trailer.chassisNumber} finished all stages, ready for inventory`,
      });
    }

    // The progress pointer is recomputed from the whole pipeline in
    // stageTransition, so nothing stage-order-specific is patched here.
    return { stage: updated, trailerPatch: {}, events };
  });
}

/** Admin-only: assign (or clear, workerId "") a worker on a non-completed stage. */
export async function assignStageWorker(
  trailerId: string,
  stageIndex: number,
  worker: { id: string; name: string } | null,
  actor: Actor,
): Promise<TrailerRecord> {
  const ref = trailersCol().doc(trailerId);

  return adminDb().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) {
      throw new DomainError("NOT_FOUND", "Trailer not found", 404);
    }
    const trailer = snap.data() as TrailerRecord;
    const stage = trailer.stages[stageIndex];
    if (!stage) {
      throw new DomainError("BAD_STAGE", "No such stage on this trailer", 422);
    }
    if (stage.status === "completed") {
      throw new DomainError(
        "STAGE_COMPLETED",
        "Cannot reassign a completed stage.",
        409,
      );
    }

    const now = nowIso();
    const stages = [...trailer.stages];
    stages[stageIndex] = {
      ...stage,
      ...(worker
        ? { workerId: worker.id, workerName: worker.name }
        : { workerId: undefined, workerName: undefined }),
    };
    // Firestore rejects `undefined` fields, strip them.
    stages[stageIndex] = stripUndefined(stages[stageIndex]);

    // `undefined` here means "clear the field", toUpdatePayload turns it
    // into FieldValue.delete() so a cleared assignment doesn't linger.
    const patch: Partial<TrailerRecord> = { stages, updatedAt: now };
    if (stageIndex === trailer.currentStageIndex) {
      patch.currentWorkerId = worker?.id;
      patch.currentWorkerName = worker?.name;
    }

    const histRef = ref.collection(TRAILER_HISTORY_SUBCOLLECTION).doc();
    const event: TrailerHistoryEvent = {
      id: histRef.id,
      type: "worker_assigned",
      stageIndex,
      stageName: stage.name,
      actorId: actor.id,
      actorName: actor.name,
      note: worker
        ? `${worker.name} assigned to ${stage.name}`
        : `Assignment cleared on ${stage.name}`,
      createdAt: now,
    };

    tx.update(ref, toUpdatePayload(patch));
    tx.set(histRef, event);
    return { ...trailer, ...patch };
  });
}

export interface ListTrailersFilter {
  status?: TrailerStatus;
  /** Trailers whose *current* stage involves this worker. */
  workerId?: string;
  /** Free-text across chassis/model/stage/worker names, applied in memory. */
  search?: string;
  limit?: number;
}

/** List trailers, newest first. Same in-memory filter strategy as issues. */
export async function listTrailers(
  filter: ListTrailersFilter = {},
): Promise<TrailerRecord[]> {
  const snap = await trailersCol().orderBy("createdAt", "desc").get();
  let trailers = snap.docs.map((d) => d.data() as TrailerRecord);

  if (filter.status) {
    trailers = trailers.filter((t) => t.status === filter.status);
  }
  if (filter.workerId) {
    trailers = trailers.filter(
      (t) =>
        t.currentWorkerId === filter.workerId ||
        t.stages[t.currentStageIndex]?.workerId === filter.workerId,
    );
  }
  if (filter.search?.trim()) {
    const needle = filter.search.trim().toLowerCase();
    trailers = trailers.filter((t) =>
      [t.chassisNumber, t.model, t.currentStageName, t.currentWorkerName]
        .filter(Boolean)
        .some((f) => f!.toLowerCase().includes(needle)),
    );
  }
  if (filter.limit) {
    trailers = trailers.slice(0, filter.limit);
  }
  return trailers;
}

export async function getTrailer(id: string): Promise<TrailerRecord | null> {
  const snap = await trailersCol().doc(id).get();
  return snap.exists ? (snap.data() as TrailerRecord) : null;
}

/** Full audit feed for one trailer, newest first. */
export async function listTrailerHistory(
  id: string,
): Promise<TrailerHistoryEvent[]> {
  const snap = await trailersCol()
    .doc(id)
    .collection(TRAILER_HISTORY_SUBCOLLECTION)
    .orderBy("createdAt", "desc")
    .get();
  return snap.docs.map((d) => d.data() as TrailerHistoryEvent);
}

// ── internals ────────────────────────────────────────────────────────────────

type EventSeed = { type: TrailerHistoryEvent["type"]; note: string };

/**
 * Recompute the "where is this build" pointer from the whole pipeline.
 *
 * With stages worked out of order there is no single cursor to advance, so
 * `current` is whatever is actively being worked on, else the first thing
 * still waiting. The trailer is done only when every stage is complete.
 */
function deriveProgress(
  stages: TrailerStage[],
  now: string,
): Partial<TrailerRecord> {
  const inProgress = stages.find((s) => s.status === "in_progress");
  const pending = stages.find((s) => s.status === "pending");
  const current = inProgress ?? pending ?? stages[stages.length - 1];
  const allDone = stages.every((s) => s.status === "completed");

  return {
    currentStageIndex: current.index,
    currentStageName: current.name,
    currentWorkerId: current.workerId,
    currentWorkerName: current.workerName,
    status: allDone ? ("completed" as TrailerStatus) : ("in_progress" as TrailerStatus),
    ...(allDone ? { completedAt: now } : {}),
  };
}

/**
 * Shared transaction wrapper for start/complete: loads the trailer, applies
 * the caller's transition to the requested stage (defaulting to the current
 * one), recomputes the progress pointer, writes the patched doc and appends
 * the produced history events atomically.
 */
async function stageTransition(
  trailerId: string,
  stageIndex: number | undefined,
  actor: Actor,
  transition: (
    trailer: TrailerRecord,
    targetStage: TrailerStage,
  ) => {
    stage: TrailerStage;
    trailerPatch: Partial<TrailerRecord>;
    events: EventSeed[];
  },
): Promise<TrailerRecord> {
  const ref = trailersCol().doc(trailerId);

  return adminDb().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) {
      throw new DomainError("NOT_FOUND", "Trailer not found", 404);
    }
    const trailer = snap.data() as TrailerRecord;
    if (trailer.status === "completed") {
      throw new DomainError(
        "TRAILER_COMPLETED",
        "This trailer has already finished production.",
        409,
      );
    }

    const target =
      stageIndex === undefined
        ? trailer.stages[trailer.currentStageIndex]
        : trailer.stages[stageIndex];
    if (!target) {
      throw new DomainError("BAD_STAGE", "No such stage on this trailer", 422);
    }

    const { stage, trailerPatch, events } = transition(trailer, target);

    const now = nowIso();
    const stages = [...trailer.stages];
    stages[stage.index] = stripUndefined(stage);

    const patch = {
      ...deriveProgress(stages, now),
      ...trailerPatch,
      stages,
      updatedAt: now,
    };

    tx.update(ref, toUpdatePayload(patch));
    for (const seed of events) {
      const histRef = ref.collection(TRAILER_HISTORY_SUBCOLLECTION).doc();
      const event: TrailerHistoryEvent = {
        id: histRef.id,
        type: seed.type,
        stageIndex: stage.index,
        stageName: stage.name,
        actorId: actor.id,
        actorName: actor.name,
        note: seed.note,
        createdAt: now,
      };
      tx.set(histRef, event);
    }
    return { ...trailer, ...patch } as TrailerRecord;
  });
}

/** Firestore rejects `undefined` values; drop those keys before writing. */
function stripUndefined<T extends object>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined),
  ) as T;
}

/**
 * Build a tx.update payload: keys explicitly set to `undefined` become field
 * deletes (e.g. hand-over to an unassigned stage must clear currentWorkerId,
 * not leave the previous stage's worker behind).
 */
function toUpdatePayload(patch: object): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(patch).map(([k, v]) => [
      k,
      v === undefined ? FieldValue.delete() : v,
    ]),
  );
}

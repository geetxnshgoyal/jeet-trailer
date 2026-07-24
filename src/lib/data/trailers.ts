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
} from "@/lib/domain/types";

/**
 * Workshop trailer data-access.
 *
 * A trailer's pipeline is an embedded, ordered `stages` array; the chassis is
 * always "held" by exactly one stage (`currentStageIndex`). Stage transitions
 * run in a transaction against the live doc so two workers can never both
 * claim or complete the same stage:
 *
 *   pending ──start──▶ in_progress ──complete──▶ completed, advance pointer
 *
 * Completing the final stage marks the whole trailer `completed`. Every
 * transition also appends an immutable event to the trailer's `history`
 * subcollection — that feed is the audit trail the admin timeline renders.
 */

function trailersCol() {
  return adminDb().collection(COLLECTIONS.trailers);
}

interface Actor {
  id: string;
  name: string;
  role: "admin" | "worker";
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
 * Start the current stage. Admins can start any stage; a worker can start it
 * when it is assigned to them or unassigned (starting an unassigned stage
 * claims it). The actor becomes the stage's worker either way.
 */
export async function startCurrentStage(
  trailerId: string,
  actor: Actor,
): Promise<TrailerRecord> {
  return stageTransition(trailerId, actor, (trailer, stage) => {
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
      trailerPatch: {
        currentWorkerId: worker.id,
        currentWorkerName: worker.name,
      },
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
 * Complete the current stage and hand the chassis to the next one. Only the
 * worker on the stage (or an admin) may complete it. Completing the last
 * stage marks the whole trailer completed.
 */
export async function completeCurrentStage(
  trailerId: string,
  actor: Actor,
  notes?: string,
): Promise<TrailerRecord> {
  return stageTransition(trailerId, actor, (trailer, stage) => {
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

    const isLast = stage.index >= trailer.stages.length - 1;
    const next = isLast ? null : trailer.stages[stage.index + 1];

    const trailerPatch: Partial<TrailerRecord> = isLast
      ? {
          status: "completed" as TrailerStatus,
          completedAt: now,
          currentStageName: updated.name,
          currentWorkerId: updated.workerId,
          currentWorkerName: updated.workerName,
        }
      : {
          currentStageIndex: next!.index,
          currentStageName: next!.name,
          currentWorkerId: next!.workerId,
          currentWorkerName: next!.workerName,
        };

    let completedNote = `${updated.workerName} completed ${stage.name} on ${trailer.chassisNumber}`;
    if (next) {
      completedNote += next.workerName
        ? ` — handed over to ${next.workerName} (${next.name})`
        : ` — handed over to ${next.name}`;
    }
    const events: EventSeed[] = [{ type: "stage_completed", note: completedNote }];
    if (isLast) {
      events.push({
        type: "completed",
        note: `Trailer ${trailer.chassisNumber} finished all stages — ready for inventory`,
      });
    }

    return { stage: updated, trailerPatch, events };
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
    // Firestore rejects `undefined` fields — strip them.
    stages[stageIndex] = stripUndefined(stages[stageIndex]);

    // `undefined` here means "clear the field" — toUpdatePayload turns it
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
 * Shared transaction wrapper for start/complete: loads the trailer, applies
 * the caller's transition to the *current* stage, writes the patched doc and
 * appends the produced history events atomically.
 */
async function stageTransition(
  trailerId: string,
  actor: Actor,
  transition: (
    trailer: TrailerRecord,
    currentStage: TrailerStage,
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

    const current = trailer.stages[trailer.currentStageIndex];
    const { stage, trailerPatch, events } = transition(trailer, current);

    const now = nowIso();
    const stages = [...trailer.stages];
    stages[stage.index] = stripUndefined(stage);

    const patch = { ...trailerPatch, stages, updatedAt: now };

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

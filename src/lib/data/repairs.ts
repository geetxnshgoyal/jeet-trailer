import "server-only";
import { adminDb } from "@/lib/firebase/admin";
import { COLLECTIONS, REPAIR_CODE_PREFIX } from "@/lib/domain/constants";
import { nextCode } from "@/lib/data/counters";
import { nowIso } from "@/lib/utils";
import { DomainError } from "@/lib/api/response";
import type { RepairRecord, InstallationPhoto } from "@/lib/domain/types";

/**
 * Workshop repair logs.
 *
 * Deliberately simple compared with issues: a repair touches no stock, so
 * there is nothing to keep in balance. It is a dated record of work done,
 * with photos as the evidence. Records are never deleted.
 */

function repairsCol() {
  return adminDb().collection(COLLECTIONS.repairs);
}

export interface CreateRepairData {
  vehicleNumber?: string;
  chassisNumber?: string;
  partyName?: string;
  description?: string;
  cost?: number;
  workerId: string;
  workerName: string;
}

export async function createRepair(
  input: CreateRepairData,
): Promise<RepairRecord> {
  const ref = repairsCol().doc();

  return adminDb().runTransaction(async (tx) => {
    const code = await nextCode(tx, REPAIR_CODE_PREFIX);
    const now = nowIso();

    const record: RepairRecord = {
      id: ref.id,
      code,
      photos: [],
      workerId: input.workerId,
      workerName: input.workerName,
      createdAt: now,
      updatedAt: now,
      ...(input.vehicleNumber?.trim()
        ? { vehicleNumber: input.vehicleNumber.trim().toUpperCase() }
        : {}),
      ...(input.chassisNumber?.trim()
        ? { chassisNumber: input.chassisNumber.trim().toUpperCase() }
        : {}),
      ...(input.partyName?.trim() ? { partyName: input.partyName.trim() } : {}),
      ...(input.description?.trim()
        ? { description: input.description.trim() }
        : {}),
      ...(typeof input.cost === "number" && input.cost > 0
        ? { cost: input.cost }
        : {}),
    };

    tx.set(ref, record);
    return record;
  });
}

/** Attach uploaded photos to a repair. Photos are additive, never replaced. */
export async function addRepairPhotos(
  id: string,
  photos: InstallationPhoto[],
): Promise<RepairRecord> {
  const ref = repairsCol().doc(id);

  return adminDb().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) {
      throw new DomainError("NOT_FOUND", "Repair not found", 404);
    }
    const repair = snap.data() as RepairRecord;
    const next = [...(repair.photos ?? []), ...photos];

    tx.update(ref, { photos: next, updatedAt: nowIso() });
    return { ...repair, photos: next };
  });
}

export interface ListRepairsFilter {
  /** Restrict to one worker's own logs. */
  workerId?: string;
  /** Free-text across code, vehicle, chassis, party and description. */
  search?: string;
  limit?: number;
}

/** List repairs, newest first. */
export async function listRepairs(
  filter: ListRepairsFilter = {},
): Promise<RepairRecord[]> {
  const snap = await repairsCol().orderBy("createdAt", "desc").get();
  let repairs = snap.docs.map((d) => d.data() as RepairRecord);

  if (filter.workerId) {
    repairs = repairs.filter((r) => r.workerId === filter.workerId);
  }
  if (filter.search?.trim()) {
    const needle = filter.search.trim().toLowerCase();
    repairs = repairs.filter((r) =>
      [r.code, r.vehicleNumber, r.chassisNumber, r.partyName, r.description]
        .filter(Boolean)
        .some((f) => f!.toLowerCase().includes(needle)),
    );
  }
  if (filter.limit) repairs = repairs.slice(0, filter.limit);
  return repairs;
}

export async function getRepair(id: string): Promise<RepairRecord | null> {
  const snap = await repairsCol().doc(id).get();
  return snap.exists ? (snap.data() as RepairRecord) : null;
}

import "server-only";
import { adminDb } from "@/lib/firebase/admin";
import {
  COLLECTIONS,
  ITEM_HISTORY_SUBCOLLECTION,
  deriveStockStatus,
} from "@/lib/domain/constants";
import { nextCode } from "@/lib/data/counters";
import { nowIso } from "@/lib/utils";
import { DomainError } from "@/lib/api/response";
import type {
  InventoryItem,
  IssueRecord,
  ItemHistoryEvent,
  InstallationPhoto,
} from "@/lib/domain/types";

/**
 * Issue & installation data-access — the core of the system.
 *
 * Issuing an item is a single Firestore transaction that:
 *   1. reads the item and checks sufficient stock,
 *   2. decrements the item quantity and recomputes stock status,
 *   3. writes the immutable issue record, and
 *   4. appends an "issued" event to the item's history subcollection.
 * Either all four land or none do, so stock can never drift from the ledger.
 *
 * Issue records are NEVER deleted — they are the audit trail. Installation
 * completion mutates the same record in place (status + photos + timestamp)
 * and appends an "installed" history event.
 */

function issuesCol() {
  return adminDb().collection(COLLECTIONS.issues);
}

function itemRef(itemId: string) {
  return adminDb().collection(COLLECTIONS.inventory).doc(itemId);
}

export interface CreateIssueInput {
  itemId: string;
  quantity: number;
  vehicleNumber: string;
  serialNumber?: string;
  notes?: string;
  workerId: string;
  workerName: string;
}

export async function createIssue(
  input: CreateIssueInput,
): Promise<IssueRecord> {
  const iRef = itemRef(input.itemId);
  const issueRef = issuesCol().doc();
  const histRef = iRef.collection(ITEM_HISTORY_SUBCOLLECTION).doc();
  const counterRef = adminDb().collection(COLLECTIONS.counters).doc("ISS");

  return adminDb().runTransaction(async (tx) => {
    // ---- all reads first (Firestore transaction rule) ----
    const itemSnap = await tx.get(iRef);
    if (!itemSnap.exists) {
      throw new DomainError("NOT_FOUND", "Item not found", 404);
    }
    const item = itemSnap.data() as InventoryItem;
    const counterSnap = await tx.get(counterRef);

    if (input.quantity <= 0) {
      throw new DomainError("INVALID_QUANTITY", "Quantity must be positive", 422);
    }
    if (item.quantity < input.quantity) {
      throw new DomainError(
        "INSUFFICIENT_STOCK",
        `Only ${item.quantity} ${item.unit} of ${item.name} in stock.`,
        409,
      );
    }

    // Serial-tracked items are single-unit and carry their serial onto the issue.
    const serialNumber = item.serialNumber ?? input.serialNumber?.trim();

    // ---- derive next values ----
    const nextQty = item.quantity - input.quantity;
    const status = deriveStockStatus(nextQty, item.lowStockThreshold);
    const seq = ((counterSnap.exists ? counterSnap.data()?.value : 0) ?? 0) + 1;
    const code = `ISS-${String(seq).padStart(6, "0")}`;
    const now = nowIso();

    const record: IssueRecord = {
      id: issueRef.id,
      code,
      itemId: item.id,
      itemName: item.name,
      itemCode: item.code,
      categoryId: item.categoryId,
      categoryName: item.categoryName,
      quantity: input.quantity,
      workerId: input.workerId,
      workerName: input.workerName,
      vehicleNumber: input.vehicleNumber,
      status: "issued",
      issuedAt: now,
      photos: [],
      createdAt: now,
      updatedAt: now,
      ...(serialNumber ? { serialNumber } : {}),
      ...(input.notes?.trim() ? { notes: input.notes.trim() } : {}),
    };

    const historyEvent: ItemHistoryEvent = {
      id: histRef.id,
      type: "issued",
      quantityDelta: -input.quantity,
      resultingQuantity: nextQty,
      issueId: issueRef.id,
      vehicleNumber: input.vehicleNumber,
      actorId: input.workerId,
      actorName: input.workerName,
      createdAt: now,
      note: `Issued ${input.quantity} ${item.unit} for vehicle ${input.vehicleNumber}`,
    };

    // ---- writes ----
    tx.update(iRef, { quantity: nextQty, status, updatedAt: now });
    tx.set(counterRef, { value: seq }, { merge: true });
    tx.set(issueRef, record);
    tx.set(histRef, historyEvent);

    return record;
  });
}

export interface CompleteInstallationInput {
  issueId: string;
  photos: InstallationPhoto[];
  notes?: string;
  actorId: string;
  actorName: string;
}

/**
 * Mark an issue installed: attach photos, set status + installedAt, and append
 * an "installed" event to the item's history. Idempotent-ish — re-completing an
 * already-installed issue is rejected so timestamps aren't overwritten.
 */
export async function completeInstallation(
  input: CompleteInstallationInput,
): Promise<IssueRecord> {
  const issueRef = issuesCol().doc(input.issueId);

  return adminDb().runTransaction(async (tx) => {
    const snap = await tx.get(issueRef);
    if (!snap.exists) {
      throw new DomainError("NOT_FOUND", "Issue record not found", 404);
    }
    const issue = snap.data() as IssueRecord;

    if (issue.status === "installed") {
      throw new DomainError(
        "ALREADY_INSTALLED",
        "This issue is already marked installed.",
        409,
      );
    }
    if (issue.status === "cancelled") {
      throw new DomainError(
        "ISSUE_CANCELLED",
        "This issue was cancelled and cannot be installed.",
        409,
      );
    }

    const now = nowIso();
    const photos = [...issue.photos, ...input.photos];

    const histRef = itemRef(issue.itemId)
      .collection(ITEM_HISTORY_SUBCOLLECTION)
      .doc();
    const historyEvent: ItemHistoryEvent = {
      id: histRef.id,
      type: "installed",
      issueId: issue.id,
      vehicleNumber: issue.vehicleNumber,
      actorId: input.actorId,
      actorName: input.actorName,
      createdAt: now,
      note: `Installed on vehicle ${issue.vehicleNumber}`,
    };

    tx.update(issueRef, {
      status: "installed",
      installedAt: now,
      photos,
      updatedAt: now,
      ...(input.notes?.trim() ? { notes: input.notes.trim() } : {}),
    });
    tx.set(histRef, historyEvent);

    return { ...issue, status: "installed", installedAt: now, photos };
  });
}

export interface ListIssuesFilter {
  workerId?: string;
  status?: IssueRecord["status"];
  vehicleNumber?: string;
  /** Free-text across code/item/worker/vehicle, applied in memory. */
  search?: string;
  limit?: number;
}

/**
 * List issue records, newest first. Category/worker/status/vehicle filters are
 * applied in Firestore where indexable; free-text search is applied in memory
 * (see the note in inventory.listItems for the rationale and the scaling seam).
 */
export async function listIssues(
  filter: ListIssuesFilter = {},
): Promise<IssueRecord[]> {
  const q = issuesCol().orderBy("issuedAt", "desc");
  const snap = await q.get();
  let issues = snap.docs.map((d) => d.data() as IssueRecord);

  if (filter.workerId) {
    issues = issues.filter((it) => it.workerId === filter.workerId);
  }
  if (filter.status) {
    issues = issues.filter((it) => it.status === filter.status);
  }
  if (filter.vehicleNumber) {
    const vn = filter.vehicleNumber.toUpperCase();
    issues = issues.filter((it) => it.vehicleNumber === vn);
  }
  if (filter.limit) {
    issues = issues.slice(0, filter.limit);
  }

  if (filter.search?.trim()) {
    const needle = filter.search.trim().toLowerCase();
    issues = issues.filter((it) =>
      [it.code, it.itemName, it.itemCode, it.workerName, it.vehicleNumber, it.serialNumber]
        .filter(Boolean)
        .some((f) => f!.toLowerCase().includes(needle)),
    );
  }
  return issues;
}

export async function getIssue(id: string): Promise<IssueRecord | null> {
  const snap = await issuesCol().doc(id).get();
  return snap.exists ? (snap.data() as IssueRecord) : null;
}

/** Count issues created since a given ISO instant — used by the dashboard. */
export async function countIssuesSince(iso: string): Promise<number> {
  const snap = await issuesCol().where("issuedAt", ">=", iso).count().get();
  return snap.data().count;
}

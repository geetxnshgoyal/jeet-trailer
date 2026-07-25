import "server-only";
import { adminDb } from "@/lib/firebase/admin";
import {
  COLLECTIONS,
  ITEM_HISTORY_SUBCOLLECTION,
  deriveStockStatus,
} from "@/lib/domain/constants";
import { nowIso } from "@/lib/utils";
import { DomainError } from "@/lib/api/response";
import type {
  GatePassRecord,
  GatePassLine,
  InventoryItem,
  ItemHistoryEvent,
} from "@/lib/domain/types";

/**
 * Gate pass data-access.
 *
 * Issuing a pass is one Firestore transaction that:
 *   1. reads every referenced inventory item and checks stock,
 *   2. decrements each item and recomputes its stock status,
 *   3. writes the gate pass record, and
 *   4. appends a `gate_pass` event to each item's history.
 *
 * Either all of it lands or none does, so stock always reflects what has
 * physically left the gate. Voucher numbers are unique: the same pass must
 * never deduct stock twice.
 */

function passesCol() {
  return adminDb().collection(COLLECTIONS.gatePasses);
}

function itemRef(itemId: string) {
  return adminDb().collection(COLLECTIONS.inventory).doc(itemId);
}

export interface CreateGatePassData {
  voucherNumber: string;
  partyName: string;
  trailerChassisNumber?: string;
  trailerSize?: string;
  tyreItemId?: string;
  tyreQuantity?: number;
  rimItemId?: string;
  rimQuantity?: number;
  color?: string;
  paymentMethod?: string;
  notes?: string;
  actorId: string;
  actorName: string;
}

/** One stock line to draw, before it has been resolved against inventory. */
interface RequestedLine {
  kind: "tyre" | "rim";
  itemId: string;
  quantity: number;
}

export async function createGatePass(
  input: CreateGatePassData,
): Promise<GatePassRecord> {
  const voucherNumber = input.voucherNumber.trim();

  const requested: RequestedLine[] = [];
  if (input.tyreItemId && input.tyreQuantity && input.tyreQuantity > 0) {
    requested.push({
      kind: "tyre",
      itemId: input.tyreItemId,
      quantity: input.tyreQuantity,
    });
  }
  if (input.rimItemId && input.rimQuantity && input.rimQuantity > 0) {
    requested.push({
      kind: "rim",
      itemId: input.rimItemId,
      quantity: input.rimQuantity,
    });
  }

  const passRef = passesCol().doc();

  return adminDb().runTransaction(async (tx) => {
    // ---- all reads first (Firestore transaction rule) ----
    const dupe = await tx.get(
      passesCol().where("voucherNumber", "==", voucherNumber).limit(1),
    );
    if (!dupe.empty) {
      throw new DomainError(
        "DUPLICATE_VOUCHER",
        `Gate pass ${voucherNumber} already exists.`,
        409,
      );
    }

    const snaps = await Promise.all(
      requested.map((line) => tx.get(itemRef(line.itemId))),
    );

    // ---- validate stock before writing anything ----
    const resolved: { line: RequestedLine; item: InventoryItem }[] = [];
    for (let i = 0; i < requested.length; i++) {
      const line = requested[i];
      const snap = snaps[i];
      if (!snap.exists) {
        throw new DomainError(
          "ITEM_NOT_FOUND",
          `The selected ${line.kind} is no longer in inventory.`,
          404,
        );
      }
      const item = snap.data() as InventoryItem;
      if (item.quantity < line.quantity) {
        throw new DomainError(
          "INSUFFICIENT_STOCK",
          `Only ${item.quantity} ${item.unit} of ${item.name} in stock.`,
          409,
        );
      }
      resolved.push({ line, item });
    }

    const now = nowIso();
    const lines: Partial<Record<"tyre" | "rim", GatePassLine>> = {};

    for (const { line, item } of resolved) {
      lines[line.kind] = {
        itemId: item.id,
        itemCode: item.code,
        label: describeItem(item),
        quantity: line.quantity,
      };
    }

    const record: GatePassRecord = {
      id: passRef.id,
      voucherNumber,
      partyName: input.partyName.trim(),
      createdById: input.actorId,
      createdByName: input.actorName,
      createdAt: now,
      updatedAt: now,
      ...(lines.tyre ? { tyre: lines.tyre } : {}),
      ...(lines.rim ? { rim: lines.rim } : {}),
      ...(input.trailerChassisNumber?.trim()
        ? { trailerChassisNumber: input.trailerChassisNumber.trim().toUpperCase() }
        : {}),
      ...(input.trailerSize?.trim() ? { trailerSize: input.trailerSize.trim() } : {}),
      ...(input.color?.trim() ? { color: input.color.trim() } : {}),
      ...(input.paymentMethod?.trim()
        ? { paymentMethod: input.paymentMethod.trim() }
        : {}),
      ...(input.notes?.trim() ? { notes: input.notes.trim() } : {}),
    };

    // ---- writes ----
    tx.set(passRef, record);

    for (const { line, item } of resolved) {
      const nextQty = item.quantity - line.quantity;
      const status = deriveStockStatus(nextQty, item.lowStockThreshold);
      tx.update(itemRef(item.id), {
        quantity: nextQty,
        status,
        updatedAt: now,
      });

      const histRef = itemRef(item.id)
        .collection(ITEM_HISTORY_SUBCOLLECTION)
        .doc();
      const event: ItemHistoryEvent = {
        id: histRef.id,
        type: "gate_pass",
        quantityDelta: -line.quantity,
        resultingQuantity: nextQty,
        gatePassId: passRef.id,
        partyName: record.partyName,
        actorId: input.actorId,
        actorName: input.actorName,
        createdAt: now,
        note: `Gate pass ${voucherNumber} to ${record.partyName}: ${line.quantity} ${item.unit}`,
      };
      tx.set(histRef, event);
    }

    return record;
  });
}

/** Human label for a stock line, e.g. "MRF Tyre (295/80 R22.5)". */
function describeItem(item: InventoryItem): string {
  const parts = [item.brand, item.model].filter(Boolean).join(" ").trim();
  const base = parts || item.name;
  return item.spec ? `${base} (${item.spec})` : base;
}

export interface ListGatePassesFilter {
  /** Free-text across voucher, party, chassis and stock labels. */
  search?: string;
  limit?: number;
}

/** List gate passes, newest first. */
export async function listGatePasses(
  filter: ListGatePassesFilter = {},
): Promise<GatePassRecord[]> {
  const snap = await passesCol().orderBy("createdAt", "desc").get();
  let passes = snap.docs.map((d) => d.data() as GatePassRecord);

  if (filter.search?.trim()) {
    const needle = filter.search.trim().toLowerCase();
    passes = passes.filter((p) =>
      [
        p.voucherNumber,
        p.partyName,
        p.trailerChassisNumber,
        p.tyre?.label,
        p.rim?.label,
      ]
        .filter(Boolean)
        .some((f) => f!.toLowerCase().includes(needle)),
    );
  }
  if (filter.limit) passes = passes.slice(0, filter.limit);
  return passes;
}

export async function getGatePass(id: string): Promise<GatePassRecord | null> {
  const snap = await passesCol().doc(id).get();
  return snap.exists ? (snap.data() as GatePassRecord) : null;
}

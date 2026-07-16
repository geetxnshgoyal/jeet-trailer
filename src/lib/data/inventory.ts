import "server-only";
import { adminDb } from "@/lib/firebase/admin";
import {
  COLLECTIONS,
  DEFAULT_CATEGORIES,
  DEFAULT_LOW_STOCK_THRESHOLD,
  CUSTOM_CATEGORY_CODE_PREFIX,
  ITEM_HISTORY_SUBCOLLECTION,
  deriveStockStatus,
} from "@/lib/domain/constants";
import { reserveCode } from "@/lib/data/counters";
import { nowIso } from "@/lib/utils";
import { DomainError } from "@/lib/api/response";
import type {
  InventoryItem,
  ItemHistoryEvent,
  ItemHistoryEventType,
  Category,
} from "@/lib/domain/types";

/**
 * Inventory data-access layer.
 *
 * Every stock-changing operation is wrapped in a Firestore transaction that
 * (1) mutates the item quantity, (2) recomputes stock status, and (3) appends
 * an immutable event to the item's `history` subcollection — so the item is
 * never out of sync with its audit trail. Issue-driven decrements live in the
 * issues layer (which also writes the issue record atomically), but they call
 * the same history-append shape defined here.
 */

function itemsCol() {
  return adminDb().collection(COLLECTIONS.inventory);
}

function historyCol(itemId: string) {
  return itemsCol().doc(itemId).collection(ITEM_HISTORY_SUBCOLLECTION);
}

/** Resolve the code prefix for a category, falling back for custom categories. */
function codePrefixForCategory(category: Category): string {
  const def = DEFAULT_CATEGORIES.find((d) => d.slug === category.slug);
  if (def) return def.codePrefix;
  // Custom category: derive a 3-letter prefix from its name, else generic.
  const letters = category.name.replace(/[^a-zA-Z]/g, "").toUpperCase();
  return letters.length >= 3 ? letters.slice(0, 3) : CUSTOM_CATEGORY_CODE_PREFIX;
}

/** Generate the next human-facing item code for a category, e.g. TYR-00125. */
async function generateItemCode(category: Category): Promise<string> {
  const prefix = codePrefixForCategory(category);
  return reserveCode(prefix);
}

export interface CreateItemInput {
  category: Category;
  name: string;
  brand: string;
  model?: string;
  spec?: string;
  quantity: number;
  unit: string;
  lowStockThreshold?: number;
  serialNumber?: string;
  remarks?: string;
  photoBase64?: string;
  actorId: string;
  actorName: string;
}

export async function createItem(
  input: CreateItemInput,
): Promise<InventoryItem> {
  // Serial-tracked categories require a unique serial and are single-unit.
  if (input.category.serialTracked) {
    if (!input.serialNumber?.trim()) {
      throw new DomainError(
        "SERIAL_REQUIRED",
        `${input.category.name} items require a serial number.`,
        422,
      );
    }
    const dupe = await itemsCol()
      .where("serialNumber", "==", input.serialNumber.trim())
      .limit(1)
      .get();
    if (!dupe.empty) {
      throw new DomainError(
        "SERIAL_EXISTS",
        `Serial number ${input.serialNumber} is already recorded.`,
        409,
      );
    }
  }

  const code = await generateItemCode(input.category);
  const ref = itemsCol().doc();
  const now = nowIso();
  const threshold = input.lowStockThreshold ?? DEFAULT_LOW_STOCK_THRESHOLD;
  const quantity = input.quantity;

  const item: InventoryItem = {
    id: ref.id,
    code,
    categoryId: input.category.id,
    categoryName: input.category.name,
    name: input.name,
    brand: input.brand,
    model: input.model,
    spec: input.spec,
    quantity,
    unit: input.unit,
    lowStockThreshold: threshold,
    status: deriveStockStatus(quantity, threshold),
    serialNumber: input.category.serialTracked
      ? input.serialNumber?.trim()
      : undefined,
    remarks: input.remarks,
    photoBase64: input.photoBase64,
    createdAt: now,
    updatedAt: now,
  };

  const batch = adminDb().batch();
  batch.set(ref, stripUndefined(item));
  const evtRef = historyCol(ref.id).doc();
  batch.set(
    evtRef,
    buildEvent(evtRef.id, "added", {
      resultingQuantity: quantity,
      quantityDelta: quantity,
      actorId: input.actorId,
      actorName: input.actorName,
      note: `Added to inventory with ${quantity} ${input.unit}`,
    }),
  );
  await batch.commit();
  return item;
}

export interface ListItemsFilter {
  categoryId?: string;
  status?: InventoryItem["status"];
  /** Free-text query matched client-visible against name/code/brand/serial. */
  search?: string;
}

/**
 * List items with optional category/status filters applied in Firestore, and
 * free-text search applied in memory.
 *
 * Firestore has no substring/OR text search, so we scope by the indexable
 * fields server-side and filter the text match here. At workshop data volumes
 * (hundreds to low-thousands of items) this is well within budget; if the
 * catalogue ever grows large this is the seam to swap in a search index.
 */
export async function listItems(
  filter: ListItemsFilter = {},
): Promise<InventoryItem[]> {
  const q = itemsCol().orderBy("createdAt", "desc");
  const snap = await q.get();
  let items = snap.docs.map((d) => d.data() as InventoryItem);

  if (filter.categoryId) {
    items = items.filter((it) => it.categoryId === filter.categoryId);
  }
  if (filter.status) {
    items = items.filter((it) => it.status === filter.status);
  }

  if (filter.search?.trim()) {
    const needle = filter.search.trim().toLowerCase();
    items = items.filter((it) =>
      [it.name, it.code, it.brand, it.serialNumber, it.spec]
        .filter(Boolean)
        .some((f) => f!.toLowerCase().includes(needle)),
    );
  }
  return items;
}

export async function getItem(id: string): Promise<InventoryItem | null> {
  const snap = await itemsCol().doc(id).get();
  return snap.exists ? (snap.data() as InventoryItem) : null;
}

export async function getItemHistory(
  itemId: string,
): Promise<ItemHistoryEvent[]> {
  const snap = await historyCol(itemId).orderBy("createdAt", "desc").get();
  return snap.docs.map((d) => d.data() as ItemHistoryEvent);
}

export interface UpdateItemInput {
  name?: string;
  brand?: string;
  model?: string;
  spec?: string;
  unit?: string;
  lowStockThreshold?: number;
  remarks?: string;
  photoBase64?: string;
  actorId: string;
  actorName: string;
}

/**
 * Edit item metadata (not quantity — that goes through adjustStock so every
 * quantity change is audited). Recomputes status if the threshold changes.
 */
export async function updateItem(
  id: string,
  patch: UpdateItemInput,
): Promise<InventoryItem> {
  const ref = itemsCol().doc(id);
  return adminDb().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new DomainError("NOT_FOUND", "Item not found", 404);
    const current = snap.data() as InventoryItem;

    const updates: Partial<InventoryItem> = { updatedAt: nowIso() };
    if (patch.name !== undefined) updates.name = patch.name;
    if (patch.brand !== undefined) updates.brand = patch.brand;
    if (patch.model !== undefined) updates.model = patch.model;
    if (patch.spec !== undefined) updates.spec = patch.spec;
    if (patch.unit !== undefined) updates.unit = patch.unit;
    if (patch.remarks !== undefined) updates.remarks = patch.remarks;
    if (patch.photoBase64 !== undefined) updates.photoBase64 = patch.photoBase64;
    if (patch.lowStockThreshold !== undefined) {
      updates.lowStockThreshold = patch.lowStockThreshold;
      updates.status = deriveStockStatus(
        current.quantity,
        patch.lowStockThreshold,
      );
    }

    tx.set(ref, stripUndefined(updates), { merge: true });
    const evtRef = historyCol(id).doc();
    tx.set(
      evtRef,
      buildEvent(evtRef.id, "edited", {
        actorId: patch.actorId,
        actorName: patch.actorName,
        note: "Item details updated",
      }),
    );
    return { ...current, ...updates } as InventoryItem;
  });
}

/**
 * Adjust stock by a signed delta (admin restock or manual correction).
 * Runs in a transaction and refuses to drive quantity negative.
 */
export async function adjustStock(input: {
  itemId: string;
  delta: number;
  actorId: string;
  actorName: string;
  note?: string;
}): Promise<InventoryItem> {
  const ref = itemsCol().doc(input.itemId);
  return adminDb().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new DomainError("NOT_FOUND", "Item not found", 404);
    const current = snap.data() as InventoryItem;

    const nextQty = current.quantity + input.delta;
    if (nextQty < 0) {
      throw new DomainError(
        "INSUFFICIENT_STOCK",
        `Cannot reduce below zero. Current stock: ${current.quantity}.`,
        409,
      );
    }

    const status = deriveStockStatus(nextQty, current.lowStockThreshold);
    tx.update(ref, {
      quantity: nextQty,
      status,
      updatedAt: nowIso(),
    });

    const evtRef = historyCol(input.itemId).doc();
    const type: ItemHistoryEventType =
      input.delta >= 0 ? "stock_increased" : "stock_reduced";
    tx.set(
      evtRef,
      buildEvent(evtRef.id, type, {
        quantityDelta: input.delta,
        resultingQuantity: nextQty,
        actorId: input.actorId,
        actorName: input.actorName,
        note:
          input.note ??
          `Stock ${input.delta >= 0 ? "increased" : "reduced"} by ${Math.abs(
            input.delta,
          )}`,
      }),
    );

    return { ...current, quantity: nextQty, status } as InventoryItem;
  });
}

/**
 * Delete an item. Only permitted when the item has never been issued — issue
 * records are an immutable audit trail and must never dangle. Callers should
 * guard on that; here we also delete the item's history subcollection.
 */
export async function deleteItem(id: string): Promise<void> {
  const ref = itemsCol().doc(id);
  const snap = await ref.get();
  if (!snap.exists) throw new DomainError("NOT_FOUND", "Item not found", 404);

  // Block deletion if this item appears in any issue record.
  const issued = await adminDb()
    .collection(COLLECTIONS.issues)
    .where("itemId", "==", id)
    .limit(1)
    .get();
  if (!issued.empty) {
    throw new DomainError(
      "ITEM_HAS_HISTORY",
      "This item has issue records and cannot be deleted. Reduce its stock instead.",
      409,
    );
  }

  // Delete history subcollection docs, then the item.
  const hist = await historyCol(id).get();
  const batch = adminDb().batch();
  hist.docs.forEach((d) => batch.delete(d.ref));
  batch.delete(ref);
  await batch.commit();
}

/** Build a history event document, omitting undefined optional fields. */
function buildEvent(
  id: string,
  type: ItemHistoryEventType,
  fields: Partial<Omit<ItemHistoryEvent, "id" | "type" | "createdAt">> & {
    actorId: string;
    actorName: string;
  },
): ItemHistoryEvent {
  return stripUndefined({
    id,
    type,
    createdAt: nowIso(),
    ...fields,
  }) as ItemHistoryEvent;
}

/**
 * Firestore rejects `undefined` field values. Strip them so optional fields
 * (model, spec, serialNumber…) simply stay absent rather than erroring.
 */
function stripUndefined<T extends object>(obj: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out as T;
}

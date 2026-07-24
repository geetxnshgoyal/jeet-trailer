/**
 * Core domain types for the Jeet Trailers inventory & workshop system.
 *
 * These mirror the Firestore document shapes. Timestamps are stored as
 * ISO-8601 strings on the wire (serializable across the server/client
 * boundary and through TanStack Query's cache) and converted to/from
 * Firestore Timestamps at the data-access layer.
 */

/** User roles. Stored both as a Firebase Auth custom claim and on the users doc. */
export type Role = "admin" | "worker";

export interface AppUser {
  /** Firebase Auth UID. */
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: Role;
  /** Disabled workers cannot sign in or issue items, but their history is retained. */
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  /** Slug used for stable references and default-seed detection. */
  slug: string;
  /** Default categories ship with the system and cannot be deleted. */
  isDefault: boolean;
  /**
   * Whether items in this category are individually tracked via serial number
   * (tyres, rims) versus tracked purely by quantity (welding rods, MIG rolls).
   */
  serialTracked: boolean;
  createdAt: string;
  updatedAt: string;
}

export type StockStatus = "in_stock" | "low_stock" | "out_of_stock";

export interface InventoryItem {
  id: string;
  /** Human-facing code, e.g. TYR-00125. Auto-generated from category + counter. */
  code: string;
  categoryId: string;
  categoryName: string;
  name: string;
  brand: string;
  model?: string;
  supplierName?: string;
  invoiceNumber?: string;
  purchaseDate?: string;
  /** Size / specification, e.g. "295/80 R22.5". */
  spec?: string;
  quantity: number;
  unit: string;
  /** Threshold at or below which the item is considered low stock. */
  lowStockThreshold: number;
  status: StockStatus;
  /** Present only for serial-tracked items. */
  serialNumber?: string;
  remarks?: string;
  photoBase64?: string;
  createdAt: string;
  updatedAt: string;
}

/** Immutable event appended to an item's `history` subcollection. */
export type ItemHistoryEventType =
  | "added"
  | "stock_increased"
  | "stock_reduced"
  | "issued"
  | "installed"
  | "edited";

export interface ItemHistoryEvent {
  id: string;
  type: ItemHistoryEventType;
  /** Quantity delta for stock events (positive or negative). */
  quantityDelta?: number;
  /** Resulting quantity after the event, when applicable. */
  resultingQuantity?: number;
  /** Linked issue, for issued/installed events. */
  issueId?: string;
  vehicleNumber?: string;
  actorId: string;
  actorName: string;
  note?: string;
  createdAt: string;
}

// ── Workshop / production line ───────────────────────────────────────────────

export type TrailerStatus = "in_progress" | "completed";

export type TrailerStageStatus = "pending" | "in_progress" | "completed";

/**
 * One step of a trailer's production pipeline, embedded on the trailer doc.
 * `index` is the position in the pipeline (0-based); only the stage at
 * `currentStageIndex` can be started or completed.
 */
export interface TrailerStage {
  index: number;
  /** Display name, e.g. "Chassis Welding". */
  name: string;
  /** Worker assigned to (or who claimed) this stage. */
  workerId?: string;
  workerName?: string;
  status: TrailerStageStatus;
  startedAt?: string;
  completedAt?: string;
  /** Hand-over note left by the worker on completion. */
  notes?: string;
}

/**
 * A trailer build moving through the workshop. The stage pipeline is embedded
 * (snapshot at creation, so later template edits never rewrite active builds)
 * and denormalized `current*` fields keep list queries single-read.
 */
export interface TrailerRecord {
  id: string;
  /** Human-facing chassis number, e.g. CH-00001. Auto-generated or custom. */
  chassisNumber: string;
  /** Trailer model / type, e.g. "22ft Flatbed". */
  model?: string;
  description?: string;
  status: TrailerStatus;
  /** Index into `stages` of the stage currently holding the chassis. */
  currentStageIndex: number;
  currentStageName: string;
  /** Worker currently holding the chassis (set while a stage is in progress). */
  currentWorkerId?: string;
  currentWorkerName?: string;
  stages: TrailerStage[];
  completedAt?: string;
  createdById: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}

/** Immutable event appended to a trailer's `history` subcollection. */
export type TrailerHistoryEventType =
  | "created"
  | "stage_started"
  | "stage_completed"
  | "worker_assigned"
  | "completed";

export interface TrailerHistoryEvent {
  id: string;
  type: TrailerHistoryEventType;
  stageIndex?: number;
  stageName?: string;
  actorId: string;
  actorName: string;
  note?: string;
  createdAt: string;
}

export type InstallationStatus = "issued" | "installed" | "cancelled";

/** A stored installation photo reference. */
export interface InstallationPhoto {
  /** Storage path (provider-agnostic key). */
  path: string;
  /** Publicly resolvable URL for display/download. */
  url: string;
  uploadedAt: string;
}

/**
 * The core issue/installation record. Never deleted — full audit trail.
 *
 * `vehicleNumber` is stored flat now. A future Vehicle Management module can
 * introduce a `vehicles` collection and add an optional `vehicleId` here
 * without migrating existing records.
 */
export interface IssueRecord {
  id: string;
  /** Human-facing code, e.g. ISS-000042. */
  code: string;
  itemId: string;
  itemName: string;
  itemCode: string;
  categoryId: string;
  categoryName: string;
  quantity: number;
  serialNumber?: string;
  workerId: string;
  workerName: string;
  vehicleNumber: string;
  /** Reserved for future Vehicle Management module. */
  vehicleId?: string;
  status: InstallationStatus;
  issuedAt: string;
  installedAt?: string;
  photos: InstallationPhoto[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

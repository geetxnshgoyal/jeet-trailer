import type { StockStatus, TrailerStatus, TrailerStageStatus } from "./types";

/**
 * The seven default inventory categories Jeet Trailers ships with.
 * `serialTracked` items (tyres, rims) require a serial number per unit;
 * the rest are consumables tracked by quantity only.
 */
export const DEFAULT_CATEGORIES: ReadonlyArray<{
  name: string;
  slug: string;
  serialTracked: boolean;
  /** Prefix used when auto-generating item codes, e.g. TYR-00125. */
  codePrefix: string;
  defaultUnit: string;
}> = [
  { name: "Rim", slug: "rim", serialTracked: true, codePrefix: "RIM", defaultUnit: "pcs" },
  { name: "Tyre", slug: "tyre", serialTracked: true, codePrefix: "TYR", defaultUnit: "pcs" },
  { name: "Welding Rod", slug: "welding-rod", serialTracked: false, codePrefix: "WLR", defaultUnit: "packet" },
  { name: "MIG Roll", slug: "mig-roll", serialTracked: false, codePrefix: "MIG", defaultUnit: "roll" },
  { name: "Welding Holder", slug: "welding-holder", serialTracked: false, codePrefix: "WLH", defaultUnit: "pcs" },
  { name: "Cutting Wheel", slug: "cutting-wheel", serialTracked: false, codePrefix: "CTW", defaultUnit: "pcs" },
  { name: "Inch Tape", slug: "inch-tape", serialTracked: false, codePrefix: "INT", defaultUnit: "pcs" },
] as const;

/** Fallback code prefix for admin-created custom categories. */
export const CUSTOM_CATEGORY_CODE_PREFIX = "ITM";

/** Default low-stock threshold applied when an item doesn't specify one. */
export const DEFAULT_LOW_STOCK_THRESHOLD = 5;

export const UNITS = ["pcs", "packet", "roll", "box", "meter", "kg", "set"] as const;

/** System roles. Admin has full access; workers issue/install only. */
export const USER_ROLES = ["admin", "worker"] as const;

/** Derive stock status from quantity and threshold. Single source of truth. */
export function deriveStockStatus(
  quantity: number,
  lowStockThreshold: number,
): StockStatus {
  if (quantity <= 0) return "out_of_stock";
  if (quantity <= lowStockThreshold) return "low_stock";
  return "in_stock";
}

export const STOCK_STATUS_LABELS: Record<StockStatus, string> = {
  in_stock: "In Stock",
  low_stock: "Low Stock",
  out_of_stock: "Out of Stock",
};

/** Indian vehicle registration format, e.g. RJ31GA9265. Lenient but structured. */
export const VEHICLE_NUMBER_REGEX = /^[A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{1,4}$/;

export const COLLECTIONS = {
  users: "users",
  categories: "categories",
  inventory: "inventory",
  issues: "issues",
  trailers: "trailers",
  counters: "counters",
} as const;

/** Subcollection name under each inventory item. */
export const ITEM_HISTORY_SUBCOLLECTION = "history";

/** Subcollection name under each trailer. */
export const TRAILER_HISTORY_SUBCOLLECTION = "history";

/** Counter prefix for auto-generated chassis numbers, e.g. CH-00001. */
export const CHASSIS_CODE_PREFIX = "CH";

/**
 * Default production pipeline a new trailer is pre-filled with, in order.
 * Admins can rename, add, or remove stages per trailer at creation — this is
 * only the starting template, so changing it never affects builds in flight.
 */
export const DEFAULT_WORKSHOP_STAGES: ReadonlyArray<string> = [
  "Chassis Welding",
  "Axle & Suspension Fitting",
  "Body Fabrication",
  "Painting",
  "Electrical & Finishing",
];

export const TRAILER_STATUS_LABELS: Record<TrailerStatus, string> = {
  in_progress: "In Production",
  completed: "Completed",
};

export const TRAILER_STAGE_STATUS_LABELS: Record<TrailerStageStatus, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  completed: "Completed",
};

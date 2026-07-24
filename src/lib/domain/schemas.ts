import { z } from "zod";
import { UNITS, USER_ROLES } from "./constants";

/**
 * Zod schemas are the single source of truth for the shape of data crossing
 * any trust boundary: form submissions, API request bodies, and documents read
 * back out of Firestore (which is schemaless, so we validate on read too).
 */

const trimmed = (min: number, max: number, label: string) =>
  z
    .string()
    .trim()
    .min(min, `${label} is required`)
    .max(max, `${label} is too long`);

/** Indian vehicle registration, e.g. RJ31GA9265. Kept permissive but sane. */
export const vehicleNumberSchema = z
  .string()
  .trim()
  .toUpperCase()
  .min(4, "Vehicle number is required")
  .max(16, "Vehicle number is too long")
  .regex(/^[A-Z0-9- ]+$/, "Vehicle number has invalid characters");

// ── Auth ────────────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});
export type LoginInput = z.infer<typeof loginSchema>;

// ── Users / workers ───────────────────────────────────────────────────────────

export const createWorkerSchema = z.object({
  name: trimmed(2, 80, "Name"),
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  role: z.enum(USER_ROLES).default("worker"),
});
export type CreateWorkerInput = z.infer<typeof createWorkerSchema>;

export const updateWorkerSchema = z.object({
  name: trimmed(2, 80, "Name").optional(),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  role: z.enum(USER_ROLES).optional(),
  active: z.boolean().optional(),
});
export type UpdateWorkerInput = z.infer<typeof updateWorkerSchema>;

// ── Categories ────────────────────────────────────────────────────────────────

export const createCategorySchema = z.object({
  name: trimmed(2, 60, "Category name"),
  /** Consumables track quantity only; trackable items also carry serials. */
  trackable: z.boolean().default(false),
});
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

// ── Inventory ─────────────────────────────────────────────────────────────────

export const createItemSchema = z.object({
  categoryId: trimmed(1, 64, "Category"),
  name: trimmed(2, 120, "Item name"),
  brand: z.string().trim().max(80).optional().or(z.literal("")),
  supplierName: z.string().trim().max(120).optional().or(z.literal("")),
  invoiceNumber: z.string().trim().max(80).optional().or(z.literal("")),
  purchaseDate: z.string().trim().optional().or(z.literal("")),
  size: z.string().trim().max(80).optional().or(z.literal("")),
  quantity: z.coerce.number().int().min(0, "Quantity cannot be negative"),
  unit: z.enum(UNITS).default("pcs"),
  lowStockThreshold: z.coerce
    .number()
    .int()
    .min(0, "Threshold cannot be negative")
    .default(5),
  serialNumber: z.string().trim().max(120).optional().or(z.literal("")),
  remarks: z.string().trim().max(500).optional().or(z.literal("")),
  photoBase64: z.string().optional(),
});
export type CreateItemInput = z.infer<typeof createItemSchema>;

export const updateItemSchema = createItemSchema.partial();
export type UpdateItemInput = z.infer<typeof updateItemSchema>;

/** Positive/negative stock adjustment with an audit reason. */
export const stockAdjustSchema = z.object({
  delta: z.coerce
    .number()
    .int()
    .refine((n) => n !== 0, "Adjustment cannot be zero"),
  reason: trimmed(2, 200, "Reason"),
});
export type StockAdjustInput = z.infer<typeof stockAdjustSchema>;

// ── Workshop / production line ────────────────────────────────────────────────

/** Chassis number, e.g. CH-00042 or a custom shop code. */
export const chassisNumberSchema = z
  .string()
  .trim()
  .toUpperCase()
  .min(3, "Chassis number is too short")
  .max(24, "Chassis number is too long")
  .regex(/^[A-Z0-9-]+$/, "Chassis number can use letters, digits and dashes");

export const createTrailerSchema = z.object({
  /** Left empty to auto-generate CH-00001-style numbers. */
  chassisNumber: chassisNumberSchema.optional().or(z.literal("")),
  model: z.string().trim().max(80).optional().or(z.literal("")),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  stages: z
    .array(
      z.object({
        name: trimmed(2, 60, "Stage name"),
        workerId: z.string().trim().max(64).optional().or(z.literal("")),
      }),
    )
    .min(1, "Add at least one stage")
    .max(12, "At most 12 stages"),
});
export type CreateTrailerInput = z.infer<typeof createTrailerSchema>;

/** Start or complete the trailer's current stage. */
export const trailerStageActionSchema = z.object({
  action: z.enum(["start", "complete"]),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});
export type TrailerStageActionInput = z.infer<typeof trailerStageActionSchema>;

/** Admin (re)assigns a worker to a not-yet-completed stage. */
export const assignStageWorkerSchema = z.object({
  stageIndex: z.coerce.number().int().min(0),
  /** Empty string clears the assignment. */
  workerId: z.string().trim().max(64),
});
export type AssignStageWorkerInput = z.infer<typeof assignStageWorkerSchema>;

// ── Issue & installation ───────────────────────────────────────────────────────

export const createIssueSchema = z.object({
  itemId: trimmed(1, 64, "Item"),
  workerId: z.string().trim().optional(),
  quantity: z.coerce.number().int().min(1, "Quantity must be at least 1"),
  vehicleNumber: vehicleNumberSchema.optional().or(z.literal("")),
  serialNumber: z.string().trim().max(120).optional().or(z.literal("")),
  status: z.enum(["issued", "installed", "cancelled"]).optional(),
  photos: z
    .array(
      z.object({
        path: z.string(),
        url: z.string(),
        uploadedAt: z.string(),
      }),
    )
    .optional(),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});
export type CreateIssueInput = z.infer<typeof createIssueSchema>;

/** Marks an issue installed; photo URLs are attached after upload. */
export const completeInstallationSchema = z.object({
  photoUrls: z
    .array(z.string().url())
    .min(1, "Upload at least one installation photo")
    .max(10, "At most 10 photos"),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});
export type CompleteInstallationInput = z.infer<
  typeof completeInstallationSchema
>;

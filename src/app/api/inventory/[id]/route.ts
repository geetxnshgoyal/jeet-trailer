import { NextRequest } from "next/server";
import { requireRole, requireUser } from "@/lib/auth/session";
import { ok, handler, DomainError } from "@/lib/api/response";
import { updateItemSchema } from "@/lib/domain/schemas";
import { getItem, updateItem, deleteItem } from "@/lib/data/inventory";

/**
 * GET /api/inventory/[id] — fetch a single item (any authenticated user).
 */
export const GET = handler(
  async (_req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    await requireUser();
    const { id } = await ctx.params;
    const item = await getItem(id);
    if (!item) throw new DomainError("NOT_FOUND", "Item not found", 404);
    return ok({ item });
  },
);

/**
 * PATCH /api/inventory/[id] — edit item metadata (admin only). Quantity is not
 * editable here; it changes only through the audited stock-adjust endpoint.
 */
export const PATCH = handler(
  async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    const actor = await requireRole("admin");
    const { id } = await ctx.params;
    const patch = updateItemSchema.parse(await req.json());

    const item = await updateItem(id, {
      name: patch.name,
      brand: patch.brand || undefined,
      model: patch.model || undefined,
      spec: patch.size || undefined,
      unit: patch.unit,
      lowStockThreshold: patch.lowStockThreshold,
      remarks: patch.remarks || undefined,
      actorId: actor.uid,
      actorName: actor.name,
    });
    return ok({ item });
  },
);

/**
 * DELETE /api/inventory/[id] — remove an item (admin only). Blocked by the data
 * layer if the item has any issue history, protecting the audit trail.
 */
export const DELETE = handler(
  async (_req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    await requireRole("admin");
    const { id } = await ctx.params;
    await deleteItem(id);
    return ok({ deleted: true });
  },
);

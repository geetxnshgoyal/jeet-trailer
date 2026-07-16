import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth/session";
import { ok, handler } from "@/lib/api/response";
import { stockAdjustSchema } from "@/lib/domain/schemas";
import { adjustStock } from "@/lib/data/inventory";

/**
 * POST /api/inventory/[id]/stock — apply a signed stock adjustment (admin only).
 * Positive delta = restock, negative = manual correction. The data layer runs
 * this in a transaction, refuses to drive stock negative, and appends a history
 * event carrying the supplied reason.
 */
export const POST = handler(
  async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    const actor = await requireRole("admin");
    const { id } = await ctx.params;
    const { delta, reason } = stockAdjustSchema.parse(await req.json());

    const item = await adjustStock({
      itemId: id,
      delta,
      actorId: actor.uid,
      actorName: actor.name,
      note: reason,
    });
    return ok({ item });
  },
);

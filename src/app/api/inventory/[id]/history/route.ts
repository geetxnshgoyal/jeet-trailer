import { NextRequest } from "next/server";
import { requireInventoryAccess } from "@/lib/auth/session";
import { ok, handler } from "@/lib/api/response";
import { getItemHistory } from "@/lib/data/inventory";

/**
 * GET /api/inventory/[id]/history: full, chronologically-descending audit
 * trail for an item (added, stock changes, issued, installed, edits).
 * Any authenticated user may read history.
 */
export const GET = handler(
  async (_req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    await requireInventoryAccess();
    const { id } = await ctx.params;
    const history = await getItemHistory(id);
    return ok({ history });
  },
);

import { NextRequest } from "next/server";
import { requireInventoryAccess } from "@/lib/auth/session";
import { ok, handler, DomainError } from "@/lib/api/response";
import { getGatePass } from "@/lib/data/gate-passes";

/** GET /api/gate-passes/[id]: fetch a single gate pass. */
export const GET = handler(
  async (_req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    await requireInventoryAccess();
    const { id } = await ctx.params;

    const gatePass = await getGatePass(id);
    if (!gatePass) {
      throw new DomainError("NOT_FOUND", "Gate pass not found", 404);
    }
    return ok({ gatePass });
  },
);

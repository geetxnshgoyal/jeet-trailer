import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { ok, handler } from "@/lib/api/response";
import { trailerStageActionSchema } from "@/lib/domain/schemas";
import {
  startCurrentStage,
  completeCurrentStage,
} from "@/lib/data/trailers";

/**
 * POST /api/workshop/trailers/[id]/stage — act on the trailer's current stage.
 *
 * `{ action: "start" }` — the worker picks up the chassis (claims the stage if
 * unassigned). `{ action: "complete", notes? }` — marks the stage done and
 * hands the chassis to the next stage (or finishes the trailer). Per-actor
 * permission rules are enforced inside the data layer's transaction.
 */
export const POST = handler(
  async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    const user = await requireUser();
    const { id } = await ctx.params;
    const input = trailerStageActionSchema.parse(await req.json());

    const actor = { id: user.uid, name: user.name, role: user.role };
    const trailer =
      input.action === "start"
        ? await startCurrentStage(id, actor)
        : await completeCurrentStage(id, actor, input.notes || undefined);

    return ok({ trailer });
  },
);

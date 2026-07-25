import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { ok, handler } from "@/lib/api/response";
import { trailerStageActionSchema } from "@/lib/domain/schemas";
import { startStage, completeStage } from "@/lib/data/trailers";

/**
 * POST /api/workshop/trailers/[id]/stage: act on one of the trailer's stages.
 *
 * `{ action: "start", stageIndex? }` has the worker pick up that stage
 * (claiming it if unassigned). `{ action: "complete", stageIndex?, notes? }`
 * marks it done; the trailer finishes once every stage is complete. Stages
 * are independent, so any pending one can be started at any time. Omitting
 * stageIndex targets the current stage. Per-actor permission rules are
 * enforced inside the data layer's transaction.
 */
export const POST = handler(
  async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    const user = await requireUser();
    const { id } = await ctx.params;
    const input = trailerStageActionSchema.parse(await req.json());

    const actor = { id: user.uid, name: user.name, role: user.role };
    const trailer =
      input.action === "start"
        ? await startStage(id, input.stageIndex, actor)
        : await completeStage(
            id,
            input.stageIndex,
            actor,
            input.notes || undefined,
          );

    return ok({ trailer });
  },
);

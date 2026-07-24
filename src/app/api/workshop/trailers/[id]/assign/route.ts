import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth/session";
import { ok, handler, DomainError } from "@/lib/api/response";
import { assignStageWorkerSchema } from "@/lib/domain/schemas";
import { assignStageWorker } from "@/lib/data/trailers";
import { adminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/domain/constants";
import type { AppUser } from "@/lib/domain/types";

/**
 * POST /api/workshop/trailers/[id]/assign — assign or clear the worker on a
 * stage (admin only). An empty workerId clears the assignment.
 */
export const POST = handler(
  async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    const user = await requireRole("admin");
    const { id } = await ctx.params;
    const input = assignStageWorkerSchema.parse(await req.json());

    let worker: { id: string; name: string } | null = null;
    if (input.workerId) {
      const snap = await adminDb()
        .collection(COLLECTIONS.users)
        .doc(input.workerId)
        .get();
      if (!snap.exists) {
        throw new DomainError("UNKNOWN_WORKER", "Worker not found", 422);
      }
      const data = snap.data() as AppUser;
      worker = { id: snap.id, name: data.name };
    }

    const trailer = await assignStageWorker(id, input.stageIndex, worker, {
      id: user.uid,
      name: user.name,
      role: user.role,
    });

    return ok({ trailer });
  },
);

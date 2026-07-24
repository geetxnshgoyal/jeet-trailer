import { NextRequest } from "next/server";
import { requireUser, requireRole } from "@/lib/auth/session";
import { ok, handler, DomainError } from "@/lib/api/response";
import { createTrailerSchema } from "@/lib/domain/schemas";
import { createTrailer, listTrailers } from "@/lib/data/trailers";
import { adminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/domain/constants";
import type { AppUser, TrailerRecord } from "@/lib/domain/types";

/**
 * GET /api/workshop/trailers — list trailers (any authenticated user).
 * Workers use `workerId=me` to see builds currently waiting on them.
 */
export const GET = handler(async (req: NextRequest) => {
  const user = await requireUser();
  const params = req.nextUrl.searchParams;

  const workerParam = params.get("workerId") ?? undefined;
  const trailers = await listTrailers({
    status: (params.get("status") as TrailerRecord["status"]) ?? undefined,
    workerId: workerParam === "me" ? user.uid : workerParam,
    search: params.get("search") ?? undefined,
    limit: params.get("limit") ? Number(params.get("limit")) : undefined,
  });

  return ok({ trailers });
});

/**
 * POST /api/workshop/trailers — put a new trailer into production (admin only).
 * Worker names are resolved server-side and denormalized onto the stages so
 * non-admin viewers never need the (admin-only) workers API.
 */
export const POST = handler(async (req: NextRequest) => {
  const user = await requireRole("admin");
  const input = createTrailerSchema.parse(await req.json());

  // Resolve assigned workers' names in one batch read.
  const workerIds = [
    ...new Set(
      input.stages.map((s) => s.workerId).filter((id): id is string => !!id),
    ),
  ];
  const names = new Map<string, string>();
  if (workerIds.length > 0) {
    const snaps = await adminDb().getAll(
      ...workerIds.map((id) => adminDb().collection(COLLECTIONS.users).doc(id)),
    );
    for (const snap of snaps) {
      if (snap.exists) names.set(snap.id, (snap.data() as AppUser).name);
    }
    const missing = workerIds.filter((id) => !names.has(id));
    if (missing.length > 0) {
      throw new DomainError("UNKNOWN_WORKER", "Unknown worker on a stage", 422);
    }
  }

  const trailer = await createTrailer(
    {
      chassisNumber: input.chassisNumber || undefined,
      model: input.model || undefined,
      description: input.description || undefined,
      stages: input.stages.map((s) => ({
        name: s.name,
        workerId: s.workerId || undefined,
        workerName: s.workerId ? names.get(s.workerId) : undefined,
      })),
    },
    { id: user.uid, name: user.name, role: user.role },
  );

  return ok({ trailer }, 201);
});

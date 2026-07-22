import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { ok, handler } from "@/lib/api/response";
import { createIssueSchema } from "@/lib/domain/schemas";
import { createIssue, listIssues } from "@/lib/data/issues";
import { adminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/domain/constants";
import type { IssueRecord, AppUser } from "@/lib/domain/types";

/**
 * GET /api/issues — list issue records (any authenticated user).
 */
export const GET = handler(async (req: NextRequest) => {
  await requireUser();
  const params = req.nextUrl.searchParams;

  const issues = await listIssues({
    workerId: params.get("workerId") ?? undefined,
    status: (params.get("status") as IssueRecord["status"]) ?? undefined,
    vehicleNumber: params.get("vehicleNumber") ?? undefined,
    search: params.get("search") ?? undefined,
    limit: params.get("limit") ? Number(params.get("limit")) : undefined,
  });

  return ok({ issues });
});

/**
 * POST /api/issues — issue an item (any authenticated user).
 *
 * Worker Defaults to session user if not explicitly specified.
 * Stock decrement + issue record + history are written in a single transaction.
 */
export const POST = handler(async (req: NextRequest) => {
  const user = await requireUser();
  const input = createIssueSchema.parse(await req.json());

  let targetWorkerId = user.uid;
  let targetWorkerName = user.name;

  if (input.workerId && input.workerId !== user.uid) {
    const workerSnap = await adminDb()
      .collection(COLLECTIONS.users)
      .doc(input.workerId)
      .get();
    if (workerSnap.exists) {
      const workerData = workerSnap.data() as AppUser;
      targetWorkerId = workerData.id || input.workerId;
      targetWorkerName = workerData.name;
    }
  }

  const issue = await createIssue({
    itemId: input.itemId,
    quantity: input.quantity,
    vehicleNumber: input.vehicleNumber || "",
    serialNumber: input.serialNumber || undefined,
    notes: input.notes || undefined,
    status: input.status,
    photos: input.photos,
    workerId: targetWorkerId,
    workerName: targetWorkerName,
  });

  return ok({ issue }, 201);
});

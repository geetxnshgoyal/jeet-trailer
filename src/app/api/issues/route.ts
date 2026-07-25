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

  // Resolve the recipient: a workerId links a portal account; otherwise a
  // free-typed name is recorded as-is (workerId "") so items can be issued to
  // floor workers without accounts. Defaults to the session user.
  let targetWorkerId = user.uid;
  let targetWorkerName = user.name;

  const typedName = input.workerName?.trim();
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
  } else if (
    !input.workerId &&
    typedName &&
    typedName.toLowerCase() !== user.name.toLowerCase()
  ) {
    targetWorkerId = "";
    targetWorkerName = typedName;
  }

  // Link the workshop trailer when its chassis matches a build; unmatched
  // numbers are still recorded as plain text.
  const trailerChassisNumber =
    input.trailerChassisNumber?.trim().toUpperCase() || "";
  let trailerId: string | undefined;
  if (trailerChassisNumber) {
    const trailerSnap = await adminDb()
      .collection(COLLECTIONS.trailers)
      .where("chassisNumber", "==", trailerChassisNumber)
      .limit(1)
      .get();
    trailerId = trailerSnap.empty ? undefined : trailerSnap.docs[0].id;
  }

  const issue = await createIssue({
    itemId: input.itemId,
    quantity: input.quantity,
    vehicleNumber: input.vehicleNumber || "",
    chassisNumber: input.chassisNumber || undefined,
    trailerChassisNumber: trailerChassisNumber || undefined,
    trailerId,
    serialNumber: input.serialNumber || undefined,
    notes: input.notes || undefined,
    status: input.status,
    photos: input.photos,
    workerId: targetWorkerId,
    workerName: targetWorkerName,
    actorId: user.uid,
    actorName: user.name,
  });

  return ok({ issue }, 201);
});

import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { ok, handler } from "@/lib/api/response";
import { createIssueSchema } from "@/lib/domain/schemas";
import { createIssue, listIssues } from "@/lib/data/issues";
import type { IssueRecord } from "@/lib/domain/types";

/**
 * GET /api/issues — list issue records (any authenticated user).
 *
 * Workers see only their own issues (workerId is forced to the caller);
 * admins may pass ?workerId / ?status / ?vehicleNumber / ?search to filter
 * across everyone.
 */
export const GET = handler(async (req: NextRequest) => {
  const user = await requireUser();
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
 * The worker is taken from the session, never the body, so a worker can only
 * issue as themselves. Stock decrement + issue record + history are written in
 * a single transaction inside createIssue().
 */
export const POST = handler(async (req: NextRequest) => {
  const user = await requireUser();
  const input = createIssueSchema.parse(await req.json());

  const issue = await createIssue({
    itemId: input.itemId,
    quantity: input.quantity,
    vehicleNumber: input.vehicleNumber,
    serialNumber: input.serialNumber || undefined,
    notes: input.notes || undefined,
    workerId: user.uid,
    workerName: user.name,
  });

  return ok({ issue }, 201);
});

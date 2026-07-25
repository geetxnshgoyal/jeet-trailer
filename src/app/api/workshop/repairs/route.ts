import { NextRequest } from "next/server";
import { requireArea } from "@/lib/auth/session";
import { ok, handler } from "@/lib/api/response";
import { createRepairSchema } from "@/lib/domain/schemas";
import { createRepair, listRepairs } from "@/lib/data/repairs";

/**
 * GET /api/workshop/repairs: list repair logs, newest first.
 * Open to any signed-in user, including workshop accounts.
 */
export const GET = handler(async (req: NextRequest) => {
  const user = await requireArea("repairs");
  const params = req.nextUrl.searchParams;

  const workerParam = params.get("workerId") ?? undefined;
  const repairs = await listRepairs({
    workerId: workerParam === "me" ? user.uid : workerParam,
    search: params.get("search") ?? undefined,
    limit: params.get("limit") ? Number(params.get("limit")) : undefined,
  });

  return ok({ repairs });
});

/**
 * POST /api/workshop/repairs: log a repair. Photos are uploaded separately
 * against the returned id, since they need the record to exist first.
 */
export const POST = handler(async (req: NextRequest) => {
  const user = await requireArea("repairs");
  const input = createRepairSchema.parse(await req.json());

  const repair = await createRepair({
    vehicleNumber: input.vehicleNumber || undefined,
    chassisNumber: input.chassisNumber || undefined,
    partyName: input.partyName || undefined,
    description: input.description || undefined,
    cost: input.cost,
    workerId: user.uid,
    workerName: user.name,
  });

  return ok({ repair }, 201);
});

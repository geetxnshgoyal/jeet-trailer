import { NextRequest } from "next/server";
import { requireArea } from "@/lib/auth/session";
import { ok, handler } from "@/lib/api/response";
import { createGatePassSchema } from "@/lib/domain/schemas";
import { createGatePass, listGatePasses } from "@/lib/data/gate-passes";

/**
 * GET /api/gate-passes: list gate passes, newest first.
 * Stock-facing, so workshop accounts are refused.
 */
export const GET = handler(async (req: NextRequest) => {
  await requireArea("gatePass");
  const params = req.nextUrl.searchParams;

  const gatePasses = await listGatePasses({
    search: params.get("search") ?? undefined,
    limit: params.get("limit") ? Number(params.get("limit")) : undefined,
  });

  return ok({ gatePasses });
});

/**
 * POST /api/gate-passes: issue a pass and deduct the stock it releases.
 *
 * The deduction, the stock-status recompute and the pass record are one
 * transaction in the data layer, so a pass can never exist against stock that
 * was not removed, nor vice versa.
 */
export const POST = handler(async (req: NextRequest) => {
  const user = await requireArea("gatePass");
  const input = createGatePassSchema.parse(await req.json());

  const gatePass = await createGatePass({
    voucherNumber: input.voucherNumber,
    partyName: input.partyName,
    trailerChassisNumber: input.trailerChassisNumber || undefined,
    trailerSize: input.trailerSize || undefined,
    tyreItemId: input.tyreItemId || undefined,
    tyreQuantity: input.tyreQuantity || undefined,
    rimItemId: input.rimItemId || undefined,
    rimQuantity: input.rimQuantity || undefined,
    color: input.color || undefined,
    paymentMethod: input.paymentMethod || undefined,
    notes: input.notes || undefined,
    actorId: user.uid,
    actorName: user.name,
  });

  return ok({ gatePass }, 201);
});

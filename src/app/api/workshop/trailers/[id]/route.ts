import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { ok, handler, DomainError } from "@/lib/api/response";
import { getTrailer, listTrailerHistory } from "@/lib/data/trailers";

/**
 * GET /api/workshop/trailers/[id] — trailer detail plus its audit history
 * (any authenticated user; the whole floor can see where every chassis is).
 */
export const GET = handler(
  async (_req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    await requireUser();
    const { id } = await ctx.params;

    const trailer = await getTrailer(id);
    if (!trailer) {
      throw new DomainError("NOT_FOUND", "Trailer not found", 404);
    }
    const history = await listTrailerHistory(id);

    return ok({ trailer, history });
  },
);

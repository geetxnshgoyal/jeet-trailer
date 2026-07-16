import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { ok, handler, DomainError } from "@/lib/api/response";
import { getIssue } from "@/lib/data/issues";

/**
 * GET /api/issues/[id] — fetch a single issue record.
 * Workers are restricted to viewing only their own issues.
 */
export const GET = handler(
  async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    await requireUser();
    const { id } = await ctx.params;
    const issue = await getIssue(id);
    if (!issue) {
      throw new DomainError("NOT_FOUND", "Issue record not found", 404);
    }



    return ok({ issue });
  },
);

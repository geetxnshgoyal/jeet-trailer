import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { ok, handler, DomainError } from "@/lib/api/response";
import { completeInstallationSchema } from "@/lib/domain/schemas";
import { getIssue, completeInstallation } from "@/lib/data/issues";
import type { InstallationPhoto } from "@/lib/domain/types";

/**
 * POST /api/issues/[id]/install — mark an issue installed.
 *
 * Photos are uploaded first via POST /api/issues/[id]/photos, which appends
 * them to the issue record. This endpoint then verifies at least one photo is
 * present, sets the installed status/timestamp, and appends the "installed"
 * history event (all transactionally in the data layer).
 *
 * A worker may only complete their own issues; admins may complete any.
 */
export const POST = handler(
  async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    const user = await requireUser();
    const { id } = await ctx.params;

    const body = await req.json().catch(() => ({}));
    const notes = completeInstallationSchema.shape.notes.parse(body?.notes);
    const photos = (body?.photos || []) as InstallationPhoto[];

    const issue = await getIssue(id);
    if (!issue) throw new DomainError("NOT_FOUND", "Issue not found", 404);



    if (photos.length === 0 && issue.photos.length === 0) {
      throw new DomainError(
        "PHOTOS_REQUIRED",
        "Upload at least one installation photo before marking complete.",
        422,
      );
    }

    const updated = await completeInstallation({
      issueId: id,
      photos,
      notes: notes || undefined,
      actorId: user.uid,
      actorName: user.name,
    });

    return ok({ issue: updated });
  },
);


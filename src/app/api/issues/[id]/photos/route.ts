import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireUser } from "@/lib/auth/session";
import { ok, handler, DomainError } from "@/lib/api/response";
import { getStorage } from "@/lib/storage";
import { COLLECTIONS } from "@/lib/domain/constants";
import type { IssueRecord, InstallationPhoto } from "@/lib/domain/types";

/**
 * POST /api/issues/[id]/photos — upload one or more installation photos for an
 * issue. Multipart form data with one or more `files` parts.
 *
 * Photos are uploaded through the storage abstraction (Firebase Storage today,
 * swappable later) and returned as {@link InstallationPhoto} refs. This endpoint
 * only stores the files and returns their URLs; marking the issue installed and
 * persisting the photo refs happens in the install route so the two stay in one
 * auditable transaction.
 */

const MAX_FILES = 10;
const MAX_BYTES = 8 * 1024 * 1024; // 8 MB per photo
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/heic"]);

export const POST = handler(
  async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    await requireUser();
    const { id } = await ctx.params;

    // Confirm the issue exists before spending time on uploads.
    const snap = await adminDb().collection(COLLECTIONS.issues).doc(id).get();
    if (!snap.exists) {
      throw new DomainError("NOT_FOUND", "Issue record not found", 404);
    }
    const issue = snap.data() as IssueRecord;



    const form = await req.formData();
    const files = form.getAll("files").filter((f): f is File => f instanceof File);
    if (files.length === 0) {
      throw new DomainError("NO_FILES", "No photos provided", 422);
    }
    if (files.length > MAX_FILES) {
      throw new DomainError(
        "TOO_MANY_FILES",
        `At most ${MAX_FILES} photos per upload.`,
        422,
      );
    }

    const storage = getStorage();
    const uploaded: InstallationPhoto[] = [];
    for (const file of files) {
      if (!ALLOWED.has(file.type)) {
        throw new DomainError(
          "UNSUPPORTED_TYPE",
          `Unsupported image type: ${file.type || "unknown"}.`,
          422,
        );
      }
      if (file.size > MAX_BYTES) {
        throw new DomainError(
          "FILE_TOO_LARGE",
          `${file.name} exceeds the 8 MB limit.`,
          422,
        );
      }
      const buffer = Buffer.from(await file.arrayBuffer());
      const stored = await storage.upload({
        path: `installations/${issue.code}`,
        fileName: file.name || "photo.jpg",
        contentType: file.type,
        data: buffer,
      });
      uploaded.push({
        path: stored.key,
        url: stored.url,
        uploadedAt: new Date().toISOString(),
      });
    }

    return ok({ photos: uploaded }, 201);
  },
);

import { NextRequest } from "next/server";
import { requireArea } from "@/lib/auth/session";
import { ok, handler, DomainError } from "@/lib/api/response";
import { getStorage } from "@/lib/storage";
import { getRepair, addRepairPhotos } from "@/lib/data/repairs";
import type { InstallationPhoto } from "@/lib/domain/types";

/**
 * POST /api/workshop/repairs/[id]/photos: upload repair photos.
 * Multipart form data with one or more `files` parts.
 *
 * Files go through the storage abstraction rather than into the document, so
 * a repair can carry many photos without running into Firestore's 1 MB
 * per-document limit. The refs are attached to the repair on success.
 */

const MAX_FILES = 10;
const MAX_BYTES = 8 * 1024 * 1024; // 8 MB per photo
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/heic"]);

export const POST = handler(
  async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    await requireArea("repairs");
    const { id } = await ctx.params;

    const repair = await getRepair(id);
    if (!repair) {
      throw new DomainError("NOT_FOUND", "Repair not found", 404);
    }

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
        path: `repairs/${repair.code}`,
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

    const updated = await addRepairPhotos(id, uploaded);
    return ok({ repair: updated, photos: uploaded }, 201);
  },
);

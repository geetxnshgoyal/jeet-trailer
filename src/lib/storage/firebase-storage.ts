import { randomUUID } from "crypto";
import { adminStorage } from "@/lib/firebase/admin";
import type { StorageProvider, StoredObject, UploadInput } from "./provider";

/**
 * Firebase Storage implementation of {@link StorageProvider}.
 *
 * Uses the Admin SDK bucket so uploads happen server-side (in API routes)
 * after auth/role checks — clients never write to the bucket directly.
 */
export class FirebaseStorageProvider implements StorageProvider {
  private extensionFor(fileName: string): string {
    const idx = fileName.lastIndexOf(".");
    return idx >= 0 ? fileName.slice(idx) : "";
  }

  async upload(input: UploadInput): Promise<StoredObject> {
    const bucket = adminStorage().bucket();
    const ext = this.extensionFor(input.fileName);
    const key = `${input.path.replace(/\/+$/, "")}/${randomUUID()}${ext}`;
    const file = bucket.file(key);

    const buffer =
      input.data instanceof Blob
        ? Buffer.from(await input.data.arrayBuffer())
        : Buffer.from(input.data);

    // A download token lets us build a stable public URL without making the
    // whole bucket public.
    const token = randomUUID();
    await file.save(buffer, {
      contentType: input.contentType,
      resumable: false,
      metadata: { metadata: { firebaseStorageDownloadTokens: token } },
    });

    return {
      key,
      url: this.buildDownloadUrl(bucket.name, key, token),
      contentType: input.contentType,
      size: buffer.byteLength,
    };
  }

  async remove(key: string): Promise<void> {
    const bucket = adminStorage().bucket();
    await bucket
      .file(key)
      .delete({ ignoreNotFound: true })
      .catch(() => undefined);
  }

  async getUrl(key: string): Promise<string> {
    const bucket = adminStorage().bucket();
    const [metadata] = await bucket.file(key).getMetadata();
    const token = (metadata.metadata as Record<string, string> | undefined)
      ?.firebaseStorageDownloadTokens;
    if (token) return this.buildDownloadUrl(bucket.name, key, token);

    // Fallback: signed URL valid for 1h.
    const [url] = await bucket.file(key).getSignedUrl({
      action: "read",
      expires: Date.now() + 60 * 60 * 1000,
    });
    return url;
  }

  private buildDownloadUrl(bucketName: string, key: string, token: string) {
    const encoded = encodeURIComponent(key);
    return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encoded}?alt=media&token=${token}`;
  }
}

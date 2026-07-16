import "server-only";

/**
 * Provider-agnostic storage interface. The app depends only on this contract;
 * swapping Firebase Storage for S3 or Cloudinary later means adding a new
 * implementation and changing one factory line — no call-site changes.
 */

export interface UploadInput {
  /** Logical folder/prefix, e.g. "installations/ISS-000042". */
  path: string;
  fileName: string;
  contentType: string;
  /** Raw bytes to store. */
  data: Blob | Buffer | Uint8Array;
}

export interface StoredObject {
  /** Provider key/path used for later deletion or URL resolution. */
  key: string;
  url: string;
  contentType: string;
  size: number;
}

export interface StorageProvider {
  upload(input: UploadInput): Promise<StoredObject>;
  remove(key: string): Promise<void>;
  getUrl(key: string): Promise<string>;
}

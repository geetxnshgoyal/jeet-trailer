import type { StorageProvider } from "./provider";
import { FirebaseStorageProvider } from "./firebase-storage";

/**
 * Single place that decides which storage backend the app uses.
 *
 * Swapping to S3 or Cloudinary later means adding a new `StorageProvider`
 * implementation and changing only this factory — nothing else in the app
 * imports a concrete provider.
 */
let cached: StorageProvider | null = null;

export function getStorage(): StorageProvider {
  if (cached) return cached;
  cached = new FirebaseStorageProvider();
  return cached;
}

export type { StorageProvider } from "./provider";

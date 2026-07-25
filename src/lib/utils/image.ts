"use client";

/**
 * Client-side image downscaling.
 *
 * Photos that are stored inline on a document have to fit inside Firestore's
 * 1 MB per-document limit, and base64 inflates bytes by about 37%. A phone
 * photo is several megabytes, so storing one raw guarantees a failed write.
 * Downscaling first keeps a typical shot in the low hundreds of kilobytes,
 * which is plenty for identifying a part or proving an installation.
 */

/** Longest edge, in pixels, after downscaling. */
const MAX_EDGE = 1280;
/** JPEG quality. High enough to read a serial plate, low enough to stay small. */
const QUALITY = 0.72;

export interface CompressedImage {
  /** JPEG data URL, ready to store or preview. */
  dataUrl: string;
  /** Approximate encoded size in bytes, for budget checks. */
  bytes: number;
}

/** Approximate decoded byte length of a base64 data URL. */
export function dataUrlBytes(dataUrl: string): number {
  const comma = dataUrl.indexOf(",");
  const b64 = comma === -1 ? dataUrl : dataUrl.slice(comma + 1);
  const padding = b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((b64.length * 3) / 4) - padding);
}

/**
 * Downscale and re-encode an image file as a JPEG data URL.
 * Falls back to the original bytes if the browser cannot decode the file,
 * so an unusual format degrades rather than silently dropping the photo.
 */
export function compressImage(file: File): Promise<CompressedImage> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read the image file"));
    reader.onload = () => {
      const original = reader.result as string;
      const img = new Image();

      img.onerror = () =>
        resolve({ dataUrl: original, bytes: dataUrlBytes(original) });

      img.onload = () => {
        const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height));
        const width = Math.round(img.width * scale);
        const height = Math.round(img.height * scale);

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve({ dataUrl: original, bytes: dataUrlBytes(original) });
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL("image/jpeg", QUALITY);
        // Keep whichever is smaller: re-encoding a tiny PNG can inflate it.
        const best =
          dataUrlBytes(dataUrl) < dataUrlBytes(original) ? dataUrl : original;
        resolve({ dataUrl: best, bytes: dataUrlBytes(best) });
      };

      img.src = original;
    };
    reader.readAsDataURL(file);
  });
}

/** Human-readable size, e.g. "412 KB". */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

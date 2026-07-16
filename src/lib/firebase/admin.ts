import "server-only";
import {
  initializeApp,
  getApps,
  getApp,
  cert,
  type App,
} from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getStorage, type Storage } from "firebase-admin/storage";
import { serverEnv, useEmulator } from "@/lib/env";

/**
 * Firebase Admin SDK singleton for server-side use only (API routes, server
 * actions, seed scripts). Never import this into a client component.
 *
 * Auth strategy:
 *  - Emulator mode: no real credentials needed; the SDK talks to local
 *    emulators via the FIREBASE_* emulator host env vars set in the process.
 *  - Production: a service account is supplied via the three-field credential
 *    (project id, client email, private key) from the downloaded JSON.
 */

let adminApp: App | undefined;

/**
 * The Storage bucket name. The Admin SDK and the Web SDK share the same
 * bucket, so we reuse the public var rather than duplicating it server-side.
 */
function storageBucket(): string | undefined {
  return process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || undefined;
}

function initAdmin(): App {
  if (adminApp) return adminApp;
  if (getApps().length) {
    adminApp = getApp();
    return adminApp;
  }

  const env = serverEnv();

  if (useEmulator()) {
    // Point the Admin SDK at local emulators. These env vars are read by the
    // SDK internally; set them here so a single flag drives everything.
    process.env.FIRESTORE_EMULATOR_HOST ||= "127.0.0.1:8080";
    process.env.FIREBASE_AUTH_EMULATOR_HOST ||= "127.0.0.1:9099";
    process.env.FIREBASE_STORAGE_EMULATOR_HOST ||= "127.0.0.1:9199";
    adminApp = initializeApp({
      projectId: env.FIREBASE_ADMIN_PROJECT_ID,
      storageBucket: storageBucket(),
    });
    return adminApp;
  }

  const processedKey = env.FIREBASE_ADMIN_PRIVATE_KEY
    .replace(/^"/, "")
    .replace(/"$/, "")
    .replace(/\\\n/g, "\n")
    .replace(/\\n/g, "\n");

  adminApp = initializeApp({
    credential: cert({
      projectId: env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: processedKey,
    }),
    projectId: env.FIREBASE_ADMIN_PROJECT_ID,
    storageBucket: storageBucket(),
  });
  return adminApp;
}

export function adminAuth(): Auth {
  return getAuth(initAdmin());
}

export function adminDb(): Firestore {
  return getFirestore(initAdmin());
}

export function adminStorage(): Storage {
  return getStorage(initAdmin());
}

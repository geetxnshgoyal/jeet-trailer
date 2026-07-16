import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, connectAuthEmulator, type Auth } from "firebase/auth";
import {
  getFirestore,
  connectFirestoreEmulator,
  type Firestore,
} from "firebase/firestore";
import {
  getStorage,
  connectStorageEmulator,
  type FirebaseStorage,
} from "firebase/storage";
import { clientEnv, shouldUseEmulator } from "@/lib/env";

/**
 * Browser Firebase SDK singleton. Safe to import in client components.
 * Emulator wiring is applied once, guarded so HMR does not double-connect.
 */

let app: FirebaseApp | undefined;
let authInstance: Auth | undefined;
let dbInstance: Firestore | undefined;
let storageInstance: FirebaseStorage | undefined;
let emulatorsConnected = false;

function firebaseApp(): FirebaseApp {
  if (app) return app;
  const env = clientEnv();
  const config = {
    apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
  app = getApps().length ? getApp() : initializeApp(config);
  return app;
}

function connectEmulatorsOnce(
  auth: Auth,
  db: Firestore,
  storage: FirebaseStorage,
) {
  if (emulatorsConnected || !shouldUseEmulator()) return;
  emulatorsConnected = true;
  connectAuthEmulator(auth, "http://127.0.0.1:9099", {
    disableWarnings: true,
  });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
  connectStorageEmulator(storage, "127.0.0.1", 9199);
}

export function getFirebaseAuth(): Auth {
  if (!authInstance) authInstance = getAuth(firebaseApp());
  return authInstance;
}

export function getDb(): Firestore {
  if (!dbInstance) dbInstance = getFirestore(firebaseApp());
  return dbInstance;
}

export function getFirebaseStorage(): FirebaseStorage {
  if (!storageInstance) storageInstance = getStorage(firebaseApp());
  return storageInstance;
}

/** Call once from a top-level client provider to wire emulators in dev. */
export function ensureEmulators() {
  connectEmulatorsOnce(getFirebaseAuth(), getDb(), getFirebaseStorage());
}

import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { serverEnv } from "@/lib/env";
import { COLLECTIONS } from "@/lib/domain/constants";
import type { AppUser, Role } from "@/lib/domain/types";

/**
 * Server-side session handling built on Firebase Auth session cookies.
 *
 * Flow: the client signs in with the Web SDK, obtains an ID token, and POSTs it
 * to /api/auth/session. We verify it and mint a long-lived HTTP-only session
 * cookie (see createSessionCookie). Every server request then reads that cookie
 * to resolve the current user — the ID token itself never lives in the browser
 * beyond the initial exchange.
 */

/** Session cookie lifetime: 5 days, in seconds/millis. */
export const SESSION_MAX_AGE_MS = 5 * 24 * 60 * 60 * 1000;

export interface SessionUser {
  uid: string;
  email: string;
  name: string;
  role: Role;
  active: boolean;
}

/** Mint a Firebase session cookie from a freshly-issued ID token. */
export async function createSessionCookie(idToken: string): Promise<{
  value: string;
  maxAgeMs: number;
}> {
  const value = await adminAuth().createSessionCookie(idToken, {
    expiresIn: SESSION_MAX_AGE_MS,
  });
  return { value, maxAgeMs: SESSION_MAX_AGE_MS };
}

export function sessionCookieName(): string {
  return serverEnv().SESSION_COOKIE_NAME;
}

/**
 * Resolve the current user from the session cookie, or null if unauthenticated.
 *
 * Verifies the session cookie (checking for revocation) then loads the mirrored
 * users doc so role/active reflect the latest admin changes, not a stale claim.
 * Wrapped in React `cache` so multiple calls within one request hit Firebase once.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  try {
    const store = await cookies();
    const cookie = store.get(sessionCookieName())?.value;
    if (!cookie) return null;

    const decoded = await adminAuth().verifySessionCookie(cookie, true);
    const snap = await adminDb()
      .collection(COLLECTIONS.users)
      .doc(decoded.uid)
      .get();
    if (!snap.exists) return null;

    const data = snap.data() as AppUser;
    // A disabled worker keeps a valid cookie until expiry; enforce active here.
    if (!data.active) return null;

    return {
      uid: decoded.uid,
      email: data.email,
      name: data.name,
      role: data.role,
      active: data.active,
    };
  } catch {
    // Expired, revoked, or malformed cookie — treat as signed out.
    return null;
  }
});

/** Throw-if-absent variant for server code that requires a user. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new AuthError("UNAUTHENTICATED", "Not signed in");
  return user;
}

/** Require a specific role. Admins implicitly satisfy any worker-level check. */
export async function requireRole(role: Role): Promise<SessionUser> {
  const user = await requireUser();
  if (role === "admin" && user.role !== "admin") {
    throw new AuthError("FORBIDDEN", "Admin access required");
  }
  return user;
}

export class AuthError extends Error {
  constructor(
    public code: "UNAUTHENTICATED" | "FORBIDDEN",
    message: string,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

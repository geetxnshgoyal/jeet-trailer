import { NextRequest } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/domain/constants";
import { createSessionCookie, sessionCookieName } from "@/lib/auth/session";
import { ok, handler, DomainError } from "@/lib/api/response";
import type { AppUser } from "@/lib/domain/types";

const bodySchema = z.object({ idToken: z.string().min(1) });

/**
 * POST /api/auth/session — exchange a freshly-issued ID token for an HTTP-only
 * session cookie. Rejects disabled accounts and users without a mirrored
 * `users` doc (i.e. not provisioned by an admin).
 */
export const POST = handler(async (req: NextRequest) => {
  const { idToken } = bodySchema.parse(await req.json());

  const decoded = await adminAuth().verifyIdToken(idToken);
  const snap = await adminDb()
    .collection(COLLECTIONS.users)
    .doc(decoded.uid)
    .get();

  if (!snap.exists) {
    throw new DomainError(
      "NOT_PROVISIONED",
      "This account has not been set up. Contact an administrator.",
      403,
    );
  }

  const user = snap.data() as AppUser;
  if (!user.active) {
    throw new DomainError(
      "ACCOUNT_DISABLED",
      "This account is disabled. Contact an administrator.",
      403,
    );
  }

  const { value, maxAgeMs } = await createSessionCookie(idToken);
  const store = await cookies();
  store.set(sessionCookieName(), value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(maxAgeMs / 1000),
  });

  return ok({
    user: {
      id: decoded.uid,
      email: user.email,
      name: user.name,
      role: user.role,
    },
  });
});

/** DELETE /api/auth/session — sign out by clearing the cookie. */
export const DELETE = handler(async () => {
  const store = await cookies();
  store.delete(sessionCookieName());
  return ok({ signedOut: true });
});

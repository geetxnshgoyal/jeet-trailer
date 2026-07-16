"use client";

import {
  signInWithEmailAndPassword,
  signOut as fbSignOut,
} from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client";

/**
 * Client-side auth helpers. These wrap the Firebase Web SDK and keep the
 * server session cookie in lock-step with the client sign-in state:
 *
 *  - signIn: authenticate with Firebase, then exchange the ID token for the
 *    HTTP-only session cookie our server routes read.
 *  - signOut: clear the server cookie, then sign out of the Firebase client.
 */

export interface SignedInUser {
  id: string;
  email: string;
  name: string;
  role: "admin" | "worker";
}

/** Map Firebase Auth error codes to friendly, non-leaky messages. */
function friendlyAuthError(code: string): string {
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Incorrect email or password.";
    case "auth/too-many-requests":
      return "Too many attempts. Try again in a few minutes.";
    case "auth/user-disabled":
      return "This account is disabled. Contact an administrator.";
    case "auth/invalid-email":
      return "Enter a valid email address.";
    default:
      return "Unable to sign in. Please try again.";
  }
}

export async function signIn(
  email: string,
  password: string,
): Promise<SignedInUser> {
  const auth = getFirebaseAuth();
  let idToken: string;
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    idToken = await cred.user.getIdToken();
  } catch (err) {
    const code =
      typeof err === "object" && err && "code" in err
        ? String((err as { code: unknown }).code)
        : "";
    throw new Error(friendlyAuthError(code));
  }

  // Exchange the ID token for a server session cookie. If the server rejects
  // the account (not provisioned / disabled), sign back out so client and
  // server never disagree about who is logged in.
  const res = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  if (!res.ok) {
    await fbSignOut(auth).catch(() => undefined);
    const body = await res.json().catch(() => null);
    throw new Error(
      body?.error?.message ?? "Unable to complete sign in. Please try again.",
    );
  }

  const { data } = await res.json();
  return data.user as SignedInUser;
}

export async function signOut(): Promise<void> {
  await fetch("/api/auth/session", { method: "DELETE" }).catch(() => undefined);
  await fbSignOut(getFirebaseAuth()).catch(() => undefined);
}

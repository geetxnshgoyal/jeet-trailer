import { NextRequest } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/domain/constants";
import { createWorkerSchema } from "@/lib/domain/schemas";
import { requireRole } from "@/lib/auth/session";
import { ok, handler, DomainError } from "@/lib/api/response";
import { nowIso } from "@/lib/utils";
import type { AppUser } from "@/lib/domain/types";

/**
 * GET /api/workers — list all users (admin only).
 * Ordered by creation so the roster is stable.
 */
export const GET = handler(async () => {
  await requireRole("admin");
  const snap = await adminDb()
    .collection(COLLECTIONS.users)
    .orderBy("createdAt", "desc")
    .get();
  const workers = snap.docs.map((d) => d.data() as AppUser);
  return ok({ workers });
});

/**
 * POST /api/workers — provision a new worker or admin (admin only).
 *
 * Creates the Firebase Auth account, sets the role custom claim, and mirrors
 * the profile into the `users` collection keyed by UID. Workers cannot
 * self-register, so this is the sole account-creation path.
 */
export const POST = handler(async (req: NextRequest) => {
  await requireRole("admin");
  const input = createWorkerSchema.parse(await req.json());

  let userRecord;
  try {
    userRecord = await adminAuth().createUser({
      email: input.email,
      password: input.password,
      displayName: input.name,
    });
  } catch (err) {
    const code =
      typeof err === "object" && err && "code" in err
        ? String((err as { code: unknown }).code)
        : "";
    if (code === "auth/email-already-exists") {
      throw new DomainError(
        "EMAIL_EXISTS",
        "An account with this email already exists.",
        409,
      );
    }
    throw err;
  }

  await adminAuth().setCustomUserClaims(userRecord.uid, { role: input.role });

  const now = nowIso();
  const user: AppUser = {
    id: userRecord.uid,
    email: input.email,
    name: input.name,
    role: input.role,
    active: true,
    ...(input.phone ? { phone: input.phone } : {}),
    createdAt: now,
    updatedAt: now,
  };
  await adminDb().collection(COLLECTIONS.users).doc(userRecord.uid).set(user);

  return ok({ worker: user }, 201);
});

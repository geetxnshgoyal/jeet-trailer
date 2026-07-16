import { NextRequest } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { requireRole } from "@/lib/auth/session";
import { ok, handler, DomainError } from "@/lib/api/response";
import { updateWorkerSchema } from "@/lib/domain/schemas";
import { COLLECTIONS } from "@/lib/domain/constants";
import { nowIso } from "@/lib/utils";
import type { AppUser } from "@/lib/domain/types";

/**
 * PATCH /api/workers/[id] — update a worker's profile, role, or active state.
 *
 * DELETE is intentionally unsupported: workers are disabled (soft flag), never
 * removed, so their issue history and audit trail remain intact.
 */
export const PATCH = handler(
  async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    await requireRole("admin");
    const { id } = await ctx.params;
    const patch = updateWorkerSchema.parse(await req.json());

    const ref = adminDb().collection(COLLECTIONS.users).doc(id);
    const snap = await ref.get();
    if (!snap.exists) {
      throw new DomainError("NOT_FOUND", "Worker not found", 404);
    }
    const current = snap.data() as AppUser;

    const updates: Partial<AppUser> = { updatedAt: nowIso() };
    if (patch.name !== undefined) updates.name = patch.name;
    if (patch.phone !== undefined) updates.phone = patch.phone;
    if (patch.active !== undefined) updates.active = patch.active;
    if (patch.role !== undefined) updates.role = patch.role;

    await ref.set(updates, { merge: true });

    // Keep the Auth custom claim in sync when the role changes.
    if (patch.role !== undefined && patch.role !== current.role) {
      await adminAuth().setCustomUserClaims(id, { role: patch.role });
    }

    // Disabling is a soft flag in Firestore; also reflect it in Firebase Auth
    // so a disabled account cannot mint new ID tokens.
    if (patch.active !== undefined && patch.active !== current.active) {
      await adminAuth().updateUser(id, { disabled: !patch.active });
    }

    // Echo the applied updates so the client can patch its cache.
    return ok({ id, ...updates });
  },
);

import "server-only";
import { adminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/domain/constants";
import type { Transaction } from "firebase-admin/firestore";

/**
 * Monotonic per-prefix counters used to mint human-facing codes such as
 * TYR-00125 or ISS-000042. Stored in the `counters` collection, one doc per
 * prefix, incremented inside a transaction so concurrent issues/adds never
 * collide on a number.
 */

/**
 * Reserve the next value for `prefix` within an existing transaction and return
 * the formatted code. Must be called after all reads in the transaction (the
 * counter read/write is itself a read+write on the counter doc).
 */
export async function nextCode(
  tx: Transaction,
  prefix: string,
  pad = 5,
): Promise<string> {
  const ref = adminDb().collection(COLLECTIONS.counters).doc(prefix);
  const snap = await tx.get(ref);
  const current = (snap.exists ? (snap.data()?.value as number) : 0) ?? 0;
  const next = current + 1;
  tx.set(ref, { value: next }, { merge: true });
  return `${prefix}-${String(next).padStart(pad, "0")}`;
}

/** Standalone counter increment (its own transaction) for non-transactional callers. */
export async function reserveCode(prefix: string, pad = 5): Promise<string> {
  return adminDb().runTransaction((tx) => nextCode(tx, prefix, pad));
}

import "server-only";
import { adminDb } from "@/lib/firebase/admin";
import { COLLECTIONS, DEFAULT_CATEGORIES } from "@/lib/domain/constants";
import { nowIso, slugify } from "@/lib/utils";
import { DomainError } from "@/lib/api/response";
import type { Category } from "@/lib/domain/types";

/**
 * Category data-access. Categories drive item-code prefixes and whether a
 * category's items are serial-tracked. The seven defaults are seeded on demand
 * and cannot be deleted; admins may add custom categories on top.
 */

function db() {
  return adminDb().collection(COLLECTIONS.categories);
}

export async function listCategories(): Promise<Category[]> {
  const snap = await db().orderBy("name").get();
  return snap.docs.map((d) => d.data() as Category);
}

export async function getCategory(id: string): Promise<Category | null> {
  const snap = await db().doc(id).get();
  return snap.exists ? (snap.data() as Category) : null;
}

/**
 * Create a custom category. Slug must be unique so item-code prefixes and
 * lookups stay unambiguous.
 */
export async function createCategory(input: {
  name: string;
  serialTracked: boolean;
}): Promise<Category> {
  const slug = slugify(input.name);
  const existing = await db().where("slug", "==", slug).limit(1).get();
  if (!existing.empty) {
    throw new DomainError(
      "CATEGORY_EXISTS",
      "A category with a similar name already exists.",
      409,
    );
  }

  const ref = db().doc();
  const now = nowIso();
  const category: Category = {
    id: ref.id,
    name: input.name,
    slug,
    isDefault: false,
    serialTracked: input.serialTracked,
    createdAt: now,
    updatedAt: now,
  };
  await ref.set(category);
  return category;
}

/** Idempotently seed the seven default categories. Returns the count created. */
export async function seedDefaultCategories(): Promise<number> {
  const batch = adminDb().batch();
  const now = nowIso();
  let created = 0;

  for (const def of DEFAULT_CATEGORIES) {
    const existing = await db().where("slug", "==", def.slug).limit(1).get();
    if (!existing.empty) continue;
    const ref = db().doc();
    const category: Category = {
      id: ref.id,
      name: def.name,
      slug: def.slug,
      isDefault: true,
      serialTracked: def.serialTracked,
      createdAt: now,
      updatedAt: now,
    };
    batch.set(ref, category);
    created += 1;
  }

  if (created > 0) await batch.commit();
  return created;
}

import { NextRequest } from "next/server";
import { requireRole, requireUser } from "@/lib/auth/session";
import { ok, handler } from "@/lib/api/response";
import { createCategorySchema } from "@/lib/domain/schemas";
import {
  listCategories,
  createCategory,
  seedDefaultCategories,
} from "@/lib/data/categories";

/**
 * GET /api/categories — list categories (any authenticated user).
 * Seeds the seven defaults on first call so a fresh project is never empty.
 */
export const GET = handler(async () => {
  await requireUser();
  await seedDefaultCategories();
  const categories = await listCategories();
  return ok({ categories });
});

/** POST /api/categories — create a custom category (admin only). */
export const POST = handler(async (req: NextRequest) => {
  await requireRole("admin");
  const input = createCategorySchema.parse(await req.json());
  // Schema exposes `trackable`; the data layer models it as `serialTracked`.
  const category = await createCategory({
    name: input.name,
    serialTracked: input.trackable,
  });
  return ok({ category }, 201);
});

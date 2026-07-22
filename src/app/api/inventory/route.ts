import { NextRequest } from "next/server";
import { requireRole, requireUser } from "@/lib/auth/session";
import { ok, handler, DomainError } from "@/lib/api/response";
import { createItemSchema } from "@/lib/domain/schemas";
import { listItems, createItem } from "@/lib/data/inventory";
import { getCategory } from "@/lib/data/categories";
import type { InventoryItem } from "@/lib/domain/types";

/**
 * GET /api/inventory — list items with optional ?category, ?status, ?search
 * filters. Any authenticated user (admin or worker) may read inventory.
 */
export const GET = handler(async (req: NextRequest) => {
  await requireUser();
  const { searchParams } = new URL(req.url);
  const items = await listItems({
    categoryId: searchParams.get("category") ?? undefined,
    status:
      (searchParams.get("status") as InventoryItem["status"] | null) ??
      undefined,
    search: searchParams.get("search") ?? undefined,
  });
  return ok({ items });
});

/**
 * POST /api/inventory — create an item (admin only).
 * Bridges the API field names (size) to the domain shape (spec) and resolves
 * the category so the item stores its denormalized category name + serial rule.
 */
export const POST = handler(async (req: NextRequest) => {
  const user = await requireRole("admin");
  const input = createItemSchema.parse(await req.json());

  const category = await getCategory(input.categoryId);
  if (!category) {
    throw new DomainError("CATEGORY_NOT_FOUND", "Category not found", 422);
  }

  const item = await createItem({
    category,
    name: input.name,
    brand: input.brand || "",
    supplierName: input.supplierName || undefined,
    invoiceNumber: input.invoiceNumber || undefined,
    purchaseDate: input.purchaseDate || undefined,
    spec: input.size || undefined,
    quantity: input.quantity,
    unit: input.unit,
    lowStockThreshold: input.lowStockThreshold,
    serialNumber: input.serialNumber || undefined,
    remarks: input.remarks || undefined,
    photoBase64: input.photoBase64 || undefined,
    actorId: user.uid,
    actorName: user.name,
  });

  return ok({ item }, 201);
});

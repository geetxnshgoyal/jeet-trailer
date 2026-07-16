import { CategoriesTable } from "@/features/categories/components/categories-table";
import { requireRole } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

/**
 * Categories configuration page (Admin only).
 */
export default async function CategoriesPage() {
  await requireRole("admin");
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Inventory Categories</h1>
        <p className="text-sm text-muted-foreground">
          Configure categories to control parts numbering prefixes and serial-number tracking enforcement rules.
        </p>
      </div>
      <CategoriesTable />
    </div>
  );
}

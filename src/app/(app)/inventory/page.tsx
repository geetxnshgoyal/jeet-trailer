import { InventoryTable } from "@/features/inventory/components/inventory-table";
import { requireUser } from "@/lib/auth/session";

/**
 * Inventory list route. The table is a client component (search, filters, and
 * mutations all live client-side via TanStack Query); this server component is
 * just the mount point so the route participates in the authenticated layout.
 */
export default async function InventoryPage() {
  const user = await requireUser();
  return <InventoryTable canManage={user.role === "admin"} />;
}

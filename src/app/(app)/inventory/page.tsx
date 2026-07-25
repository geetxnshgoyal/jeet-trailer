import { InventoryTable } from "@/features/inventory/components/inventory-table";
import { requireUser } from "@/lib/auth/session";
import { canAccess, landingPath } from "@/lib/domain/permissions";
import { redirect } from "next/navigation";

/**
 * Inventory list route. The table is a client component (search, filters, and
 * mutations all live client-side via TanStack Query); this server component is
 * just the mount point so the route participates in the authenticated layout.
 */
export default async function InventoryPage() {
  const user = await requireUser();
  if (!canAccess(user.role, "inventory")) redirect(landingPath(user.role));
  // Store workers run the stock room day to day, so they manage items too.
  return <InventoryTable canManage={canAccess(user.role, "inventory")} />;
}

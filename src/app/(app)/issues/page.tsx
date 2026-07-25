import { IssuesTable } from "@/features/issues/components/issues-table";
import { requireUser } from "@/lib/auth/session";
import { canAccessInventory } from "@/lib/domain/constants";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/**
 * Issues list route.
 */
export default async function IssuesPage() {
  const user = await requireUser();
  // Workshop accounts have no stock access; send them to their own area.
  if (!canAccessInventory(user.role)) redirect("/workshop");
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Issue Logs & Installations</h1>
        <p className="text-sm text-muted-foreground">
          Track items issued from stock to the workshop floor, log vehicle numbers, and verify installations.
        </p>
      </div>
      <IssuesTable />
    </div>
  );
}

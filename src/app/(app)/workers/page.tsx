import { WorkersTable } from "@/features/workers/components/workers-table";
import { requireRole } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

/**
 * Workers page route (Admin only).
 */
export default async function WorkersPage() {
  await requireRole("admin");
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Workers Roster</h1>
        <p className="text-sm text-muted-foreground">
          Manage personnel accounts, system access permissions, and monitor activity records.
        </p>
      </div>
      <WorkersTable />
    </div>
  );
}

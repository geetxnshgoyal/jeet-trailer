import { redirect } from "next/navigation";
import { GatePassesTable } from "@/features/gate-pass/components/gate-passes-table";
import { requireUser } from "@/lib/auth/session";
import { canAccessInventory } from "@/lib/domain/constants";

export const dynamic = "force-dynamic";

/** Gate pass route. Stock-facing, so workshop accounts are sent away. */
export default async function GatePassPage() {
  const user = await requireUser();
  if (!canAccessInventory(user.role)) redirect("/workshop");

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Gate Pass</h1>
        <p className="text-sm text-muted-foreground">
          Record goods leaving the yard against a voucher. Tyres and rims listed
          on a pass are deducted from stock automatically.
        </p>
      </div>
      <GatePassesTable />
    </div>
  );
}

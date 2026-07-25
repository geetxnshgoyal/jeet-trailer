import { RepairsList } from "@/features/repairs/components/repairs-list";
import { requireUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

/** Workshop repair log. Open to workshop staff, workers and admins. */
export default async function RepairsPage() {
  await requireUser();

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Repairs</h1>
        <p className="text-sm text-muted-foreground">
          Log repair work with photos as proof. Everything is optional, so a job
          can be recorded in seconds.
        </p>
      </div>
      <RepairsList />
    </div>
  );
}

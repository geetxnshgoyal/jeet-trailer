import { WorkshopBoard } from "@/features/workshop/components/workshop-board";
import { requireUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

/**
 * Workshop production-line route.
 */
export default async function WorkshopPage() {
  await requireUser();
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Workshop</h1>
        <p className="text-sm text-muted-foreground">
          Track every chassis as it moves through the production line — who has
          it, what stage it&apos;s at, and what&apos;s done.
        </p>
      </div>
      <WorkshopBoard />
    </div>
  );
}

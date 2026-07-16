import { WorkerDetail } from "@/features/workers/components/worker-detail";
import { requireRole } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

/**
 * Worker detail view route (Admin only).
 */
export default async function WorkerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("admin");
  const { id } = await params;
  return <WorkerDetail id={id} />;
}

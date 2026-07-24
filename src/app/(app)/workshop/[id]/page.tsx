import { TrailerDetail } from "@/features/workshop/components/trailer-detail";
import { requireUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

/**
 * Single trailer build route — stage timeline, actions, and history.
 */
export default async function TrailerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;
  return <TrailerDetail id={id} />;
}

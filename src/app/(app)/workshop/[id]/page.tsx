import { TrailerDetail } from "@/features/workshop/components/trailer-detail";
import { requireUser } from "@/lib/auth/session";
import { canAccess, landingPath } from "@/lib/domain/permissions";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/**
 * Single trailer build route, stage timeline, actions, and history.
 */
export default async function TrailerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  if (!canAccess(user.role, "workshop")) redirect(landingPath(user.role));
  const { id } = await params;
  return <TrailerDetail id={id} />;
}

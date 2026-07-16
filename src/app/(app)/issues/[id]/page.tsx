import { IssueDetail } from "@/features/issues/components/issue-detail";
import { requireUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

/**
 * Single Issue Detail route.
 */
export default async function IssueDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;
  return <IssueDetail id={id} />;
}

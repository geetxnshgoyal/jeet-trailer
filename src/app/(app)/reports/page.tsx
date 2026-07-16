import { ReportsPage } from "@/features/reports/components/reports-page";
import { requireRole } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

/**
 * Reports generation and export page (Admin only).
 */
export default async function ReportsRoute() {
  await requireRole("admin");
  return <ReportsPage />;
}

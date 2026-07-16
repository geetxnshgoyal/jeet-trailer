import { requireUser } from "@/lib/auth/session";
import { DashboardPage } from "@/features/dashboard/components/dashboard-page";

/**
 * Dashboard page route. Resolves authenticated session on server and passes
 * user name to client analytics widgets.
 */
export default async function DashboardRoute() {
  const user = await requireUser();
  return <DashboardPage userName={userNameForDisplay(user.name)} />;
}

function userNameForDisplay(name: string): string {
  return name ? name.split(" ")[0] : "User";
}


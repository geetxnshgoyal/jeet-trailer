import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { landingPath } from "@/lib/domain/permissions";

export const dynamic = "force-dynamic";

/**
 * Root entry. Sends each visitor straight to somewhere they can actually use:
 * only admins have a dashboard, so a fixed redirect there would bounce every
 * other role through a page they are not allowed to see.
 */
export default async function RootPage() {
  const user = await getCurrentUser();
  redirect(user ? landingPath(user.role) : "/login");
}

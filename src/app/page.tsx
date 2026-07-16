import { redirect } from "next/navigation";

/**
 * Root entry. Authenticated users are routed to the dashboard by middleware;
 * unauthenticated users land on the login page. This redirect covers the
 * bare "/" hit before middleware-based routing takes over in phase 2.
 */
export default function RootPage() {
  redirect("/dashboard");
}

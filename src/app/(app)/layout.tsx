import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { AuthProvider } from "@/lib/auth/auth-context";
import { AppShell } from "@/components/layout/app-shell";
import type { SignedInUser } from "@/lib/auth/auth-client";

/**
 * Everything under (app) depends on the per-request session cookie, so it must
 * render dynamically — never statically prerendered at build time.
 */
export const dynamic = "force-dynamic";

/**
 * Authenticated application layout. Resolves the session on the server so the
 * client renders with the user already hydrated (no auth loading flash), then
 * hands off to the shell (sidebar + topbar + content).
 *
 * Middleware also guards these routes, but we re-check here because middleware
 * only inspects cookie presence — this is the authoritative verification.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const initialUser: SignedInUser = {
    id: user.uid,
    email: user.email,
    name: user.name,
    role: user.role,
  };

  return (
    <AuthProvider initialUser={initialUser}>
      <AppShell role={initialUser.role}>{children}</AppShell>
    </AuthProvider>
  );
}

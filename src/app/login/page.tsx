import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { LoginForm } from "@/features/auth/components/login-form";
import { Truck } from "lucide-react";

/**
 * Login screen. Server component: if a valid session already exists we redirect
 * straight to the dashboard so the login form never flashes for signed-in users.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  const { next } = await searchParams;

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      {/* Brand panel — hidden on small screens. */}
      <div className="relative hidden flex-col justify-between bg-sidebar p-12 text-sidebar-foreground lg:flex">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Truck className="size-6" />
          </div>
          <div>
            <p className="text-lg font-semibold text-white">Jeet Trailers</p>
            <p className="text-sm text-sidebar-foreground/70">
              Workshop Inventory System
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <h1 className="text-3xl font-semibold leading-tight text-white">
            Every rim, tyre, and weld —<br />
            tracked from stock to install.
          </h1>
          <p className="max-w-md text-sidebar-foreground/70">
            Digital inventory and installation records for the workshop floor.
            Issue items, log vehicles, and keep a complete audit trail.
          </p>
        </div>

        <p className="text-sm text-sidebar-foreground/50">
          © {new Date().getFullYear()} Jeet Trailers. Internal use only.
        </p>
      </div>

      {/* Form panel. */}
      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <div className="mb-3 flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Truck className="size-6" />
            </div>
            <p className="text-lg font-semibold">Jeet Trailers</p>
          </div>

          <h2 className="text-2xl font-semibold tracking-tight">Sign in</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter your credentials to access the workshop system.
          </p>

          <div className="mt-8">
            <LoginForm next={next} />
          </div>
        </div>
      </div>
    </div>
  );
}

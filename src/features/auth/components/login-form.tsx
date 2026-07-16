"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Truck } from "lucide-react";
import { toast } from "sonner";
import type { z } from "zod";
import { loginSchema } from "@/lib/domain/schemas";
import { signIn } from "@/lib/auth/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type LoginValues = z.infer<typeof loginSchema>;

/**
 * Login form. Lives on the public /login route which sits OUTSIDE the
 * AuthProvider tree, so it calls the client sign-in helper directly rather
 * than going through useAuth(). On success it does a full navigation to the
 * post-login destination so server components re-resolve the fresh session.
 */
export function LoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginValues) {
    setSubmitting(true);
    try {
      const user = await signIn(values.email, values.password);
      toast.success(`Welcome back, ${user.name}`);
      // Respect a ?next= redirect target, but only if it is a same-site path.
      const dest = next && next.startsWith("/") ? next : "/dashboard";
      router.replace(dest);
      router.refresh();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to sign in.";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="you@jeettrailers.com"
          aria-invalid={!!errors.email}
          {...register("email")}
        />
        {errors.email && (
          <p className="text-sm text-destructive">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          aria-invalid={!!errors.password}
          {...register("password")}
        />
        {errors.password && (
          <p className="text-sm text-destructive">{errors.password.message}</p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Signing in…
          </>
        ) : (
          <>
            <Truck className="size-4" />
            Sign in
          </>
        )}
      </Button>
    </form>
  );
}

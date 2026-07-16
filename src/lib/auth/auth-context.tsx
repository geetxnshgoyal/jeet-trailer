"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  signIn as clientSignIn,
  signOut as clientSignOut,
  type SignedInUser,
} from "@/lib/auth/auth-client";

/**
 * Client auth context. The authoritative session lives in the HTTP-only cookie
 * read on the server; this context holds the hydrated user for the current
 * client render so components can branch on role without a round-trip.
 *
 * The initial user is provided by a server component (layout) that has already
 * resolved the session, so there is no loading flash on first paint.
 */

interface AuthContextValue {
  user: SignedInUser | null;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<SignedInUser>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
  initialUser,
  children,
}: {
  initialUser: SignedInUser | null;
  children: ReactNode;
}) {
  const [user, setUser] = useState<SignedInUser | null>(initialUser);
  const router = useRouter();

  const signIn = useCallback(
    async (email: string, password: string) => {
      const signedIn = await clientSignIn(email, password);
      setUser(signedIn);
      return signedIn;
    },
    [],
  );

  const signOut = useCallback(async () => {
    await clientSignOut();
    setUser(null);
    // Full navigation so server components re-resolve the (now absent) session.
    router.replace("/login");
    router.refresh();
  }, [router]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, isAdmin: user?.role === "admin", signIn, signOut }),
    [user, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}

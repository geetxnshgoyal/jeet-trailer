"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { Toaster } from "sonner";

/**
 * Global client providers: TanStack Query for server-state, and Sonner for
 * toast notifications. Kept in one place so the root layout stays a Server
 * Component (it only renders this wrapper).
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Workshop data changes often but not every second — a short stale
            // window avoids refetch storms while keeping tables fresh.
            staleTime: 30_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster
        position="top-right"
        richColors
        closeButton
        toastOptions={{ duration: 3500 }}
      />
    </QueryClientProvider>
  );
}

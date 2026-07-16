"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import type { DashboardStats } from "@/lib/data/stats";

export function useDashboardStats() {
  return useQuery({
    queryKey: ["dashboard", "stats"],
    queryFn: () => api.get<{ stats: DashboardStats }>("/api/dashboard"),
    select: (d) => d.stats,
    refetchInterval: 60 * 1000, // auto-refresh stats every 60s
  });
}

"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import type { TrailerRecord, TrailerHistoryEvent } from "@/lib/domain/types";

export const trailerKeys = {
  all: ["trailers"] as const,
  list: (filter: Record<string, string | undefined>) =>
    ["trailers", "list", filter] as const,
  detail: (id: string) => ["trailers", "detail", id] as const,
};

export interface TrailersFilter {
  status?: string;
  /** "me" resolves to the session user server-side. */
  workerId?: string;
  search?: string;
}

function toQueryString(filter: TrailersFilter): string {
  const params = new URLSearchParams();
  if (filter.status) params.set("status", filter.status);
  if (filter.workerId) params.set("workerId", filter.workerId);
  if (filter.search) params.set("search", filter.search);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export function useTrailers(filter: TrailersFilter) {
  return useQuery({
    queryKey: trailerKeys.list(filter as Record<string, string | undefined>),
    queryFn: () =>
      api.get<{ trailers: TrailerRecord[] }>(
        `/api/workshop/trailers${toQueryString(filter)}`,
      ),
    select: (d) => d.trailers,
  });
}

export function useTrailer(id: string) {
  return useQuery({
    queryKey: trailerKeys.detail(id),
    queryFn: () =>
      api.get<{ trailer: TrailerRecord; history: TrailerHistoryEvent[] }>(
        `/api/workshop/trailers/${id}`,
      ),
    enabled: !!id,
  });
}

export function useCreateTrailer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      chassisNumber?: string;
      model?: string;
      description?: string;
      stages: { name: string; workerId?: string }[];
    }) =>
      api.post<{ trailer: TrailerRecord }>("/api/workshop/trailers", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: trailerKeys.all });
    },
  });
}

export function useTrailerStageAction(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { action: "start" | "complete"; notes?: string }) =>
      api.post<{ trailer: TrailerRecord }>(
        `/api/workshop/trailers/${id}/stage`,
        body,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: trailerKeys.all });
    },
  });
}

export function useAssignStageWorker(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { stageIndex: number; workerId: string }) =>
      api.post<{ trailer: TrailerRecord }>(
        `/api/workshop/trailers/${id}/assign`,
        body,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: trailerKeys.all });
    },
  });
}

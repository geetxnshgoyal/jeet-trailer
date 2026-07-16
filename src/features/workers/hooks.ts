"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import type { AppUser, IssueRecord } from "@/lib/domain/types";

export const workerKeys = {
  all: ["workers"] as const,
  list: ["workers", "list"] as const,
  detail: (id: string) => ["workers", "detail", id] as const,
  issues: (id: string) => ["workers", "issues", id] as const,
};

export function useWorkers() {
  return useQuery({
    queryKey: workerKeys.list,
    queryFn: () => api.get<{ workers: AppUser[] }>("/api/workers"),
    select: (d) => d.workers,
  });
}

export function useWorker(id: string) {
  const { data: workers } = useWorkers();
  return useQuery({
    queryKey: workerKeys.detail(id),
    queryFn: () => {
      const found = workers?.find(w => w.id === id);
      if (found) return found;
      // Fallback: workers list is loaded, if not found or list is empty, fetch all to find it
      return api.get<{ workers: AppUser[] }>("/api/workers").then(res => {
        return res.workers.find(w => w.id === id) || null;
      });
    },
    enabled: !!id,
  });
}

export function useWorkerIssues(id: string) {
  return useQuery({
    queryKey: workerKeys.issues(id),
    queryFn: () => api.get<{ issues: IssueRecord[] }>(`/api/issues?workerId=${id}`),
    select: (d) => d.issues,
    enabled: !!id,
  });
}

export function useCreateWorker() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api.post<{ worker: AppUser }>("/api/workers", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: workerKeys.all });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useUpdateWorker(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api.patch<{ worker: AppUser }>(`/api/workers/${id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: workerKeys.all });
      qc.invalidateQueries({ queryKey: workerKeys.detail(id) });
    },
  });
}

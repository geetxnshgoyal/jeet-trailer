"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import type { IssueRecord, AppUser, InventoryItem } from "@/lib/domain/types";

export const issueKeys = {
  all: ["issues"] as const,
  list: (filter: Record<string, string | undefined>) =>
    ["issues", "list", filter] as const,
  detail: (id: string) => ["issues", "detail", id] as const,
};

export interface IssuesFilter {
  workerId?: string;
  status?: string;
  vehicleNumber?: string;
  search?: string;
}

function toQueryString(filter: IssuesFilter): string {
  const params = new URLSearchParams();
  if (filter.workerId) params.set("workerId", filter.workerId);
  if (filter.status) params.set("status", filter.status);
  if (filter.vehicleNumber) params.set("vehicleNumber", filter.vehicleNumber);
  if (filter.search) params.set("search", filter.search);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export function useIssues(filter: IssuesFilter) {
  return useQuery({
    queryKey: issueKeys.list(filter as Record<string, string | undefined>),
    queryFn: () =>
      api.get<{ issues: IssueRecord[] }>(`/api/issues${toQueryString(filter)}`),
    select: (d) => d.issues,
  });
}

export function useIssue(id: string) {
  return useQuery({
    queryKey: issueKeys.detail(id),
    queryFn: () => api.get<{ issue: IssueRecord }>(`/api/issues/${id}`),
    select: (d) => d.issue,
    enabled: !!id,
  });
}

export function useCreateIssue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      itemId: string;
      quantity: number;
      vehicleNumber: string;
      serialNumber?: string;
      notes?: string;
    }) => api.post<{ issue: IssueRecord }>("/api/issues", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: issueKeys.all });
      qc.invalidateQueries({ queryKey: ["inventory"] }); // invalidate inventory list/details
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useCompleteInstallation(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { notes?: string }) =>
      api.post<{ issue: IssueRecord }>(`/api/issues/${id}/install`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: issueKeys.all });
      qc.invalidateQueries({ queryKey: issueKeys.detail(id) });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useUploadPhotos(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (files: File[]) => {
      const formData = new FormData();
      files.forEach((file) => formData.append("files", file));
      
      const res = await fetch(`/api/issues/${id}/photos`, {
        method: "POST",
        body: formData,
      });

      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error?.message || "Upload failed");
      }
      return body.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: issueKeys.detail(id) });
    },
  });
}

export function useWorkersList() {
  return useQuery({
    queryKey: ["workers"],
    queryFn: () => api.get<{ workers: AppUser[] }>("/api/workers"),
    select: (d) => d.workers,
  });
}

export function useInventoryForIssues() {
  return useQuery({
    queryKey: ["inventory", "simple-list"],
    queryFn: () => api.get<{ items: InventoryItem[] }>("/api/inventory"),
    select: (d) => d.items.filter(item => item.quantity > 0),
  });
}

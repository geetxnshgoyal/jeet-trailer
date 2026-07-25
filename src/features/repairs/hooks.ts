"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import type { RepairRecord } from "@/lib/domain/types";

export const repairKeys = {
  all: ["repairs"] as const,
  list: (filter: Record<string, string | undefined>) =>
    ["repairs", "list", filter] as const,
};

export function useRepairs(filter: { search?: string; workerId?: string }) {
  const params = new URLSearchParams();
  if (filter.search) params.set("search", filter.search);
  if (filter.workerId) params.set("workerId", filter.workerId);
  const qs = params.toString();

  return useQuery({
    queryKey: repairKeys.list(filter as Record<string, string | undefined>),
    queryFn: () =>
      api.get<{ repairs: RepairRecord[] }>(
        `/api/workshop/repairs${qs ? `?${qs}` : ""}`,
      ),
    select: (d) => d.repairs,
  });
}

/**
 * Log a repair, then upload its photos against the new id.
 *
 * Photos need the record to exist first, so this is two calls: if the upload
 * fails the repair is still saved, which is the right way round for a floor
 * log where losing the entry would be worse than losing the pictures.
 */
export function useCreateRepair() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      vehicleNumber?: string;
      chassisNumber?: string;
      partyName?: string;
      description?: string;
      cost?: number;
      files?: File[];
    }) => {
      const { files, ...body } = input;
      const { repair } = await api.post<{ repair: RepairRecord }>(
        "/api/workshop/repairs",
        body,
      );

      if (!files || files.length === 0) return { repair, photoError: null };

      const formData = new FormData();
      files.forEach((file) => formData.append("files", file));
      const res = await fetch(`/api/workshop/repairs/${repair.id}/photos`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        return {
          repair,
          photoError: payload?.error?.message || "Photo upload failed",
        };
      }
      const payload = await res.json();
      return { repair: payload.data.repair as RepairRecord, photoError: null };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: repairKeys.all });
    },
  });
}

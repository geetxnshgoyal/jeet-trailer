"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import type {
  InventoryItem,
  Category,
  ItemHistoryEvent,
} from "@/lib/domain/types";

/**
 * TanStack Query hooks for the inventory module. Query keys are structured so
 * a single item edit / stock change can invalidate both the list and that
 * item's detail + history without over-fetching.
 */

export const inventoryKeys = {
  all: ["inventory"] as const,
  list: (filter: Record<string, string | undefined>) =>
    ["inventory", "list", filter] as const,
  detail: (id: string) => ["inventory", "detail", id] as const,
  history: (id: string) => ["inventory", "history", id] as const,
  categories: ["categories"] as const,
};

export interface InventoryFilter {
  categoryId?: string;
  status?: string;
  search?: string;
}

function toQueryString(filter: InventoryFilter): string {
  const params = new URLSearchParams();
  if (filter.categoryId) params.set("categoryId", filter.categoryId);
  if (filter.status) params.set("status", filter.status);
  if (filter.search) params.set("search", filter.search);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export function useInventory(filter: InventoryFilter) {
  return useQuery({
    queryKey: inventoryKeys.list(filter as Record<string, string | undefined>),
    queryFn: () =>
      api.get<{ items: InventoryItem[] }>(
        `/api/inventory${toQueryString(filter)}`,
      ),
    select: (d) => d.items,
  });
}

export function useCategories() {
  return useQuery({
    queryKey: inventoryKeys.categories,
    queryFn: () => api.get<{ categories: Category[] }>("/api/categories"),
    select: (d) => d.categories,
    staleTime: 5 * 60 * 1000, // categories change rarely
  });
}

export function useItem(id: string) {
  return useQuery({
    queryKey: inventoryKeys.detail(id),
    queryFn: () => api.get<{ item: InventoryItem }>(`/api/inventory/${id}`),
    select: (d) => d.item,
    enabled: !!id,
  });
}

export function useItemHistory(id: string) {
  return useQuery({
    queryKey: inventoryKeys.history(id),
    queryFn: () =>
      api.get<{ history: ItemHistoryEvent[] }>(
        `/api/inventory/${id}/history`,
      ),
    select: (d) => d.history,
    enabled: !!id,
  });
}

export function useCreateItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api.post<{ item: InventoryItem }>("/api/inventory", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: inventoryKeys.all }),
  });
}

export function useUpdateItem(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api.patch<{ item: InventoryItem }>(`/api/inventory/${id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: inventoryKeys.all });
      qc.invalidateQueries({ queryKey: inventoryKeys.detail(id) });
    },
  });
}

export function useAdjustStock(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { delta: number; reason: string }) =>
      api.post<{ item: InventoryItem }>(`/api/inventory/${id}/stock`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: inventoryKeys.all });
      qc.invalidateQueries({ queryKey: inventoryKeys.detail(id) });
      qc.invalidateQueries({ queryKey: inventoryKeys.history(id) });
    },
  });
}

export function useDeleteItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del<{ deleted: boolean }>(`/api/inventory/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: inventoryKeys.all }),
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; trackable: boolean }) =>
      api.post<{ category: Category }>("/api/categories", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: inventoryKeys.categories }),
  });
}

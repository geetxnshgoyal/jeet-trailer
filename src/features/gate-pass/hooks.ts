"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import {
  GATE_PASS_TYRE_CATEGORIES,
  GATE_PASS_RIM_CATEGORIES,
} from "@/lib/domain/constants";
import type { GatePassRecord, InventoryItem } from "@/lib/domain/types";

export const gatePassKeys = {
  all: ["gate-passes"] as const,
  list: (filter: Record<string, string | undefined>) =>
    ["gate-passes", "list", filter] as const,
  detail: (id: string) => ["gate-passes", "detail", id] as const,
};

export function useGatePasses(filter: { search?: string }) {
  const params = new URLSearchParams();
  if (filter.search) params.set("search", filter.search);
  const qs = params.toString();

  return useQuery({
    queryKey: gatePassKeys.list(filter as Record<string, string | undefined>),
    queryFn: () =>
      api.get<{ gatePasses: GatePassRecord[] }>(
        `/api/gate-passes${qs ? `?${qs}` : ""}`,
      ),
    select: (d) => d.gatePasses,
  });
}

export function useGatePass(id: string) {
  return useQuery({
    queryKey: gatePassKeys.detail(id),
    queryFn: () =>
      api.get<{ gatePass: GatePassRecord }>(`/api/gate-passes/${id}`),
    select: (d) => d.gatePass,
    enabled: !!id,
  });
}

export function useCreateGatePass() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      voucherNumber: string;
      partyName: string;
      trailerChassisNumber?: string;
      trailerSize?: string;
      tyreItemId?: string;
      tyreQuantity?: number;
      rimItemId?: string;
      rimQuantity?: number;
      color?: string;
      paymentMethod?: string;
      notes?: string;
    }) => api.post<{ gatePass: GatePassRecord }>("/api/gate-passes", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: gatePassKeys.all });
      // A pass moves stock, so anything showing quantities is now stale.
      qc.invalidateQueries({ queryKey: ["inventory"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

/**
 * Tyre and rim stock available to a gate pass.
 *
 * Brands are never typed by hand: the dropdowns are built from inventory, so
 * a pass can only ever reference stock that actually exists. Items at zero
 * are excluded since they cannot be issued.
 */
export function useGatePassStock() {
  const query = useQuery({
    queryKey: ["inventory", "gate-pass-stock"],
    queryFn: () => api.get<{ items: InventoryItem[] }>("/api/inventory"),
  });

  const inStock = (query.data?.items ?? []).filter((i) => i.quantity > 0);
  const matches = (item: InventoryItem, names: string[]) =>
    names.includes((item.categoryName || "").trim().toLowerCase());

  return {
    ...query,
    tyres: inStock.filter((i) => matches(i, GATE_PASS_TYRE_CATEGORIES)),
    rims: inStock.filter((i) => matches(i, GATE_PASS_RIM_CATEGORIES)),
  };
}

/** Label shown in the brand dropdowns, matching the stored gate pass label. */
export function describeStockItem(item: InventoryItem): string {
  const parts = [item.brand, item.model].filter(Boolean).join(" ").trim();
  const base = parts || item.name;
  return item.spec ? `${base} (${item.spec})` : base;
}

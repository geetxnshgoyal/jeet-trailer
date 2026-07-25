"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus, Search, FileOutput } from "lucide-react";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { useGatePasses } from "../hooks";
import { GatePassFormDialog } from "./gate-pass-form-dialog";
import { DataTable } from "@/components/common/data-table";
import { EmptyState } from "@/components/common/empty-state";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import type { GatePassRecord } from "@/lib/domain/types";

export function GatePassesTable() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const { data: passes, isLoading } = useGatePasses({
    search: debouncedSearch || undefined,
  });

  const columns = useMemo<ColumnDef<GatePassRecord>[]>(
    () => [
      {
        accessorKey: "voucherNumber",
        header: "Voucher",
        cell: ({ row }) => (
          <span className="font-mono text-sm font-medium text-primary">
            {row.original.voucherNumber}
          </span>
        ),
      },
      {
        accessorKey: "partyName",
        header: "Party",
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate font-medium">{row.original.partyName}</p>
            {row.original.trailerChassisNumber && (
              <p className="truncate font-mono text-xs text-muted-foreground">
                {row.original.trailerChassisNumber}
              </p>
            )}
          </div>
        ),
      },
      {
        id: "stock",
        header: "Stock Issued",
        cell: ({ row }) => {
          const { tyre, rim } = row.original;
          if (!tyre && !rim) {
            return <span className="text-xs text-muted-foreground">-</span>;
          }
          return (
            <div className="space-y-0.5 text-xs">
              {tyre && (
                <p>
                  <span className="font-medium text-foreground">
                    {tyre.quantity}
                  </span>{" "}
                  <span className="text-muted-foreground">
                    tyre · {tyre.label}
                  </span>
                </p>
              )}
              {rim && (
                <p>
                  <span className="font-medium text-foreground">
                    {rim.quantity}
                  </span>{" "}
                  <span className="text-muted-foreground">
                    rim · {rim.label}
                  </span>
                </p>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "trailerSize",
        header: "Size",
        cell: ({ row }) => (
          <span className="text-sm">{row.original.trailerSize || "-"}</span>
        ),
      },
      {
        accessorKey: "paymentMethod",
        header: "Payment",
        cell: ({ row }) => (
          <span className="text-sm">{row.original.paymentMethod || "-"}</span>
        ),
      },
      {
        accessorKey: "createdAt",
        header: "Date",
        cell: ({ row }) => (
          <span className="text-xs tabular-nums text-muted-foreground">
            {formatDate(row.original.createdAt)}
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search voucher, party, chassis..."
            className="pl-9"
          />
        </div>
        <GatePassFormDialog
          trigger={
            <Button className="w-full sm:w-auto">
              <Plus className="size-4" />
              New Gate Pass
            </Button>
          }
        />
      </div>

      {!isLoading && passes && passes.length === 0 ? (
        <EmptyState
          icon={FileOutput}
          title="No gate passes yet"
          description={
            search
              ? "Try a different search."
              : "Issue a pass when goods leave the yard. Stock is deducted automatically."
          }
        />
      ) : (
        <DataTable columns={columns} data={passes ?? []} loading={isLoading} />
      )}
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus, Search, Package } from "lucide-react";
import { useInventory, useCategories } from "../hooks";
import { StockStatusBadge } from "./stock-status-badge";
import { ItemFormDialog } from "./item-form-dialog";
import { DataTable } from "@/components/common/data-table";
import { EmptyState } from "@/components/common/empty-state";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { InventoryItem } from "@/lib/domain/types";

const ALL = "all";

/**
 * Inventory browser: debounced text search plus category/status filters, over a
 * sortable table. Search and status/category are applied server-side (see the
 * inventory data layer); the text box is debounced to avoid a request per
 * keystroke. Admins get an "Add item" action; workers see the same table
 * read-only (the add action is gated by the `canManage` prop).
 */
export function InventoryTable({ canManage }: { canManage: boolean }) {
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<string>(ALL);
  const [status, setStatus] = useState<string>(ALL);
  const debouncedSearch = useDebouncedValue(search, 300);

  const { data: categories } = useCategories();
  const { data: items, isLoading } = useInventory({
    search: debouncedSearch || undefined,
    categoryId: categoryId === ALL ? undefined : categoryId,
    status: status === ALL ? undefined : status,
  });

  const columns = useMemo<ColumnDef<InventoryItem>[]>(
    () => [
      {
        accessorKey: "code",
        header: "Code",
        cell: ({ row }) => (
          <Link
            href={`/inventory/${row.original.id}`}
            className="font-mono text-sm font-medium text-primary hover:underline"
          >
            {row.original.code}
          </Link>
        ),
      },
      {
        accessorKey: "name",
        header: "Item",
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate font-medium">{row.original.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {row.original.brand}
              {row.original.spec ? ` · ${row.original.spec}` : ""}
            </p>
          </div>
        ),
      },
      { accessorKey: "categoryName", header: "Category" },
      {
        accessorKey: "serialNumber",
        header: "Serial",
        cell: ({ row }) =>
          row.original.serialNumber ? (
            <span className="font-mono text-xs">
              {row.original.serialNumber}
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        accessorKey: "quantity",
        header: "Qty",
        cell: ({ row }) => (
          <span className="tabular-nums">
            {row.original.quantity}{" "}
            <span className="text-xs text-muted-foreground">
              {row.original.unit}
            </span>
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <StockStatusBadge status={row.original.status} />,
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
            placeholder="Search name, code, brand, serial…"
            className="pl-9"
          />
        </div>
        <Select value={categoryId} onValueChange={setCategoryId}>
          <SelectTrigger className="sm:w-48">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All categories</SelectItem>
            {categories?.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="sm:w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All status</SelectItem>
            <SelectItem value="in_stock">In stock</SelectItem>
            <SelectItem value="low_stock">Low stock</SelectItem>
            <SelectItem value="out_of_stock">Out of stock</SelectItem>
          </SelectContent>
        </Select>
        {canManage && (
          <ItemFormDialog
            trigger={
              <Button>
                <Plus className="size-4" />
                Add item
              </Button>
            }
          />
        )}
      </div>

      {!isLoading && items && items.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No items found"
          description={
            search || categoryId !== ALL || status !== ALL
              ? "Try adjusting your filters."
              : "Get started by adding your first inventory item."
          }
        />
      ) : (
        <DataTable
          columns={columns}
          data={items ?? []}
          loading={isLoading}
        />
      )}
    </div>
  );
}

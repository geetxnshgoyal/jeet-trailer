"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus, Search, Package, LayoutGrid, List } from "lucide-react";
import { useInventory, useCategories } from "../hooks";
import { StockStatusBadge } from "./stock-status-badge";
import { ItemFormDialog } from "./item-form-dialog";
import { DataTable } from "@/components/common/data-table";
import { EmptyState } from "@/components/common/empty-state";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
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

        <div className="flex items-center gap-1 border border-input p-0.5 rounded-lg bg-muted/40">
          <Button
            variant={viewMode === "table" ? "secondary" : "ghost"}
            size="icon"
            onClick={() => setViewMode("table")}
            className="h-9 w-9 p-0"
            title="Table View"
            type="button"
          >
            <List className="size-4" />
          </Button>
          <Button
            variant={viewMode === "grid" ? "secondary" : "ghost"}
            size="icon"
            onClick={() => setViewMode("grid")}
            className="h-9 w-9 p-0"
            title="Grid View"
            type="button"
          >
            <LayoutGrid className="size-4" />
          </Button>
        </div>

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
      ) : viewMode === "grid" ? (
        isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, idx) => (
              <div key={idx} className="space-y-3 rounded-xl border border-border p-4 bg-card">
                <Skeleton className="aspect-video w-full rounded-lg" />
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {items?.map((item) => (
              <Link
                key={item.id}
                href={`/inventory/${item.id}`}
                className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md"
              >
                <div className="relative aspect-video w-full overflow-hidden bg-muted flex items-center justify-center border-b border-border">
                  {item.photoBase64 ? (
                    <img
                      src={item.photoBase64}
                      alt={item.name}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <Package className="size-10 text-muted-foreground/45 transition-transform duration-300 group-hover:scale-110" />
                  )}
                  <div className="absolute right-2 top-2">
                    <StockStatusBadge status={item.status} />
                  </div>
                </div>
                <div className="p-4 flex-1 flex flex-col justify-between space-y-2">
                  <div>
                    <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">{item.code}</p>
                    <div className="min-w-0 mt-0.5">
                      <h3 className="truncate font-semibold text-sm group-hover:text-primary transition-colors">
                        {item.name}
                      </h3>
                      <p className="truncate text-xs text-muted-foreground mt-0.5">
                        {item.brand}
                        {item.spec ? ` · ${item.spec}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2 pt-2">
                    <div className="flex items-baseline justify-between text-xs border-t border-border/60 pt-2">
                      <span className="text-muted-foreground">Quantity</span>
                      <span className="font-semibold tabular-nums text-sm">
                        {item.quantity}{" "}
                        <span className="text-xs font-normal text-muted-foreground">
                          {item.unit}
                        </span>
                      </span>
                    </div>
                    {item.serialNumber && (
                      <div className="flex items-center justify-between text-[11px] bg-muted/50 px-2 py-1 rounded">
                        <span className="text-muted-foreground">Serial</span>
                        <span className="font-mono text-foreground font-medium">
                          {item.serialNumber}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )
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

"use client";

import { useMemo } from "react";
import { Plus, Tags, ShieldAlert, KeyRound } from "lucide-react";
import { useCategories } from "@/features/inventory/hooks";
import { CategoryFormDialog } from "./category-form-dialog";
import { DataTable } from "@/components/common/data-table";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Category } from "@/lib/domain/types";
import { formatDate } from "@/lib/utils";
import type { ColumnDef } from "@tanstack/react-table";

export function CategoriesTable() {
  const { data: categories, isLoading } = useCategories();

  const columns = useMemo<ColumnDef<Category>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => (
          <span className="font-semibold text-foreground flex items-center gap-2">
            {row.original.name}
            {row.original.isDefault && (
              <Badge variant="secondary" className="text-[10px] py-0 px-1.5 h-4 font-normal bg-muted">
                System Default
              </Badge>
            )}
          </span>
        ),
      },
      {
        accessorKey: "slug",
        header: "Slug / Identifier",
        cell: ({ row }) => <span className="font-mono text-xs text-muted-foreground">{row.original.slug}</span>,
      },
      {
        accessorKey: "serialTracked",
        header: "Tracking Mode",
        cell: ({ row }) => (
          <Badge variant={row.original.serialTracked ? "default" : "outline"} className="capitalize">
            {row.original.serialTracked ? "Serial Number" : "Quantity Only"}
          </Badge>
        ),
      },
      {
        accessorKey: "createdAt",
        header: "Created On",
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground tabular-nums">
            {formatDate(row.original.createdAt)}
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Showing {categories?.length || 0} inventory categories
        </div>
        <CategoryFormDialog
          trigger={
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" /> Add Category
            </Button>
          }
        />
      </div>

      {!isLoading && categories && categories.length === 0 ? (
        <EmptyState
          icon={Tags}
          title="No categories found"
          description="Create a custom category or wait for defaults to seed."
        />
      ) : (
        <DataTable
          columns={columns}
          data={categories ?? []}
          loading={isLoading}
        />
      )}
    </div>
  );
}

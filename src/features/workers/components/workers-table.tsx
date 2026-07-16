"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Plus, Pencil, Users, Shield, User } from "lucide-react";
import { useWorkers } from "../hooks";
import { WorkerFormDialog } from "./worker-form-dialog";
import { DataTable } from "@/components/common/data-table";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { AppUser } from "@/lib/domain/types";
import { formatDate } from "@/lib/utils";
import type { ColumnDef } from "@tanstack/react-table";

export function WorkersTable() {
  const { data: workers, isLoading } = useWorkers();

  const columns = useMemo<ColumnDef<AppUser>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => (
          <Link
            href={`/workers/${row.original.id}`}
            className="font-medium text-foreground hover:underline hover:text-primary flex items-center gap-2"
          >
            {row.original.role === "admin" ? (
              <Shield className="h-3.5 w-3.5 text-primary shrink-0" />
            ) : (
              <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            )}
            {row.original.name}
          </Link>
        ),
      },
      {
        accessorKey: "email",
        header: "Email",
      },
      {
        accessorKey: "phone",
        header: "Phone",
        cell: ({ row }) => row.original.phone || <span className="text-muted-foreground">—</span>,
      },
      {
        accessorKey: "role",
        header: "Role",
        cell: ({ row }) => (
          <Badge variant={row.original.role === "admin" ? "default" : "secondary"} className="capitalize">
            {row.original.role}
          </Badge>
        ),
      },
      {
        accessorKey: "active",
        header: "Status",
        cell: ({ row }) => (
          <Badge
            variant="outline"
            className={
              row.original.active
                ? "border-success text-success bg-success/5"
                : "border-destructive text-destructive bg-destructive/5"
            }
          >
            {row.original.active ? "Active" : "Disabled"}
          </Badge>
        ),
      },
      {
        accessorKey: "createdAt",
        header: "Provisioned On",
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground tabular-nums">
            {formatDate(row.original.createdAt)}
          </span>
        ),
      },
      {
        id: "actions",
        cell: ({ row }) => (
          <div className="flex justify-end">
            <WorkerFormDialog
              worker={row.original}
              trigger={
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Pencil className="h-4 w-4" />
                  <span className="sr-only">Edit worker settings</span>
                </Button>
              }
            />
          </div>
        ),
      },
    ],
    [],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Showing {workers?.length || 0} registered personnel
        </div>
        <WorkerFormDialog
          trigger={
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" /> Add Worker
            </Button>
          }
        />
      </div>

      {!isLoading && workers && workers.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No workers provisioned"
          description="Provision your first worker account to get started."
        />
      ) : (
        <DataTable
          columns={columns}
          data={workers ?? []}
          loading={isLoading}
        />
      )}
    </div>
  );
}

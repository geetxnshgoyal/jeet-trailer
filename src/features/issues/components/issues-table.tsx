"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus, Search, ClipboardList } from "lucide-react";
import { useIssues, useWorkersList } from "../hooks";
import { IssueStatusBadge } from "./issue-status-badge";
import { IssueFormDialog } from "./issue-form-dialog";
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
import type { IssueRecord } from "@/lib/domain/types";
import { formatDate } from "@/lib/utils";
import { useAuth } from "@/lib/auth/auth-context";

const ALL = "all";

export function IssuesTable() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [search, setSearch] = useState("");
  const [workerId, setWorkerId] = useState<string>(ALL);
  const [status, setStatus] = useState<string>(ALL);
  const [vehicleNumber, setVehicleNumber] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const debouncedVehicle = useDebouncedValue(vehicleNumber, 300);

  const { data: workers } = useWorkersList();
  const { data: issues, isLoading } = useIssues({
    search: debouncedSearch || undefined,
    workerId: workerId === ALL ? undefined : workerId,
    status: status === ALL ? undefined : status,
    vehicleNumber: debouncedVehicle || undefined,
  });

  const columns = useMemo<ColumnDef<IssueRecord>[]>(
    () => [
      {
        accessorKey: "code",
        header: "Issue Code",
        cell: ({ row }) => (
          <Link
            href={`/issues/${row.original.id}`}
            className="font-mono text-sm font-medium text-primary hover:underline"
          >
            {row.original.code}
          </Link>
        ),
      },
      {
        accessorKey: "itemName",
        header: "Item & Code",
        cell: ({ row }) => (
          <div>
            <span className="font-medium text-foreground">{row.original.itemName}</span>
            <p className="font-mono text-xs text-muted-foreground">{row.original.itemCode}</p>
          </div>
        ),
      },
      {
        accessorKey: "workerName",
        header: "Issued By",
        cell: ({ row }) => <span className="text-sm">{row.original.workerName}</span>,
      },
      {
        accessorKey: "vehicleNumber",
        header: "Vehicle No.",
        cell: ({ row }) => (
          <span className="font-semibold text-foreground tracking-wide font-mono bg-muted/60 px-2 py-0.5 rounded text-xs border border-border">
            {row.original.vehicleNumber}
          </span>
        ),
      },
      {
        accessorKey: "quantity",
        header: "Qty",
        cell: ({ row }) => (
          <span className="tabular-nums">
            {row.original.quantity}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <IssueStatusBadge status={row.original.status} />,
      },
      {
        accessorKey: "issuedAt",
        header: "Date",
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground tabular-nums">
            {formatDate(row.original.issuedAt)}
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search items, worker, code…"
            className="pl-9"
          />
        </div>

        <div className="grid grid-cols-2 gap-3 sm:flex sm:items-center">
          <Input
            value={vehicleNumber}
            onChange={(e) => setVehicleNumber(e.target.value)}
            placeholder="Vehicle No."
            className="sm:w-36 font-mono uppercase"
          />

          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="sm:w-36">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All Status</SelectItem>
              <SelectItem value="issued">Issued</SelectItem>
              <SelectItem value="installed">Installed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>

          {isAdmin && (
            <Select value={workerId} onValueChange={setWorkerId}>
              <SelectTrigger className="sm:w-48 col-span-2 sm:col-span-1">
                <SelectValue placeholder="Filter by Worker" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All Workers</SelectItem>
                {workers?.map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="flex justify-end shrink-0">
          <IssueFormDialog
            trigger={
              <Button className="w-full sm:w-auto">
                <Plus className="size-4" />
                Issue Item
              </Button>
            }
          />
        </div>
      </div>

      {!isLoading && issues && issues.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No issues found"
          description={
            search || workerId !== ALL || status !== ALL || vehicleNumber
              ? "Try adjusting your filters."
              : "No items have been issued yet."
          }
        />
      ) : (
        <DataTable
          columns={columns}
          data={issues ?? []}
          loading={isLoading}
        />
      )}
    </div>
  );
}

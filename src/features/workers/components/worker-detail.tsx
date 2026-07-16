"use client";

import Link from "next/link";
import { ArrowLeft, Pencil, Shield, User, Mail, Phone, Calendar, ClipboardCheck, Clock, Settings } from "lucide-react";
import { useWorker, useWorkerIssues } from "../hooks";
import { WorkerFormDialog } from "./worker-form-dialog";
import { DataTable } from "@/components/common/data-table";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatDateTime, formatDate, initials } from "@/lib/utils";
import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import type { IssueRecord } from "@/lib/domain/types";
import { IssueStatusBadge } from "@/features/issues/components/issue-status-badge";

export function WorkerDetail({ id }: { id: string }) {
  const { data: worker, isLoading: loadingWorker } = useWorker(id);
  const { data: issues, isLoading: loadingIssues } = useWorkerIssues(id);

  const stats = useMemo(() => {
    if (!issues) return { totalIssued: 0, pendingInstallations: 0, completedInstallations: 0 };
    const totalIssued = issues.reduce((acc, issue) => acc + issue.quantity, 0);
    const pendingInstallations = issues.filter(i => i.status === "issued").length;
    const completedInstallations = issues.filter(i => i.status === "installed").length;
    return { totalIssued, pendingInstallations, completedInstallations };
  }, [issues]);

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
        cell: ({ row }) => <span className="tabular-nums">{row.original.quantity}</span>,
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <IssueStatusBadge status={row.original.status} />,
      },
      {
        accessorKey: "issuedAt",
        header: "Date Issued",
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground tabular-nums">
            {formatDateTime(row.original.issuedAt)}
          </span>
        ),
      },
    ],
    [],
  );

  if (loadingWorker) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[200px] w-full" />
      </div>
    );
  }

  if (!worker) {
    return (
      <div className="py-16 text-center">
        <p className="text-muted-foreground font-medium">Worker not found.</p>
        <Button asChild variant="link" className="mt-2">
          <Link href="/workers">Back to roster</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
          <Link href="/workers">
            <ArrowLeft className="size-4" />
            Workers Roster
          </Link>
        </Button>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-primary text-xl text-primary-foreground font-semibold">
                {initials(worker.name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-semibold tracking-tight">{worker.name}</h1>
                <Badge variant={worker.role === "admin" ? "default" : "secondary"} className="capitalize">
                  {worker.role}
                </Badge>
                <Badge
                  variant="outline"
                  className={
                    worker.active
                      ? "border-success text-success bg-success/5"
                      : "border-destructive text-destructive bg-destructive/5"
                  }
                >
                  {worker.active ? "Active" : "Disabled"}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" /> {worker.email}
              </p>
            </div>
          </div>
          <WorkerFormDialog
            worker={worker}
            trigger={
              <Button>
                <Pencil className="mr-2 h-4 w-4" /> Edit Profile
              </Button>
            }
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Parts Issued</span>
            <ClipboardCheck className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">{stats.totalIssued}</div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Sum of issued item quantities</p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pending Installations</span>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">{stats.pendingInstallations}</div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Awaiting photo uploads</p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Completed Installations</span>
            <Badge variant="outline" className="h-5 border-success text-success bg-success/5 capitalize">Done</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">{stats.completedInstallations}</div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Verified installations</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* User Details Panel */}
        <Card className="lg:col-span-1 border-border">
          <CardHeader>
            <CardTitle className="text-base font-semibold">User Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <div>
                <span className="block text-xs text-muted-foreground">Email</span>
                <span>{worker.email}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <div>
                <span className="block text-xs text-muted-foreground">Phone</span>
                <span>{worker.phone || "—"}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <span className="block text-xs text-muted-foreground">Registered on</span>
                <span>{formatDate(worker.createdAt)}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-muted-foreground" />
              <div>
                <span className="block text-xs text-muted-foreground">System Permissions</span>
                <span className="capitalize">{worker.role} access scope</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Worker History list */}
        <Card className="lg:col-span-2 border-border">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Issued History</CardTitle>
            <CardDescription>Records of parts issued by {worker.name}</CardDescription>
          </CardHeader>
          <CardContent>
            {!loadingIssues && issues && issues.length === 0 ? (
              <EmptyState
                icon={ClipboardCheck}
                title="No issues recorded"
                description="This worker has not issued any inventory items yet."
              />
            ) : (
              <DataTable
                columns={columns}
                data={issues ?? []}
                loading={loadingIssues}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

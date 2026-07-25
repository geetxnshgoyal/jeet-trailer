"use client";

import { useState } from "react";
import { Plus, Search, Wrench, User, Car } from "lucide-react";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { useRepairs } from "../hooks";
import { RepairFormDialog } from "./repair-form-dialog";
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
import { formatDateTime } from "@/lib/utils";
import type { RepairRecord } from "@/lib/domain/types";

const ALL = "all";
const MINE = "mine";

/** Repair log, newest first. Cards rather than a table: photos are the point. */
export function RepairsList() {
  const [search, setSearch] = useState("");
  const [scope, setScope] = useState(ALL);
  const debouncedSearch = useDebouncedValue(search, 300);

  const { data: repairs, isLoading } = useRepairs({
    search: debouncedSearch || undefined,
    workerId: scope === MINE ? "me" : undefined,
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search vehicle, chassis, party..."
            className="pl-9"
          />
        </div>
        <Select value={scope} onValueChange={setScope}>
          <SelectTrigger className="sm:w-40">
            <SelectValue placeholder="Scope" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All repairs</SelectItem>
            <SelectItem value={MINE}>Logged by me</SelectItem>
          </SelectContent>
        </Select>
        <RepairFormDialog
          trigger={
            <Button className="w-full sm:w-auto">
              <Plus className="size-4" />
              Log Repair
            </Button>
          }
        />
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      ) : !repairs || repairs.length === 0 ? (
        <EmptyState
          icon={Wrench}
          title="No repairs logged"
          description={
            search
              ? "Try a different search."
              : "Log a repair to keep a record of work done, with photos as proof."
          }
          action={
            !search ? (
              <RepairFormDialog
                trigger={
                  <Button>
                    <Plus className="size-4" />
                    Log Repair
                  </Button>
                }
              />
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {repairs.map((repair) => (
            <RepairCard key={repair.id} repair={repair} />
          ))}
        </div>
      )}
    </div>
  );
}

function RepairCard({ repair }: { repair: RepairRecord }) {
  const target = repair.vehicleNumber || repair.chassisNumber;
  // Tolerate records written before the field existed rather than crashing
  // the whole list on one bad document.
  const photos = repair.photos ?? [];

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          {target ? (
            <p className="flex items-center gap-1.5 font-mono text-sm font-semibold text-foreground">
              <Car className="size-3.5 shrink-0 text-muted-foreground" />
              {target}
            </p>
          ) : (
            <p className="text-sm font-semibold text-foreground">Repair</p>
          )}
          {repair.partyName && (
            <p className="truncate text-xs text-muted-foreground">
              {repair.partyName}
            </p>
          )}
        </div>
        <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
          {repair.code}
        </span>
      </div>

      {repair.description && (
        <p className="line-clamp-3 text-sm text-muted-foreground">
          {repair.description}
        </p>
      )}

      {photos.length > 0 && (
        <div className="grid grid-cols-4 gap-1.5">
          {photos.slice(0, 4).map((photo) => (
            <a
              key={photo.path}
              href={photo.url}
              target="_blank"
              rel="noreferrer"
              className="relative aspect-square overflow-hidden rounded-md border border-border bg-muted"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.url}
                alt="Repair"
                className="h-full w-full object-cover transition-transform hover:scale-105"
              />
            </a>
          ))}
        </div>
      )}

      <div className="mt-auto flex items-center justify-between gap-2 pt-1 text-xs text-muted-foreground">
        <span className="flex min-w-0 items-center gap-1.5">
          <User className="size-3.5 shrink-0" />
          <span className="truncate">{repair.workerName}</span>
        </span>
        <span className="shrink-0 tabular-nums">
          {formatDateTime(repair.createdAt)}
        </span>
      </div>

      {typeof repair.cost === "number" && repair.cost > 0 && (
        <p className="text-sm font-medium text-foreground">
          Cost: {repair.cost.toLocaleString("en-IN")}
        </p>
      )}
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Search, Factory, User, ArrowRight } from "lucide-react";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { useTrailers } from "../hooks";
import { TrailerFormDialog } from "./trailer-form-dialog";
import { TrailerStatusBadge } from "./trailer-badges";
import { StageProgress } from "./stage-progress";
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
import { useAuth } from "@/lib/auth/auth-context";
import { formatDate } from "@/lib/utils";
import type { TrailerRecord } from "@/lib/domain/types";

const ALL = "all";
const MINE = "mine";

/**
 * The workshop floor view. Admins see every build and where it sits on the
 * line; workers can narrow to chassis currently waiting on them. The summary
 * strip counts active builds per stage so bottlenecks are visible at a glance.
 */
export function WorkshopBoard() {
  const { user, isAdmin } = useAuth();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>(ALL);
  const [scope, setScope] = useState<string>(ALL);
  const debouncedSearch = useDebouncedValue(search, 300);

  const { data: trailers, isLoading } = useTrailers({
    search: debouncedSearch || undefined,
    status: status === ALL ? undefined : status,
    workerId: scope === MINE ? "me" : undefined,
  });

  // Active builds per current stage — the live "where is everything" strip.
  const stageCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of trailers ?? []) {
      if (t.status !== "in_progress") continue;
      counts.set(t.currentStageName, (counts.get(t.currentStageName) ?? 0) + 1);
    }
    return [...counts.entries()];
  }, [trailers]);

  const hasFilters = !!search || status !== ALL || scope !== ALL;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search chassis, model, stage, worker…"
            className="pl-9"
          />
        </div>

        <div className="grid grid-cols-2 gap-3 sm:flex sm:items-center">
          <Select value={scope} onValueChange={setScope}>
            <SelectTrigger className="sm:w-40">
              <SelectValue placeholder="Scope" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All Builds</SelectItem>
              <SelectItem value={MINE}>Waiting on Me</SelectItem>
            </SelectContent>
          </Select>

          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="sm:w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All Status</SelectItem>
              <SelectItem value="in_progress">In Production</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isAdmin && (
          <div className="flex justify-end shrink-0">
            <TrailerFormDialog
              trigger={
                <Button className="w-full sm:w-auto">
                  <Plus className="size-4" />
                  New Trailer
                </Button>
              }
            />
          </div>
        )}
      </div>

      {stageCounts.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {stageCounts.map(([name, count]) => (
            <span
              key={name}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground"
            >
              <span className="font-medium text-foreground">{count}</span>
              at {name}
            </span>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-xl" />
          ))}
        </div>
      ) : !trailers || trailers.length === 0 ? (
        <EmptyState
          icon={Factory}
          title="No trailers on the floor"
          description={
            hasFilters
              ? "Try adjusting your filters."
              : isAdmin
                ? "Start your first trailer build to see it move through the line."
                : "No builds are currently waiting on you."
          }
          action={
            isAdmin && !hasFilters ? (
              <TrailerFormDialog
                trigger={
                  <Button>
                    <Plus className="size-4" />
                    New Trailer
                  </Button>
                }
              />
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {trailers.map((t) => (
            <TrailerCard key={t.id} trailer={t} myId={user?.id} />
          ))}
        </div>
      )}
    </div>
  );
}

function TrailerCard({
  trailer,
  myId,
}: {
  trailer: TrailerRecord;
  myId?: string;
}) {
  const completed = trailer.stages.filter(
    (s) => s.status === "completed",
  ).length;
  const current = trailer.stages[trailer.currentStageIndex];
  const isMine =
    trailer.status === "in_progress" &&
    (current?.workerId === myId || (!current?.workerId && !!myId));

  return (
    <Link
      href={`/workshop/${trailer.id}`}
      className="group flex flex-col gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-accent/30"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-mono text-sm font-semibold text-primary">
            {trailer.chassisNumber}
          </p>
          <p className="text-sm text-muted-foreground">
            {trailer.model || "Trailer"}
          </p>
        </div>
        <TrailerStatusBadge status={trailer.status} />
      </div>

      <StageProgress stages={trailer.stages} />

      {trailer.status === "completed" ? (
        <p className="text-sm text-muted-foreground">
          All {trailer.stages.length} stages done
          {trailer.completedAt ? ` · ${formatDate(trailer.completedAt)}` : ""}
        </p>
      ) : (
        <div className="space-y-1">
          <p className="text-sm">
            <span className="text-muted-foreground">
              Stage {trailer.currentStageIndex + 1}/{trailer.stages.length}:
            </span>{" "}
            <span className="font-medium text-foreground">
              {trailer.currentStageName}
            </span>
          </p>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <User className="size-3.5" />
            {current?.status === "in_progress"
              ? `${trailer.currentWorkerName} is working on it`
              : trailer.currentWorkerName
                ? `Waiting for ${trailer.currentWorkerName} to start`
                : "Unassigned — waiting for pickup"}
          </p>
        </div>
      )}

      <div className="mt-auto flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {completed}/{trailer.stages.length} stages · started{" "}
          {formatDate(trailer.createdAt)}
        </span>
        {isMine && trailer.status === "in_progress" && (
          <span className="inline-flex items-center gap-1 font-medium text-primary">
            Open <ArrowRight className="size-3.5" />
          </span>
        )}
      </div>
    </Link>
  );
}

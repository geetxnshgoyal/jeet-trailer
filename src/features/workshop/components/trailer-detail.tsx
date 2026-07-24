"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  CircleDashed,
  Hammer,
  Loader2,
  Play,
  User,
  History,
} from "lucide-react";
import { toast } from "sonner";
import { useTrailer, useTrailerStageAction, useAssignStageWorker } from "../hooks";
import { useWorkersList } from "@/features/issues/hooks";
import { TrailerStatusBadge, StageStatusBadge } from "./trailer-badges";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/lib/auth/auth-context";
import { cn, formatDateTime } from "@/lib/utils";
import type { TrailerRecord, TrailerStage } from "@/lib/domain/types";

const UNASSIGNED = "unassigned";

/**
 * Single-trailer view: header, per-stage timeline with the start/complete
 * hand-over actions for the stage currently holding the chassis, and the
 * immutable audit history underneath.
 */
export function TrailerDetail({ id }: { id: string }) {
  const { user, isAdmin } = useAuth();
  const { data, isLoading } = useTrailer(id);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }
  if (!data) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Trailer not found.</p>
        <Button variant="outline" asChild>
          <Link href="/workshop">
            <ArrowLeft className="size-4" /> Back to Workshop
          </Link>
        </Button>
      </div>
    );
  }

  const { trailer, history } = data;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild className="-ml-2">
              <Link href="/workshop">
                <ArrowLeft className="size-4" />
              </Link>
            </Button>
            <h1 className="font-mono text-2xl font-semibold tracking-tight">
              {trailer.chassisNumber}
            </h1>
            <TrailerStatusBadge status={trailer.status} />
          </div>
          <p className="text-sm text-muted-foreground sm:pl-10">
            {trailer.model || "Trailer"}
            {trailer.description ? ` — ${trailer.description}` : ""}
          </p>
        </div>
        {trailer.status === "in_progress" && (
          <div className="text-sm text-muted-foreground sm:text-right">
            <p>
              Currently at{" "}
              <span className="font-medium text-foreground">
                {trailer.currentStageName}
              </span>
            </p>
            <p className="text-xs">
              {trailer.currentWorkerName
                ? `with ${trailer.currentWorkerName}`
                : "unassigned"}
            </p>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card p-4 sm:p-6">
        <ol className="space-y-0">
          {trailer.stages.map((stage, i) => (
            <StageRow
              key={stage.index}
              trailer={trailer}
              stage={stage}
              isLast={i === trailer.stages.length - 1}
              isAdmin={isAdmin}
              myId={user?.id}
            />
          ))}
        </ol>
      </div>

      <div className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <History className="size-4 text-muted-foreground" />
          Activity History
        </h2>
        <div className="rounded-xl border border-border bg-card">
          {history.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No activity yet.</p>
          ) : (
            history.map((event, i) => (
              <div key={event.id}>
                {i > 0 && <Separator />}
                <div className="flex items-start justify-between gap-3 p-3 sm:px-4">
                  <p className="text-sm text-foreground">{event.note}</p>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {formatDateTime(event.createdAt)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function StageRow({
  trailer,
  stage,
  isLast,
  isAdmin,
  myId,
}: {
  trailer: TrailerRecord;
  stage: TrailerStage;
  isLast: boolean;
  isAdmin: boolean;
  myId?: string;
}) {
  const isCurrent =
    trailer.status === "in_progress" &&
    stage.index === trailer.currentStageIndex;
  const canStart =
    isCurrent &&
    stage.status === "pending" &&
    (isAdmin || !stage.workerId || stage.workerId === myId);
  const canComplete =
    isCurrent &&
    stage.status === "in_progress" &&
    (isAdmin || stage.workerId === myId);

  return (
    <li className="relative flex gap-4 pb-2">
      {/* timeline rail */}
      <div className="flex flex-col items-center">
        <span
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold",
            stage.status === "completed" &&
              "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
            stage.status === "in_progress" &&
              "border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400",
            stage.status === "pending" &&
              "border-border bg-muted/40 text-muted-foreground",
          )}
        >
          {stage.status === "completed" ? (
            <Check className="size-4" />
          ) : stage.status === "in_progress" ? (
            <Hammer className="size-4" />
          ) : (
            stage.index + 1
          )}
        </span>
        {!isLast && (
          <span
            className={cn(
              "w-0.5 flex-1 min-h-6 rounded-full",
              stage.status === "completed" ? "bg-emerald-500/50" : "bg-border",
            )}
          />
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium text-foreground">{stage.name}</p>
            <StageStatusBadge status={stage.status} />
          </div>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {stage.workerName ? (
              <>
                <User className="size-3.5" /> {stage.workerName}
              </>
            ) : (
              <>
                <CircleDashed className="size-3.5" /> Unassigned
              </>
            )}
            {stage.startedAt && (
              <span> · started {formatDateTime(stage.startedAt)}</span>
            )}
            {stage.completedAt && (
              <span> · done {formatDateTime(stage.completedAt)}</span>
            )}
          </p>
          {stage.notes && (
            <p className="max-w-prose rounded-md bg-muted/60 px-2.5 py-1.5 text-xs text-muted-foreground">
              “{stage.notes}”
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {isAdmin && stage.status !== "completed" && (
            <AssignWorkerSelect trailer={trailer} stage={stage} />
          )}
          {canStart && <StartButton trailerId={trailer.id} stage={stage} />}
          {canComplete && (
            <CompleteDialog trailerId={trailer.id} stage={stage} isLast={isLast} />
          )}
        </div>
      </div>
    </li>
  );
}

function StartButton({
  trailerId,
  stage,
}: {
  trailerId: string;
  stage: TrailerStage;
}) {
  const action = useTrailerStageAction(trailerId);
  return (
    <Button
      size="sm"
      onClick={() =>
        action.mutate(
          { action: "start" },
          {
            onSuccess: () => toast.success(`Started ${stage.name}.`),
            onError: (err) =>
              toast.error(err.message || "Could not start the stage."),
          },
        )
      }
      disabled={action.isPending}
    >
      {action.isPending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Play className="size-4" />
      )}
      Start Work
    </Button>
  );
}

function CompleteDialog({
  trailerId,
  stage,
  isLast,
}: {
  trailerId: string;
  stage: TrailerStage;
  isLast: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const action = useTrailerStageAction(trailerId);

  const submit = () => {
    action.mutate(
      { action: "complete", notes: notes.trim() || undefined },
      {
        onSuccess: () => {
          toast.success(
            isLast
              ? "All stages complete — trailer is ready!"
              : `${stage.name} completed and handed over.`,
          );
          setOpen(false);
          setNotes("");
        },
        onError: (err) =>
          toast.error(err.message || "Could not complete the stage."),
      },
    );
  };

  return (
    <>
      <Button size="sm" variant="default" onClick={() => setOpen(true)}>
        <Check className="size-4" />
        {isLast ? "Complete Build" : "Complete & Hand Over"}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Complete {stage.name}?</DialogTitle>
            <DialogDescription>
              {isLast
                ? "This is the final stage — the trailer will be marked complete and ready for inventory."
                : "The chassis will be handed over to the next stage."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="handover-notes">Hand-over Notes (optional)</Label>
            <Textarea
              id="handover-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything the next stage should know…"
              maxLength={500}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={action.isPending}
            >
              Cancel
            </Button>
            <Button onClick={submit} disabled={action.isPending}>
              {action.isPending && <Loader2 className="size-4 animate-spin" />}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Admin-only worker picker; mounted only for admins so worker sessions never hit the admin workers API. */
function AssignWorkerSelect({
  trailer,
  stage,
}: {
  trailer: TrailerRecord;
  stage: TrailerStage;
}) {
  const { data: workers } = useWorkersList();
  const assign = useAssignStageWorker(trailer.id);
  const activeWorkers = workers?.filter((w) => w.active && w.role === "worker") ?? [];

  return (
    <Select
      value={stage.workerId || UNASSIGNED}
      onValueChange={(val) =>
        assign.mutate(
          {
            stageIndex: stage.index,
            workerId: val === UNASSIGNED ? "" : val,
          },
          {
            onError: (err) =>
              toast.error(err.message || "Could not assign worker."),
          },
        )
      }
      disabled={assign.isPending}
    >
      <SelectTrigger className="h-8 w-36 text-xs">
        <SelectValue placeholder="Assign worker" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
        {activeWorkers.map((w) => (
          <SelectItem key={w.id} value={w.id}>
            {w.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

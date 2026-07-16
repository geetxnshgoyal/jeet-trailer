"use client";

import {
  Plus,
  ArrowUp,
  ArrowDown,
  PackageCheck,
  Wrench,
  Pencil,
  type LucideIcon,
} from "lucide-react";
import { useItemHistory } from "../hooks";
import { formatDateTime } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import type { ItemHistoryEventType } from "@/lib/domain/types";

/**
 * Vertical timeline of an item's lifecycle events (added, stock changes,
 * issued, installed, edited) read from its history subcollection. Newest first.
 */

const EVENT_META: Record<
  ItemHistoryEventType,
  { icon: LucideIcon; label: string; tone: string }
> = {
  added: { icon: Plus, label: "Added to inventory", tone: "text-primary" },
  stock_increased: { icon: ArrowUp, label: "Stock increased", tone: "text-success" },
  stock_reduced: { icon: ArrowDown, label: "Stock reduced", tone: "text-warning" },
  issued: { icon: PackageCheck, label: "Issued", tone: "text-primary" },
  installed: { icon: Wrench, label: "Installed", tone: "text-success" },
  edited: { icon: Pencil, label: "Details edited", tone: "text-muted-foreground" },
};

export function ItemHistoryTimeline({ itemId }: { itemId: string }) {
  const { data: events, isLoading } = useItemHistory(itemId);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="size-9 rounded-full" />
            <div className="flex-1 space-y-2 py-1">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!events || events.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No history recorded yet.</p>
    );
  }

  return (
    <ol className="relative space-y-1">
      {events.map((evt, idx) => {
        const meta = EVENT_META[evt.type];
        const Icon = meta.icon;
        const isLast = idx === events.length - 1;
        return (
          <li key={evt.id} className="relative flex gap-3 pb-5">
            {/* Connector line */}
            {!isLast && (
              <span
                className="absolute left-[17px] top-9 h-full w-px bg-border"
                aria-hidden
              />
            )}
            <span
              className={`z-10 flex size-9 flex-shrink-0 items-center justify-center rounded-full bg-muted ${meta.tone}`}
            >
              <Icon className="size-4" />
            </span>
            <div className="min-w-0 pt-1">
              <p className="text-sm font-medium text-foreground">
                {meta.label}
                {typeof evt.resultingQuantity === "number" && (
                  <span className="ml-1 font-normal text-muted-foreground">
                    → {evt.resultingQuantity} in stock
                  </span>
                )}
              </p>
              {evt.note && (
                <p className="text-sm text-muted-foreground">{evt.note}</p>
              )}
              {evt.vehicleNumber && (
                <p className="text-sm text-muted-foreground">
                  Vehicle {evt.vehicleNumber}
                </p>
              )}
              <p className="mt-0.5 text-xs text-muted-foreground">
                {formatDateTime(evt.createdAt)} · {evt.actorName}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

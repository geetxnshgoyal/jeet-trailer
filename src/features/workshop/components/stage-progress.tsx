import { cn } from "@/lib/utils";
import type { TrailerStage } from "@/lib/domain/types";

/**
 * Compact dot-per-stage progress strip used on trailer cards: filled for
 * completed stages, pulsing for the stage currently holding the chassis.
 */
export function StageProgress({ stages }: { stages: TrailerStage[] }) {
  return (
    <div className="flex items-center gap-1.5">
      {stages.map((stage) => (
        <span
          key={stage.index}
          title={`${stage.name} — ${stage.status.replace("_", " ")}`}
          className={cn(
            "h-1.5 flex-1 rounded-full transition-colors",
            stage.status === "completed" && "bg-emerald-500",
            stage.status === "in_progress" && "bg-amber-500 animate-pulse",
            stage.status === "pending" && "bg-muted",
          )}
        />
      ))}
    </div>
  );
}

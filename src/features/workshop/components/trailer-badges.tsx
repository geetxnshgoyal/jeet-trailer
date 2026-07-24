import { Badge } from "@/components/ui/badge";
import {
  TRAILER_STATUS_LABELS,
  TRAILER_STAGE_STATUS_LABELS,
} from "@/lib/domain/constants";
import type { TrailerStatus, TrailerStageStatus } from "@/lib/domain/types";

const TRAILER_VARIANT: Record<
  TrailerStatus,
  "default" | "success"
> = {
  in_progress: "default",
  completed: "success",
};

export function TrailerStatusBadge({ status }: { status: TrailerStatus }) {
  return (
    <Badge variant={TRAILER_VARIANT[status]}>
      {TRAILER_STATUS_LABELS[status]}
    </Badge>
  );
}

const STAGE_VARIANT: Record<
  TrailerStageStatus,
  "secondary" | "warning" | "success"
> = {
  pending: "secondary",
  in_progress: "warning",
  completed: "success",
};

export function StageStatusBadge({ status }: { status: TrailerStageStatus }) {
  return (
    <Badge variant={STAGE_VARIANT[status]}>
      {TRAILER_STAGE_STATUS_LABELS[status]}
    </Badge>
  );
}

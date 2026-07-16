import { Badge } from "@/components/ui/badge";
import { STOCK_STATUS_LABELS } from "@/lib/domain/constants";
import type { StockStatus } from "@/lib/domain/types";

/** Colour-coded stock status pill. Single mapping used across tables and detail. */
export function StockStatusBadge({ status }: { status: StockStatus }) {
  const variant =
    status === "in_stock"
      ? "success"
      : status === "low_stock"
        ? "warning"
        : "destructive";
  return <Badge variant={variant}>{STOCK_STATUS_LABELS[status]}</Badge>;
}

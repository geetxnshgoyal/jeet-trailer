"use client";

import { Badge } from "@/components/ui/badge";
import type { InstallationStatus } from "@/lib/domain/types";

export function IssueStatusBadge({ status }: { status: InstallationStatus }) {
  switch (status) {
    case "issued":
      return (
        <Badge variant="outline" className="border-amber-500 text-amber-500 bg-amber-500/5 hover:bg-amber-500/10">
          Issued
        </Badge>
      );
    case "installed":
      return (
        <Badge variant="outline" className="border-success text-success bg-success/5 hover:bg-success/10">
          Installed
        </Badge>
      );
    case "cancelled":
      return (
        <Badge variant="outline" className="border-destructive text-destructive bg-destructive/5 hover:bg-destructive/10">
          Cancelled
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

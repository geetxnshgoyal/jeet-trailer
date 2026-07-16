"use client";

import { Fragment } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";

/** Human labels for path segments; falls back to title-casing the raw segment. */
const SEGMENT_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  inventory: "Inventory",
  issues: "Issues",
  installations: "Installations",
  workers: "Workers",
  categories: "Categories",
  reports: "Reports",
  new: "New",
  edit: "Edit",
};

function labelFor(segment: string): string {
  return (
    SEGMENT_LABELS[segment] ??
    segment
      .replace(/-/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

/**
 * Derives breadcrumbs from the current pathname. Dynamic id segments (e.g. a
 * Firestore doc id) are shown verbatim but not linked, since intermediate
 * detail routes may not resolve on their own.
 */
export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="min-w-0">
      <ol className="flex items-center gap-1.5 text-sm text-muted-foreground">
        {segments.map((segment, index) => {
          const href = "/" + segments.slice(0, index + 1).join("/");
          const isLast = index === segments.length - 1;
          // Heuristic: long, non-label segments are ids — render as plain text.
          const looksLikeId =
            !SEGMENT_LABELS[segment] && segment.length > 16;

          return (
            <Fragment key={href}>
              {index > 0 && (
                <ChevronRight
                  className="h-3.5 w-3.5 flex-shrink-0 text-border"
                  aria-hidden
                />
              )}
              {isLast || looksLikeId ? (
                <span
                  className={
                    isLast
                      ? "truncate font-medium text-foreground"
                      : "truncate"
                  }
                  aria-current={isLast ? "page" : undefined}
                >
                  {looksLikeId ? "Detail" : labelFor(segment)}
                </span>
              ) : (
                <Link
                  href={href}
                  className="truncate transition-colors hover:text-foreground"
                >
                  {labelFor(segment)}
                </Link>
              )}
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}

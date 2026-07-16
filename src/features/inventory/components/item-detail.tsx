"use client";

import Link from "next/link";
import { ArrowLeft, Pencil, Boxes } from "lucide-react";
import { useItem } from "../hooks";
import { StockStatusBadge } from "./stock-status-badge";
import { StockAdjustDialog } from "./stock-adjust-dialog";
import { ItemFormDialog } from "./item-form-dialog";
import { ItemHistoryTimeline } from "./item-history-timeline";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth/auth-context";
import { formatDateTime } from "@/lib/utils";

/**
 * Item detail: identity, current stock with status, admin stock/edit actions,
 * and the full immutable history timeline. Workers see a read-only view; admins
 * get the adjust-stock and edit affordances.
 */
export function ItemDetail({ id }: { id: string }) {
  const { isAdmin } = useAuth();
  const { data: item, isLoading } = useItem(id);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="py-16 text-center">
        <p className="text-muted-foreground">Item not found.</p>
        <Button asChild variant="link">
          <Link href="/inventory">Back to inventory</Link>
        </Button>
      </div>
    );
  }

  const fields: Array<{ label: string; value?: string | number }> = [
    { label: "Category", value: item.categoryName },
    { label: "Brand", value: item.brand || "—" },
    { label: "Model", value: item.model || "—" },
    { label: "Size / spec", value: item.spec || "—" },
    { label: "Serial number", value: item.serialNumber || "—" },
    { label: "Unit", value: item.unit },
    { label: "Low-stock threshold", value: item.lowStockThreshold },
    { label: "Remarks", value: item.remarks || "—" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
          <Link href="/inventory">
            <ArrowLeft className="size-4" />
            Inventory
          </Link>
        </Button>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight">
                {item.name}
              </h1>
              <StockStatusBadge status={item.status} />
            </div>
            <p className="mt-1 font-mono text-sm text-muted-foreground">
              {item.code}
            </p>
          </div>
          {isAdmin && (
            <div className="flex items-center gap-2">
              <StockAdjustDialog
                item={item}
                trigger={
                  <Button variant="outline">
                    <Boxes className="size-4" />
                    Adjust stock
                  </Button>
                }
              />
              <ItemFormDialog
                item={item}
                trigger={
                  <Button>
                    <Pencil className="size-4" />
                    Edit
                  </Button>
                }
              />
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Current stock</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-semibold tabular-nums">
                  {item.quantity}
                </span>
                <span className="text-muted-foreground">{item.unit}</span>
              </div>
            </CardContent>
          </Card>

          {item.photoBase64 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Item photo</CardTitle>
              </CardHeader>
              <CardContent className="flex justify-center">
                <img
                  src={item.photoBase64}
                  alt={item.name}
                  className="h-44 w-full rounded-lg object-cover border border-input shadow-sm"
                />
              </CardContent>
            </Card>
          )}
        </div>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
              {fields.map((f) => (
                <div key={f.label}>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                    {f.label}
                  </dt>
                  <dd className="mt-0.5 text-sm">{f.value}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>History</CardTitle>
        </CardHeader>
        <CardContent>
          <ItemHistoryTimeline itemId={id} />
          {item.createdAt && (
            <p className="mt-4 text-xs text-muted-foreground">
              Item created {formatDateTime(item.createdAt)}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

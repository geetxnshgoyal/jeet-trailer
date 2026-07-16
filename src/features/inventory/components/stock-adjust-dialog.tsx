"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { stockAdjustSchema, type StockAdjustInput } from "@/lib/domain/schemas";
import { useAdjustStock } from "../hooks";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { InventoryItem } from "@/lib/domain/types";

/**
 * Admin stock adjustment. The signed delta is composed from a direction toggle
 * (add / reduce) and an absolute amount so the reason is always explicit and
 * the underlying audited API only ever sees a single signed number.
 */
export function StockAdjustDialog({
  item,
  trigger,
}: {
  item: InventoryItem;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [direction, setDirection] = useState<"add" | "reduce">("add");
  const adjust = useAdjustStock(item.id);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<{ amount: number; reason: string }>({
    defaultValues: { amount: 1, reason: "" },
  });

  async function onSubmit(values: { amount: number; reason: string }) {
    const amount = Math.abs(Number(values.amount));
    const delta = direction === "add" ? amount : -amount;

    // Validate the composed payload against the shared schema before sending.
    const parsed = stockAdjustSchema.safeParse({
      delta,
      reason: values.reason,
    } satisfies StockAdjustInput);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid adjustment");
      return;
    }

    try {
      await adjust.mutateAsync(parsed.data);
      toast.success(
        `Stock ${direction === "add" ? "increased" : "reduced"} by ${amount}`,
      );
      reset({ amount: 1, reason: "" });
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Adjustment failed");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adjust stock</DialogTitle>
          <DialogDescription>
            {item.name} ({item.code}) — current stock {item.quantity} {item.unit}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={direction === "add" ? "default" : "outline"}
              onClick={() => setDirection("add")}
            >
              <Plus className="size-4" />
              Add
            </Button>
            <Button
              type="button"
              variant={direction === "reduce" ? "default" : "outline"}
              onClick={() => setDirection("reduce")}
            >
              <Minus className="size-4" />
              Reduce
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              type="number"
              min={1}
              {...register("amount", { valueAsNumber: true })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason</Label>
            <Input
              id="reason"
              placeholder="e.g. New stock received, stock count correction"
              aria-invalid={!!errors.reason}
              {...register("reason")}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={adjust.isPending}>
              {adjust.isPending && <Loader2 className="size-4 animate-spin" />}
              Apply adjustment
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

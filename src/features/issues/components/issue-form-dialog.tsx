"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { createIssueSchema, type CreateIssueInput } from "@/lib/domain/schemas";
import { useCreateIssue, useInventoryForIssues } from "../hooks";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

export function IssueFormDialog({ trigger }: { trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const { data: items, isLoading: loadingItems } = useInventoryForIssues();
  const createIssueMutation = useCreateIssue();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<z.input<typeof createIssueSchema>>({
    resolver: zodResolver(createIssueSchema),
    defaultValues: {
      itemId: "",
      quantity: 1,
      vehicleNumber: "",
      serialNumber: "",
      notes: "",
    },
  });

  const selectedItemId = watch("itemId");
  const selectedItem = items?.find((it) => it.id === selectedItemId);

  // If item is serial-tracked, quantity is constrained to 1
  const isSerialTracked = selectedItem?.serialNumber !== undefined || selectedItem?.categoryName.toLowerCase() === "tyre" || selectedItem?.categoryName.toLowerCase() === "rim";

  const onSubmit = (data: z.input<typeof createIssueSchema>) => {
    // If serial tracked, force qty = 1
    const body = {
      itemId: data.itemId,
      vehicleNumber: data.vehicleNumber,
      serialNumber: data.serialNumber || undefined,
      notes: data.notes || undefined,
      quantity: isSerialTracked ? 1 : Number(data.quantity),
    };

    createIssueMutation.mutate(body, {
      onSuccess: (res) => {
        toast.success(`Issued ${res.issue.itemName} successfully!`);
        reset();
        setOpen(false);
      },
      onError: (err) => {
        toast.error(err.message || "Failed to issue item.");
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { setOpen(val); if (!val) reset(); }}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Issue Item from Inventory</DialogTitle>
          <DialogDescription>
            Record parts issued to the workshop floor for specific vehicles.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="itemId">Item</Label>
            {loadingItems ? (
              <div className="flex h-10 items-center justify-center rounded-md border border-input bg-muted/20 text-muted-foreground text-sm">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading stock...
              </div>
            ) : (
              <Select
                value={selectedItemId}
                onValueChange={(val) => {
                  setValue("itemId", val, { shouldValidate: true });
                  const it = items?.find((i) => i.id === val);
                  if (it && (it.serialNumber || it.categoryName.toLowerCase() === "tyre" || it.categoryName.toLowerCase() === "rim")) {
                    setValue("quantity", 1);
                  }
                }}
              >
                <SelectTrigger id="itemId">
                  <SelectValue placeholder="Select available item" />
                </SelectTrigger>
                <SelectContent>
                  {items && items.length === 0 ? (
                    <div className="p-2 text-center text-xs text-muted-foreground">
                      No items with stock available.
                    </div>
                  ) : (
                    items?.map((it) => (
                      <SelectItem key={it.id} value={it.id}>
                        {it.name} ({it.code}) — {it.quantity} {it.unit} in stock
                        {it.serialNumber ? ` [Serial: ${it.serialNumber}]` : ""}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            )}
            {errors.itemId && (
              <p className="text-xs text-destructive">{errors.itemId.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                disabled={isSerialTracked}
                {...register("quantity", { valueAsNumber: true })}
              />
              {isSerialTracked && (
                <p className="text-[10px] text-muted-foreground mt-1">
                  Serial-tracked items are restricted to a quantity of 1.
                </p>
              )}
              {errors.quantity && (
                <p className="text-xs text-destructive">{errors.quantity.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="vehicleNumber">Vehicle Number</Label>
              <Input
                id="vehicleNumber"
                placeholder="e.g. RJ31GA9265"
                {...register("vehicleNumber")}
              />
              {errors.vehicleNumber && (
                <p className="text-xs text-destructive">
                  {errors.vehicleNumber.message}
                </p>
              )}
            </div>
          </div>

          {!selectedItem?.serialNumber && isSerialTracked && (
            <div className="space-y-1.5">
              <Label htmlFor="serialNumber">Serial Number (Required)</Label>
              <Input
                id="serialNumber"
                placeholder="Enter serial number for tracking"
                {...register("serialNumber")}
              />
              {errors.serialNumber && (
                <p className="text-xs text-destructive">
                  {errors.serialNumber.message}
                </p>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes / Purpose</Label>
            <Textarea
              id="notes"
              placeholder="e.g. Front axle replacement, structural repairs..."
              className="resize-none h-20"
              {...register("notes")}
            />
            {errors.notes && (
              <p className="text-xs text-destructive">{errors.notes.message}</p>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={createIssueMutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createIssueMutation.isPending}>
              {createIssueMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Issue Item
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

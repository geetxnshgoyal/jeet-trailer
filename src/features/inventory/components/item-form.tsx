"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { z } from "zod";
import { createItemSchema, type CreateItemInput } from "@/lib/domain/schemas";

// Zod coercion makes the *input* type of numeric fields `unknown` (a string
// from the <input>) while the *output* type is `number`. Type the form on both
// so RHF's resolver, defaults, and submit handler all line up.
type ItemFormInput = z.input<typeof createItemSchema>;
type ItemFormOutput = z.output<typeof createItemSchema>;
import { UNITS } from "@/lib/domain/constants";
import { useCategories, useCreateItem, useUpdateItem } from "../hooks";
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
import type { InventoryItem } from "@/lib/domain/types";

/**
 * Create/edit form for inventory items. On create it drives POST /api/inventory;
 * on edit it PATCHes metadata only (quantity changes go through the stock
 * adjust flow so every quantity delta is audited).
 *
 * The serial-number field only appears for serial-tracked categories (tyres,
 * rims); for consumables it is hidden and quantity is the sole measure.
 */
export function ItemForm({
  item,
  onDone,
}: {
  item?: InventoryItem;
  onDone: () => void;
}) {
  const isEdit = !!item;
  const { data: categories } = useCategories();
  const createItem = useCreateItem();
  const updateItem = useUpdateItem(item?.id ?? "");

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ItemFormInput, unknown, ItemFormOutput>({
    resolver: zodResolver(createItemSchema),
    defaultValues: {
      categoryId: item?.categoryId ?? "",
      name: item?.name ?? "",
      brand: item?.brand ?? "",
      model: item?.model ?? "",
      size: item?.spec ?? "",
      quantity: item?.quantity ?? 0,
      unit: (item?.unit as CreateItemInput["unit"]) ?? "pcs",
      lowStockThreshold: item?.lowStockThreshold ?? 5,
      serialNumber: item?.serialNumber ?? "",
      remarks: item?.remarks ?? "",
    },
  });

  const selectedCategoryId = watch("categoryId");
  const selectedCategory = categories?.find((c) => c.id === selectedCategoryId);
  const serialTracked = selectedCategory?.serialTracked ?? false;

  // Keep the Select (which is not a native input) wired into RHF.
  useEffect(() => {
    register("categoryId");
    register("unit");
  }, [register]);

  async function onSubmit(values: CreateItemInput) {
    try {
      if (isEdit) {
        // Metadata only — omit quantity/category which are managed elsewhere.
        const { name, brand, model, size, unit, lowStockThreshold, remarks } =
          values;
        await updateItem.mutateAsync({
          name,
          brand,
          model,
          size,
          unit,
          lowStockThreshold,
          remarks,
        });
        toast.success("Item updated");
      } else {
        await createItem.mutateAsync(values);
        toast.success("Inventory item added");
      }
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  const submitting = createItem.isPending || updateItem.isPending;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {!isEdit && (
        <div className="space-y-2">
          <Label htmlFor="categoryId">Category</Label>
          <Select
            value={selectedCategoryId}
            onValueChange={(v) =>
              setValue("categoryId", v, { shouldValidate: true })
            }
          >
            <SelectTrigger id="categoryId" aria-invalid={!!errors.categoryId}>
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent>
              {categories?.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.categoryId && (
            <p className="text-sm text-destructive">
              {errors.categoryId.message}
            </p>
          )}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="name">Item name</Label>
        <Input id="name" aria-invalid={!!errors.name} {...register("name")} />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name.message}</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="brand">Brand</Label>
          <Input id="brand" {...register("brand")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="model">Model (optional)</Label>
          <Input id="model" {...register("model")} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="size">Size / specification</Label>
        <Input id="size" placeholder="e.g. 295/80 R22.5" {...register("size")} />
      </div>

      {serialTracked ? (
        <div className="space-y-2">
          <Label htmlFor="serialNumber">Serial number</Label>
          <Input
            id="serialNumber"
            aria-invalid={!!errors.serialNumber}
            {...register("serialNumber")}
          />
          <p className="text-xs text-muted-foreground">
            {selectedCategory?.name} items are tracked individually by serial
            number.
          </p>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="quantity">Quantity</Label>
          <Input
            id="quantity"
            type="number"
            min={0}
            disabled={isEdit}
            aria-invalid={!!errors.quantity}
            {...register("quantity")}
          />
          {isEdit && (
            <p className="text-xs text-muted-foreground">
              Use stock adjust to change quantity.
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="unit">Unit</Label>
          <Select
            value={watch("unit")}
            onValueChange={(v) =>
              setValue("unit", v as CreateItemInput["unit"], {
                shouldValidate: true,
              })
            }
          >
            <SelectTrigger id="unit">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {UNITS.map((u) => (
                <SelectItem key={u} value={u}>
                  {u}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="lowStockThreshold">Low-stock at</Label>
          <Input
            id="lowStockThreshold"
            type="number"
            min={0}
            {...register("lowStockThreshold")}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="remarks">Remarks</Label>
        <Textarea id="remarks" rows={2} {...register("remarks")} />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting && <Loader2 className="size-4 animate-spin" />}
          {isEdit ? "Save changes" : "Add item"}
        </Button>
      </div>
    </form>
  );
}

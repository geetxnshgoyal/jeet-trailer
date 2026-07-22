"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { Loader2, Camera, X } from "lucide-react";
import { toast } from "sonner";
import type { z } from "zod";
import { createItemSchema, type CreateItemInput } from "@/lib/domain/schemas";
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

type ItemFormInput = z.input<typeof createItemSchema>;
type ItemFormOutput = z.output<typeof createItemSchema>;

function getTodayString(): string {
  return new Date().toISOString().split("T")[0];
}

export function ItemForm({
  item,
  onDone,
}: Readonly<{
  item?: InventoryItem;
  onDone: () => void;
}>) {
  const isEdit = !!item;
  const { data: categories } = useCategories();
  const createItem = useCreateItem();
  const updateItem = useUpdateItem(item?.id ?? "");

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    clearErrors,
    formState: { errors },
  } = useForm<ItemFormInput, unknown, ItemFormOutput>({
    resolver: zodResolver(createItemSchema),
    defaultValues: {
      categoryId: item?.categoryId ?? "",
      name: item?.name ?? "",
      brand: item?.brand ?? "",
      supplierName: item?.supplierName ?? "",
      invoiceNumber: item?.invoiceNumber ?? "",
      purchaseDate: item?.purchaseDate ?? getTodayString(),
      size: item?.spec ?? "",
      quantity: item?.quantity ?? 1,
      unit: (item?.unit as CreateItemInput["unit"]) ?? "pcs",
      lowStockThreshold: item?.lowStockThreshold ?? 5,
      serialNumber: item?.serialNumber ?? "",
      remarks: item?.remarks ?? "",
      photoBase64: item?.photoBase64 ?? "",
    },
  });

  const selectedCategoryId = watch("categoryId");
  const selectedCategory = categories?.find((c) => c.id === selectedCategoryId);
  
  const categoryNameLower = (selectedCategory?.name || "").trim().toLowerCase();
  const isRimOrTyre =
    selectedCategory?.serialTracked ||
    categoryNameLower === "rim" ||
    categoryNameLower === "tyre" ||
    categoryNameLower === "rims" ||
    categoryNameLower === "tyres";

  const photoBase64 = watch("photoBase64");

  // Keep Select inputs registered
  useEffect(() => {
    register("categoryId");
    register("unit");
    register("photoBase64");
  }, [register]);

  // When switching categories away from Rim/Tyre, clear serial number
  useEffect(() => {
    if (!isRimOrTyre) {
      setValue("serialNumber", "");
      clearErrors("serialNumber");
    }
  }, [isRimOrTyre, setValue, clearErrors]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error("Image size must be less than 2MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setValue("photoBase64", reader.result as string, { shouldValidate: true });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setValue("photoBase64", "", { shouldValidate: true });
  };

  async function onSubmit(values: CreateItemInput) {
    if (isRimOrTyre && !values.serialNumber?.trim()) {
      toast.error(`Serial Number is required for ${selectedCategory?.name || "Rim / Tyre"}.`);
      return;
    }

    try {
      if (isEdit) {
        const {
          name,
          brand,
          supplierName,
          invoiceNumber,
          purchaseDate,
          size,
          unit,
          lowStockThreshold,
          remarks,
          photoBase64,
          serialNumber,
        } = values;

        await updateItem.mutateAsync({
          name,
          brand,
          supplierName,
          invoiceNumber,
          purchaseDate,
          size,
          unit,
          lowStockThreshold,
          remarks,
          photoBase64,
          serialNumber: isRimOrTyre ? serialNumber : undefined,
        });
        toast.success("Item updated");
      } else {
        await createItem.mutateAsync({
          ...values,
          serialNumber: isRimOrTyre ? values.serialNumber : undefined,
        });
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
      {/* 1. Item Image (Optional) */}
      <div className="space-y-2">
        <Label>Item Image (Optional)</Label>
        {photoBase64 ? (
          <div className="relative inline-block">
            <img
              src={photoBase64}
              alt="Preview"
              className="h-28 w-28 rounded-lg object-cover border border-input shadow-sm"
            />
            <button
              type="button"
              onClick={handleRemoveImage}
              className="absolute -right-2 -top-2 flex size-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow hover:bg-destructive/90"
            >
              <X className="size-3" />
            </button>
          </div>
        ) : (
          <label className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/20 hover:border-primary/50 hover:bg-accent/20 transition">
            <Camera className="size-5 text-muted-foreground mb-1" />
            <span className="text-xs text-muted-foreground font-medium">Upload</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageChange}
            />
          </label>
        )}
      </div>

      {/* 2. Category */}
      {!isEdit && (
        <div className="space-y-1.5">
          <Label htmlFor="categoryId">
            Category <span className="text-destructive">*</span>
          </Label>
          <Select
            value={selectedCategoryId}
            onValueChange={(v) => setValue("categoryId", v, { shouldValidate: true })}
          >
            <SelectTrigger id="categoryId" className="h-10" aria-invalid={!!errors.categoryId}>
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
            <p className="text-xs text-destructive">{errors.categoryId.message}</p>
          )}
        </div>
      )}

      {/* 3. Item Name */}
      <div className="space-y-1.5">
        <Label htmlFor="name">
          Item Name <span className="text-destructive">*</span>
        </Label>
        <Input
          id="name"
          placeholder="e.g. Radial Tyre 295/80 R22.5"
          className="h-10"
          aria-invalid={!!errors.name}
          {...register("name")}
        />
        {errors.name && (
          <p className="text-xs text-destructive">{errors.name.message}</p>
        )}
      </div>

      {/* 4. Brand & Supplier / Party Name */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="brand">Brand</Label>
          <Input id="brand" placeholder="e.g. Apollo, JK Tyre, Esab" className="h-10" {...register("brand")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="supplierName">Supplier / Party Name</Label>
          <Input
            id="supplierName"
            placeholder="e.g. Shree Tyres, Raj Hardware"
            className="h-10"
            {...register("supplierName")}
          />
        </div>
      </div>

      {/* 5. Invoice / Bill Number & Purchase Date */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="invoiceNumber">Invoice / Bill Number</Label>
          <Input
            id="invoiceNumber"
            placeholder="e.g. INV-1092"
            className="h-10 font-mono"
            {...register("invoiceNumber")}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="purchaseDate">Purchase Date</Label>
          <Input
            id="purchaseDate"
            type="date"
            className="h-10"
            {...register("purchaseDate")}
          />
        </div>
      </div>

      {/* 6. Size / Specification */}
      <div className="space-y-1.5">
        <Label htmlFor="size">Size / Specification</Label>
        <Input
          id="size"
          placeholder="e.g. 295/80 R22.5, 3.15mm, 4 inch"
          className="h-10"
          {...register("size")}
        />
      </div>

      {/* 7. Serial Number (Only for Rim & Tyre, Required) */}
      <div className="transition-all duration-300 ease-in-out">
        {isRimOrTyre && (
          <div className="space-y-1.5 p-3.5 rounded-xl border border-primary/20 bg-primary/5">
            <Label htmlFor="serialNumber" className="font-semibold text-primary">
              Serial Number <span className="text-destructive">*</span>
            </Label>
            <Input
              id="serialNumber"
              placeholder="e.g. TYR-000125, RIM-00054"
              className="h-10 font-mono font-medium tracking-wide bg-background"
              aria-invalid={!!errors.serialNumber}
              {...register("serialNumber")}
            />
            <p className="text-[11px] text-muted-foreground">
              Required for {selectedCategory?.name || "Rim & Tyre"}. Must be unique across inventory.
            </p>
            {errors.serialNumber && (
              <p className="text-xs text-destructive">{errors.serialNumber.message}</p>
            )}
          </div>
        )}
      </div>

      {/* 8. Quantity, Unit, Low Stock Alert */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="quantity">
            Quantity <span className="text-destructive">*</span>
          </Label>
          <Input
            id="quantity"
            type="number"
            min={0}
            disabled={isEdit}
            className="h-10"
            aria-invalid={!!errors.quantity}
            {...register("quantity")}
          />
          {isEdit && (
            <p className="text-[11px] text-muted-foreground">
              Use Stock Adjust to alter existing quantity.
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="unit">
            Unit <span className="text-destructive">*</span>
          </Label>
          <Select
            value={watch("unit")}
            onValueChange={(v) =>
              setValue("unit", v as CreateItemInput["unit"], {
                shouldValidate: true,
              })
            }
          >
            <SelectTrigger id="unit" className="h-10">
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

        <div className="space-y-1.5">
          <Label htmlFor="lowStockThreshold">Low-stock Alert At</Label>
          <Input
            id="lowStockThreshold"
            type="number"
            min={0}
            className="h-10"
            {...register("lowStockThreshold")}
          />
        </div>
      </div>

      {/* 9. Remarks */}
      <div className="space-y-1.5">
        <Label htmlFor="remarks">Remarks (Optional)</Label>
        <Textarea
          id="remarks"
          rows={2}
          placeholder="e.g. Purchased from Shree Tyres under warranty..."
          className="resize-none text-sm"
          {...register("remarks")}
        />
      </div>

      {/* Footer Buttons */}
      <div className="flex justify-end gap-2 pt-3">
        <Button type="button" variant="outline" onClick={onDone} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting && <Loader2 className="mr-2 size-4 animate-spin" />}
          {isEdit ? "Save Changes" : "Add Inventory Item"}
        </Button>
      </div>
    </form>
  );
}

"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, AlertCircle } from "lucide-react";
import { createGatePassSchema } from "@/lib/domain/schemas";
import { PAYMENT_METHODS } from "@/lib/domain/constants";
import { useCreateGatePass, useGatePassStock, describeStockItem } from "../hooks";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { InventoryItem } from "@/lib/domain/types";

const NONE = "none";

type FormValues = z.input<typeof createGatePassSchema>;

/**
 * Gate pass entry. Voucher number and party are the only required fields;
 * tyres and rims are each optional but self-consistent, so a quantity forces
 * a brand and a brand forces a quantity.
 *
 * Brand dropdowns are built from live inventory, never typed by hand, and each
 * option shows its available stock so the yard can see what is left before
 * committing. The server re-checks stock inside the deduction transaction, so
 * the client-side cap here is a convenience, not the guarantee.
 */
export function GatePassFormDialog({ trigger }: { trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const createGatePass = useCreateGatePass();
  const { tyres, rims, isLoading: loadingStock } = useGatePassStock();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(createGatePassSchema),
    defaultValues: {
      voucherNumber: "",
      partyName: "",
      trailerChassisNumber: "",
      trailerSize: "",
      tyreItemId: "",
      tyreQuantity: undefined,
      rimItemId: "",
      rimQuantity: undefined,
      color: "",
      paymentMethod: "",
      notes: "",
    },
  });

  const tyreItemId = watch("tyreItemId");
  const rimItemId = watch("rimItemId");
  const tyreQuantity = watch("tyreQuantity");
  const rimQuantity = watch("rimQuantity");
  const paymentMethod = watch("paymentMethod");

  const selectedTyre = tyres.find((t) => t.id === tyreItemId);
  const selectedRim = rims.find((r) => r.id === rimItemId);

  const overTyre =
    !!selectedTyre && Number(tyreQuantity) > selectedTyre.quantity;
  const overRim = !!selectedRim && Number(rimQuantity) > selectedRim.quantity;

  const onSubmit = (data: FormValues) => {
    if (overTyre || overRim) {
      toast.error("Quantity exceeds available stock.");
      return;
    }

    createGatePass.mutate(
      {
        voucherNumber: data.voucherNumber,
        partyName: data.partyName,
        trailerChassisNumber: data.trailerChassisNumber || undefined,
        trailerSize: data.trailerSize || undefined,
        tyreItemId: data.tyreItemId || undefined,
        tyreQuantity: data.tyreQuantity ? Number(data.tyreQuantity) : undefined,
        rimItemId: data.rimItemId || undefined,
        rimQuantity: data.rimQuantity ? Number(data.rimQuantity) : undefined,
        color: data.color || undefined,
        paymentMethod: data.paymentMethod || undefined,
        notes: data.notes || undefined,
      },
      {
        onSuccess: (res) => {
          toast.success(`Gate pass ${res.gatePass.voucherNumber} issued.`);
          reset();
          setOpen(false);
        },
        onError: (err) => toast.error(err.message || "Could not issue pass."),
      },
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        setOpen(val);
        if (!val) reset();
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Gate Pass</DialogTitle>
          <DialogDescription>
            Record goods leaving the yard. Any tyres or rims listed are deducted
            from stock straight away.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="voucherNumber">
                Voucher Number <span className="text-destructive">*</span>
              </Label>
              <Input
                id="voucherNumber"
                placeholder="e.g. GP-1042"
                className="font-mono"
                {...register("voucherNumber")}
              />
              {errors.voucherNumber && (
                <p className="text-xs text-destructive">
                  {errors.voucherNumber.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="partyName">
                Party Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="partyName"
                placeholder="Who is collecting"
                {...register("partyName")}
              />
              {errors.partyName && (
                <p className="text-xs text-destructive">
                  {errors.partyName.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="trailerChassisNumber">Trailer Chassis No.</Label>
              <Input
                id="trailerChassisNumber"
                placeholder="Optional"
                className="font-mono uppercase"
                {...register("trailerChassisNumber")}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="trailerSize">Trailer Size</Label>
              <Input
                id="trailerSize"
                placeholder="e.g. 22 ft"
                {...register("trailerSize")}
              />
            </div>
          </div>

          {/* Stock lines. Brands come from inventory only. */}
          <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-3.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Stock going out
            </p>

            <StockLine
              kind="Tyre"
              options={tyres}
              loading={loadingStock}
              selectedId={tyreItemId || ""}
              selected={selectedTyre}
              quantityField="tyreQuantity"
              over={overTyre}
              onSelect={(val) =>
                setValue("tyreItemId", val === NONE ? "" : val, {
                  shouldValidate: true,
                })
              }
              register={register}
              brandError={errors.tyreItemId?.message}
              quantityError={errors.tyreQuantity?.message}
            />

            <StockLine
              kind="Rim"
              options={rims}
              loading={loadingStock}
              selectedId={rimItemId || ""}
              selected={selectedRim}
              quantityField="rimQuantity"
              over={overRim}
              onSelect={(val) =>
                setValue("rimItemId", val === NONE ? "" : val, {
                  shouldValidate: true,
                })
              }
              register={register}
              brandError={errors.rimItemId?.message}
              quantityError={errors.rimQuantity?.message}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="color">Color</Label>
              <Input id="color" placeholder="Optional" {...register("color")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="paymentMethod">Payment Method</Label>
              <Select
                value={paymentMethod || NONE}
                onValueChange={(val) =>
                  setValue(
                    "paymentMethod",
                    val === NONE
                      ? ""
                      : (val as (typeof PAYMENT_METHODS)[number]),
                  )
                }
              >
                <SelectTrigger id="paymentMethod">
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Not specified</SelectItem>
                  {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              rows={2}
              placeholder="Optional"
              {...register("notes")}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={createGatePass.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createGatePass.isPending || overTyre || overRim}
            >
              {createGatePass.isPending && (
                <Loader2 className="size-4 animate-spin" />
              )}
              Issue Gate Pass
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** One brand + quantity row, showing what is left in stock. */
function StockLine({
  kind,
  options,
  loading,
  selectedId,
  selected,
  quantityField,
  over,
  onSelect,
  register,
  brandError,
  quantityError,
}: {
  kind: string;
  options: InventoryItem[];
  loading: boolean;
  selectedId: string;
  selected?: InventoryItem;
  quantityField: "tyreQuantity" | "rimQuantity";
  over: boolean;
  onSelect: (value: string) => void;
  register: ReturnType<typeof useForm<FormValues>>["register"];
  brandError?: string;
  quantityError?: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_7rem]">
        <div className="space-y-1.5">
          <Label>{kind} Brand</Label>
          <Select value={selectedId || NONE} onValueChange={onSelect}>
            <SelectTrigger>
              <SelectValue
                placeholder={loading ? "Loading stock..." : `Select ${kind.toLowerCase()}`}
              />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              <SelectItem value={NONE}>None</SelectItem>
              {options.length === 0 && !loading ? (
                <div className="p-2 text-center text-xs text-muted-foreground">
                  No {kind.toLowerCase()} stock available.
                </div>
              ) : (
                options.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {describeStockItem(item)} ({item.quantity} {item.unit})
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={quantityField}>Quantity</Label>
          <Input
            id={quantityField}
            type="number"
            min={1}
            max={selected?.quantity}
            placeholder="0"
            {...register(quantityField, { valueAsNumber: true })}
          />
        </div>
      </div>

      {selected && (
        <p
          className={
            over
              ? "flex items-center gap-1 text-xs text-destructive"
              : "text-xs text-muted-foreground"
          }
        >
          {over && <AlertCircle className="size-3.5" />}
          {over
            ? `Only ${selected.quantity} ${selected.unit} in stock.`
            : `Available: ${selected.quantity} ${selected.unit}`}
        </p>
      )}
      {brandError && <p className="text-xs text-destructive">{brandError}</p>}
      {quantityError && (
        <p className="text-xs text-destructive">{quantityError}</p>
      )}
    </div>
  );
}

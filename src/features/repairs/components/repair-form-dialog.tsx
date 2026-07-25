"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, Camera, X } from "lucide-react";
import { createRepairSchema } from "@/lib/domain/schemas";
import { useCreateRepair } from "../hooks";
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

type FormValues = z.input<typeof createRepairSchema>;

interface PendingPhoto {
  id: string;
  file: File;
  preview: string;
}

/**
 * Repair log entry for the workshop floor. Every field is optional so a job
 * can be recorded in seconds; the only rule is that a completely blank entry
 * is rejected, since it would record nothing at all.
 *
 * Photos upload to storage rather than into the document, so a job can carry
 * as many as needed without hitting Firestore's per-document size limit.
 */
export function RepairFormDialog({ trigger }: { trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [photos, setPhotos] = useState<PendingPhoto[]>([]);
  const createRepair = useCreateRepair();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(createRepairSchema),
    defaultValues: {
      vehicleNumber: "",
      chassisNumber: "",
      partyName: "",
      description: "",
      cost: undefined,
    },
  });

  const addPhotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    for (const file of files) {
      if (file.size > 8 * 1024 * 1024) {
        toast.error(`${file.name} is over the 8 MB limit.`);
        continue;
      }
      setPhotos((prev) =>
        prev.length >= 10
          ? prev
          : [
              ...prev,
              {
                id: `${Date.now()}-${Math.random()}`,
                file,
                preview: URL.createObjectURL(file),
              },
            ],
      );
    }
    e.target.value = "";
  };

  const removePhoto = (id: string) => {
    setPhotos((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.preview);
      return prev.filter((p) => p.id !== id);
    });
  };

  const closeAndReset = () => {
    photos.forEach((p) => URL.revokeObjectURL(p.preview));
    setPhotos([]);
    reset();
    setOpen(false);
  };

  const onSubmit = (data: FormValues) => {
    createRepair.mutate(
      {
        vehicleNumber: data.vehicleNumber || undefined,
        chassisNumber: data.chassisNumber || undefined,
        partyName: data.partyName || undefined,
        description: data.description || undefined,
        cost: data.cost ? Number(data.cost) : undefined,
        files: photos.map((p) => p.file),
      },
      {
        onSuccess: (res) => {
          // The log is saved even if photos failed, so say which happened.
          if (res.photoError) {
            toast.warning(`Repair ${res.repair.code} saved, but photos failed to upload.`);
          } else {
            toast.success(`Repair ${res.repair.code} logged.`);
          }
          closeAndReset();
        },
        onError: (err) => toast.error(err.message || "Could not log repair."),
      },
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => (val ? setOpen(true) : closeAndReset())}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Log a Repair</DialogTitle>
          <DialogDescription>
            Record work done on a vehicle or trailer. Add photos as proof of the
            repair. All fields are optional.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="vehicleNumber">Vehicle Number</Label>
              <Input
                id="vehicleNumber"
                placeholder="e.g. RJ31GA9265"
                className="font-mono uppercase"
                {...register("vehicleNumber")}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="chassisNumber">Chassis Number</Label>
              <Input
                id="chassisNumber"
                placeholder="Optional"
                className="font-mono uppercase"
                {...register("chassisNumber")}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="partyName">Party Name</Label>
              <Input
                id="partyName"
                placeholder="Optional"
                {...register("partyName")}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cost">Cost</Label>
              <Input
                id="cost"
                type="number"
                min={0}
                placeholder="Optional"
                {...register("cost", { valueAsNumber: true })}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">What was repaired</Label>
            <Textarea
              id="description"
              rows={3}
              placeholder="e.g. Replaced rear axle bearing, welded cross member"
              {...register("description")}
            />
            {errors.vehicleNumber && (
              <p className="text-xs text-destructive">
                {errors.vehicleNumber.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="flex items-center justify-between">
              <span>Repair Photos</span>
              <span className="text-xs font-normal text-muted-foreground">
                {photos.length}/10
              </span>
            </Label>

            <div className="rounded-xl border-2 border-dashed border-input bg-muted/10 p-4 text-center transition-colors hover:border-primary/50">
              <label className="flex cursor-pointer flex-col items-center gap-1.5">
                <span className="rounded-full bg-primary/10 p-2.5 text-primary">
                  <Camera className="size-5" />
                </span>
                <span className="text-xs font-semibold">
                  Tap to add repair photos
                </span>
                <span className="text-[11px] text-muted-foreground">
                  JPG, PNG or WEBP, up to 8 MB each
                </span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={addPhotos}
                />
              </label>
            </div>

            {photos.length > 0 && (
              <div className="grid grid-cols-4 gap-2.5 pt-1">
                {photos.map((p) => (
                  <div
                    key={p.id}
                    className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-muted"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p.preview}
                      alt="Repair"
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(p.id)}
                      className="absolute right-1 top-1 rounded-full bg-destructive p-0.5 text-destructive-foreground shadow transition-transform hover:scale-110"
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={closeAndReset}
              disabled={createRepair.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createRepair.isPending}>
              {createRepair.isPending && (
                <Loader2 className="size-4 animate-spin" />
              )}
              Save Repair
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

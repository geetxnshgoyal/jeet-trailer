"use client";

import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { createIssueSchema } from "@/lib/domain/schemas";
import { useCreateIssue, useInventoryForIssues, useWorkersList } from "../hooks";
import { useTrailers } from "@/features/workshop/hooks";
import { useAuth } from "@/lib/auth/auth-context";
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
import { Loader2, Upload, X, Camera, CheckCircle2, User } from "lucide-react";
import type { InstallationPhoto } from "@/lib/domain/types";

interface PhotoItem {
  id: string;
  file?: File;
  url: string; // Base64 or object URL
  name: string;
}

export function IssueFormDialog({ trigger }: Readonly<{ trigger: React.ReactNode }>) {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const { data: items, isLoading: loadingItems } = useInventoryForIssues();
  const { data: workers } = useWorkersList();
  const createIssueMutation = useCreateIssue();

  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const { data: workshopTrailers } = useTrailers({ status: "in_progress" });

  const activeWorkers = workers?.filter((w) => w.active !== false) || [];

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    clearErrors,
    formState: { errors },
  } = useForm<z.input<typeof createIssueSchema>>({
    resolver: zodResolver(createIssueSchema),
    defaultValues: {
      itemId: "",
      workerId: "",
      workerName: "",
      quantity: 1,
      vehicleNumber: "",
      chassisNumber: "",
      trailerChassisNumber: "",
      serialNumber: "",
      status: "installed",
      notes: "",
    },
  });

  const selectedItemId = watch("itemId");
  const selectedStatus = watch("status");

  const selectedItem = items?.find((it) => it.id === selectedItemId);

  // Determine if selected category requires installation tracking (Tyre / Rim)
  const categoryNameLower = (selectedItem?.categoryName || "").trim().toLowerCase();
  const requiresInstallation =
    categoryNameLower === "tyre" ||
    categoryNameLower === "rim" ||
    categoryNameLower === "tyres" ||
    categoryNameLower === "rims";

  // Prefill the recipient with the logged-in user's name exactly once per
  // open. Re-running on every change would rewrite the name the instant the
  // field is cleared, making it impossible to type anyone else.
  const prefilledRef = useRef(false);
  useEffect(() => {
    if (!open) {
      prefilledRef.current = false;
      return;
    }
    if (!prefilledRef.current && user?.name) {
      prefilledRef.current = true;
      setValue("workerName", user.name, { shouldValidate: true });
    }
  }, [open, user, setValue]);


  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const selectedFiles = Array.from(e.target.files);
    setPhotoError(null);

    selectedFiles.forEach((file) => {
      if (file.size > 8 * 1024 * 1024) {
        toast.error(`${file.name} exceeds 8MB limit`);
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotos((prev) => [
          ...prev,
          {
            id: `${Date.now()}-${Math.random()}`,
            file,
            url: reader.result as string,
            name: file.name,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  const removePhoto = (id: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  };

  const handleOpenChange = (val: boolean) => {
    setOpen(val);
    if (!val) {
      reset();
      setPhotos([]);
      setPhotoError(null);
    }
  };

  const onSubmit = (data: z.input<typeof createIssueSchema>) => {
    const recipientName = data.workerName?.trim();
    if (!recipientName) {
      toast.error("Please enter who the item is issued to.");
      return;
    }
    // A typed name matching a registered worker links their account;
    // any other name is recorded as-is.
    const matched = activeWorkers.find(
      (w) => w.name.trim().toLowerCase() === recipientName.toLowerCase(),
    );

    // Tyre/Rim installs must be fully traceable: registration, vehicle
    // chassis, and the workshop build are all required.
    if (requiresInstallation) {
      if (!data.vehicleNumber || data.vehicleNumber.trim().length < 4) {
        toast.error("Vehicle number is required for installation tracking.");
        return;
      }
      if (!data.chassisNumber || data.chassisNumber.trim().length < 3) {
        toast.error("Chassis number is required for installation tracking.");
        return;
      }
      if (
        !data.trailerChassisNumber ||
        data.trailerChassisNumber.trim().length < 3
      ) {
        toast.error("Trailer chassis is required for installation tracking.");
        return;
      }
    }

    const photoObjects: InstallationPhoto[] = photos.map((p) => ({
      path: `installations/${p.name}`,
      url: p.url,
      uploadedAt: new Date().toISOString(),
    }));

    const body = {
      itemId: data.itemId,
      workerId: matched?.id,
      workerName: recipientName,
      quantity: Number(data.quantity),
      notes: data.notes?.trim() || undefined,
      serialNumber: selectedItem?.serialNumber || data.serialNumber || undefined,
      ...(requiresInstallation
        ? {
            vehicleNumber: data.vehicleNumber?.trim().toUpperCase(),
            chassisNumber: data.chassisNumber?.trim().toUpperCase(),
            trailerChassisNumber:
              data.trailerChassisNumber?.trim().toUpperCase(),
            status: (data.status as "installed" | "issued") || "installed",
            photos: photoObjects,
          }
        : {
            vehicleNumber: "",
            status: "issued" as const,
            photos: [],
          }),
    };

    createIssueMutation.mutate(body, {
      onSuccess: (res) => {
        toast.success(`Issued ${res.issue.itemName} successfully!`);
        handleOpenChange(false);
      },
      onError: (err) => {
        toast.error(err.message || "Failed to issue item.");
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            Issue Item from Inventory
          </DialogTitle>
          <DialogDescription>
            Record inventory items issued to workers with category-specific details.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          {/* 1. Item Selector */}
          <div className="space-y-1.5">
            <Label htmlFor="itemId" className="font-medium">
              Item <span className="text-destructive">*</span>
            </Label>
            {loadingItems ? (
              <div className="flex h-10 items-center justify-center rounded-md border border-input bg-muted/20 text-muted-foreground text-sm">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading stock...
              </div>
            ) : (
              <Select
                value={selectedItemId}
                onValueChange={(val) => {
                  setValue("itemId", val, { shouldValidate: true });
                  clearErrors("itemId");
                }}
              >
                <SelectTrigger id="itemId" className="h-10">
                  <SelectValue placeholder="Select available item" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {items && items.length === 0 ? (
                    <div className="p-2 text-center text-xs text-muted-foreground">
                      No items with stock available.
                    </div>
                  ) : (
                    items?.map((it) => (
                      <SelectItem key={it.id} value={it.id}>
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium">{it.name}</span>
                          <span className="text-xs text-muted-foreground">
                            [{it.categoryName}] · {it.quantity} {it.unit}
                          </span>
                        </div>
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

          {/* 2. Issued To, typeable, with registered workers as suggestions */}
          <div className="space-y-1.5">
            <Label htmlFor="workerName" className="font-medium">
              Issued To <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="workerName"
                list="worker-suggestions"
                placeholder="Type the name of who receives it"
                className="h-10 pl-9"
                autoComplete="off"
                {...register("workerName")}
              />
              <datalist id="worker-suggestions">
                {activeWorkers.map((w) => (
                  <option key={w.id} value={w.name} />
                ))}
              </datalist>
            </div>
            <p className="text-xs text-muted-foreground">
              Pick a registered worker from the suggestions or type any name.
            </p>
            {errors.workerName && (
              <p className="text-xs text-destructive">{errors.workerName.message}</p>
            )}
          </div>

          {/* Dynamic Content Container */}
          <div className="transition-all duration-300 ease-in-out space-y-4">
            {requiresInstallation ? (
              <>
                {/* Tyre & Rim Layout: Quantity & Vehicle Number */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="quantity" className="font-medium">
                      Quantity <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="quantity"
                      type="number"
                      min={1}
                      max={selectedItem?.quantity || 9999}
                      {...register("quantity", { valueAsNumber: true })}
                      className="h-10"
                    />
                    {selectedItem && (
                      <p className="text-[10px] text-muted-foreground">
                        Available stock: {selectedItem.quantity} {selectedItem.unit}
                      </p>
                    )}
                    {errors.quantity && (
                      <p className="text-xs text-destructive">
                        {errors.quantity.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="vehicleNumber" className="font-medium">
                      Vehicle Number <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="vehicleNumber"
                      placeholder="e.g. RJ31GA9265"
                      className="h-10 font-mono uppercase tracking-wider"
                      {...register("vehicleNumber")}
                    />
                    {errors.vehicleNumber && (
                      <p className="text-xs text-destructive">
                        {errors.vehicleNumber.message}
                      </p>
                    )}
                  </div>
                </div>

                {/* Chassis number & workshop trailer chassis */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="chassisNumber" className="font-medium">
                      Chassis Number <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="chassisNumber"
                      placeholder="e.g. MAT448099L1B12345"
                      className="h-10 font-mono uppercase tracking-wider"
                      {...register("chassisNumber")}
                    />
                    {errors.chassisNumber && (
                      <p className="text-xs text-destructive">
                        {errors.chassisNumber.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label
                      htmlFor="trailerChassisNumber"
                      className="font-medium"
                    >
                      Trailer Chassis <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="trailerChassisNumber"
                      list="chassis-suggestions"
                      placeholder="e.g. CH-00001"
                      className="h-10 font-mono uppercase tracking-wider"
                      autoComplete="off"
                      {...register("trailerChassisNumber")}
                    />
                    <datalist id="chassis-suggestions">
                      {workshopTrailers?.map((t) => (
                        <option key={t.id} value={t.chassisNumber}>
                          {t.model
                            ? `${t.model} · ${t.currentStageName}`
                            : t.currentStageName}
                        </option>
                      ))}
                    </datalist>
                    {errors.trailerChassisNumber && (
                      <p className="text-xs text-destructive">
                        {errors.trailerChassisNumber.message}
                      </p>
                    )}
                  </div>
                </div>

                {/* Installation Status Selector */}
                <div className="space-y-1.5">
                  <Label htmlFor="status" className="font-medium">
                    Installation Status
                  </Label>
                  <Select
                    value={selectedStatus || "installed"}
                    onValueChange={(val) =>
                      setValue("status", val as "installed" | "issued", {
                        shouldValidate: true,
                      })
                    }
                  >
                    <SelectTrigger id="status" className="h-10">
                      <SelectValue placeholder="Select Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="installed">
                        Installed (Mounted on vehicle)
                      </SelectItem>
                      <SelectItem value="issued">
                        Issued (Handed over to worker)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Upload Installation Photos (Optional) */}
                <div className="space-y-2">
                  <Label className="font-medium flex items-center justify-between">
                    <span>Installation Photos (Optional)</span>
                    <span className="text-xs text-muted-foreground font-normal">
                      {photos.length} uploaded
                    </span>
                  </Label>

                  <div className="border-2 border-dashed border-input hover:border-primary/50 transition-colors rounded-xl p-4 text-center bg-muted/10">
                    <label className="cursor-pointer flex flex-col items-center gap-1.5">
                      <div className="rounded-full bg-primary/10 p-2.5 text-primary">
                        <Camera className="h-5 w-5" />
                      </div>
                      <span className="text-xs font-semibold">
                        Click to upload installation photos
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        Optional installation proof for Tyre & Rim (PNG, JPG, WEBP)
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={handlePhotoUpload}
                      />
                    </label>
                  </div>

                  {photoError && (
                    <p className="text-xs text-destructive">{photoError}</p>
                  )}

                  {/* Photo Preview Grid */}
                  {photos.length > 0 && (
                    <div className="grid grid-cols-4 gap-2.5 pt-1">
                      {photos.map((p) => (
                        <div
                          key={p.id}
                          className="group relative aspect-square rounded-lg border border-border overflow-hidden bg-muted"
                        >
                          <img
                            src={p.url}
                            alt={p.name}
                            className="h-full w-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => removePhoto(p.id)}
                            className="absolute top-1 right-1 rounded-full bg-destructive text-destructive-foreground p-0.5 shadow hover:scale-110 transition-transform"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                {/* Consumables Layout: Quantity Only */}
                <div className="space-y-1.5">
                  <Label htmlFor="quantity" className="font-medium">
                    Quantity <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="quantity"
                    type="number"
                    min={1}
                    max={selectedItem?.quantity || 9999}
                    {...register("quantity", { valueAsNumber: true })}
                    className="h-10"
                  />
                  {selectedItem && (
                    <p className="text-xs text-muted-foreground">
                      Available stock: {selectedItem.quantity} {selectedItem.unit}
                    </p>
                  )}
                  {errors.quantity && (
                    <p className="text-xs text-destructive">{errors.quantity.message}</p>
                  )}
                </div>
              </>
            )}

            {/* Notes / Purpose */}
            <div className="space-y-1.5">
              <Label htmlFor="notes" className="font-medium">
                Notes / Purpose (Optional)
              </Label>
              <Textarea
                id="notes"
                placeholder="e.g. Workshop maintenance, axle repair, replacement..."
                className="resize-none h-20 text-sm"
                {...register("notes")}
              />
              {errors.notes && (
                <p className="text-xs text-destructive">{errors.notes.message}</p>
              )}
            </div>
          </div>

          <DialogFooter className="pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
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

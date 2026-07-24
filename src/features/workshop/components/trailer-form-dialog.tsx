"use client";

import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { createTrailerSchema } from "@/lib/domain/schemas";
import { DEFAULT_WORKSHOP_STAGES } from "@/lib/domain/constants";
import { useCreateTrailer } from "../hooks";
import { useWorkersList } from "@/features/issues/hooks";
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
import { Loader2, Plus, Trash2, GripVertical } from "lucide-react";

const UNASSIGNED = "unassigned";

type FormValues = z.input<typeof createTrailerSchema>;

/**
 * Admin dialog to put a new trailer into production. The stage pipeline is
 * pre-filled from the default workshop levels and fully editable — rename,
 * add, remove, and optionally pre-assign a worker to each level.
 */
export function TrailerFormDialog({ trigger }: { trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const createTrailer = useCreateTrailer();
  const { data: workers } = useWorkersList();

  const activeWorkers = workers?.filter((w) => w.active) ?? [];

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(createTrailerSchema),
    defaultValues: {
      chassisNumber: "",
      model: "",
      description: "",
      stages: DEFAULT_WORKSHOP_STAGES.map((name) => ({ name, workerId: "" })),
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "stages" });
  const stageValues = watch("stages");

  const onSubmit = (data: FormValues) => {
    createTrailer.mutate(
      {
        chassisNumber: data.chassisNumber || undefined,
        model: data.model || undefined,
        description: data.description || undefined,
        stages: data.stages.map((s) => ({
          name: s.name,
          workerId: s.workerId || undefined,
        })),
      },
      {
        onSuccess: (res) => {
          toast.success(
            `Trailer ${res.trailer.chassisNumber} entered the workshop.`,
          );
          reset();
          setOpen(false);
        },
        onError: (err) => {
          toast.error(err.message || "Failed to create trailer.");
        },
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
          <DialogTitle>New Trailer Build</DialogTitle>
          <DialogDescription>
            Start a chassis through the production line. Leave the chassis
            number empty to auto-generate one.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="chassisNumber">Chassis Number</Label>
              <Input
                id="chassisNumber"
                placeholder="Auto (CH-00001)"
                className="font-mono uppercase"
                {...register("chassisNumber")}
              />
              {errors.chassisNumber && (
                <p className="text-xs text-destructive">
                  {errors.chassisNumber.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="model">Trailer Model</Label>
              <Input
                id="model"
                placeholder="e.g. 22ft Flatbed"
                {...register("model")}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              rows={2}
              placeholder="Order details, customer, special requirements…"
              {...register("description")}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Production Stages (in order)</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ name: "", workerId: "" })}
                disabled={fields.length >= 12}
              >
                <Plus className="size-3.5" />
                Add Stage
              </Button>
            </div>

            <div className="space-y-2">
              {fields.map((field, index) => (
                <div key={field.id} className="flex items-center gap-2">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                    {index + 1}
                  </span>
                  <GripVertical className="size-4 shrink-0 text-muted-foreground/50" />
                  <Input
                    placeholder={`Stage ${index + 1} name`}
                    className="flex-1"
                    {...register(`stages.${index}.name`)}
                  />
                  <Select
                    value={stageValues?.[index]?.workerId || UNASSIGNED}
                    onValueChange={(val) =>
                      setValue(
                        `stages.${index}.workerId`,
                        val === UNASSIGNED ? "" : val,
                      )
                    }
                  >
                    <SelectTrigger className="w-36 shrink-0">
                      <SelectValue placeholder="Worker" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
                      {activeWorkers.map((w) => (
                        <SelectItem key={w.id} value={w.id}>
                          {w.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => remove(index)}
                    disabled={fields.length <= 1}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
            {errors.stages && (
              <p className="text-xs text-destructive">
                {errors.stages.message ||
                  errors.stages.root?.message ||
                  "Check the stage names — each needs at least 2 characters."}
              </p>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={createTrailer.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createTrailer.isPending}>
              {createTrailer.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Start Production
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

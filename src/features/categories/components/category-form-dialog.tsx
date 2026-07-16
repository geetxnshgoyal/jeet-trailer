"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { createCategorySchema, type CreateCategoryInput } from "@/lib/domain/schemas";
import { useCreateCategory } from "@/features/inventory/hooks";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";

export function CategoryFormDialog({ trigger }: { trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const createCategoryMutation = useCreateCategory();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<z.input<typeof createCategorySchema>>({
    resolver: zodResolver(createCategorySchema),
    defaultValues: {
      name: "",
      trackable: false,
    },
  });

  const isTrackable = watch("trackable");

  const onSubmit = (data: z.input<typeof createCategorySchema>) => {
    createCategoryMutation.mutate({
      name: data.name,
      trackable: !!data.trackable,
    }, {
      onSuccess: (res) => {
        toast.success(`Category "${res.category.name}" created successfully!`);
        reset();
        setOpen(false);
      },
      onError: (err) => {
        toast.error(err.message || "Failed to create category.");
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { setOpen(val); if (!val) reset(); }}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Custom Category</DialogTitle>
          <DialogDescription>
            Create a custom inventory category. Default categories cannot be modified.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Category Name</Label>
            <Input id="name" placeholder="e.g. Engine Part, Paint Spray" {...register("name")} />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <Checkbox
              id="trackable"
              checked={isTrackable}
              onCheckedChange={(val) => setValue("trackable", !!val)}
            />
            <div className="grid gap-1.5 leading-none">
              <Label
                htmlFor="trackable"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Serial Number Tracked
              </Label>
              <p className="text-xs text-muted-foreground">
                Requires unique serial numbers per unit (like Tyres and Rims).
              </p>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={createCategoryMutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createCategoryMutation.isPending}>
              {createCategoryMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Create Category
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

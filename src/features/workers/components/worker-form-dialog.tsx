"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { createWorkerSchema, updateWorkerSchema } from "@/lib/domain/schemas";
import { useCreateWorker, useUpdateWorker } from "../hooks";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import type { AppUser } from "@/lib/domain/types";

type CreateInput = z.infer<typeof createWorkerSchema>;
type FormValues = CreateInput & { active?: boolean };

interface WorkerFormDialogProps {
  readonly worker?: AppUser;
  readonly trigger: React.ReactNode;
}

export function WorkerFormDialog({ worker, trigger }: Readonly<WorkerFormDialogProps>) {
  const [open, setOpen] = useState(false);
  const isEdit = !!worker;

  const createMutation = useCreateWorker();
  const updateMutation = useUpdateWorker(worker?.id || "");

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(isEdit ? updateWorkerSchema : createWorkerSchema),
    defaultValues: isEdit
      ? {
          name: worker.name,
          phone: worker.phone || "",
          role: worker.role,
          active: worker.active,
        }
      : {
          name: "",
          email: "",
          password: "",
          phone: "",
          role: "worker",
        } as any,
  });

  const selectedRole = watch("role");
  const isActive = watch("active");

  const onSubmit = (data: FormValues) => {
    if (isEdit) {
      updateMutation.mutate(data, {
        onSuccess: () => {
          toast.success("Worker profile updated successfully!");
          setOpen(false);
        },
        onError: (err) => {
          toast.error(err.message || "Failed to update worker.");
        },
      });
    } else {
      createMutation.mutate(data, {
        onSuccess: () => {
          toast.success("Worker created and provisioned successfully!");
          reset();
          setOpen(false);
        },
        onError: (err) => {
          toast.error(err.message || "Failed to create worker.");
        },
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { setOpen(val); if (!val) reset(); }}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Worker Profile" : "Provision New Worker"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update settings and permissions for this user."
              : "Register a worker or admin account. Workers cannot self-register."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Full Name</Label>
            <Input id="name" placeholder="John Doe" {...register("name")} />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message?.toString()}</p>
            )}
          </div>

          {!isEdit && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@jeettrailers.com"
                  {...register("email")}
                />
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email.message?.toString()}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Temporary Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Min 6 characters"
                  {...register("password")}
                />
                {errors.password && (
                  <p className="text-xs text-destructive">{errors.password.message?.toString()}</p>
                )}
              </div>
            </>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone (Optional)</Label>
              <Input id="phone" placeholder="e.g. +91 9876543210" {...register("phone")} />
              {errors.phone && (
                <p className="text-xs text-destructive">{errors.phone.message?.toString()}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="role">System Role</Label>
              <Select
                value={selectedRole}
                onValueChange={(val) => setValue("role", val, { shouldValidate: true })}
              >
                <SelectTrigger id="role">
                  <SelectValue placeholder="Select Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="worker">Worker</SelectItem>
                  <SelectItem value="admin">Administrator</SelectItem>
                </SelectContent>
              </Select>
              {errors.role && (
                <p className="text-xs text-destructive">{errors.role.message?.toString()}</p>
              )}
            </div>
          </div>

          {isEdit && (
            <div className="flex items-center space-x-2 pt-2">
              <Checkbox
                id="active"
                checked={isActive}
                onCheckedChange={(val) => setValue("active", !!val)}
              />
              <div className="grid gap-1.5 leading-none">
                <Label
                  htmlFor="active"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Account Active
                </Label>
                <p className="text-xs text-muted-foreground">
                  Disabled workers cannot sign in or issue items.
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
              {(createMutation.isPending || updateMutation.isPending) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {isEdit ? "Save Changes" : "Create Account"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState, type ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ItemForm } from "./item-form";
import type { InventoryItem } from "@/lib/domain/types";

/**
 * Dialog wrapper around {@link ItemForm}. Used for both "Add item" (no item
 * prop) and "Edit item" (item provided). Controls its own open state and closes
 * automatically once the form reports success via onDone.
 */
export function ItemFormDialog({
  item,
  trigger,
}: {
  item?: InventoryItem;
  trigger: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const isEdit = !!item;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit item" : "Add inventory item"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the item's details. Use stock adjust to change quantity."
              : "Record a new item in the workshop inventory."}
          </DialogDescription>
        </DialogHeader>
        <ItemForm item={item} onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

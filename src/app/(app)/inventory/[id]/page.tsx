import { ItemDetail } from "@/features/inventory/components/item-detail";

/** Inventory item detail route. The client component loads item + history. */
export default async function InventoryItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ItemDetail id={id} />;
}

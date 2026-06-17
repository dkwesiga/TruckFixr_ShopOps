import { createItem } from "@/lib/actions/items";
import { ItemForm } from "@/components/items/item-form";
import { PageHeader } from "@/components/layout/page-header";

export default async function NewItemPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string; type?: string }>;
}) {
  const { returnTo, type } = await searchParams;

  return (
    <div>
      <PageHeader title="New Item" backHref={returnTo ?? "/items"} />
      <ItemForm
        action={createItem}
        defaultType={(type === "labour" || type === "part") ? type : "part"}
        returnTo={returnTo}
      />
    </div>
  );
}

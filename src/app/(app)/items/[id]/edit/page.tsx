import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getItem } from "@/lib/queries/items";
import { updateItem } from "@/lib/actions/items";
import { ItemForm } from "@/components/items/item-form";
import { PageHeader } from "@/components/layout/page-header";

export default async function EditItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { companyId: true } });
  if (!dbUser) redirect("/onboarding");

  const item = await getItem(id, dbUser.companyId);
  if (!item) notFound();

  if (item.type === "fee") redirect(`/items/${id}`);

  const action = updateItem.bind(null, id);

  return (
    <div>
      <PageHeader title="Edit Item" backHref={`/items/${id}`} />
      <ItemForm
        action={action}
        defaultType={item.type as "labour" | "part"}
        submitLabel="Save changes"
        defaultValues={{
          name: item.name,
          description: item.description ?? undefined,
          partNumber: item.partNumber ?? undefined,
          cost: item.cost ? Number(item.cost) : null,
          sellPrice: item.sellPrice ? Number(item.sellPrice) : null,
          defaultRate: item.defaultRate ? Number(item.defaultRate) : null,
          defaultTime: item.defaultTime ? Number(item.defaultTime) : null,
          taxable: item.taxable,
          qtyOnHand: item.qtyOnHand ? Number(item.qtyOnHand) : null,
          fitmentMake: item.fitmentMake,
          fitmentModel: item.fitmentModel,
          fitmentYearFrom: item.fitmentYearFrom,
          fitmentYearTo: item.fitmentYearTo,
        }}
      />
    </div>
  );
}

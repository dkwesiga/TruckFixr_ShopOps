import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getItem } from "@/lib/queries/items";
import { deleteItem } from "@/lib/actions/items";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default async function ItemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { companyId: true } });
  if (!dbUser) redirect("/onboarding");

  const item = await getItem(id, dbUser.companyId);
  if (!item) notFound();

  const deleteWithId = deleteItem.bind(null, id);

  return (
    <div>
      <PageHeader
        title={item.name}
        backHref="/items"
        action={
          <Link href={`/items/${id}/edit`} className="text-sm text-[#004787] font-medium px-2 py-1">
            Edit
          </Link>
        }
      />

      <div className="py-4 space-y-4">
        <div className="industrial-card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Badge variant={item.type === "labour" ? "default" : "success"}>{item.type}</Badge>
            {!item.taxable && <Badge variant="warning">Tax exempt</Badge>}
          </div>

          {item.description && <Row label="Description" value={item.description} />}

          {item.type === "part" && (
            <>
              {item.partNumber && <Row label="Part #" value={item.partNumber} mono />}
              {item.cost != null && <Row label="Cost" value={`$${item.cost}`} />}
              {item.sellPrice != null && <Row label="Sell price" value={`$${item.sellPrice}`} />}
              {item.qtyOnHand != null && <Row label="Qty on hand" value={String(item.qtyOnHand)} />}
              {(item.fitmentMake || item.fitmentModel) && (
                <Row
                  label="Fitment"
                  value={[
                    item.fitmentYearFrom,
                    item.fitmentYearTo && item.fitmentYearTo !== item.fitmentYearFrom ? `–${item.fitmentYearTo}` : null,
                    item.fitmentMake,
                    item.fitmentModel,
                  ].filter(Boolean).join(" ")}
                />
              )}
            </>
          )}

          {item.type === "labour" && (
            <>
              {item.defaultRate != null && <Row label="Rate" value={`$${item.defaultRate}/hr`} />}
              {item.defaultTime != null && <Row label="Default time" value={`${item.defaultTime} hr`} />}
            </>
          )}
        </div>

        <div className="pt-2">
          <form action={deleteWithId}>
            <Button
              type="submit"
              variant="destructive"
              size="sm"
              className="w-full"
              onClick={(e) => {
                if (!confirm("Delete this item? This cannot be undone.")) e.preventDefault();
              }}
            >
              Delete item
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  return (
    <div className="flex gap-3">
      <span className="text-xs text-[#858b98] w-20 flex-shrink-0 pt-0.5">{label}</span>
      <span className={`text-sm text-[#424955] flex-1 whitespace-pre-wrap ${mono ? "font-mono text-xs" : ""}`}>
        {value}
      </span>
    </div>
  );
}

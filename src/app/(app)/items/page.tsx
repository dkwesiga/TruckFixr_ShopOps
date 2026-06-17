import Link from "next/link";
import { redirect } from "next/navigation";
import { ItemType } from "@prisma/client";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getItems } from "@/lib/queries/items";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";

export default async function ItemsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { companyId: true } });
  if (!dbUser) redirect("/onboarding");

  const { q, type } = await searchParams;
  const itemType = (type === "labour" || type === "part") ? type as ItemType : undefined;
  const items = await getItems(dbUser.companyId, itemType, q);

  return (
    <div>
      <PageHeader
        title="Item Library"
        action={
          <Link href="/items/new" className="inline-flex items-center rounded-xl bg-[#004787] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#1e5fa8] min-h-9">
            + Add
          </Link>
        }
      />

      <div className="py-3 space-y-3">
        <form method="GET" className="flex gap-2">
          <input
            name="q"
            defaultValue={q}
            placeholder="Search items…"
            className="flex-1 rounded-xl border border-[#c2c6d3] bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#004787]"
          />
          {type && <input type="hidden" name="type" value={type} />}
        </form>

        <div className="flex gap-2">
          {[
            { label: "All", value: "" },
            { label: "Labour", value: "labour" },
            { label: "Parts", value: "part" },
          ].map((tab) => (
            <Link
              key={tab.value}
              href={`/items${tab.value ? `?type=${tab.value}` : ""}${q ? `${tab.value ? "&" : "?"}q=${q}` : ""}`}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                (itemType ?? "") === tab.value
                  ? "bg-[#004787] text-white"
                  : "bg-white border border-[#c2c6d3] text-[#5f6673]"
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </div>

      {items.length === 0 ? (
        <EmptyState
          title={q ? "No items match your search" : "No items yet"}
          description={q ? undefined : "Add labour rates and parts to your library."}
          actionLabel="Add item"
          actionHref="/items/new"
        />
      ) : (
        <ul className="space-y-2 pb-4">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={`/items/${item.id}`}
                className="flex items-center gap-3 industrial-card p-4 active:bg-[#f1f3f9]"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-medium text-[#191c20] text-sm truncate">{item.name}</p>
                    <Badge variant={item.type === "labour" ? "default" : "success"}>
                      {item.type}
                    </Badge>
                  </div>
                  <p className="text-xs text-[#5f6673]">
                    {item.type === "labour"
                      ? `$${item.defaultRate?.toString() ?? "—"}/hr · ${item.defaultTime?.toString() ?? "—"} hr default`
                      : `Sell: $${item.sellPrice?.toString() ?? "—"} · Cost: $${item.cost?.toString() ?? "—"}`}
                  </p>
                  {item.partNumber && (
                    <p className="text-xs text-[#858b98] font-mono mt-0.5">{item.partNumber}</p>
                  )}
                </div>
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="text-[#c2c6d3] flex-shrink-0">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

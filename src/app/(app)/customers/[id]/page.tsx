import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getCustomer } from "@/lib/queries/customers";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { deleteCustomer } from "@/lib/actions/customers";

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { companyId: true } });
  if (!dbUser) redirect("/onboarding");

  const customer = await getCustomer(id, dbUser.companyId);
  if (!customer) notFound();

  const deleteWithId = deleteCustomer.bind(null, id);

  return (
    <div>
      <PageHeader
        title={customer.name}
        backHref="/customers"
        action={
          <Link href={`/customers/${id}/edit`} className="text-sm text-[#004787] font-medium px-2 py-1">
            Edit
          </Link>
        }
      />

      <div className="py-4 space-y-4">
        {/* Info card */}
        <div className="industrial-card p-4 space-y-3">
          {customer.companyName && (
            <Row label="Company" value={customer.companyName} />
          )}
          {customer.contactPerson && (
            <Row label="Contact" value={customer.contactPerson} />
          )}
          {customer.phone && (
            <Row label="Phone">
              <a href={`tel:${customer.phone}`} className="text-[#004787] text-sm">{customer.phone}</a>
            </Row>
          )}
          {customer.email && (
            <Row label="Email">
              <a href={`mailto:${customer.email}`} className="text-[#004787] text-sm">{customer.email}</a>
            </Row>
          )}
          {customer.billingAddress && (
            <Row label="Billing" value={customer.billingAddress} />
          )}
          {customer.paymentTerms && (
            <Row label="Terms" value={customer.paymentTerms} />
          )}
          {customer.notes && (
            <Row label="Notes" value={customer.notes} />
          )}
        </div>

        {/* Vehicles */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="industrial-label">Vehicles</h2>
            <Link
              href={`/vehicles/new?customerId=${id}`}
              className="text-xs text-[#004787] font-medium"
            >
              + Add vehicle
            </Link>
          </div>
          {customer.vehicles.length === 0 ? (
            <p className="text-sm text-[#858b98] py-4 text-center industrial-card">
              No vehicles yet
            </p>
          ) : (
            <ul className="space-y-2">
              {customer.vehicles.map((v) => (
                <li key={v.id}>
                  <Link
                    href={`/vehicles/${v.id}`}
                    className="flex items-center gap-3 industrial-card p-3.5 active:bg-[#f1f3f9]"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#191c20]">
                        {[v.year, v.make, v.model].filter(Boolean).join(" ") || "Unknown vehicle"}
                      </p>
                      <p className="text-xs text-[#5f6673] mt-0.5">
                        {[v.unitNumber && `#${v.unitNumber}`, v.plate].filter(Boolean).join(" · ") || v.vin || "—"}
                      </p>
                    </div>
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="text-[#c2c6d3]">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Counts */}
        <div className="grid grid-cols-2 gap-2">
          <div className="industrial-card p-4 text-center">
            <p className="text-2xl font-bold text-[#191c20]">{customer._count.estimates}</p>
            <p className="text-xs text-[#5f6673] mt-0.5">Estimates</p>
          </div>
          <div className="industrial-card p-4 text-center">
            <p className="text-2xl font-bold text-[#191c20]">{customer._count.invoices}</p>
            <p className="text-xs text-[#5f6673] mt-0.5">Invoices</p>
          </div>
        </div>

        {/* Danger zone */}
        <div className="pt-4">
          <form action={deleteWithId}>
            <Button
              type="submit"
              variant="destructive"
              size="sm"
              className="w-full"
              onClick={(e) => {
                if (!confirm("Delete this customer? This cannot be undone.")) e.preventDefault();
              }}
            >
              Delete customer
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, children }: { label: string; value?: string | null; children?: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="text-xs text-[#858b98] w-16 flex-shrink-0 pt-0.5">{label}</span>
      {children ?? <span className="text-sm text-[#424955] flex-1 whitespace-pre-wrap">{value}</span>}
    </div>
  );
}

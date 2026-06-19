import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { updateCompanyDetails, uploadLogo, removeLogo } from "@/lib/actions/company";
import { PageHeader } from "@/components/layout/page-header";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { CANADIAN_PROVINCES, PROVINCE_TAX } from "@/lib/constants";
import { toNum } from "@/lib/money";
import { extractGstHstNumber, stripGstHstNumber } from "@/lib/company-doc-settings";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { companyId: true } });
  if (!dbUser) redirect("/onboarding");

  const company = await prisma.company.findUnique({ where: { id: dbUser.companyId } });
  if (!company) redirect("/onboarding");

  const { saved, error } = await searchParams;
  const tax = PROVINCE_TAX[company.province] ?? PROVINCE_TAX["ON"];
  const gstHstNumber = extractGstHstNumber(company.termsText);
  const termsText = stripGstHstNumber(company.termsText);

  return (
    <div>
      <PageHeader title="Shop settings" backHref="/more" />

      {saved && (
        <div className="mb-4 rounded-lg bg-[#e8f5e9] border border-[#2e7d32]/30 px-3 py-2 text-sm text-[#2e7d32]">
          Settings saved.
        </div>
      )}
      {error && (
        <div className="mb-4 rounded-lg bg-[#fdecec] border border-[#d32f2f]/30 px-3 py-2 text-sm text-[#d32f2f]">
          {error}
        </div>
      )}

      {/* Logo — separate form (file upload) */}
      <div className="pt-1">
        <h2 className="industrial-label mb-2">Logo</h2>
        <div className="industrial-card p-4 space-y-3">
          {company.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- user logo from Storage
            <img src={company.logoUrl} alt="Shop logo" className="h-14 object-contain" />
          ) : (
            <p className="text-sm text-[#858b98]">No logo uploaded — your shop name is used on documents.</p>
          )}
          <form action={uploadLogo} className="flex items-center gap-2">
            <input type="file" name="logo" accept="image/*" required className="block w-full text-xs text-[#5f6673] file:mr-3 file:rounded-lg file:border-0 file:bg-[#eef4ff] file:px-3 file:py-2 file:text-[#004787]" />
            <Button type="submit" size="sm">Upload</Button>
          </form>
          {company.logoUrl && (
            <form action={removeLogo}>
              <Button type="submit" variant="ghost" size="sm" className="text-[#d32f2f]">Remove logo</Button>
            </form>
          )}
          <p className="text-[11px] text-[#858b98]">PNG or JPG, under 2MB. Shown on estimates &amp; invoices.</p>
        </div>
      </div>

      <form action={updateCompanyDetails} className="py-5 space-y-5">
        <section className="space-y-4">
          <h2 className="industrial-label">Shop details</h2>
          <Input label="Shop name" name="name" required defaultValue={company.name} />
          <Textarea label="Address" name="address" defaultValue={company.address ?? ""} placeholder="Street, city, province, postal code" rows={2} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Phone" name="phone" type="tel" defaultValue={company.phone ?? ""} placeholder="(555) 555-5555" />
            <Input label="Email" name="email" type="email" defaultValue={company.email ?? ""} placeholder="shop@example.com" />
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="industrial-label">Tax &amp; rates</h2>
          <Select
            label="Province"
            name="province"
            defaultValue={company.province}
            options={CANADIAN_PROVINCES.map((p) => ({ value: p.value, label: p.label }))}
            hint={`Tax: ${tax.name} ${Math.round(tax.rate * 100)}% — changing province updates your default tax rate`}
          />
          <Input
            label="Default labour rate ($/hr)"
            name="defaultLabourRate"
            type="number"
            step="0.01"
            min="0"
            defaultValue={toNum(company.defaultLabourRate).toString()}
          />
          <Input
            label="GST/HST number"
            name="gstHstNumber"
            defaultValue={gstHstNumber ?? ""}
            placeholder="e.g. 123456789 RT0001"
            hint="Shown neatly on invoice headers"
          />
        </section>

        <section className="space-y-4">
          <h2 className="industrial-label">Documents &amp; branding</h2>
          <Input label="Document number prefix" name="numberingPrefix" defaultValue={company.numberingPrefix ?? ""} placeholder="Leave blank for EST/INV" hint="Used on new estimates & invoices" />
          <Textarea label="Terms / disclaimer" name="termsText" defaultValue={termsText ?? ""} placeholder="Payment terms, disclaimers shown on documents" rows={3} />
          <Textarea label="Warranty text" name="warrantyText" defaultValue={company.warrantyText ?? ""} placeholder="Warranty statement shown on documents" rows={2} />
        </section>

        <Button type="submit" size="lg" className="w-full">Save settings</Button>
      </form>

      <div className="pb-6">
        <Link href="/settings/labour-templates" className="industrial-card flex items-center justify-between p-4 active:bg-[#f1f3f9]">
          <div>
            <p className="text-sm font-semibold text-[#191c20]">Labour templates</p>
            <p className="text-xs text-[#5f6673] mt-0.5">Manage your common jobs and rates</p>
          </div>
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="text-[#858b98] flex-shrink-0">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </div>
  );
}

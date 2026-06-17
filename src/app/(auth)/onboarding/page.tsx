import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createCompany } from "@/lib/actions/company";
import { CANADIAN_PROVINCES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { DEMO_USER_ID, isPlaceholderDatabaseEnv } from "@/lib/demo-auth";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  if (user.id === DEMO_USER_ID && isPlaceholderDatabaseEnv()) redirect("/dashboard");

  const { prisma } = await import("@/lib/prisma");
  const existing = await prisma.user.findUnique({ where: { id: user.id } });
  if (existing) redirect("/dashboard");

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f9f9ff] px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-7 flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-xl border border-[#d8dbe5] bg-white text-2xl font-black tracking-tight shadow-sm">
            <span className="text-[#004787]">T</span>
            <span className="text-[#f2862e]">F</span>
          </div>
          <h1 className="text-[32px] font-bold leading-10 text-[#004787]">TruckFixr ShopOps</h1>
          <p className="mt-1 text-base leading-6 text-[#5f6673]">Finish setting up your terminal</p>
        </div>

        <form action={createCompany} className="industrial-card space-y-5 p-5">
          <Input
            label="Shop name"
            name="name"
            required
            placeholder="e.g. Smith Truck Repair"
            autoFocus
          />

          <Select
            label="Province"
            name="province"
            defaultValue="ON"
            options={CANADIAN_PROVINCES.map((p) => ({ value: p.value, label: p.label }))}
            hint="Sets your default tax rate automatically"
          />

          <Input
            label="Default labour rate ($/hr)"
            name="defaultLabourRate"
            type="number"
            min="0"
            step="0.01"
            required
            placeholder="e.g. 150"
            hint="Used for new labour lines until you set a specific rate"
          />

          <Button type="submit" size="lg" className="w-full">
            Get Started
          </Button>
        </form>

        <div className="mt-5 rounded-lg border border-dashed border-[#c2c6d3] bg-white px-4 py-3 text-center text-sm leading-5 text-[#5f6673]">
          Tax rates, logo, numbering, and terms can be configured later in Settings.
        </div>
        <p className="mt-5 text-center text-xs font-semibold uppercase tracking-[0.14em] text-[#5f6673]">
          Secure Terminal - ISO 27001
        </p>
      </div>
    </div>
  );
}

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Called once per new company during onboarding (Milestone 2).
// Also usable directly: npx prisma db seed -- --companyId=<uuid>
export async function seedNewCompany(companyId: string) {
  await prisma.$transaction([
    // Default HST rate for Ontario
    prisma.taxRate.create({
      data: {
        companyId,
        name: "HST",
        rate: 0.13,
        province: "ON",
        isDefault: true,
      },
    }),

    // 8 generic heavy-duty labour templates so AI capture has matches immediately
    ...defaultLabourTemplates(companyId).map((t) =>
      prisma.labourTemplate.create({ data: t })
    ),
  ]);
}

function defaultLabourTemplates(companyId: string) {
  return [
    {
      companyId,
      name: "Oil & Filter Change",
      description: "Engine oil and filter service",
      defaultTime: 1.0,
      defaultRate: 150.0,
    },
    {
      companyId,
      name: "Brake Inspection & Adjustment",
      description: "Inspect and adjust foundation brakes, check pads/shoes",
      defaultTime: 2.0,
      defaultRate: 150.0,
    },
    {
      companyId,
      name: "Tire Rotation & Inspection",
      description: "Rotate tires, inspect tread depth and sidewalls",
      defaultTime: 1.5,
      defaultRate: 150.0,
    },
    {
      companyId,
      name: "Air Filter Replacement",
      description: "Replace engine air filter",
      defaultTime: 0.5,
      defaultRate: 150.0,
    },
    {
      companyId,
      name: "Coolant Flush & Fill",
      description: "Drain, flush, and refill cooling system",
      defaultTime: 2.0,
      defaultRate: 150.0,
    },
    {
      companyId,
      name: "DPF Cleaning / Regen Service",
      description: "Diesel particulate filter forced regeneration or off-vehicle cleaning",
      defaultTime: 3.0,
      defaultRate: 150.0,
    },
    {
      companyId,
      name: "Electrical Diagnosis",
      description: "Scan codes, trace fault, document findings",
      defaultTime: 2.0,
      defaultRate: 150.0,
    },
    {
      companyId,
      name: "PM Service (Annual / CVIP Prep)",
      description: "Full preventive maintenance including CVIP readiness inspection",
      defaultTime: 4.0,
      defaultRate: 150.0,
    },
  ];
}

// Standalone seed entry point
async function main() {
  const companyId = process.argv.find((a) => a.startsWith("--companyId="))?.split("=")[1];
  if (!companyId) {
    console.log("Usage: npx prisma db seed -- --companyId=<uuid>");
    process.exit(1);
  }
  await seedNewCompany(companyId);
  console.log(`Seeded company ${companyId}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

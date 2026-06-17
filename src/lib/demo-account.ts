import { DEMO_EMAIL, DEMO_USER_ID } from "@/lib/demo-auth";
import { PROVINCE_TAX } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

const DEMO_COMPANY_NAME = "TruckFixr Demo Shop";
const DEFAULT_LABOUR_RATE = 150;

const DEFAULT_LABOUR_TEMPLATES = [
  { name: "Oil & Filter Change", description: "Engine oil and filter service", defaultTime: 1.0 },
  { name: "Brake Inspection & Adjustment", description: "Inspect and adjust foundation brakes", defaultTime: 2.0 },
  { name: "Tire Rotation & Inspection", description: "Rotate tires, inspect tread and sidewalls", defaultTime: 1.5 },
  { name: "Air Filter Replacement", description: "Replace engine air filter", defaultTime: 0.5 },
  { name: "Coolant Flush & Fill", description: "Drain, flush, and refill cooling system", defaultTime: 2.0 },
  { name: "DPF Cleaning / Regen Service", description: "Diesel particulate filter service", defaultTime: 3.0 },
  { name: "Electrical Diagnosis", description: "Scan codes, trace fault, document findings", defaultTime: 2.0 },
  { name: "PM Service (Annual / CVIP Prep)", description: "Full preventive maintenance inspection", defaultTime: 4.0 },
];

export async function ensureDemoAccount() {
  const existingUser = await prisma.user.findUnique({
    where: { id: DEMO_USER_ID },
    select: { companyId: true },
  });

  if (existingUser) {
    await ensureDemoSeedData(existingUser.companyId);
    return existingUser;
  }

  return prisma.$transaction(async (tx) => {
    const company = await tx.company.create({
      data: {
        name: DEMO_COMPANY_NAME,
        province: "ON",
        defaultLabourRate: DEFAULT_LABOUR_RATE,
        pilotFounderRate: true,
      },
      select: { id: true },
    });

    await tx.user.create({
      data: {
        id: DEMO_USER_ID,
        companyId: company.id,
        email: DEMO_EMAIL,
      },
    });

    await ensureDemoSeedData(company.id, tx);

    return { companyId: company.id };
  });
}

async function ensureDemoSeedData(
  companyId: string,
  tx: typeof prisma | Parameters<Parameters<typeof prisma.$transaction>[0]>[0] = prisma
) {
  const taxCount = await tx.taxRate.count({ where: { companyId } });
  if (taxCount === 0) {
    const tax = PROVINCE_TAX.ON;
    await tx.taxRate.create({
      data: {
        companyId,
        name: tax.name,
        rate: tax.rate,
        province: "ON",
        isDefault: true,
      },
    });
  }

  const labourTemplateCount = await tx.labourTemplate.count({ where: { companyId } });
  if (labourTemplateCount === 0) {
    await tx.labourTemplate.createMany({
      data: DEFAULT_LABOUR_TEMPLATES.map((template) => ({
        companyId,
        ...template,
        defaultRate: DEFAULT_LABOUR_RATE,
      })),
    });
  }
}

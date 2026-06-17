import type { Prisma } from "@prisma/client";

export type Numeric = Prisma.Decimal | number | string | null | undefined;

/** Coerce a Prisma Decimal / number / string to a plain number (0 for null). */
export function toNum(v: Numeric): number {
  if (v == null) return 0;
  if (typeof v === "number") return v;
  const n = parseFloat(v.toString());
  return isNaN(n) ? 0 : n;
}

/** Round to 2 decimal places, avoiding binary float drift. */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** A single line's extended total (quantity × unit price), rounded. */
export function lineTotal(quantity: Numeric, unitPrice: Numeric): number {
  return round2(toNum(quantity) * toNum(unitPrice));
}

/** Format a value as Canadian dollars, e.g. $1,234.50. */
export function formatCurrency(v: Numeric): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
  }).format(toNum(v));
}

/** Format a tax rate (0.13) as a percent label ("13%"). */
export function formatRate(rate: Numeric): string {
  return `${round2(toNum(rate) * 100)}%`;
}

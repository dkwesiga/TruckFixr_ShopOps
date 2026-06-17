export const CANADIAN_PROVINCES = [
  { value: "AB", label: "Alberta" },
  { value: "BC", label: "British Columbia" },
  { value: "MB", label: "Manitoba" },
  { value: "NB", label: "New Brunswick" },
  { value: "NL", label: "Newfoundland and Labrador" },
  { value: "NS", label: "Nova Scotia" },
  { value: "NT", label: "Northwest Territories" },
  { value: "NU", label: "Nunavut" },
  { value: "ON", label: "Ontario" },
  { value: "PE", label: "Prince Edward Island" },
  { value: "QC", label: "Quebec" },
  { value: "SK", label: "Saskatchewan" },
  { value: "YT", label: "Yukon" },
] as const;

// Combined tax rates per province (Phase 1a single-rate simplification)
// Multi-rate GST+PST breakdown deferred to Phase 2
export const PROVINCE_TAX: Record<string, { name: string; rate: number }> = {
  AB: { name: "GST", rate: 0.05 },
  BC: { name: "GST+PST", rate: 0.12 },
  MB: { name: "GST+RST", rate: 0.12 },
  NB: { name: "HST", rate: 0.15 },
  NL: { name: "HST", rate: 0.15 },
  NS: { name: "HST", rate: 0.15 },
  NT: { name: "GST", rate: 0.05 },
  NU: { name: "GST", rate: 0.05 },
  ON: { name: "HST", rate: 0.13 },
  PE: { name: "HST", rate: 0.15 },
  QC: { name: "GST+QST", rate: 0.14975 },
  SK: { name: "GST+PST", rate: 0.11 },
  YT: { name: "GST", rate: 0.05 },
};

export const FREE_PLAN_MONTHLY_DOC_LIMIT = 15;

export const PAYMENT_TERMS_OPTIONS = [
  { value: "Due on receipt", label: "Due on receipt" },
  { value: "Net 15", label: "Net 15" },
  { value: "Net 30", label: "Net 30" },
  { value: "Net 60", label: "Net 60" },
];

export const PAYMENT_METHOD_OPTIONS = [
  { value: "cash", label: "Cash" },
  { value: "debit", label: "Debit" },
  { value: "credit_card", label: "Credit card" },
  { value: "e_transfer", label: "E-transfer" },
  { value: "cheque", label: "Cheque" },
  { value: "other", label: "Other" },
];

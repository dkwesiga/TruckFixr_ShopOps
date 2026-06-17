import type {
  EstimateStatus,
  InvoiceStatus,
  WorkOrderStatus,
} from "@prisma/client";
import { Badge } from "@/components/ui/badge";

type BadgeVariant = "default" | "success" | "warning" | "error" | "ai";

const ESTIMATE: Record<EstimateStatus, { label: string; variant: BadgeVariant }> = {
  draft: { label: "Draft", variant: "default" },
  sent: { label: "Sent", variant: "warning" },
  approved: { label: "Approved", variant: "success" },
  declined: { label: "Declined", variant: "error" },
  converted: { label: "Converted", variant: "success" },
  cancelled: { label: "Cancelled", variant: "default" },
};

const WORK_ORDER: Record<WorkOrderStatus, { label: string; variant: BadgeVariant }> = {
  draft: { label: "Draft", variant: "default" },
  approved: { label: "Approved", variant: "warning" },
  in_progress: { label: "In Progress", variant: "warning" },
  done: { label: "Done", variant: "success" },
  invoiced: { label: "Invoiced", variant: "success" },
};

const INVOICE: Record<InvoiceStatus, { label: string; variant: BadgeVariant }> = {
  draft: { label: "Draft", variant: "default" },
  sent: { label: "Sent", variant: "warning" },
  paid: { label: "Paid", variant: "success" },
  partially_paid: { label: "Partially Paid", variant: "warning" },
  overdue: { label: "Overdue", variant: "error" },
  void: { label: "Void", variant: "default" },
};

export function EstimateStatusBadge({ status }: { status: EstimateStatus }) {
  const s = ESTIMATE[status];
  return <Badge variant={s.variant}>{s.label}</Badge>;
}

export function WorkOrderStatusBadge({ status }: { status: WorkOrderStatus }) {
  const s = WORK_ORDER[status];
  return <Badge variant={s.variant}>{s.label}</Badge>;
}

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  const s = INVOICE[status];
  return <Badge variant={s.variant}>{s.label}</Badge>;
}

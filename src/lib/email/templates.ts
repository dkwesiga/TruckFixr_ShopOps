import { formatCurrency } from "@/lib/money";

interface EmailDoc {
  subject: string;
  html: string;
}

function shell(title: string, bodyInner: string, footer?: string): string {
  return `
  <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#191c20;">
    <h1 style="font-size:20px;margin:0 0 16px;">${esc(title)}</h1>
    ${bodyInner}
    ${footer ? `<p style="font-size:12px;color:#858b98;margin-top:24px;border-top:1px solid #e5e7eb;padding-top:12px;">${footer}</p>` : ""}
  </div>`;
}

function button(href: string, label: string): string {
  return `<a href="${esc(href)}" style="display:inline-block;background:#004787;color:#fff;text-decoration:none;font-weight:600;padding:12px 20px;border-radius:8px;font-size:14px;">${esc(label)}</a>`;
}

export function estimateApprovalEmail(args: {
  companyName: string;
  customerName: string;
  number: string;
  total: number;
  approvalUrl: string;
  expiry?: Date | null;
}): EmailDoc {
  const body = `
    <p style="font-size:14px;line-height:1.6;">Hi ${esc(args.customerName)},</p>
    <p style="font-size:14px;line-height:1.6;">${esc(args.companyName)} has prepared estimate <strong>${esc(args.number)}</strong> for your review, totalling <strong>${formatCurrency(args.total)}</strong>.</p>
    <p style="font-size:14px;line-height:1.6;">You can review the details and approve or decline online:</p>
    <p style="margin:20px 0;">${button(args.approvalUrl, "Review estimate")}</p>
    ${args.expiry ? `<p style="font-size:13px;color:#5f6673;">This link is valid until ${fmtDate(args.expiry)}.</p>` : ""}`;
  return {
    subject: `Estimate ${args.number} from ${args.companyName}`,
    html: shell(`Estimate ${args.number}`, body, `Sent by ${esc(args.companyName)} via TruckFixr ShopOps.`),
  };
}

export function invoiceEmail(args: {
  companyName: string;
  customerName: string;
  number: string;
  total: number;
  balanceDue: number;
  dueDate?: Date | null;
  paymentTerms?: string | null;
  termsText?: string | null;
  lines: { description: string; quantity: number; unitPrice: number; total: number }[];
}): EmailDoc {
  const rows = args.lines
    .map(
      (l) => `
      <tr>
        <td style="padding:6px 0;font-size:13px;">${esc(l.description)}</td>
        <td style="padding:6px 0;font-size:13px;text-align:right;">${l.quantity}</td>
        <td style="padding:6px 0;font-size:13px;text-align:right;">${formatCurrency(l.total)}</td>
      </tr>`
    )
    .join("");

  const body = `
    <p style="font-size:14px;line-height:1.6;">Hi ${esc(args.customerName)},</p>
    <p style="font-size:14px;line-height:1.6;">Please find invoice <strong>${esc(args.number)}</strong> from ${esc(args.companyName)} below.</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;">
      <thead>
        <tr style="border-bottom:1px solid #c2c6d3;">
          <th style="text-align:left;font-size:11px;color:#5f6673;text-transform:uppercase;padding-bottom:6px;">Description</th>
          <th style="text-align:right;font-size:11px;color:#5f6673;text-transform:uppercase;padding-bottom:6px;">Qty</th>
          <th style="text-align:right;font-size:11px;color:#5f6673;text-transform:uppercase;padding-bottom:6px;">Amount</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <p style="font-size:15px;text-align:right;margin:4px 0;"><strong>Total: ${formatCurrency(args.total)}</strong></p>
    ${args.balanceDue > 0 ? `<p style="font-size:15px;text-align:right;margin:4px 0;color:#b95c14;"><strong>Balance due: ${formatCurrency(args.balanceDue)}</strong></p>` : `<p style="font-size:14px;text-align:right;color:#2e7d32;">Paid in full — thank you!</p>`}
    ${args.dueDate ? `<p style="font-size:13px;color:#5f6673;">Due ${fmtDate(args.dueDate)}${args.paymentTerms ? ` · ${esc(args.paymentTerms)}` : ""}.</p>` : ""}
    ${args.termsText ? `<p style="font-size:12px;color:#5f6673;white-space:pre-line;margin-top:12px;">${esc(args.termsText)}</p>` : ""}`;

  return {
    subject: `Invoice ${args.number} from ${args.companyName}`,
    html: shell(`Invoice ${args.number}`, body, `Sent by ${esc(args.companyName)} via TruckFixr ShopOps.`),
  };
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function fmtDate(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "short", day: "numeric" }).format(d);
}

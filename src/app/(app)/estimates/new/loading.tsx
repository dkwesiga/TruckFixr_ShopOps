import { PageHeader } from "@/components/layout/page-header";

export default function NewEstimateLoading() {
  return (
    <div className="space-y-4">
      <PageHeader title="New Estimate" backHref="/estimates" />
      <div className="industrial-card space-y-4 p-5">
        <div className="h-4 w-48 rounded bg-[#e3e6ee]" />
        <div className="grid grid-cols-2 gap-2 rounded-lg border border-[#d8dbe5] bg-[#f9f9ff] p-1">
          <div className="h-10 rounded-md bg-white shadow-sm" />
          <div className="h-10 rounded-md bg-[#eef0f5]" />
        </div>
        <div className="space-y-2">
          <div className="h-4 w-24 rounded bg-[#e3e6ee]" />
          <div className="h-12 rounded-lg border border-[#c2c6d3] bg-white" />
          <div className="h-28 rounded-lg border border-[#e3e6ee] bg-white" />
        </div>
        <div className="space-y-2">
          <div className="h-4 w-36 rounded bg-[#e3e6ee]" />
          <div className="h-24 rounded-lg border border-[#c2c6d3] bg-white" />
        </div>
        <div className="h-12 rounded-lg bg-[#004787]" />
      </div>
    </div>
  );
}

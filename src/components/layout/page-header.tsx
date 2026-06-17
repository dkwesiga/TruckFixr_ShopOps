import Link from "next/link";

interface PageHeaderProps {
  title: string;
  backHref?: string;
  action?: React.ReactNode;
}

export function PageHeader({ title, backHref, action }: PageHeaderProps) {
  return (
    <header className="mb-4 flex min-h-14 items-center gap-3 border-b border-[#c2c6d3] bg-[#f9f9ff] py-3">
      {backHref && (
        <Link
          href={backHref}
          className="-ml-1 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg text-[#424955] hover:bg-[#f1f3f9]"
          aria-label="Back"
        >
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
      )}
      <h1 className="flex-1 truncate text-2xl font-bold leading-8 text-[#191c20]">{title}</h1>
      {action && <div className="flex-shrink-0">{action}</div>}
    </header>
  );
}

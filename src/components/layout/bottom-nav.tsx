"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  {
    href: "/dashboard",
    label: "Home",
    icon: (
      <svg width="23" height="23" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.9}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.5 11.5 12 4l8.5 7.5" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M5.5 10.5V20h4.25v-5.25h4.5V20h4.25v-9.5" />
      </svg>
    ),
  },
  {
    href: "/estimates",
    label: "Estimates",
    icon: (
      <svg width="23" height="23" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.9}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 3.75h6.5L18 8.25V20.25H7a2 2 0 0 1-2-2V5.75a2 2 0 0 1 2-2Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 3.75V8.25H18M8.5 12.25h7M8.5 16h5" />
      </svg>
    ),
  },
  {
    href: "/customers",
    label: "Customers",
    icon: (
      <svg width="23" height="23" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.9}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 19.25c0-2.35-2.01-4.25-4.5-4.25s-4.5 1.9-4.5 4.25" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 12.25a3.75 3.75 0 1 0 0-7.5 3.75 3.75 0 0 0 0 7.5ZM18.5 10.5a2.75 2.75 0 0 1 0 5M5.5 10.5a2.75 2.75 0 0 0 0 5" />
      </svg>
    ),
  },
  {
    href: "/invoices",
    label: "Invoices",
    icon: (
      <svg width="23" height="23" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.9}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.5 3.75h11v16.5l-2.75-1.5-2.75 1.5-2.75-1.5-2.75 1.5V3.75Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 8.25h6M9 12h6M9 15.75h3.5" />
      </svg>
    ),
  },
  {
    href: "/more",
    label: "More",
    icon: (
      <svg width="23" height="23" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.9}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 7.5h14M5 12h14M5 16.5h14" />
      </svg>
    ),
  },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-[#c2c6d3] bg-white pb-safe shadow-[0_-8px_24px_rgba(0,0,0,0.05)]">
      <div className="mx-auto grid max-w-5xl grid-cols-5 px-2 pt-2">
        {navItems.map((item) => {
          const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[10px] font-semibold transition-colors ${
                active ? "bg-[#f2862e] text-white" : "text-[#5f6673] hover:bg-[#f1f3f9]"
              }`}
            >
              {item.icon}
              <span className="leading-none">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

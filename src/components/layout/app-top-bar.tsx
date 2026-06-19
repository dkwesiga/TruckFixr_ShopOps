"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const drawerLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/estimates", label: "Estimates" },
  { href: "/invoices", label: "Invoices" },
  { href: "/customers", label: "Customers" },
  { href: "/vehicles", label: "Vehicles" },
  { href: "/items", label: "Items & Labour" },
  { href: "/receivables", label: "Receivables" },
  { href: "/more", label: "More" },
];

function initialsFrom(email?: string | null, name?: string | null) {
  const source = name || email || "ShopOps";
  const parts = source
    .replace(/@.*/, "")
    .split(/\s+|[._-]/)
    .filter(Boolean);
  return (parts[0]?.[0] ?? "S").toUpperCase() + (parts[1]?.[0] ?? "").toUpperCase();
}

export function AppTopBar({
  email,
  companyName,
}: {
  email?: string | null;
  companyName?: string | null;
}) {
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const initials = initialsFrom(email, companyName);

  function warmRoute(href: string) {
    router.prefetch(href);
    if (href === "/estimates") router.prefetch("/estimates/new");
  }

  async function signOut() {
    setSigningOut(true);
    const supabase = createClient();
    await Promise.all([
      supabase.auth.signOut().catch(() => null),
      fetch("/api/demo-login", { method: "DELETE" }).catch(() => null),
    ]);
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="fixed inset-x-0 top-0 z-30 border-b border-[#c2c6d3] bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-5xl items-center gap-3 px-4">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="-ml-1 flex h-11 w-11 items-center justify-center rounded-lg text-[#191c20] hover:bg-[#f1f3f9]"
          aria-label="Open menu"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/TruckFixr ShopOps.png" alt="TruckFixr ShopOps" className="h-8 w-auto" />
        <div className="ml-auto relative">
          <button
            type="button"
            onClick={() => setProfileOpen((open) => !open)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#004787] text-sm font-bold text-white shadow-sm hover:bg-[#1e5fa8] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f2862e] focus-visible:ring-offset-2"
            aria-label="Open profile menu"
            aria-expanded={profileOpen}
          >
            {initials}
          </button>

          {profileOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-lg border border-[#c2c6d3] bg-white p-2 shadow-lg">
              <div className="border-b border-[#e3e6ee] px-3 py-2">
                <p className="truncate text-sm font-semibold text-[#191c20]">{companyName ?? "ShopOps"}</p>
                {email && <p className="truncate text-xs text-[#5f6673]">{email}</p>}
              </div>
              <Link
                href="/more"
                onClick={() => setProfileOpen(false)}
                className="block rounded-md px-3 py-2 text-sm font-medium text-[#191c20] hover:bg-[#f1f3f9]"
              >
                Profile
              </Link>
              <Link
                href="/settings"
                onClick={() => setProfileOpen(false)}
                className="block rounded-md px-3 py-2 text-sm font-medium text-[#191c20] hover:bg-[#f1f3f9]"
              >
                Shop settings
              </Link>
              <button
                type="button"
                onClick={signOut}
                disabled={signingOut}
                className="w-full rounded-md px-3 py-2 text-left text-sm font-semibold text-[#d32f2f] hover:bg-[#fdecec] disabled:opacity-50"
              >
                {signingOut ? "Signing out..." : "Sign out"}
              </button>
            </div>
          )}
        </div>
      </div>

      {drawerOpen && (
        <div className="fixed inset-0 top-16 z-40">
          <button
            type="button"
            aria-label="Close menu backdrop"
            className="absolute inset-0 bg-black/25"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="relative h-[calc(100vh-4rem)] w-[min(22rem,88vw)] border-r border-[#c2c6d3] bg-white shadow-xl">
            <div className="flex h-full flex-col p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-bold text-[#191c20]">ShopOps</p>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-lg text-[#5f6673] hover:bg-[#f1f3f9]"
                  aria-label="Close menu"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" d="M6 6l12 12M18 6 6 18" />
                  </svg>
                </button>
              </div>

              <nav className="space-y-1">
                {drawerLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onMouseEnter={() => warmRoute(link.href)}
                    onFocus={() => warmRoute(link.href)}
                    onClick={() => setDrawerOpen(false)}
                    className="block rounded-lg px-3 py-3 text-sm font-semibold text-[#191c20] hover:bg-[#f1f3f9]"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>

              <Link
                href="/estimates/new"
                onMouseEnter={() => router.prefetch("/estimates/new")}
                onFocus={() => router.prefetch("/estimates/new")}
                onClick={() => setDrawerOpen(false)}
                className="mt-4 rounded-lg bg-[#004787] px-3 py-3 text-center text-sm font-bold text-white hover:bg-[#1e5fa8]"
              >
                New estimate
              </Link>
            </div>
          </aside>
        </div>
      )}
    </header>
  );
}

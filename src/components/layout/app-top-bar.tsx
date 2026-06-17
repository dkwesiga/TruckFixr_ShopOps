export function AppTopBar() {
  return (
    <header className="fixed inset-x-0 top-0 z-30 border-b border-[#c2c6d3] bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-5xl items-center gap-3 px-4">
        <button
          type="button"
          className="-ml-1 flex h-11 w-11 items-center justify-center rounded-lg text-[#191c20] hover:bg-[#f1f3f9]"
          aria-label="Open menu"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/TruckFixr ShopOps.png" alt="TruckFixr ShopOps" className="h-8 w-auto" />
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#004787] text-sm font-bold text-white">
          DS
        </div>
      </div>
    </header>
  );
}

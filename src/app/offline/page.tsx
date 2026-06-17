export const metadata = { title: "Offline — TruckFixr ShopOps" };

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-6 bg-[#f9f9ff]">
      <div className="w-16 h-16 rounded-lg bg-[#004787] flex items-center justify-center mb-5">
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L4 17l3 3 5.3-5.3a4 4 0 0 0 5.4-5.4l-2.3 2.3-2.7-.7-.7-2.7 2.4-2.2Z" />
        </svg>
      </div>
      <h1 className="text-xl font-bold text-[#191c20]">You’re offline</h1>
      <p className="text-sm text-[#5f6673] mt-2 max-w-xs">
        Reconnect to load this page. Anything you’ve already captured stays on this device and will sync once you’re back online.
      </p>
    </div>
  );
}

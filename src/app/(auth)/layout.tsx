export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f1f3f9] flex flex-col">
      {children}
    </div>
  );
}

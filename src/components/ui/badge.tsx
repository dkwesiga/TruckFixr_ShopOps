type BadgeVariant = "default" | "success" | "warning" | "error" | "ai";

const variants: Record<BadgeVariant, string> = {
  default: "bg-[#eef0f5] text-[#424955]",
  success: "bg-[#e8f5e9] text-[#2e7d32]",
  warning: "bg-[#fff3e8] text-[#b95c14]",
  error: "bg-[#fdecec] text-[#d32f2f]",
  ai: "bg-[#eef4ff] text-[#004787]",
};

export function Badge({
  children,
  variant = "default",
}: {
  children: React.ReactNode;
  variant?: BadgeVariant;
}) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${variants[variant]}`}>
      {children}
    </span>
  );
}

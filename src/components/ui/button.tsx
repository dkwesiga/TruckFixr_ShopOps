import { type ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost" | "destructive";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const variants: Record<Variant, string> = {
  primary:
    "bg-[#004787] text-white hover:bg-[#1e5fa8] active:bg-[#003a70] disabled:bg-[#9db7d1]",
  secondary:
    "bg-white text-[#004787] border border-[#c2c6d3] hover:bg-[#f1f3f9] active:bg-[#e8ebf3] disabled:opacity-50",
  ghost:
    "text-[#5f6673] hover:bg-[#f1f3f9] active:bg-[#e8ebf3] disabled:opacity-50",
  destructive:
    "bg-[#d32f2f] text-white hover:bg-[#b32626] active:bg-[#8f1f1f] disabled:opacity-50",
};

const sizes: Record<Size, string> = {
  sm: "px-3 py-1.5 text-sm min-h-9",
  md: "px-4 py-2.5 text-sm min-h-11",
  lg: "px-5 py-3 text-base min-h-12",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", loading, children, className = "", disabled, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f2862e] focus-visible:ring-offset-2 ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {loading && (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {children}
    </button>
  )
);
Button.displayName = "Button";

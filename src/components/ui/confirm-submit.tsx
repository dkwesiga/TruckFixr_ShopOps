"use client";

import { Button } from "@/components/ui/button";

type Variant = "primary" | "secondary" | "ghost" | "destructive";
type Size = "sm" | "md" | "lg";

/**
 * A submit button that asks for confirmation before allowing its parent form to
 * submit. Lives in a client component so the onClick handler is valid (server
 * components can't attach event handlers).
 */
export function ConfirmSubmit({
  children,
  message,
  variant = "destructive",
  size = "sm",
  className = "",
  disabled = false,
}: {
  children: React.ReactNode;
  message: string;
  variant?: Variant;
  size?: Size;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <Button
      type="submit"
      variant={variant}
      size={size}
      className={className}
      disabled={disabled}
      onClick={(e) => {
        if (!confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </Button>
  );
}

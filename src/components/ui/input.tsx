import { type InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className = "", id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-semibold text-[#424955]">
            {label}
            {props.required && <span className="text-[#d32f2f] ml-0.5">*</span>}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`w-full rounded-lg border px-3.5 py-3 text-base text-[#191c20] placeholder:text-[#858b98] focus:outline-none focus:ring-2 focus:ring-[#004787] transition-colors min-h-12 ${
            error ? "border-[#d32f2f] bg-red-50" : "border-[#c2c6d3] bg-white"
          } ${className}`}
          {...props}
        />
        {hint && !error && <p className="text-xs text-[#5f6673]">{hint}</p>}
        {error && <p className="text-xs text-[#d32f2f]">{error}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";

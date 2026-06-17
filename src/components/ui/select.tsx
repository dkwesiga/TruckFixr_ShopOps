import { type SelectHTMLAttributes, forwardRef } from "react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, hint, options, placeholder, className = "", id, ...props }, ref) => {
    const selectId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={selectId} className="text-sm font-semibold text-[#424955]">
            {label}
            {props.required && <span className="text-[#d32f2f] ml-0.5">*</span>}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={`w-full rounded-lg border px-3.5 py-3 text-base text-[#191c20] focus:outline-none focus:ring-2 focus:ring-[#004787] transition-colors min-h-12 bg-white ${
            error ? "border-[#d32f2f] bg-red-50" : "border-[#c2c6d3]"
          } ${className}`}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {hint && !error && <p className="text-xs text-[#5f6673]">{hint}</p>}
        {error && <p className="text-xs text-[#d32f2f]">{error}</p>}
      </div>
    );
  }
);
Select.displayName = "Select";

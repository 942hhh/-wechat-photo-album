import { cn } from "@/lib/utils";
import { InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-zinc-600 mb-1.5">{label}</label>
        )}
        <input
          ref={ref}
          className={cn(
            "w-full h-11 px-3 rounded-lg border bg-white text-base",
            "border-zinc-200 focus:border-[#07c160] focus:ring-2 focus:ring-[#07c160]/20 focus:outline-none",
            "placeholder:text-zinc-400",
            error && "border-red-400 focus:border-red-400 focus:ring-red-400/20",
            className
          )}
          {...props}
        />
        {error && <p className="mt-2 text-sm text-red-500 font-medium">{error}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";

import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

export function Button({
  variant = "primary",
  size = "md",
  loading,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center rounded-lg font-medium transition-all active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none cursor-pointer touch-manipulation select-none";

  const variants: Record<string, string> = {
    primary: "bg-[#07c160] text-white active:bg-[#06ad56]",
    secondary: "bg-white text-[#07c160] border border-[#07c160] active:bg-[#f0fff5]",
    ghost: "bg-transparent text-zinc-600 active:bg-zinc-100",
    danger: "bg-red-500 text-white active:bg-red-600",
  };

  const sizes: Record<string, string> = {
    sm: "h-8 px-3 text-sm rounded-md",
    md: "h-11 px-5 text-base",
    lg: "h-12 px-6 text-lg rounded-xl",
  };

  return (
    <button
      className={cn(base, variants[variant], sizes[size], className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  );
}
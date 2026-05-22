import { cn } from "@/lib/utils";
import { ImageIcon } from "@/components/ui/Icons";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  subtitle,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-16 px-4 text-center",
        className
      )}
    >
      <span className="mb-4 text-zinc-300">
        {icon ?? <ImageIcon size={56} />}
      </span>
      <h3 className="text-lg font-medium text-zinc-700 mb-1">{title}</h3>
      {subtitle && (
        <p className="text-sm text-zinc-400 max-w-xs">{subtitle}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

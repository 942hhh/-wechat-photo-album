"use client";

import { useRouter } from "next/navigation";
import { ChevronLeftIcon } from "@/components/ui/Icons";

interface AppHeaderProps {
  title: string | React.ReactNode;
  showBack?: boolean;
  backHref?: string;
  rightAction?: React.ReactNode;
}

export function AppHeader({
  title,
  showBack,
  backHref,
  rightAction,
}: AppHeaderProps) {
  const router = useRouter();

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-xl border-b border-zinc-100 pt-safe">
      <div className="flex items-center h-11 px-3">
        <div className="w-10 flex items-center">
          {showBack && (
            <button
              onClick={() => (backHref ? router.push(backHref) : router.back())}
              aria-label="返回"
              className="flex items-center justify-center w-10 h-10 -ml-1 rounded-full text-zinc-600 active:bg-zinc-100"
            >
              <ChevronLeftIcon size={22} />
            </button>
          )}
        </div>
        <h1 className="flex-1 text-center text-[17px] font-semibold truncate">
          {title}
        </h1>
        <div className="flex justify-end flex-shrink-0 max-w-[100px]">{rightAction}</div>
      </div>
    </header>
  );
}

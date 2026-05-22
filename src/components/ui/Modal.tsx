"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { CloseIcon } from "@/components/ui/Icons";

interface ModalProps {
  open: boolean;
  onClose?: () => void;
  title?: string;
  children: React.ReactNode;
  fullScreen?: boolean;
}

export function Modal({ open, onClose, title, children, fullScreen = false }: ModalProps) {
  const [mounted, setMounted] = useState(false);

  // 确保只在客户端渲染 Portal，避免 SSR hydration 不匹配
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (open) {
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
    } else {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    }
    return () => {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    };
  }, [open, mounted]);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        pointerEvents: "none",
      }}
    >
      {/* 背景遮罩 - 点击关闭 */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0,0,0,0.4)",
          pointerEvents: "auto",
          zIndex: 0,
        }}
      />
      {/* 内容区域 */}
      <div
        className={cn(
          "relative bg-white rounded-2xl shadow-xl flex flex-col",
          fullScreen ? "w-full h-full" : "w-full max-w-md",
        )}
        style={{
          minWidth: 280,
          maxHeight: "85vh",
          zIndex: 1,
          pointerEvents: "auto",
        }}
      >
        {title ? (
          <div className="shrink-0 flex items-center border-b border-zinc-100 px-4 py-3.5 rounded-t-2xl bg-white">
            <h2 className="flex-1 text-[17px] font-semibold text-center">{title}</h2>
            {onClose && (
              <button
                onClick={onClose}
                aria-label="关闭"
                className="w-11 h-11 flex items-center justify-center rounded-full text-zinc-400 active:bg-zinc-100 shrink-0 -mr-2"
              >
                <CloseIcon size={20} />
              </button>
            )}
          </div>
        ) : (
          onClose && (
            <button
              onClick={onClose}
              aria-label="关闭"
              className="absolute top-3 right-3 z-10 w-11 h-11 flex items-center justify-center rounded-full bg-black/20 text-white active:bg-black/30"
            >
              <CloseIcon size={20} />
            </button>
          )
        )}
        <div className="overflow-y-auto px-4 py-4" style={{ overscrollBehavior: "contain" }}>
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
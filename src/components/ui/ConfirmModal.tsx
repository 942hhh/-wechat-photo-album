"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { AlertTriangleIcon, TrashIcon } from "@/components/ui/Icons";

interface ConfirmModalProps {
  open: boolean;
  onClose?: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  loading?: boolean;
}

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "确定",
  cancelText = "取消",
  danger = false,
  loading = false,
}: ConfirmModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
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
  }, [open]);

  if (!open) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) {
      onClose?.();
    }
  };

  const modal = (
    <div
      ref={overlayRef}
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
      }}
      onClick={handleOverlayClick}
    >
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0,0,0,0.4)",
        }}
      />
      <div
        className={cn(
          "relative bg-white rounded-2xl shadow-xl overflow-hidden",
          "w-full max-w-sm",
        )}
        style={{
          minWidth: 280,
          zIndex: 1,
        }}
      >
        <div className="flex flex-col items-center px-6 py-6">
          <div
            className={cn(
              "w-16 h-16 rounded-full flex items-center justify-center mb-4",
              danger
                ? "bg-red-100 text-red-500"
                : "bg-yellow-100 text-yellow-500"
            )}
          >
            {danger ? (
              <TrashIcon size={32} />
            ) : (
              <AlertTriangleIcon size={32} />
            )}
          </div>

          <h3 className="text-lg font-semibold text-zinc-800 mb-2 text-center">
            {title}
          </h3>

          <p className="text-sm text-zinc-600 text-center leading-relaxed">
            {message}
          </p>
        </div>

        <div className="flex border-t border-zinc-100">
          <button
            onClick={onClose}
            disabled={loading}
            className={cn(
              "flex-1 py-3 text-sm font-medium transition-colors",
              "text-zinc-600 hover:text-zinc-800",
              "hover:bg-zinc-50",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            {cancelText}
          </button>
          <div className="w-px bg-zinc-100" />
          <button
            onClick={onConfirm}
            disabled={loading}
            className={cn(
              "flex-1 py-3 text-sm font-medium transition-colors",
              danger
                ? "text-red-500 hover:text-red-600 hover:bg-red-50"
                : "text-blue-500 hover:text-blue-600 hover:bg-blue-50",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            {loading ? "处理中..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document !== "undefined") {
    return createPortal(modal, document.body);
  }
  return modal;
}

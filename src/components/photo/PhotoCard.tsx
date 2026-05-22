"use client";

import { useState } from "react";
import Link from "next/link";
import { HeartFilledIcon, MessageCircleIcon, TrashIcon } from "@/components/ui/Icons";
import { useToast } from "@/components/ui/Toast";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

interface PhotoCardProps {
  id: string;
  thumbnailUrl: string;
  likeCount: number;
  commentCount: number;
  onDelete?: () => void;
  selectMode?: boolean;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
}

export function PhotoCard({
  id,
  thumbnailUrl,
  likeCount,
  commentCount,
  onDelete,
  selectMode = false,
  selected = false,
  onToggleSelect,
}: PhotoCardProps) {
  const [loaded, setLoaded] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const { toast } = useToast();

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/photos/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error);
      }
      toast("照片已删除");
      onDelete?.();
    } catch {
      toast("删除失败");
    } finally {
      setDeleting(false);
      setShowConfirm(false);
    }
  };

  const imageContent = (
    <>
      {/* 低质量占位图 - 渐进式加载效果 */}
      {!loaded && (
        <div className="absolute inset-0 bg-zinc-100">
          <img
            src={thumbnailUrl}
            alt=""
            className="w-full h-full object-cover blur-md opacity-40"
            style={{ filter: "blur(8px)" }}
          />
        </div>
      )}
      <img
        src={thumbnailUrl}
        alt=""
        className={`w-full h-full object-cover transition-all duration-500 ease-out ${
          loaded ? "opacity-100 scale-100" : "opacity-0 scale-105"
        }`}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        decoding="async"
        sizes="100px"
      />

      {/* 选择模式下的复选框 */}
      {selectMode && (
        <div
          className="absolute top-1 left-1 z-10"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onToggleSelect?.(id);
          }}
        >
          <div
            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
              selected
                ? "bg-[#07c160] border-[#07c160]"
                : "bg-black/30 border-white"
            }`}
          >
            {selected && (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
        </div>
      )}

      {/* 非选择模式下的删除按钮 */}
      {!selectMode && (
        <div className="absolute top-1 right-1 z-10">
          <button
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setShowConfirm(true);
            }}
            disabled={deleting}
            aria-label="删除照片"
            className="w-7 h-7 flex items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60 active:bg-black/70 transition-colors"
          >
            {deleting ? (
              <span className="text-xs">⋯</span>
            ) : (
              <TrashIcon size={14} />
            )}
          </button>
        </div>
      )}

      {(likeCount > 0 || commentCount > 0) && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-1.5 flex gap-2.5">
          {likeCount > 0 && (
            <span className="text-white text-[10px] flex items-center gap-0.5">
              <HeartFilledIcon size={12} /> {likeCount}
            </span>
          )}
          {commentCount > 0 && (
            <span className="text-white text-[10px] flex items-center gap-0.5">
              <MessageCircleIcon size={12} /> {commentCount}
            </span>
          )}
        </div>
      )}
    </>
  );

  const cardClasses = "block aspect-square bg-zinc-100 relative overflow-hidden transition-transform";

  return (
    <>
      {selectMode ? (
        <div
          className={`${cardClasses} cursor-pointer ${selected ? "ring-2 ring-[#07c160] ring-inset" : ""}`}
          onClick={() => onToggleSelect?.(id)}
        >
          {imageContent}
        </div>
      ) : (
        <Link
          href={`/photo/${id}`}
          className={`${cardClasses} active:scale-[0.96]`}
        >
          {imageContent}
        </Link>
      )}

      <ConfirmModal
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleDelete}
        title="删除照片"
        message="确定要删除这张照片吗？此操作不可恢复。"
        confirmText="删除"
        cancelText="取消"
        danger
        loading={deleting}
      />
    </>
  );
}

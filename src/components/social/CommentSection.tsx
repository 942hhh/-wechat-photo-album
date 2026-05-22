"use client";

import { useState, useCallback } from "react";
import { CommentItem } from "./CommentItem";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { MessageCircleIcon, SendIcon } from "@/components/ui/Icons";

interface Comment {
  id: string;
  memberId: string;
  content: string;
  createdAt: string;
  nickname?: string;
}

interface CommentSectionProps {
  photoId: string;
  memberId: string;
  memberNickname: string;
  initialComments: Comment[];
  onRefresh: () => void;
}

export function CommentSection({
  photoId,
  memberId,
  memberNickname,
  initialComments,
  onRefresh,
}: CommentSectionProps) {
  const [input, setInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const handleAdd = useCallback(
    async () => {
      if (!input.trim()) return;
      setSubmitting(true);
      try {
        const res = await fetch("/api/comments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            photoId,
            memberId,
            content: input.trim(),
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        setInput("");
        onRefresh();
        toast("评论成功");
      } catch {
        toast("评论失败");
      } finally {
        setSubmitting(false);
      }
    },
    [input, photoId, memberId, onRefresh, toast]
  );

  const handleDelete = useCallback(
    async (commentId: string) => {
      try {
        await fetch(`/api/comments/${commentId}`, { method: "DELETE" });
        onRefresh();
        toast("已删除");
      } catch {
        toast("删除失败");
      }
    },
    [onRefresh, toast]
  );

  return (
    <div className="pb-2">
      <h3 className="text-[13px] font-medium text-zinc-400 mb-1">
        评论（{initialComments.length}）
      </h3>

      {initialComments.length === 0 ? (
        <EmptyState
          icon={<MessageCircleIcon size={44} />}
          title="还没有评论"
          subtitle="来说点什么吧"
          className="py-6"
        />
      ) : (
        <div className="divide-y divide-zinc-50">
          {initialComments.map((comment) => (
            <CommentItem
              key={comment.id}
              id={comment.id}
              nickname={comment.nickname || "匿名"}
              content={comment.content}
              createdAt={comment.createdAt}
              isOwner={comment.nickname === memberNickname}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Input bar - fixed at bottom */}
      <div className="flex gap-2 mt-3 sticky bottom-0 bg-white pt-2 pb-safe border-t border-zinc-50">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="写评论..."
          maxLength={500}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          className="flex-1 h-11 px-4 rounded-full bg-zinc-100 border-0 text-sm focus:ring-2 focus:ring-[#07c160] focus:outline-none"
        />
        <button
          onClick={handleAdd}
          disabled={!input.trim() || submitting}
          aria-label="发送评论"
          className="w-11 h-11 rounded-full bg-[#07c160] text-white disabled:opacity-40 shrink-0 active:scale-95 transition-transform flex items-center justify-center"
        >
          {submitting ? (
            <span className="text-xs">...</span>
          ) : (
            <SendIcon size={18} />
          )}
        </button>
      </div>
    </div>
  );
}

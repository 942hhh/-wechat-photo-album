"use client";

import { useState, useCallback } from "react";
import { CommentItem } from "./CommentItem";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { MessageCircleIcon, SendIcon } from "@/components/ui/Icons";

interface CommentData {
  id: string;
  memberId: string;
  content: string;
  createdAt: string;
  nickname?: string;
  likeCount?: number;
  parentId?: string | null;
  replies?: CommentData[];
  replyToNickname?: string | null;
}

interface CommentSectionProps {
  photoId: string;
  memberId: string;
  memberNickname: string;
  initialComments: CommentData[];
  onRefresh: () => void;
  commentLikes?: Set<string>; // set of comment ids liked by current user
}

export function CommentSection({
  photoId,
  memberId,
  memberNickname,
  initialComments,
  onRefresh,
  commentLikes,
}: CommentSectionProps) {
  const [input, setInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [replyTarget, setReplyTarget] = useState<{
    commentId: string;
    nickname: string;
  } | null>(null);
  const [replyInput, setReplyInput] = useState("");
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(
    new Set()
  );
  const [likedComments, setLikedComments] = useState<Set<string>>(
    commentLikes || new Set()
  );
  const { toast } = useToast();

  const handleAdd = useCallback(
    async (parentId?: string, content?: string) => {
      const text = parentId ? (content || replyInput.trim()) : input.trim();
      if (!text) return;
      setSubmitting(true);
      try {
        const body: Record<string, string> = {
          photoId,
          memberId,
          content: text,
        };
        if (parentId) body.parentId = parentId;

        const res = await fetch("/api/comments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);

        if (parentId) {
          setReplyInput("");
          setReplyTarget(null);
          // Auto-expand replies for the parent
          setExpandedReplies((prev) => new Set(prev).add(parentId));
        } else {
          setInput("");
        }
        onRefresh();
        toast("评论成功");
      } catch {
        toast("评论失败");
      } finally {
        setSubmitting(false);
      }
    },
    [input, replyInput, photoId, memberId, onRefresh, toast]
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

  const handleLikeComment = useCallback(
    async (commentId: string) => {
      const wasLiked = likedComments.has(commentId);
      setLikedComments((prev) => {
        const next = new Set(prev);
        if (wasLiked) next.delete(commentId);
        else next.add(commentId);
        return next;
      });

      try {
        const res = await fetch("/api/likes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ commentId, memberId }),
        });
        const json = await res.json();
        if (res.ok && json.data) {
          setLikedComments((prev) => {
            const next = new Set(prev);
            if (json.data.liked) next.add(commentId);
            else next.delete(commentId);
            return next;
          });
        }
        // Refresh to get updated counts
        onRefresh();
      } catch {
        setLikedComments((prev) => {
          const next = new Set(prev);
          if (wasLiked) next.add(commentId);
          else next.delete(commentId);
          return next;
        });
      }
    },
    [memberId, onRefresh, likedComments]
  );

  const handleReply = useCallback((commentId: string, nickname: string) => {
    setReplyTarget({ commentId, nickname });
    setReplyInput("");
  }, []);

  const toggleReplies = useCallback((commentId: string) => {
    setExpandedReplies((prev) => {
      const next = new Set(prev);
      if (next.has(commentId)) next.delete(commentId);
      else next.add(commentId);
      return next;
    });
  }, []);

  const totalCount =
    initialComments.reduce(
      (sum, c) => sum + 1 + (c.replies?.length || 0),
      0
    );

  return (
    <div className="pb-2">
      <h3 className="text-[13px] font-medium text-zinc-400 mb-1">
        评论（{totalCount}）
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
          {initialComments.map((comment) => {
            const replies = comment.replies || [];
            const isExpanded = expandedReplies.has(comment.id);
            const showExpand = replies.length > 3 && !isExpanded;
            const visibleReplies = showExpand
              ? replies.slice(0, 3)
              : replies;

            return (
              <div key={comment.id}>
                <CommentItem
                  id={comment.id}
                  nickname={comment.nickname || "匿名"}
                  content={comment.content}
                  createdAt={comment.createdAt}
                  isOwner={comment.nickname === memberNickname}
                  onDelete={handleDelete}
                  likeCount={comment.likeCount || 0}
                  liked={likedComments.has(comment.id)}
                  onLike={handleLikeComment}
                  onReply={handleReply}
                  replyCount={replies.length}
                />

                {/* Replies */}
                {replies.length > 0 && (
                  <div className="bg-zinc-50/50">
                    {visibleReplies.map((reply) => (
                      <CommentItem
                        key={reply.id}
                        id={reply.id}
                        nickname={reply.nickname || "匿名"}
                        content={reply.content}
                        createdAt={reply.createdAt}
                        isOwner={reply.nickname === memberNickname}
                        onDelete={handleDelete}
                        likeCount={reply.likeCount || 0}
                        liked={likedComments.has(reply.id)}
                        onLike={handleLikeComment}
                        isReply
                        replyToNickname={reply.replyToNickname}
                      />
                    ))}
                    {showExpand && (
                      <button
                        onClick={() => toggleReplies(comment.id)}
                        className="ml-10 px-3 py-2 text-xs text-[#07c160] font-medium"
                      >
                        展开全部 {replies.length} 条回复
                      </button>
                    )}
                    {isExpanded && replies.length > 3 && (
                      <button
                        onClick={() => toggleReplies(comment.id)}
                        className="ml-10 px-3 py-2 text-xs text-zinc-400"
                      >
                        收起回复
                      </button>
                    )}
                  </div>
                )}

                {/* Inline reply input */}
                {replyTarget?.commentId === comment.id && (
                  <div className="ml-10 flex gap-2 mt-2 mb-2">
                    <input
                      autoFocus
                      value={replyInput}
                      onChange={(e) => setReplyInput(e.target.value)}
                      placeholder={`回复 @${replyTarget.nickname}...`}
                      maxLength={500}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleAdd(comment.id);
                        if (e.key === "Escape") setReplyTarget(null);
                      }}
                      className="flex-1 h-9 px-3 rounded-full bg-zinc-100 border-0 text-sm focus:ring-2 focus:ring-[#07c160] focus:outline-none"
                    />
                    <button
                      onClick={() => handleAdd(comment.id)}
                      disabled={!replyInput.trim() || submitting}
                      aria-label="发送回复"
                      className="w-9 h-9 rounded-full bg-[#07c160] text-white disabled:opacity-40 shrink-0 active:scale-95 transition-transform flex items-center justify-center"
                    >
                      <SendIcon size={14} />
                    </button>
                    <button
                      onClick={() => setReplyTarget(null)}
                      className="text-xs text-zinc-400 shrink-0 px-1"
                    >
                      取消
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Global input bar for top-level comments */}
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
          onClick={() => handleAdd()}
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

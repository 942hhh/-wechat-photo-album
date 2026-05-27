"use client";

import { useState } from "react";
import { HeartIcon, HeartFilledIcon } from "@/components/ui/Icons";

interface CommentItemProps {
  id: string;
  nickname?: string;
  content: string;
  createdAt: string;
  isOwner?: boolean;
  onDelete?: (id: string) => void;
  likeCount?: number;
  liked?: boolean;
  onLike?: (commentId: string) => void;
  onReply?: (commentId: string, nickname: string) => void;
  isReply?: boolean;
  replyToNickname?: string | null;
  replyCount?: number;
}

const AVATAR_COLORS = [
  "bg-red-400", "bg-blue-400", "bg-green-400", "bg-yellow-400",
  "bg-purple-400", "bg-pink-400", "bg-teal-400", "bg-orange-400",
];

export function CommentItem({
  id,
  nickname = "匿名",
  content,
  createdAt,
  isOwner,
  onDelete,
  likeCount = 0,
  liked = false,
  onLike,
  onReply,
  isReply = false,
  replyToNickname,
  replyCount,
}: CommentItemProps) {
  const [animating, setAnimating] = useState(false);
  const colorIndex = nickname.charCodeAt(0) % AVATAR_COLORS.length;
  const avatarBg = AVATAR_COLORS[colorIndex];

  const time = new Date(createdAt);
  const y = time.getFullYear();
  const m = String(time.getMonth() + 1).padStart(2, "0");
  const d = String(time.getDate()).padStart(2, "0");
  const h = String(time.getHours()).padStart(2, "0");
  const min = String(time.getMinutes()).padStart(2, "0");
  const timeStr = `${y}/${m}/${d} ${h}:${min}`;

  const handleLike = () => {
    setAnimating(true);
    setTimeout(() => setAnimating(false), 300);
    onLike?.(id);
  };

  return (
    <div className={`flex gap-3 py-3 group ${isReply ? "ml-10" : ""}`}>
      <div
        className={`w-${isReply ? "6" : "8"} h-${isReply ? "6" : "8"} rounded-full ${avatarBg} flex items-center justify-center text-white text-sm font-medium shrink-0`}
        style={{ width: isReply ? 24 : 32, height: isReply ? 24 : 32 }}
      >
        {nickname[0]?.toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`font-medium text-zinc-800 ${isReply ? "text-xs" : "text-sm"}`}>
            {nickname}
          </span>
          {replyToNickname && (
            <span className="text-xs text-zinc-400">
              回复 <span className="text-[#07c160]">@{replyToNickname}</span>
            </span>
          )}
          <span className="text-xs text-zinc-400">{timeStr}</span>
          {isOwner && onDelete && (
            <button
              onClick={() => onDelete(id)}
              aria-label="删除评论"
              className="text-xs text-red-400 shrink-0"
            >
              删除
            </button>
          )}
        </div>
        <p className={`text-zinc-600 mt-0.5 break-words ${isReply ? "text-[13px]" : "text-sm"}`}>
          {content}
        </p>

        {/* Action bar */}
        <div className="flex items-center gap-4 mt-1">
          {onReply && (
            <button
              onClick={() => onReply(id, nickname)}
              className="text-xs text-zinc-400 hover:text-zinc-600"
            >
              回复
            </button>
          )}
          {onLike && (
            <button
              onClick={handleLike}
              className={`flex items-center gap-0.5 text-xs active:scale-110 transition-transform ${
                animating ? "animate-[heartPop_0.3s_ease-out]" : ""
              }`}
            >
              <span className={liked ? "text-red-500" : "text-zinc-400"}>
                {liked ? <HeartFilledIcon size={14} /> : <HeartIcon size={14} />}
              </span>
              {likeCount > 0 && (
                <span className={liked ? "text-red-500" : "text-zinc-400"}>
                  {likeCount}
                </span>
              )}
            </button>
          )}
          {replyCount !== undefined && replyCount > 0 && (
            <span className="text-xs text-zinc-400">{replyCount} 条回复</span>
          )}
        </div>
      </div>
    </div>
  );
}

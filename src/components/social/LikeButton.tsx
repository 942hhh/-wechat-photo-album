"use client";

import { useState, useEffect } from "react";
import { HeartIcon, HeartFilledIcon } from "@/components/ui/Icons";

interface LikeButtonProps {
  photoId: string;
  memberId: string;
  initialLiked?: boolean;
  initialCount?: number;
}

export function LikeButton({
  photoId,
  memberId,
  initialLiked = false,
  initialCount = 0,
}: LikeButtonProps) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);

  useEffect(() => {
    setLiked(initialLiked);
    setCount(initialCount);
  }, [initialLiked, initialCount]);

  const toggle = async () => {
    const prevLiked = liked;
    const prevCount = count;
    setLiked(!liked);
    setCount(liked ? count - 1 : count + 1);

    try {
      const res = await fetch("/api/likes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoId, memberId }),
      });
      const json = await res.json();
      if (res.ok && json.data) {
        setLiked(json.data.liked);
        setCount(json.data.likeCount);
      }
    } catch {
      // Revert on error
      setLiked(prevLiked);
      setCount(prevCount);
    }
  };

  return (
    <button
      onClick={toggle}
      aria-label={liked ? "取消点赞" : "点赞"}
      className="flex items-center gap-1.5 text-sm active:scale-110 transition-transform"
    >
      <span className={liked ? "animate-[heartPop_0.3s_ease-out] text-red-500" : "text-zinc-400"}>
        {liked ? <HeartFilledIcon size={22} /> : <HeartIcon size={22} />}
      </span>
      <span className="text-zinc-600">{count}</span>
    </button>
  );
}

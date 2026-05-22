"use client";

interface CommentItemProps {
  id: string;
  nickname?: string;
  content: string;
  createdAt: string;
  isOwner?: boolean;
  onDelete?: (id: string) => void;
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
}: CommentItemProps) {
  const colorIndex = nickname.charCodeAt(0) % AVATAR_COLORS.length;
  const avatarBg = AVATAR_COLORS[colorIndex];

  const time = new Date(createdAt);
  const y = time.getFullYear();
  const m = String(time.getMonth() + 1).padStart(2, "0");
  const d = String(time.getDate()).padStart(2, "0");
  const h = String(time.getHours()).padStart(2, "0");
  const min = String(time.getMinutes()).padStart(2, "0");
  const timeStr = `${y}/${m}/${d} ${h}:${min}`;

  return (
    <div className="flex gap-3 py-3 group">
      <div
        className={`w-8 h-8 rounded-full ${avatarBg} flex items-center justify-center text-white text-sm font-medium shrink-0`}
      >
        {nickname[0]?.toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-zinc-800">{nickname}</span>
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
        <p className="text-sm text-zinc-600 mt-0.5 break-words">{content}</p>
      </div>
    </div>
  );
}

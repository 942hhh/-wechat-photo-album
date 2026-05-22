"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppHeader } from "@/components/layout/AppHeader";
import { LikeButton } from "@/components/social/LikeButton";
import { CommentSection } from "@/components/social/CommentSection";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { formatFileSize } from "@/lib/utils";
import { ToastProvider, useToast } from "@/components/ui/Toast";
import { ChatFloatingButton } from "@/components/chat/ChatFloatingButton";
import { TrashIcon, ChevronLeftIcon, ChevronRightIcon, HeartIcon, ChevronLeft, ChevronRight } from "@/components/ui/Icons";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

interface PhotoData {
  id: string;
  originalUrl: string;
  thumbnailUrl: string;
  description: string;
  likeCount: number;
  commentCount: number;
  width: number;
  height: number;
  fileSize: number;
  createdAt: string;
  albumId: string;
  prevId: string | null;
  nextId: string | null;
}

interface Comment {
  id: string;
  memberId: string;
  content: string;
  createdAt: string;
  nickname?: string;
}

function PhotoPageContent() {
  const params = useParams();
  const router = useRouter();
  const photoId = params.photoId as string;
  const [memberId] = useLocalStorage<string | null>("fam_album_memberId", null);
  const [memberNickname] = useLocalStorage<string | null>("fam_album_nickname", null);
  const [photo, setPhoto] = useState<PhotoData | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [liked, setLiked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const touchRef = useRef({ startX: 0, startY: 0 });
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    if (!memberId) return;
    try {
      const [photoRes, commentsRes, likesRes] = await Promise.all([
        fetch(`/api/photos/${photoId}`),
        fetch(`/api/comments?photoId=${photoId}`),
        fetch(`/api/likes?photoId=${photoId}&memberId=${memberId}`),
      ]);
      const photoJson = await photoRes.json();
      const commentsJson = await commentsRes.json();
      const likesJson = await likesRes.json();

      if (photoJson.data) setPhoto(photoJson.data);
      if (commentsJson.data) setComments(commentsJson.data);
      if (likesJson.data) setLiked(likesJson.data.liked);
    } catch {
      // Keep current
    } finally {
      setLoading(false);
    }
  }, [photoId, memberId]);

  useEffect(() => {
    setImageLoaded(false);
    fetchData();
  }, [fetchData]);

  const handleDelete = async () => {
    setShowDeleteConfirm(false);
    setDeleting(true);
    try {
      const res = await fetch(`/api/photos/${photoId}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error);
      }
      toast("照片已删除");
      router.replace(`/a/${photo?.albumId}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "删除失败";
      toast(msg);
      setDeleting(false);
    }
  };

  // 滑动手势处理
  const handleTouchStart = (e: React.TouchEvent) => {
    touchRef.current = {
      startX: e.touches[0].clientX,
      startY: e.touches[0].clientY,
    };
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping) return;
    const dx = e.touches[0].clientX - touchRef.current.startX;
    const dy = e.touches[0].clientY - touchRef.current.startY;
    
    // 只在水平方向滑动超过阈值时才显示滑动效果
    if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) {
      // 限制最大偏移量
      const maxOffset = 100;
      setSwipeOffset(Math.max(-maxOffset, Math.min(maxOffset, dx)));
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    setIsSwiping(false);
    const dx = e.changedTouches[0].clientX - touchRef.current.startX;
    const dy = e.changedTouches[0].clientY - touchRef.current.startY;
    const threshold = 60;
    
    // 重置滑动偏移
    setSwipeOffset(0);
    
    if (Math.abs(dx) > threshold && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx < 0 && photo?.nextId) {
        router.replace(`/photo/${photo.nextId}`);
      } else if (dx > 0 && photo?.prevId) {
        router.replace(`/photo/${photo.prevId}`);
      }
    }
  };

  // 键盘导航支持
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" && photo?.prevId) {
        router.replace(`/photo/${photo.prevId}`);
      } else if (e.key === "ArrowRight" && photo?.nextId) {
        router.replace(`/photo/${photo.nextId}`);
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [photo, router]);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col">
        <AppHeader title="照片" showBack backHref="/" />
        <div className="flex-1 bg-zinc-900 animate-pulse" />
      </div>
    );
  }

  if (!photo) {
    return (
      <div className="flex-1 flex flex-col">
        <AppHeader title="照片" showBack backHref="/" />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-zinc-400">照片不存在</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white">
      <AppHeader
        title="照片"
        showBack
        backHref={`/a/${photo.albumId}`}
        rightAction={
          <button onClick={() => setShowDeleteConfirm(true)} disabled={deleting} aria-label="删除照片" className="text-red-400 px-1">
            {deleting ? <span className="text-sm">...</span> : <TrashIcon size={20} />}
          </button>
        }
      />

      <div 
        className="relative bg-black select-none overflow-hidden" 
        onTouchStart={handleTouchStart} 
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* 滑动时的背景渐变遮罩 */}
        <div 
          className="absolute inset-0 pointer-events-none transition-opacity duration-200"
          style={{
            background: swipeOffset !== 0 
              ? `linear-gradient(to ${swipeOffset > 0 ? 'left' : 'right'}, rgba(0,0,0,0.3), transparent, rgba(0,0,0,0.3))`
              : 'transparent',
            opacity: swipeOffset !== 0 ? 1 : 0
          }}
        />
        
        {/* 滑动提示指示器 */}
        {(swipeOffset > 20 || swipeOffset < -20) && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
            <div 
              className={`flex items-center gap-2 px-4 py-2 rounded-full bg-black/50 text-white text-sm backdrop-blur-sm transition-opacity duration-200 ${
                Math.abs(swipeOffset) > 20 ? 'opacity-100' : 'opacity-0'
              }`}
            >
              {swipeOffset < 0 ? (
                <>
                  <ChevronRightIcon size={18} />
                  <span>下一张</span>
                </>
              ) : (
                <>
                  <span>上一张</span>
                  <ChevronLeftIcon size={18} />
                </>
              )}
            </div>
          </div>
        )}
        
        {!imageLoaded && <div className="w-full aspect-[4/3] bg-zinc-800 animate-pulse" />}
        <img
          src={photo.originalUrl}
          alt=""
          className={`w-full object-contain transition-all duration-300 ease-out ${imageLoaded ? "opacity-100" : "opacity-0 absolute inset-0"}`}
          style={{ 
            maxHeight: "60vh", 
            touchAction: "pinch-zoom",
            transform: `translateX(${swipeOffset * 0.5}px)`,
            transition: isSwiping ? 'none' : 'transform 0.3s ease-out'
          }}
          onLoad={() => setImageLoaded(true)}
        />

        {/* 滑动提示 */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2">
          <span className="text-white/40 text-xs">左右滑动切换照片</span>
        </div>
      </div>

      <div className="flex-1 px-4 pt-3 pb-safe space-y-3">
        <div className="flex items-center gap-4">
          {memberId ? (
            <LikeButton photoId={photo.id} memberId={memberId} initialLiked={liked} initialCount={photo.likeCount} />
          ) : (
            <button
              onClick={() => toast("请先登录")}
              className="flex items-center gap-1.5 text-sm text-zinc-400"
            >
              <span className="text-zinc-400">
                <HeartIcon size={22} />
              </span>
              <span>{photo.likeCount}</span>
            </button>
          )}
          <span className="text-[13px] text-zinc-400">{photo.commentCount} 条评论</span>
        </div>
        {photo.description && <p className="text-[15px] text-zinc-700">{photo.description}</p>}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-zinc-400">
          <span>{photo.uploaderNickname || "匿名"} 上传</span>
          {photo.fileSize && <span>{formatFileSize(photo.fileSize)}</span>}
          {photo.width && photo.height && <span>{photo.width}×{photo.height}</span>}
        </div>
        {memberId ? (
          <CommentSection photoId={photo.id} memberId={memberId} memberNickname={memberNickname || ""} initialComments={comments} onRefresh={fetchData} />
        ) : (
          <div className="pt-2 pb-2">
            <h3 className="text-[13px] font-medium text-zinc-400 mb-1">评论（{comments.length}）</h3>
            <button
              onClick={() => toast("请先登录")}
              className="w-full h-11 px-4 rounded-full bg-zinc-100 text-sm text-zinc-400"
            >
              请先登录才能评论
            </button>
            {comments.length > 0 && (
              <div className="divide-y divide-zinc-50 mt-3">
                {comments.map((comment) => (
                  <div key={comment.id} className="py-2">
                    <div className="flex items-start gap-2">
                      <span className="text-sm font-medium text-zinc-700">{comment.nickname || "匿名"}</span>
                      <span className="text-sm text-zinc-600">{comment.content}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 删除确认弹窗 */}
      <ConfirmModal
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="删除照片"
        message="确定要删除这张照片吗？此操作不可恢复。"
        confirmText="删除"
        cancelText="取消"
        danger
        loading={deleting}
      />
      {memberId && <ChatFloatingButton memberId={memberId} />}
    </div>
  );
}

export default function PhotoPage() {
  return <ToastProvider><PhotoPageContent /></ToastProvider>;
}

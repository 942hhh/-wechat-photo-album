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
import { TrashIcon, HeartIcon, DownloadIcon } from "@/components/ui/Icons";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

const isWeChat =
  typeof navigator !== "undefined" && /MicroMessenger/i.test(navigator.userAgent);

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
  uploaderNickname?: string | null;
  prevId: string | null;
  nextId: string | null;
}

function PhotoPageContent() {
  const params = useParams();
  const router = useRouter();
  const photoId = params.photoId as string;
  const [memberId] = useLocalStorage<string | null>("fam_album_memberId", null);
  const [memberNickname] = useLocalStorage<string | null>("fam_album_nickname", null);
  const [photo, setPhoto] = useState<PhotoData | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [liked, setLiked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const { toast } = useToast();

  // ---- 全屏模式下的滑动手势 ----
  const touchRef = useRef({ startX: 0, startY: 0, lastX: 0, lastY: 0 });
  const isSwipingRef = useRef(false);
  const hasStartedSwipeRef = useRef(false);
  const fullscreenRef = useRef<HTMLDivElement>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const swipeOffsetRef = useRef(0);
  const animatingRef = useRef(false);
  const animFrameRef = useRef<number>(0);
  const screenWidthRef = useRef(
    typeof window !== "undefined" ? window.innerWidth : 375
  );

  const [slideAnim, setSlideAnim] = useState<{
    direction: "left" | "right";
    nextUrl: string;
    progress: number;
  } | null>(null);

  const fullscreenPhotoIdRef = useRef<string | null>(null);

  // 手指按下：记录起点
  const handleTouchStart = useCallback((e: TouchEvent) => {
    const x = e.touches[0].clientX;
    const y = e.touches[0].clientY;
    touchRef.current = { startX: x, startY: y, lastX: x, lastY: y };
    isSwipingRef.current = true;
    hasStartedSwipeRef.current = false;
    cancelAnimationFrame(animFrameRef.current);
    setSlideAnim(null);
    animatingRef.current = false;
  }, []);

  // 手指移动：1:1 跟随，不触发切换
  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isSwipingRef.current || animatingRef.current) return;
    const dx = e.touches[0].clientX - touchRef.current.startX;
    const dy = e.touches[0].clientY - touchRef.current.startY;
    touchRef.current.lastX = e.touches[0].clientX;
    touchRef.current.lastY = e.touches[0].clientY;
    if (Math.abs(dx) > Math.abs(dy) || hasStartedSwipeRef.current) {
      if (Math.abs(dx) > 5) hasStartedSwipeRef.current = true;
      e.preventDefault();
      swipeOffsetRef.current = dx;
      setSwipeOffset(dx);
    }
  }, []);

  const loadFullscreenPhoto = useCallback(
    async (targetId: string, onDone?: () => void) => {
      if (!memberId) return;
      try {
        const [photoRes, commentsRes, likesRes] = await Promise.all([
          fetch(`/api/photos/${targetId}`),
          fetch(`/api/comments?photoId=${targetId}`),
          fetch(`/api/likes?photoId=${targetId}&memberId=${memberId}`),
        ]);
        const photoJson = await photoRes.json();
        const commentsJson = await commentsRes.json();
        const likesJson = await likesRes.json();

        if (photoJson.data) setPhoto(photoJson.data);
        if (commentsJson.data) setComments(commentsJson.data);
        if (likesJson.data) setLiked(likesJson.data.liked);
        setImageLoaded(true);
        fullscreenPhotoIdRef.current = targetId;
      } catch (err) {
        console.error("[Fullscreen] 加载照片失败:", err);
      } finally {
        onDone?.();
      }
    },
    [memberId]
  );

  // 预加载并执行滑动过渡动画
  const doSlideAnimation = useCallback(
    (direction: "left" | "right", nextUrl: string, targetId: string) => {
      animatingRef.current = true;
      setSlideAnim({ direction, nextUrl, progress: 0 });

      const duration = 300;
      const startTime = performance.now();

      const animate = (now: number) => {
        const elapsed = now - startTime;
        const t = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        setSlideAnim({ direction, nextUrl, progress: eased });

        if (t < 1) {
          animFrameRef.current = requestAnimationFrame(animate);
        } else {
          loadFullscreenPhoto(targetId, () => {
            setSlideAnim(null);
            setSwipeOffset(0);
            swipeOffsetRef.current = 0;
            animatingRef.current = false;
          });
        }
      };

      animFrameRef.current = requestAnimationFrame(animate);
    },
    [loadFullscreenPhoto]
  );

  // 预加载目标照片图片，加载完成后执行动画
  const switchToPhoto = useCallback(
    (targetId: string, direction: "left" | "right") => {
      animatingRef.current = true;
      fetch(`/api/photos/${targetId}`)
        .then((r) => r.json())
        .then((json) => {
          if (!json.data?.originalUrl) {
            loadFullscreenPhoto(targetId);
            animatingRef.current = false;
            return;
          }
          const img = new Image();
          img.src = json.data.originalUrl;
          img.onload = () => {
            doSlideAnimation(direction, img.src, targetId);
          };
          img.onerror = () => {
            loadFullscreenPhoto(targetId);
            animatingRef.current = false;
          };
        })
        .catch(() => {
          loadFullscreenPhoto(targetId);
          animatingRef.current = false;
        });
    },
    [loadFullscreenPhoto, doSlideAnimation]
  );

  // 手指松开：判断方向，触发切换或回弹
  const handleTouchEnd = useCallback(() => {
    if (!isSwipingRef.current) return;
    isSwipingRef.current = false;

    const dx = touchRef.current.lastX - touchRef.current.startX;
    const dy = touchRef.current.lastY - touchRef.current.startY;

    // 轻触（几乎没动）→ 关闭全屏
    if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
      setFullscreen(false);
      hasStartedSwipeRef.current = false;
      return;
    }

    // 水平滑动超过阈值 → 切换照片
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5 && photo) {
      if (dx < 0 && photo.nextId) {
        switchToPhoto(photo.nextId, "left");
      } else if (dx > 0 && photo.prevId) {
        switchToPhoto(photo.prevId, "right");
      } else {
        // 没有更多照片，回弹
        setSwipeOffset(0);
        swipeOffsetRef.current = 0;
      }
    } else {
      // 未达阈值，回弹
      setSwipeOffset(0);
      swipeOffsetRef.current = 0;
    }

    hasStartedSwipeRef.current = false;
  }, [photo, switchToPhoto]);

  useEffect(() => {
    const el = fullscreenRef.current;
    if (!el || !fullscreen) return;
    el.addEventListener("touchstart", handleTouchStart, { passive: false });
    el.addEventListener("touchmove", handleTouchMove, { passive: false });
    el.addEventListener("touchend", handleTouchEnd);
    return () => {
      el.removeEventListener("touchstart", handleTouchStart);
      el.removeEventListener("touchmove", handleTouchMove);
      el.removeEventListener("touchend", handleTouchEnd);
    };
  }, [fullscreen, handleTouchStart, handleTouchMove, handleTouchEnd]);

  useEffect(() => {
    if (fullscreen) {
      setSwipeOffset(0);
      swipeOffsetRef.current = 0;
      isSwipingRef.current = false;
      hasStartedSwipeRef.current = false;
      animatingRef.current = false;
      setSlideAnim(null);
      cancelAnimationFrame(animFrameRef.current);
      fullscreenPhotoIdRef.current = photo?.id ?? null;
    } else {
      if (fullscreenPhotoIdRef.current && fullscreenPhotoIdRef.current !== photoId) {
        router.replace(`/photo/${fullscreenPhotoIdRef.current}`);
      }
    }
  }, [fullscreen, photo?.id, photoId, router]);

  // 键盘导航：←→ 切换照片
  const switchWithAnim = useCallback(
    (direction: "left" | "right") => {
      if (!photo || animatingRef.current) return;
      const targetId = direction === "left" ? photo.nextId : photo.prevId;
      if (!targetId) return;
      switchToPhoto(targetId, direction);
    },
    [photo, switchToPhoto]
  );

  useEffect(() => {
    if (!fullscreen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" && photo?.prevId) {
        switchWithAnim("right");
      } else if (e.key === "ArrowRight" && photo?.nextId) {
        switchWithAnim("left");
      } else if (e.key === "Escape") {
        setFullscreen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [fullscreen, photo, switchWithAnim]);

  // ---- 数据加载 ----
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

  // ---- 下载照片 ----
  const handleDownload = async () => {
    if (!photo) return;
    if (isWeChat) {
      toast("请长按图片保存到手机");
      return;
    }
    setDownloading(true);
    try {
      const res = await fetch(photo.originalUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `photo_${photo.id}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast("已开始下载");
    } catch {
      toast("下载失败");
    } finally {
      setDownloading(false);
    }
  };

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

  const downloadButton = (
    <button
      onClick={(e) => {
        e.stopPropagation();
        handleDownload();
      }}
      disabled={downloading}
      aria-label="下载照片"
      className="w-9 h-9 flex items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors"
    >
      {downloading ? (
        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
      ) : (
        <DownloadIcon size={18} />
      )}
    </button>
  );

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

      {/* 照片预览区 */}
      <div className="relative bg-black select-none overflow-hidden">
        {!imageLoaded && <div className="w-full aspect-[4/3] bg-zinc-800 animate-pulse" />}
        <img
          src={photo.originalUrl}
          alt=""
          onClick={() => setFullscreen(true)}
          className={`w-full object-contain cursor-pointer ${imageLoaded ? "opacity-100" : "opacity-0 absolute inset-0"}`}
          style={{ maxHeight: "60vh" }}
          onLoad={() => setImageLoaded(true)}
        />
        <div className="absolute top-3 left-1/2 -translate-x-1/2 pointer-events-none">
          <span className="text-white/40 text-xs">点击查看大图</span>
        </div>
        <div className="absolute top-3 right-3">
          {downloadButton}
        </div>
        {isWeChat && (
          <div className="absolute bottom-3 right-3">
            <span className="text-white/50 text-[10px] bg-black/40 px-2 py-0.5 rounded-full">
              长按图片保存
            </span>
          </div>
        )}
      </div>

      {/* 信息区 */}
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
            <h3 className="text-[13px] font-medium text-zinc-400 mb-1">
              评论（{comments.reduce((sum: number, c: any) => sum + 1 + (c.replies?.length || 0), 0)}）
            </h3>
            <button
              onClick={() => toast("请先登录")}
              className="w-full h-11 px-4 rounded-full bg-zinc-100 text-sm text-zinc-400"
            >
              请先登录才能评论
            </button>
            {comments.length > 0 && (
              <div className="divide-y divide-zinc-50 mt-3">
                {comments.map((comment: any) => (
                  <div key={comment.id} className="py-2">
                    <div className="flex items-start gap-2">
                      <span className="text-sm font-medium text-zinc-700">{comment.nickname || "匿名"}</span>
                      <span className="text-sm text-zinc-600">{comment.content}</span>
                    </div>
                    {comment.replies?.map((reply: any) => (
                      <div key={reply.id} className="ml-8 mt-2 flex items-start gap-2">
                        <span className="text-xs font-medium text-zinc-600">{reply.nickname || "匿名"}</span>
                        {reply.replyToNickname && (
                          <span className="text-xs text-zinc-400">
                            回复 <span className="text-[#07c160]">@{reply.replyToNickname}</span>
                          </span>
                        )}
                        <span className="text-xs text-zinc-500">{reply.content}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 全屏大图模式 */}
      {fullscreen && (
        <div
          ref={fullscreenRef}
          className="fixed inset-0 z-[10001] bg-black flex items-center justify-center overflow-hidden"
          style={{ touchAction: "none" }}
        >
          {/* 滑动时的手指跟随层 — 只在不做过渡动画且手指正在滑动时显示 */}
          {!slideAnim && (
            <img
              src={photo.originalUrl}
              alt=""
              className="max-w-full max-h-full object-contain"
              style={{
                pointerEvents: "none",
                transform: `translateX(${swipeOffset}px)`,
                transition: isSwipingRef.current ? "none" : "transform 0.3s ease-out",
              }}
              draggable={false}
            />
          )}

          {/* 过渡动画层 */}
          {slideAnim && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {/* 当前图片滑出 */}
              <img
                src={photo.originalUrl}
                alt=""
                className="max-w-full max-h-full object-contain absolute"
                style={{
                  pointerEvents: "none",
                  transform: `translateX(${
                    slideAnim.direction === "left"
                      ? -slideAnim.progress * screenWidthRef.current
                      : slideAnim.progress * screenWidthRef.current
                  }px)`,
                  opacity: 1 - slideAnim.progress * 0.3,
                }}
                draggable={false}
              />
              {/* 下一张图片滑入 */}
              <img
                src={slideAnim.nextUrl}
                alt=""
                className="max-w-full max-h-full object-contain absolute"
                style={{
                  pointerEvents: "none",
                  transform: `translateX(${
                    slideAnim.direction === "left"
                      ? (1 - slideAnim.progress) * screenWidthRef.current
                      : -(1 - slideAnim.progress) * screenWidthRef.current
                  }px)`,
                  opacity: slideAnim.progress,
                }}
                draggable={false}
              />
            </div>
          )}

          {/* 全屏下载按钮 */}
          <div className="absolute top-4 right-4 z-10">
            {downloadButton}
          </div>
          {/* 左右指示器 */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 pointer-events-none flex gap-4">
            {!photo.prevId && <span className="text-white/20 text-xs">← 首张</span>}
            {photo.prevId && photo.nextId && <span className="text-white/30 text-xs">← 滑动切换 →</span>}
            {!photo.nextId && <span className="text-white/20 text-xs">末张 →</span>}
          </div>
        </div>
      )}

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

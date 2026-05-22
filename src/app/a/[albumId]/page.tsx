"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppHeader } from "@/components/layout/AppHeader";
import { PhotoGrid } from "@/components/photo/PhotoGrid";
import { PhotoUploader } from "@/components/photo/PhotoUploader";
import { EmptyState } from "@/components/ui/EmptyState";
import { ToastProvider, useToast } from "@/components/ui/Toast";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { ImageIcon, TrashIcon } from "@/components/ui/Icons";

interface Photo {
  id: string;
  thumbnailUrl: string;
  likeCount: number;
  commentCount: number;
}

function AlbumPageContent() {
  const params = useParams();
  const router = useRouter();
  const albumId = params.albumId as string;
  const [album, setAlbum] = useState<{ name: string } | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingAlbum, setDeletingAlbum] = useState(false);
  const [showDeleteAlbumConfirm, setShowDeleteAlbumConfirm] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchDeleting, setBatchDeleting] = useState(false);
  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false);

  const { toast } = useToast();

  const fetchPhotos = useCallback(async () => {
    try {
      const [albumRes, photosRes] = await Promise.all([
        fetch(`/api/albums/${albumId}`),
        fetch(`/api/photos?albumId=${albumId}`),
      ]);

      if (!albumRes.ok) {
        router.replace("/");
        return;
      }

      const albumJson = await albumRes.json();
      const photosJson = await photosRes.json();
      if (albumJson.data) setAlbum(albumJson.data);
      if (photosJson.data?.photos) setPhotos(photosJson.data.photos);
    } catch {
      // 出错时保持当前状态
    } finally {
      setLoading(false);
    }
  }, [albumId, router]);

  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos]);

  const handleDeleteAlbum = async () => {
    setDeletingAlbum(true);
    try {
      const res = await fetch(`/api/albums/${albumId}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error);
      }
      toast("相册已删除");
      router.replace("/");
    } catch {
      toast("删除失败");
    } finally {
      setDeletingAlbum(false);
      setShowDeleteAlbumConfirm(false);
    }
  };

  const toggleSelectMode = () => {
    if (selectMode) {
      setSelectMode(false);
      setSelectedIds(new Set());
    } else {
      setSelectMode(true);
      setSelectedIds(new Set());
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === photos.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(photos.map((p) => p.id)));
    }
  };

  const handleBatchDelete = async () => {
    setBatchDeleting(true);
    let done = 0;
    let failed = 0;

    const ids = Array.from(selectedIds);
    for (const id of ids) {
      try {
        const res = await fetch(`/api/photos/${id}`, { method: "DELETE" });
        if (!res.ok) {
          failed++;
        } else {
          done++;
        }
      } catch {
        failed++;
      }
    }

    setBatchDeleting(false);
    setShowBatchDeleteConfirm(false);
    setSelectMode(false);
    setSelectedIds(new Set());

    if (done > 0) toast(`成功删除 ${done} 张照片`);
    if (failed > 0) toast(`${failed} 张删除失败`);

    // 刷新列表
    fetchPhotos();
  };

  const headerRight = selectMode ? (
    <button
      onClick={toggleSelectMode}
      className="text-sm text-[#07c160] font-medium"
    >
      取消
    </button>
  ) : (
    <button
      onClick={() => setShowDeleteAlbumConfirm(true)}
      disabled={deletingAlbum}
      className="flex items-center gap-1 text-sm text-red-400"
    >
      <TrashIcon size={18} />
      删除相册
    </button>
  );

  return (
    <div className="flex-1 flex flex-col">
      <AppHeader
        title={selectMode ? `已选 ${selectedIds.size} 张` : (album?.name || "相册")}
        showBack
        backHref="/"
        rightAction={headerRight}
      />

      {loading ? (
        <div className="grid grid-cols-3 gap-0.5">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="aspect-square bg-zinc-200 animate-pulse" />
          ))}
        </div>
      ) : photos.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <EmptyState
            icon={<ImageIcon size={56} />}
            title="还没有照片"
            subtitle="上传第一张照片到这个相册吧！"
            action={
              <PhotoUploader albumId={albumId} onUploaded={fetchPhotos} />
            }
          />
        </div>
      ) : (
        <>
          <PhotoGrid
            photos={photos}
            onPhotoDelete={fetchPhotos}
            selectMode={selectMode}
            selectedIds={selectedIds}
            onToggleSelect={handleToggleSelect}
          />
          {!selectMode && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3">
              <button
                onClick={toggleSelectMode}
                className="px-4 py-2.5 rounded-lg bg-zinc-800 text-white text-sm font-medium active:scale-95 transition-transform shadow-sm"
              >
                批量删除
              </button>
              <PhotoUploader albumId={albumId} onUploaded={fetchPhotos} />
            </div>
          )}
        </>
      )}

      {/* 批量删除底部操作栏 */}
      {selectMode && photos.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-zinc-200 px-4 py-2 safe-area-bottom">
          <div className="flex items-center justify-between max-w-lg mx-auto">
            <button
              onClick={selectAll}
              className="text-sm text-zinc-600 py-2 px-2"
            >
              {selectedIds.size === photos.length ? "取消全选" : "全选"}
            </button>
            <button
              onClick={() => {
                if (selectedIds.size > 0) {
                  setShowBatchDeleteConfirm(true);
                }
              }}
              disabled={selectedIds.size === 0}
              className={`flex items-center gap-1.5 px-6 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                selectedIds.size > 0
                  ? "bg-red-500 text-white active:bg-red-600"
                  : "bg-zinc-200 text-zinc-400"
              }`}
            >
              <TrashIcon size={16} />
              删除 ({selectedIds.size})
            </button>
          </div>
        </div>
      )}

      {/* 删除相册确认弹窗 */}
      <ConfirmModal
        open={showDeleteAlbumConfirm}
        onClose={() => setShowDeleteAlbumConfirm(false)}
        onConfirm={handleDeleteAlbum}
        title="删除相册"
        message={`确定要删除相册「${album?.name}」及其所有照片吗？此操作不可恢复。`}
        confirmText="删除相册"
        cancelText="取消"
        danger
        loading={deletingAlbum}
      />

      {/* 批量删除确认弹窗 */}
      <ConfirmModal
        open={showBatchDeleteConfirm}
        onClose={() => setShowBatchDeleteConfirm(false)}
        onConfirm={handleBatchDelete}
        title="批量删除照片"
        message={`确定要删除选中的 ${selectedIds.size} 张照片吗？此操作不可恢复。`}
        confirmText="删除"
        cancelText="取消"
        danger
        loading={batchDeleting}
      />
    </div>
  );
}

export default function AlbumPage() {
  return (
    <ToastProvider>
      <AlbumPageContent />
    </ToastProvider>
  );
}

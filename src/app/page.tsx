"use client";

import { useState, useEffect, useCallback } from "react";
import { AppHeader } from "@/components/layout/AppHeader";
import { AlbumList } from "@/components/album/AlbumList";
import { CreateAlbumDialog } from "@/components/album/CreateAlbumDialog";
import { NicknameModal } from "@/components/NicknameModal";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { ToastProvider } from "@/components/ui/Toast";
import { PlusIcon, CameraIcon } from "@/components/ui/Icons";
import { ChatFloatingButton } from "@/components/chat/ChatFloatingButton";

interface Album {
  id: string;
  name: string;
  coverPhotoUrl: string | null;
  photoCount: number;
}

function HomePage() {
  const [memberId, setMemberId] = useState<string | null>(null);
  const [nickname, setNickname] = useState<string | null>(null);
  const [clientReady, setClientReady] = useState(false);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  console.log("[HomePage] 渲染", { memberId: memberId ? "已设置" : "null", loading, clientReady });

  useEffect(() => {
    console.log("[HomePage] useEffect 读取 localStorage");
    try {
      const savedId = localStorage.getItem("fam_album_memberId");
      const savedName = localStorage.getItem("fam_album_nickname");
      console.log("[HomePage] localStorage:", { savedId, savedName });

      if (savedId) setMemberId(JSON.parse(savedId));
      if (savedName) setNickname(JSON.parse(savedName));
    } catch (e) {
      console.error("[HomePage] localStorage error:", e);
    }
    setClientReady(true);

    const timeout = setTimeout(() => {
      console.log("[HomePage] 超时兜底触发 clientReady");
      setClientReady(true);
    }, 100);

    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (!memberId) return;
    console.log("[HomePage] 加载相册...");
    const loadAlbums = async () => {
      try {
        const res = await fetch("/api/albums");
        const json = await res.json();
        if (json.data) setAlbums(json.data);
      } catch (e) {
        console.error("[HomePage] fetch error:", e);
      } finally {
        setLoading(false);
      }
    };
    loadAlbums();

    const timeout = setTimeout(() => {
      console.log("[HomePage] 超时兜底触发，强制 loading=false");
      setLoading(false);
    }, 5000);

    return () => clearTimeout(timeout);
  }, [memberId]);

  useEffect(() => {
    const checkStored = setInterval(() => {
      try {
        const id = localStorage.getItem("fam_album_memberId");
        if (id && !memberId) {
          const parsed = JSON.parse(id);
          console.log("[HomePage] 轮询检测到 memberId:", parsed);
          setMemberId(parsed);
          clearInterval(checkStored);
        }
      } catch {}
    }, 500);
    return () => clearInterval(checkStored);
  }, [memberId]);

  const handleJoin = useCallback((id: string, name: string) => {
    try {
      localStorage.setItem("fam_album_memberId", JSON.stringify(id));
      localStorage.setItem("fam_album_nickname", JSON.stringify(name));
    } catch (e) {
      console.error("localStorage save error:", e);
    }
    // 即使 localStorage 失败也推进到相册页面（本次会话有效）
    setMemberId(id);
    setNickname(name);
  }, []);

  if (!memberId) {
    return <NicknameModal open onJoin={handleJoin} />;
  }

  return (
    <div className="flex-1 flex flex-col">
      <AppHeader
        title="家庭相册"
        rightAction={
          <button
            onClick={() => setCreateOpen(true)}
            aria-label="新建相册"
            className="text-[#07c160]"
          >
            <PlusIcon size={28} />
          </button>
        }
      />

      {loading ? (
        <div className="px-4 pt-4">
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="rounded-xl bg-white overflow-hidden animate-pulse">
                <div className="aspect-square bg-zinc-200" />
                <div className="p-3 space-y-2">
                  <div className="h-4 bg-zinc-200 rounded w-3/4" />
                  <div className="h-3 bg-zinc-100 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : albums.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <EmptyState
            icon={<CameraIcon size={56} />}
            title="还没有相册"
            subtitle="创建第一个相册，开始和家人分享照片吧！"
            action={
              <Button onClick={() => setCreateOpen(true)}>创建相册</Button>
            }
          />
        </div>
      ) : (
        <div className="py-4">
          <AlbumList albums={albums} />
        </div>
      )}

      <CreateAlbumDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          setLoading(true);
          fetch("/api/albums")
            .then(r => r.json())
            .then(json => { if (json.data) setAlbums(json.data); })
            .finally(() => setLoading(false));
        }}
      />

      <button
        onClick={() => {
          localStorage.removeItem("fam_album_memberId");
          localStorage.removeItem("fam_album_nickname");
          setMemberId(null);
          setNickname(null);
        }}
        aria-label="退出登录"
        className="fixed bottom-6 right-6 px-4 py-2.5 rounded-lg bg-zinc-800 text-white text-sm font-medium active:scale-95 transition-transform shadow-sm z-[9997]"
      >
        退出登录
      </button>

      {memberId && <ChatFloatingButton memberId={memberId} />}
    </div>
  );
}

export default function Home() {
  return (
    <ToastProvider>
      <HomePage />
    </ToastProvider>
  );
}
"use client";

import { useState, useRef, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { ImageIcon, CloseIcon, TrashIcon } from "@/components/ui/Icons";

interface PhotoUploaderProps {
  albumId: string;
  onUploaded: () => void;
}

interface FileItem {
  id: string;
  file: File;
  preview: string;
  status: "pending" | "uploading" | "done" | "error";
  errorMsg?: string;
}

export function PhotoUploader({ albumId, onUploaded }: PhotoUploaderProps) {
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [memberId] = useLocalStorage<string | null>("fam_album_memberId", null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // 弹窗打开时重置文件列表
  useEffect(() => {
    if (open) {
      // 确保打开弹窗时文件列表为空
      setFiles([]);
    } else {
      // 关闭弹窗时清理所有 preview URL
      files.forEach((item) => {
        URL.revokeObjectURL(item.preview);
      });
      setFiles([]);
    }
  }, [open]);

  useEffect(() => {
    return () => {
      files.forEach((item) => {
        URL.revokeObjectURL(item.preview);
      });
    };
  }, [files]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    if (selected.length === 0) return;

    const validFiles = selected.filter((f) => {
      if (!f.type.startsWith("image/")) {
        toast(`${f.name} 不是图片文件`);
        return false;
      }
      if (f.size > 20 * 1024 * 1024) {
        toast(`${f.name} 超过20MB限制`);
        return false;
      }
      return true;
    });

    const items: FileItem[] = validFiles.map((f) => ({
      id: Math.random().toString(36).substr(2, 9),
      file: f,
      preview: URL.createObjectURL(f),
      status: "pending",
    }));
    setFiles((prev) => [...prev, ...items]);
    
    if (fileRef.current) {
      fileRef.current.value = "";
    }
  };

  const removeFile = (id: string) => {
    setFiles((prev) => {
      const itemToRemove = prev.find((f) => f.id === id);
      if (itemToRemove) {
        URL.revokeObjectURL(itemToRemove.preview);
      }
      return prev.filter((f) => f.id !== id);
    });
  };

  const removeAllFiles = () => {
    files.forEach((item) => {
      URL.revokeObjectURL(item.preview);
    });
    setFiles([]);
  };

  const handleUploadAll = async () => {
    if (files.length === 0) return;
    setUploading(true);

    let done = 0;
    let failed = 0;

    const pendingFiles = files.filter((f) => f.status === "pending");
    
    for (const item of pendingFiles) {
      setFiles((prev) =>
        prev.map((f) => (f.id === item.id ? { ...f, status: "uploading" } : f))
      );

      try {
        const form = new FormData();
        form.append("file", item.file);
        form.append("albumId", albumId);
        if (memberId) {
          form.append("memberId", memberId);
        }
        const res = await fetch("/api/photos", { method: "POST", body: form });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || `服务器错误 (${res.status})`);

        setFiles((prev) =>
          prev.map((f) =>
            f.id === item.id ? { ...f, status: "done", errorMsg: undefined } : f
          )
        );
        done++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "未知错误";
        setFiles((prev) =>
          prev.map((f) =>
            f.id === item.id ? { ...f, status: "error", errorMsg: msg } : f
          )
        );
        failed++;
      }
    }

    setUploading(false);
    if (done > 0) toast(`成功上传 ${done} 张`);
    if (failed > 0) toast(`${failed} 张失败`);

    setTimeout(() => {
      setFiles((prev) => {
        const remaining = prev.filter((f) => f.status !== "done");
        remaining.forEach((item) => {
          URL.revokeObjectURL(item.preview);
        });
        const newFiles = remaining.filter((f) => f.status === "error");
        if (newFiles.length === 0) setOpen(false);
        return newFiles;
      });
      if (done > 0) onUploaded();
    }, 1500);
  };

  const retryFile = async (id: string) => {
    const item = files.find((f) => f.id === id);
    if (!item) return;
    
    setFiles((prev) =>
      prev.map((f) =>
        f.id === id ? { ...f, status: "uploading", errorMsg: undefined } : f
      )
    );

    try {
      const form = new FormData();
      form.append("file", item.file);
      form.append("albumId", albumId);
      const res = await fetch("/api/photos", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `服务器错误 (${res.status})`);

      setFiles((prev) =>
        prev.map((f) =>
          f.id === id ? { ...f, status: "done", errorMsg: undefined } : f
        )
      );
      
      setTimeout(() => {
        setFiles((prev) => {
          const remaining = prev.filter((f) => f.id !== id);
          if (remaining.length === 0) setOpen(false);
          return remaining;
        });
        onUploaded();
      }, 500);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "未知错误";
      setFiles((prev) =>
        prev.map((f) =>
          f.id === id ? { ...f, status: "error", errorMsg: msg } : f
        )
      );
    }
  };

  const doneCount = files.filter((f) => f.status === "done").length;
  const pendingOrError = files.filter(
    (f) => f.status === "pending" || f.status === "error"
  ).length;

  const handleModalClose = () => {
    if (!uploading) {
      setOpen(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#07c160] text-white text-sm font-medium active:scale-95 transition-transform shadow-sm hover:shadow-md"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
        上传照片
      </button>

      <Modal
        open={open}
        onClose={handleModalClose}
        title={`上传照片${files.length > 0 ? ` (${files.length}张)` : ""}`}
      >
        <div className="flex flex-col gap-4 py-2">
          {/* Select button */}
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="w-full h-28 border-2 border-dashed border-zinc-200 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-[#07c160] hover:bg-[#07c160]/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center">
              <ImageIcon size={28} className="text-zinc-400" />
            </div>
            <span className="text-sm text-zinc-600">点击选择照片（支持多选）</span>
            <span className="text-xs text-zinc-400">支持 JPG、PNG 格式，单张不超过 20MB</span>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />

          {/* File list */}
          {files.length > 0 && (
            <div className="max-h-80 overflow-y-auto space-y-3">
              {/* Header with clear button */}
              <div className="flex items-center justify-between px-1">
                <span className="text-sm text-zinc-600 font-medium">已选择 {files.length} 张照片</span>
                {!uploading && (
                  <button
                    onClick={removeAllFiles}
                    className="text-sm text-red-500 flex items-center gap-1 hover:text-red-600 transition-colors"
                  >
                    <TrashIcon size={14} />
                    清空全部
                  </button>
                )}
              </div>
              
              {files.map((item) => (
                <div
                  key={item.id}
                  className={`flex items-center gap-3 p-3 rounded-xl ${
                    item.status === "error" ? "bg-red-50 border border-red-100" : 
                    item.status === "done" ? "bg-green-50 border border-green-100" :
                    "bg-zinc-50 border border-zinc-100"
                  }`}
                >
                  <div className="relative w-14 h-14 rounded-lg overflow-hidden shrink-0">
                    <img
                      src={item.preview}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                    {item.status === "uploading" && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                    {item.status === "done" && (
                      <div className="absolute inset-0 bg-green-500/80 flex items-center justify-center">
                        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-800 truncate">{item.file.name}</p>
                    <p className="text-xs mt-0.5">
                      {item.status === "pending" && <span className="text-zinc-500">等待上传</span>}
                      {item.status === "uploading" && <span className="text-blue-500">上传中...</span>}
                      {item.status === "done" && <span className="text-green-500">✓ 上传完成</span>}
                      {item.status === "error" && (
                        <span className="text-red-500">✗ {item.errorMsg || "上传失败"}</span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {item.status === "error" && !uploading && (
                      <button
                        onClick={() => retryFile(item.id)}
                        className="px-3 py-1.5 text-xs font-medium text-[#07c160] bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                      >
                        重试
                      </button>
                    )}
                    {!uploading && (
                      <button
                        onClick={() => removeFile(item.id)}
                        aria-label="移除"
                        className="w-8 h-8 flex items-center justify-center rounded-full text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <CloseIcon size={16} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <Button
            className="w-full py-3 text-base font-medium rounded-xl bg-[#07c160] hover:bg-[#06ad56] active:bg-[#05994a] text-white"
            onClick={handleUploadAll}
            loading={uploading}
            disabled={files.length === 0 || pendingOrError === 0}
          >
            {uploading
              ? `上传中 ${doneCount}/${files.length}`
              : `上传 ${pendingOrError} 张照片`}
          </Button>
        </div>
      </Modal>
    </>
  );
}

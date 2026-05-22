"use client";

import { useState, useRef } from "react";
import { generateId } from "@/lib/utils";

interface NicknameModalProps {
  open: boolean;
  onJoin: (memberId: string, nickname: string) => void;
}

export function NicknameModal({ open, onJoin }: NicknameModalProps) {
  const [nickname, setNickname] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState("");
  const loadingRef = useRef(false);

  const doJoin = async () => {
    if (loadingRef.current) return;

    const trimmed = nickname.trim();
    if (!trimmed) {
      setError("请输入昵称");
      return;
    }

    loadingRef.current = true;
    setLoading(true);
    setError("");
    setStep("正在发送请求...");

    let res: Response;
    try {
      res = await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname: trimmed }),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "未知错误";
      setError(`网络错误：${msg}`);
      setStep(`请求失败: ${msg}`);
      loadingRef.current = false;
      setLoading(false);
      return;
    }

    setStep("正在解析响应...");

    let json: { error?: string; data?: { id: string } };
    try {
      json = await res.json();
    } catch {
      setError(`服务器返回异常 (HTTP ${res.status})`);
      setStep(`解析失败 (HTTP ${res.status})`);
      loadingRef.current = false;
      setLoading(false);
      return;
    }

    if (!res.ok) {
      const msg = json.error || "请求失败";
      setError(`加入失败：${msg}`);
      setStep(`服务器拒绝: ${msg}`);
      loadingRef.current = false;
      setLoading(false);
      return;
    }

    setStep("正在保存...");

    const actualId = json.data?.id || generateId();

    try {
      onJoin(actualId, trimmed);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "未知错误";
      setError(`保存失败：${msg}`);
      setStep(`保存失败: ${msg}`);
      loadingRef.current = false;
      setLoading(false);
      return;
    }

    setStep("完成!");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      doJoin();
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white p-4">
      <div className="w-full max-w-[400px]">
        <div className="text-center mb-6">
          <div className="text-5xl mb-2">📷</div>
          <h2 className="text-xl font-semibold mb-1">加入家庭相册</h2>
          <p className="text-sm text-gray-500">请问怎么称呼你？</p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-sm mb-1 text-gray-700">你的昵称</label>
            <input
              type="text"
              inputMode="text"
              autoComplete="nickname"
              autoFocus
              placeholder="比如：妈妈、爸爸、小明…"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              onKeyDown={handleKeyDown}
              maxLength={20}
              className="w-full h-11 px-3 rounded-lg border border-gray-300 text-base outline-none focus:border-[#07c160] box-border"
            />
            {error && (
              <p className="text-red-500 text-xs mt-1">{error}</p>
            )}
          </div>

          <button
            type="button"
            disabled={loading}
            onClick={doJoin}
            className="w-full h-12 rounded-lg text-white text-base font-medium bg-[#07c160] active:bg-[#06ad56] disabled:opacity-70 border-0 outline-none select-none"
            style={{ touchAction: "manipulation" }}
          >
            {loading ? "加入中..." : "加入"}
          </button>

          {step && (
            <p className="text-xs text-gray-400 text-center">{step}</p>
          )}
        </div>
      </div>
    </div>
  );
}

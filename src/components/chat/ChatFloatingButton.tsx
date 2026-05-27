"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { ChatIcon } from "@/components/ui/Icons";
import { ChatBot } from "./ChatBot";

type Edge = "left" | "right" | "top" | "bottom";

interface ChatFloatingButtonProps {
  memberId: string;
}

const BUTTON_SIZE = 38;
const EDGE_MARGIN = 16;

export function ChatFloatingButton({ memberId }: ChatFloatingButtonProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // 用于 DOM 直控的位置引用 + 按钮元素引用
  const positionRef = useRef({ x: 0, y: 0 });
  const edgeRef = useRef<Edge>("right");
  const isDraggingRef = useRef(false);
  const initializedRef = useRef(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // 通过 requestAnimationFrame 直接操作 DOM 实现跟手
  const rafRef = useRef(0);
  const syncDomPosition = useCallback(() => {
    const el = buttonRef.current;
    if (!el) return;
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const p = positionRef.current;
      el.style.left = `${p.x}px`;
      el.style.top = `${p.y}px`;
    });
  }, []);

  const constrainToEdge = useCallback(
    (mouseX: number, mouseY: number) => {
      if (typeof window === "undefined") return;

      const sw = window.innerWidth;
      const sh = window.innerHeight;
      const half = BUTTON_SIZE / 2;

      // 四条边上按钮中心的最优位置
      const candidates: { x: number; y: number; edge: Edge; dist: number }[] = [];

      // 左边
      const leftY = Math.max(
        EDGE_MARGIN + 60,
        Math.min(mouseY, sh - BUTTON_SIZE - EDGE_MARGIN)
      );
      candidates.push({
        x: EDGE_MARGIN,
        y: leftY,
        edge: "left",
        dist: Math.abs(mouseX - EDGE_MARGIN - half) + Math.abs(mouseY - leftY - half),
      });

      // 右边
      const rightY = Math.max(
        EDGE_MARGIN + 60,
        Math.min(mouseY, sh - BUTTON_SIZE - EDGE_MARGIN)
      );
      candidates.push({
        x: sw - BUTTON_SIZE - EDGE_MARGIN,
        y: rightY,
        edge: "right",
        dist: Math.abs(mouseX - (sw - BUTTON_SIZE - EDGE_MARGIN) - half) +
          Math.abs(mouseY - rightY - half),
      });

      // 上边
      const topX = Math.max(
        EDGE_MARGIN,
        Math.min(mouseX, sw - BUTTON_SIZE - EDGE_MARGIN)
      );
      candidates.push({
        x: topX,
        y: EDGE_MARGIN + 60,
        edge: "top",
        dist: Math.abs(mouseX - topX - half) +
          Math.abs(mouseY - (EDGE_MARGIN + 60) - half),
      });

      // 下边
      const bottomX = Math.max(
        EDGE_MARGIN,
        Math.min(mouseX, sw - BUTTON_SIZE - EDGE_MARGIN)
      );
      candidates.push({
        x: bottomX,
        y: sh - BUTTON_SIZE - EDGE_MARGIN - 70,
        edge: "bottom",
        dist: Math.abs(mouseX - bottomX - half) +
          Math.abs(mouseY - (sh - BUTTON_SIZE - EDGE_MARGIN - 70) - half),
      });

      // 选距离手指最近的边
      const best = candidates.reduce((a, b) => (a.dist < b.dist ? a : b));

      positionRef.current = { x: best.x, y: best.y };
      edgeRef.current = best.edge;
      syncDomPosition();
    },
    [syncDomPosition]
  );

  // 拖拽移动处理
  const handleDragMove = useCallback((clientX: number, clientY: number) => {
    if (!isDraggingRef.current) return;
    constrainToEdge(clientX, clientY);
  }, [constrainToEdge]);

  const handleDragEnd = useCallback(() => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    syncDomPosition();
  }, [syncDomPosition]);

  // 鼠标事件
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingRef.current = true;
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    handleDragMove(e.clientX, e.clientY);
  }, [handleDragMove]);

  const handleMouseUp = useCallback(() => {
    handleDragEnd();
  }, [handleDragEnd]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    isDraggingRef.current = true;
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    e.preventDefault();
    if (!isDraggingRef.current) return;
    const touch = e.touches[0];
    handleDragMove(touch.clientX, touch.clientY);
  }, [handleDragMove]);

  const handleTouchEnd = useCallback(() => {
    handleDragEnd();
  }, [handleDragEnd]);

  // 全局事件绑定
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => handleMouseMove(e);
    const onMouseUp = () => handleMouseUp();
    const onTouchMove = (e: TouchEvent) => {
      if (isDraggingRef.current) {
        e.preventDefault();
        handleTouchMove(e);
      }
    };
    const onTouchEnd = () => handleTouchEnd();

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  // 初始化位置（仅首次渲染）
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const w = window.innerWidth;
    const h = window.innerHeight;
    const initPos = {
      x: w - BUTTON_SIZE - EDGE_MARGIN,
      y: h - BUTTON_SIZE - EDGE_MARGIN - 70,
    };
    positionRef.current = initPos;
    setMounted(true);
  }, []);

  // mounted 后同步 DOM 位置
  useEffect(() => {
    if (mounted) {
      syncDomPosition();
    }
  }, [mounted, syncDomPosition]);

  const wasDragging = useRef(false);

  const handleClick = useCallback(() => {
    if (wasDragging.current) {
      wasDragging.current = false;
      return;
    }
    setOpen(true);
  }, []);

  const handleMouseDownWrap = useCallback((e: React.MouseEvent) => {
    wasDragging.current = false;
    handleMouseDown(e);
  }, [handleMouseDown]);

  const handleTouchStartWrap = useCallback((e: React.TouchEvent) => {
    wasDragging.current = false;
    handleTouchStart(e);
  }, [handleTouchStart]);

  // 拖拽结束后标记（防止拖拽后的 click 事件）
  useEffect(() => {
    const markDragged = () => {
      if (isDraggingRef.current) wasDragging.current = true;
    };
    const onTouchMove = () => { wasDragging.current = true; };
    const onMouseMove = () => { if (isDraggingRef.current) wasDragging.current = true; };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("touchmove", onTouchMove);
    window.addEventListener("mouseup", markDragged);
    window.addEventListener("touchend", markDragged);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("mouseup", markDragged);
      window.removeEventListener("touchend", markDragged);
    };
  }, []);

  if (!mounted) return null;

  return (
    <>
      <button
        ref={buttonRef}
        onClick={handleClick}
        onMouseDown={handleMouseDownWrap}
        onTouchStart={handleTouchStartWrap}
        className="fixed w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg flex items-center justify-center z-[9999] hover:shadow-xl hover:scale-105 active:scale-95 cursor-grab"
        style={{
          touchAction: "none",
          userSelect: "none",
          WebkitUserSelect: "none",
        }}
        aria-label="打开聊天助手"
      >
        <ChatIcon size={18} />
      </button>

      <ChatBot open={open} onClose={() => setOpen(false)} memberId={memberId} />
    </>
  );
}

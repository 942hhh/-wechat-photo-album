"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { ChatIcon } from "@/components/ui/Icons";
import { ChatBot } from "./ChatBot";

interface Position {
  x: number;
  y: number;
}

type Edge = "left" | "right" | "top" | "bottom";

interface ChatFloatingButtonProps {
  memberId: string;
}

export function ChatFloatingButton({ memberId }: ChatFloatingButtonProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 });
  const [currentEdge, setCurrentEdge] = useState<Edge>("right");
  const [isDragging, setIsDragging] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dragStartPos = useRef<Position>({ x: 0, y: 0 });
  const dragStartMouse = useRef<Position>({ x: 0, y: 0 });

  const BUTTON_SIZE = 56;
  const EDGE_MARGIN = 16;
  const CORNER_THRESHOLD = 60;

  const getInitialPosition = useCallback((): { pos: Position; edge: Edge } => {
    if (typeof window === "undefined") return { pos: { x: 0, y: 0 }, edge: "right" };

    return {
      pos: {
        x: window.innerWidth - BUTTON_SIZE - EDGE_MARGIN,
        y: window.innerHeight - BUTTON_SIZE - EDGE_MARGIN - 70,
      },
      edge: "right",
    };
  }, []);

  useEffect(() => {
    const { pos, edge } = getInitialPosition();
    setPosition(pos);
    setCurrentEdge(edge);
  }, [getInitialPosition]);

  const constrainToEdge = useCallback((mouseX: number, mouseY: number, edge: Edge): { pos: Position; newEdge: Edge } => {
    if (typeof window === "undefined") return { pos: position, newEdge: edge };

    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;

    let newX = position.x;
    let newY = position.y;
    let newEdge = edge;

    switch (edge) {
      case "left":
        newX = EDGE_MARGIN;
        newY = Math.max(EDGE_MARGIN + 60, Math.min(mouseY - BUTTON_SIZE / 2, screenHeight - BUTTON_SIZE - EDGE_MARGIN));

        if (newY <= EDGE_MARGIN + 60 + CORNER_THRESHOLD && mouseX < CORNER_THRESHOLD * 2) {
          newEdge = "top";
          newX = Math.max(EDGE_MARGIN, Math.min(mouseX - BUTTON_SIZE / 2, screenWidth - BUTTON_SIZE - EDGE_MARGIN));
          newY = EDGE_MARGIN + 60;
        } else if (newY >= screenHeight - BUTTON_SIZE - EDGE_MARGIN - CORNER_THRESHOLD && mouseX < CORNER_THRESHOLD * 2) {
          newEdge = "bottom";
          newX = Math.max(EDGE_MARGIN, Math.min(mouseX - BUTTON_SIZE / 2, screenWidth - BUTTON_SIZE - EDGE_MARGIN));
          newY = screenHeight - BUTTON_SIZE - EDGE_MARGIN - 70;
        }
        break;

      case "right":
        newX = screenWidth - BUTTON_SIZE - EDGE_MARGIN;
        newY = Math.max(EDGE_MARGIN + 60, Math.min(mouseY - BUTTON_SIZE / 2, screenHeight - BUTTON_SIZE - EDGE_MARGIN));

        if (newY <= EDGE_MARGIN + 60 + CORNER_THRESHOLD && mouseX > screenWidth - CORNER_THRESHOLD * 2) {
          newEdge = "top";
          newX = Math.max(EDGE_MARGIN, Math.min(mouseX - BUTTON_SIZE / 2, screenWidth - BUTTON_SIZE - EDGE_MARGIN));
          newY = EDGE_MARGIN + 60;
        } else if (newY >= screenHeight - BUTTON_SIZE - EDGE_MARGIN - CORNER_THRESHOLD && mouseX > screenWidth - CORNER_THRESHOLD * 2) {
          newEdge = "bottom";
          newX = Math.max(EDGE_MARGIN, Math.min(mouseX - BUTTON_SIZE / 2, screenWidth - BUTTON_SIZE - EDGE_MARGIN));
          newY = screenHeight - BUTTON_SIZE - EDGE_MARGIN - 70;
        }
        break;

      case "top":
        newY = EDGE_MARGIN + 60;
        newX = Math.max(EDGE_MARGIN, Math.min(mouseX - BUTTON_SIZE / 2, screenWidth - BUTTON_SIZE - EDGE_MARGIN));

        if (newX <= EDGE_MARGIN + CORNER_THRESHOLD && mouseY < EDGE_MARGIN * 2 + 60 + CORNER_THRESHOLD) {
          newEdge = "left";
          newX = EDGE_MARGIN;
          newY = Math.max(EDGE_MARGIN + 60, Math.min(mouseY - BUTTON_SIZE / 2, screenHeight - BUTTON_SIZE - EDGE_MARGIN));
        } else if (newX >= screenWidth - BUTTON_SIZE - EDGE_MARGIN - CORNER_THRESHOLD && mouseY < EDGE_MARGIN * 2 + 60 + CORNER_THRESHOLD) {
          newEdge = "right";
          newX = screenWidth - BUTTON_SIZE - EDGE_MARGIN;
          newY = Math.max(EDGE_MARGIN + 60, Math.min(mouseY - BUTTON_SIZE / 2, screenHeight - BUTTON_SIZE - EDGE_MARGIN));
        }
        break;

      case "bottom":
        newY = screenHeight - BUTTON_SIZE - EDGE_MARGIN - 70;
        newX = Math.max(EDGE_MARGIN, Math.min(mouseX - BUTTON_SIZE / 2, screenWidth - BUTTON_SIZE - EDGE_MARGIN));

        if (newX <= EDGE_MARGIN + CORNER_THRESHOLD && mouseY > screenHeight - EDGE_MARGIN * 2 - 70 - CORNER_THRESHOLD) {
          newEdge = "left";
          newX = EDGE_MARGIN;
          newY = Math.max(EDGE_MARGIN + 60, Math.min(mouseY - BUTTON_SIZE / 2, screenHeight - BUTTON_SIZE - EDGE_MARGIN));
        } else if (newX >= screenWidth - BUTTON_SIZE - EDGE_MARGIN - CORNER_THRESHOLD && mouseY > screenHeight - EDGE_MARGIN * 2 - 70 - CORNER_THRESHOLD) {
          newEdge = "right";
          newX = screenWidth - BUTTON_SIZE - EDGE_MARGIN;
          newY = Math.max(EDGE_MARGIN + 60, Math.min(mouseY - BUTTON_SIZE / 2, screenHeight - BUTTON_SIZE - EDGE_MARGIN));
        }
        break;
    }

    return { pos: { x: newX, y: newY }, newEdge };
  }, [position]);

  const handleDragStart = useCallback((clientX: number, clientY: number) => {
    setIsDragging(true);
    dragStartMouse.current = { x: clientX, y: clientY };
    dragStartPos.current = position;
  }, [position]);

  const handleDragMove = useCallback((clientX: number, clientY: number) => {
    if (!isDragging) return;

    const { pos, newEdge } = constrainToEdge(clientX, clientY, currentEdge);
    setPosition(pos);
    setCurrentEdge(newEdge);
  }, [isDragging, currentEdge, constrainToEdge]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    handleDragStart(e.clientX, e.clientY);
  }, [handleDragStart]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    handleDragMove(e.clientX, e.clientY);
  }, [handleDragMove]);

  const handleMouseUp = useCallback(() => {
    handleDragEnd();
  }, [handleDragEnd]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    handleDragStart(touch.clientX, touch.clientY);
  }, [handleDragStart]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    handleDragMove(touch.clientX, touch.clientY);
  }, [handleDragMove]);

  const handleTouchEnd = useCallback(() => {
    handleDragEnd();
  }, [handleDragEnd]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      window.addEventListener("touchmove", handleTouchMove, { passive: false });
      window.addEventListener("touchend", handleTouchEnd);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  const handleClick = useCallback(() => {
    if (!isDragging) {
      setOpen(true);
    }
  }, [isDragging]);

  return (
    <>
      <button
        ref={buttonRef}
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        className={`fixed w-14 h-14 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg flex items-center justify-center z-[9999] transition-all ${
          isDragging
            ? "scale-110 shadow-2xl cursor-grabbing"
            : "hover:shadow-xl hover:scale-105 active:scale-95 cursor-grab"
        }`}
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          touchAction: "none",
          userSelect: "none",
        }}
        aria-label="打开聊天助手"
      >
        <ChatIcon size={26} />
      </button>

      <ChatBot open={open} onClose={() => setOpen(false)} memberId={memberId} />
    </>
  );
}

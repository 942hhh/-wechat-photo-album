"use client";

import { useState } from "react";
import { ChatIcon, HomeIcon } from "@/components/ui/Icons";
import { ChatBot } from "./ChatBot";

interface BottomNavBarProps {
  memberId: string;
}

export function BottomNavBar({ memberId }: BottomNavBarProps) {
  const [activeTab, setActiveTab] = useState<"home" | "chat">("home");
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-zinc-200 px-6 py-2 flex justify-around items-center z-[9998] safe-area-bottom">
        <button
          onClick={() => {
            setActiveTab("home");
            setChatOpen(false);
          }}
          className={`flex flex-col items-center gap-1 py-2 px-4 rounded-lg transition-colors ${
            activeTab === "home"
              ? "text-[#07c160]"
              : "text-zinc-400 hover:text-zinc-600"
          }`}
        >
          <HomeIcon size={24} />
          <span className="text-xs font-medium">相册</span>
        </button>

        <button
          onClick={() => {
            setActiveTab("chat");
            setChatOpen(true);
          }}
          className={`flex flex-col items-center gap-1 py-2 px-4 rounded-lg transition-colors ${
            activeTab === "chat"
              ? "text-[#07c160]"
              : "text-zinc-400 hover:text-zinc-600"
          }`}
        >
          <ChatIcon size={24} />
          <span className="text-xs font-medium">助手</span>
        </button>
      </nav>

      <ChatBot open={chatOpen} onClose={() => { setChatOpen(false); setActiveTab("home"); }} memberId={memberId} />
    </>
  );
}

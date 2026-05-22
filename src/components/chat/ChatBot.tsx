"use client";

import { useState, useEffect, useRef } from "react";
import { SendIcon, CloseIcon } from "@/components/ui/Icons";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

interface ChatBotProps {
  open: boolean;
  onClose: () => void;
  memberId: string;
}

const QUICK_REPLIES = [
  "讲个笑话 😄",
  "今天天气怎么样？",
  "给我一句鼓励的话",
  "你叫什么名字？",
];

export function ChatBot({ open, onClose, memberId }: ChatBotProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && memberId) {
      loadHistory();
    }
  }, [open, memberId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadHistory = async () => {
    try {
      setLoadingHistory(true);
      const res = await fetch(`/api/chat?memberId=${memberId}`);
      const json = await res.json();
      if (json.data) {
        setMessages(json.data);
      }
    } catch (error) {
      console.error("Load history error:", error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const sendMessage = async (text?: string) => {
    const messageText = text || inputValue.trim();
    if (!messageText || loading) return;

    setInputValue("");
    setLoading(true);

    // 添加用户消息到UI
    const userMessage: Message = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: messageText,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: messageText,
          memberId,
        }),
      });

      const json = await res.json();

      if (!res.ok) throw new Error(json.error || "发送失败");

      // 添加助手回复
      const assistantMessage: Message = {
        id: json.data.id,
        role: "assistant",
        content: json.data.content,
        createdAt: json.data.createdAt,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Send message error:", error);
      const errorMsg: Message = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content: "抱歉，消息发送失败，请稍后重试。",
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-end justify-center bg-black/30 sm:items-center sm:p-4">
      <div className="w-full max-w-lg h-[85vh] sm:h-[600px] bg-white rounded-t-2xl sm:rounded-2xl flex flex-col shadow-2xl overflow-hidden">
        {/* 头部 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 bg-gradient-to-r from-blue-500 to-purple-600">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white text-xl">
              🤖
            </div>
            <div>
              <h3 className="text-white font-semibold text-base">家庭小助手</h3>
              <p className="text-white/80 text-xs">在线 · 随时为你服务</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors"
          >
            <CloseIcon size={18} />
          </button>
        </div>

        {/* 消息列表 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
          {loadingHistory ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-zinc-400 text-sm">加载历史消息...</div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <div className="text-6xl mb-4">👋</div>
              <h3 className="text-lg font-semibold text-zinc-800 mb-2">
                你好！我是小智
              </h3>
              <p className="text-sm text-zinc-500 mb-6">
                我是你的家庭智能助手，可以陪你聊天、回答问题、讲故事...
              </p>
              <div className="grid grid-cols-2 gap-2 w-full max-w-xs">
                {QUICK_REPLIES.map((reply, index) => (
                  <button
                    key={index}
                    onClick={() => sendMessage(reply)}
                    className="px-3 py-2 bg-white border border-zinc-200 rounded-lg text-xs text-zinc-700 hover:bg-blue-50 hover:border-blue-200 transition-colors"
                  >
                    {reply}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] px-4 py-2.5 rounded-2xl ${
                      msg.role === "user"
                        ? "bg-blue-500 text-white rounded-br-md"
                        : "bg-white text-zinc-800 shadow-sm border border-zinc-100 rounded-bl-md"
                    }`}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    <p
                      className={`text-[10px] mt-1 ${
                        msg.role === "user" ? "text-blue-100" : "text-zinc-400"
                      }`}
                    >
                      {new Date(msg.createdAt).toLocaleTimeString("zh-CN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="bg-white px-4 py-3 rounded-2xl rounded-bl-md shadow-sm border border-zinc-100">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* 快捷回复 */}
        {!loadingHistory && messages.length > 0 && (
          <div className="px-4 py-2 bg-white border-t border-zinc-100 flex gap-2 overflow-x-auto">
            {QUICK_REPLIES.map((reply, index) => (
              <button
                key={index}
                onClick={() => sendMessage(reply)}
                className="px-3 py-1.5 bg-gray-100 rounded-full text-xs text-zinc-700 whitespace-nowrap hover:bg-blue-50 hover:text-blue-600 transition-colors flex-shrink-0"
              >
                {reply}
              </button>
            ))}
          </div>
        )}

        {/* 输入框 */}
        <div className="px-4 py-3 bg-white border-t border-zinc-100">
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="输入消息..."
              disabled={loading}
              className="flex-1 px-4 py-2.5 bg-gray-100 rounded-full text-sm outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50"
            />
            <button
              onClick={() => sendMessage()}
              disabled={!inputValue.trim() || loading}
              className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
            >
              <SendIcon size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
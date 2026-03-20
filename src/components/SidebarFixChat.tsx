import React, { useState, useEffect, useRef } from "react";
import { User, Wand2, X, Copy, ClipboardCheck } from "lucide-react";
import { RobotChat, Logo } from "./Logo";
import ReactMarkdown from "react-markdown";
import { motion, AnimatePresence } from "motion/react";

interface Message {
  role: "user" | "assistant";
  content: string;
  fixedCode?: string;
}

interface SidebarFixChatProps {
  currentCode: string;
  onApplyFix: (fixedCode: string) => void;
  token: string;
  onAuthError?: () => void;
  onClose?: () => void;
  autoMessage?: string | null;
}

export const SidebarFixChat: React.FC<SidebarFixChatProps> = ({
  currentCode,
  onApplyFix,
  token,
  onAuthError,
  onClose,
  autoMessage
}) => {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hey! I'm **Test AI** - your AI QA engineer. Ask me anything about Playwright tests, debugging failures, or test strategies!" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [aiMode, setAiMode] = useState<"local" | "gemini" | "ollama">("local");
  const scrollRef = useRef<HTMLDivElement>(null);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [copiedCodeIdx, setCopiedCodeIdx] = useState<number | null>(null);

  const copyMessage = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const copyCodeBlock = (content: string, idx: number) => {
    const codeBlocks = content.match(/```[\s\S]*?```/g);
    const code = codeBlocks
      ? codeBlocks.map(b => b.replace(/```\w*\n?/g, "").replace(/```$/g, "").trim()).join("\n\n")
      : content;
    navigator.clipboard.writeText(code);
    setCopiedCodeIdx(idx);
    setTimeout(() => setCopiedCodeIdx(null), 2000);
  };

  const hasCodeBlock = (content: string) => /```/.test(content);

  useEffect(() => {
    fetch("/api/ai-status", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (d.mode) setAiMode(d.mode); })
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Auto-send test results analysis when autoMessage is provided
  const autoMessageSentRef = useRef<string | null>(null);
  useEffect(() => {
    if (!autoMessage || loading || autoMessageSentRef.current === autoMessage) return;
    autoMessageSentRef.current = autoMessage;
    const sendAuto = async () => {
      const userMsg = { role: "user" as const, content: autoMessage };
      setMessages((prev) => [...prev, userMsg]);
      setLoading(true);
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
          body: JSON.stringify({ code: currentCode, message: autoMessage }),
        });
        if (!res.ok) {
          const errorBody = await res.json().catch(() => ({}));
          if (res.status === 401) onAuthError?.();
          setMessages((prev) => [...prev, { role: "assistant", content: errorBody.error || `Analysis failed (${res.status})` }]);
          return;
        }
        const data = await res.json();
        setMessages((prev) => [...prev, { role: "assistant", content: data.response || "Could not analyze the results." }]);
      } catch {
        setMessages((prev) => [...prev, { role: "assistant", content: "Error connecting to AI service for analysis." }]);
      } finally {
        setLoading(false);
      }
    };
    sendAuto();
  }, [autoMessage]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: "user" as const, content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ code: currentCode, message: input }),
      });

      if (!res.ok) {
        const errorBody = await res.json().catch(() => ({}));
        if (res.status === 401) onAuthError?.();
        setMessages((prev) => [...prev, { role: "assistant", content: errorBody.error || `Chat failed (${res.status})` }]);
        return;
      }

      const data = await res.json();
      if (data.response) {
        setMessages((prev) => [...prev, { role: "assistant", content: data.response, fixedCode: data.fixedCode }]);
      } else {
        setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, I couldn't generate a response." }]);
      }
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Error connecting to AI service." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-950">
      {/* Header */}
      <div className="shrink-0 px-5 py-3.5 border-b border-gray-200 dark:border-emerald-500/10 flex items-center justify-between bg-gray-50 dark:bg-slate-900/80">
        <div className="flex items-center gap-2.5">
          <RobotChat size={24} />
          <span className="text-sm font-bold text-gray-800 dark:text-slate-100">Test AI</span>
          <span className={`px-2 py-0.5 rounded text-[8px] font-black tracking-[0.15em] border mono-label ${aiMode !== "local" ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20" : "bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-slate-500 border-gray-200 dark:border-slate-700/30"}`}>
            {aiMode === "gemini" ? "GEMINI" : aiMode === "ollama" ? "AI" : "LOCAL"}
          </span>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 dark:text-slate-500 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all">
            <X size={16} />
          </button>
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-emerald-500/10">
        <div className="p-4 space-y-5">
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
            >
              {/* Avatar */}
              {msg.role === "user" ? (
                <div className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center mt-0.5 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30">
                  <User size={14} />
                </div>
              ) : (
                <div className="shrink-0 mt-0.5">
                  <RobotChat size={32} />
                </div>
              )}

              {/* Message Bubble */}
              <div className={`relative group flex-1 min-w-0 max-w-[calc(100%-3rem)] overflow-hidden ${msg.role === "user" ? "text-right" : ""}`}>
                <div className={`inline-block text-left p-3.5 rounded-2xl text-[13px] leading-[1.7] break-words max-w-full overflow-hidden ${
                  msg.role === "user"
                    ? "bg-emerald-500 text-white dark:text-black rounded-tr-md"
                    : "bg-gray-100 dark:bg-slate-900/80 text-gray-700 dark:text-slate-300 border border-gray-200 dark:border-slate-700/20 rounded-tl-md"
                }`}>
                  {/* Copy buttons */}
                  <div className={`absolute top-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 ${msg.role === "user" ? "left-2" : "right-2"}`}>
                    {msg.role === "assistant" && hasCodeBlock(msg.content) && (
                      <button onClick={() => copyCodeBlock(msg.content, i)} className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 text-[8px] font-bold text-gray-500 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all shadow-sm mono-label" title="Copy code">
                        {copiedCodeIdx === i ? <ClipboardCheck size={10} className="text-emerald-500" /> : <Copy size={10} />}
                        {copiedCodeIdx === i ? "Copied!" : "Code"}
                      </button>
                    )}
                    <button onClick={() => copyMessage(msg.content, i)} className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[8px] font-bold transition-all shadow-sm mono-label ${
                      msg.role === "user"
                        ? "bg-emerald-600 border-emerald-400/30 text-emerald-100 hover:bg-emerald-700"
                        : "bg-white dark:bg-slate-700 border-gray-200 dark:border-slate-600 text-gray-500 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400"
                    }`} title="Copy message">
                      {copiedIdx === i ? <ClipboardCheck size={10} className={msg.role === "user" ? "text-white" : "text-emerald-500"} /> : <Copy size={10} />}
                      {copiedIdx === i ? "Copied!" : "Copy"}
                    </button>
                  </div>

                  {/* Content */}
                  <div className={`chat-markdown overflow-hidden ${msg.role === "user" ? "text-white dark:text-black" : ""}`}>
                    <ReactMarkdown
                      components={{
                        pre: ({ children }) => (
                          <pre className="my-2 p-3 rounded-lg bg-gray-800 dark:bg-slate-950 text-emerald-300 dark:text-emerald-400 text-xs leading-relaxed overflow-x-auto max-w-full border border-gray-700 dark:border-emerald-500/10 font-mono">
                            {children}
                          </pre>
                        ),
                        code: ({ children, className }) => {
                          const isBlock = className?.includes("language-");
                          return isBlock ? (
                            <code className="text-xs">{children}</code>
                          ) : (
                            <code className="px-1.5 py-0.5 rounded bg-gray-200 dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 text-xs font-mono">{children}</code>
                          );
                        },
                        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                        ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>,
                        ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>,
                        strong: ({ children }) => <strong className="font-bold">{children}</strong>,
                        a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-emerald-600 dark:text-emerald-400 underline hover:text-emerald-500">{children}</a>,
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  </div>

                  {msg.fixedCode && (
                    <button onClick={() => onApplyFix(msg.fixedCode!)} className="mt-3 w-full flex items-center justify-center gap-2 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-lg transition-all text-[10px] font-bold uppercase tracking-[0.1em] mono-label">
                      <Wand2 size={12} /> Apply Fix
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}

          {/* Loading indicator */}
          <AnimatePresence>
            {loading && (
              <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex gap-3">
                <motion.div animate={{ y: [0, -3, 0] }} transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }} className="shrink-0">
                  <RobotChat size={32} />
                </motion.div>
                <div className="bg-gray-100 dark:bg-slate-900/80 border border-gray-200 dark:border-slate-700/20 rounded-2xl rounded-tl-md px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={scrollRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="shrink-0 p-3 bg-gray-50 dark:bg-slate-900/60 border-t border-gray-200 dark:border-emerald-500/10">
        <div className="flex items-end gap-2 bg-white dark:bg-slate-950/80 border border-gray-200 dark:border-slate-700/30 rounded-xl p-2 transition-all focus-within:border-emerald-400 dark:focus-within:border-emerald-500/30 focus-within:shadow-sm focus-within:shadow-emerald-500/5">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleSend())}
            placeholder="Ask anything about testing..."
            className="flex-1 bg-transparent border-none px-2 py-2 text-sm text-gray-800 dark:text-slate-200 focus:outline-none focus:ring-0 resize-none max-h-28 min-h-[36px] leading-relaxed placeholder-gray-400 dark:placeholder-slate-600"
            rows={1}
          />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="shrink-0 w-9 h-9 flex items-center justify-center bg-emerald-500 hover:bg-emerald-400 text-white dark:text-black rounded-lg disabled:opacity-20 transition-colors shadow-sm shadow-emerald-500/20"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </motion.button>
        </div>
        <div className="flex items-center justify-center gap-2 mt-2">
          <div className="w-1 h-1 rounded-full bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.5)]" />
          <span className="text-[8px] text-gray-400 dark:text-slate-600 font-bold mono-label tracking-[0.2em]">
            {aiMode === "gemini" ? "GEMINI" : aiMode === "ollama" ? "OLLAMA" : "LOCAL"} + RAG
          </span>
        </div>
      </div>
    </div>
  );
};

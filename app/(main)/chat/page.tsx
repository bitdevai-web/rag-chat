"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import {
  Send,
  ChevronDown,
  User,
  FileText,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { CogniBaseLogo } from "@/components/CogniBaseLogo";

type Category = { id: number; name: string; doc_count: number };

type Source = { file: string; excerpt: string; score: number };

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  error?: string;
};

export default function ChatPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [category, setCategory] = useState<Category | null>(null);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/categories");
      const data: Category[] = await res.json();
      setCategories(data);
      if (data.length && !category) setCategory(data[0]);
    } catch {}
  }, [category]);

  useEffect(() => {
    loadCategories();
  }, []);

  // Load history when category changes
  useEffect(() => {
    if (!category) return;
    setMessages([]);
    fetch(`/api/chat?category=${encodeURIComponent(category.name)}`)
      .then((r) => r.json())
      .then((rows: { id: number; role: string; content: string; sources: string }[]) => {
        if (!Array.isArray(rows)) return;
        setMessages(
          rows.map((r) => ({
            id: String(r.id),
            role: r.role as "user" | "assistant",
            content: r.content,
            sources: r.sources ? JSON.parse(r.sources) : [],
          }))
        );
      })
      .catch(() => {});
  }, [category?.name]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    const q = input.trim();
    if (!q || loading || !category) return;
    setInput("");

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: q,
    };
    setMessages((m) => [...m, userMsg]);
    setLoading(true);

    const assistantId = (Date.now() + 1).toString();
    setMessages((m) => [
      ...m,
      { id: assistantId, role: "assistant", content: "" },
    ]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, category: category.name }),
      });

      const ct = res.headers.get("content-type") || "";
      if (!ct.includes("text/event-stream")) {
        const data = await res.json();
        setMessages((m) =>
          m.map((msg) =>
            msg.id === assistantId
              ? { ...msg, content: data.answer || data.error || "Error", error: data.error }
              : msg
          )
        );
        setLoading(false);
        return;
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n\n");
        buf = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6);
          if (raw === "[DONE]") continue;
          try {
            const parsed = JSON.parse(raw);
            if (parsed.text) {
              setMessages((m) =>
                m.map((msg) =>
                  msg.id === assistantId
                    ? { ...msg, content: msg.content + parsed.text }
                    : msg
                )
              );
            }
            if (parsed.sources) {
              setMessages((m) =>
                m.map((msg) =>
                  msg.id === assistantId
                    ? { ...msg, sources: parsed.sources }
                    : msg
                )
              );
            }
            if (parsed.error) {
              setMessages((m) =>
                m.map((msg) =>
                  msg.id === assistantId
                    ? { ...msg, content: parsed.error, error: parsed.error }
                    : msg
                )
              );
            }
          } catch {}
        }
      }
    } catch (e) {
      setMessages((m) =>
        m.map((msg) =>
          msg.id === assistantId
            ? {
                ...msg,
                content: "Network error. Is the server running?",
                error: String(e),
              }
            : msg
        )
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-gray-900">Chat</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Ask questions in plain English — CogniBase finds the answers in your documents
          </p>
        </div>

        {/* Category selector */}
        <div className="relative">
          <button
            onClick={() => setCategoryOpen((o) => !o)}
            className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            {category?.name ?? "Select category"}
            <ChevronDown
              size={14}
              className={`transition-transform ${categoryOpen ? "rotate-180" : ""}`}
            />
          </button>
          {categoryOpen && (
            <div className="absolute right-0 mt-1 w-52 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1">
              {categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setCategory(c);
                    setCategoryOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center justify-between transition-colors ${
                    c.id === category?.id
                      ? "text-blue-700 font-medium"
                      : "text-gray-700"
                  }`}
                >
                  {c.name}
                  <span className="text-xs text-gray-400">
                    {c.doc_count} doc{c.doc_count !== 1 ? "s" : ""}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-50 to-violet-50 flex items-center justify-center mb-4 border border-blue-100">
              <CogniBaseLogo size={36} />
            </div>
            <h2 className="text-sm font-semibold text-gray-800">
              Ask anything about your {category?.name ?? ""} documents
            </h2>
            <p className="text-xs text-gray-400 mt-1 max-w-xs">
              Type a question like &ldquo;What are the key terms?&rdquo; or &ldquo;Summarize the main points&rdquo; — CogniBase will find the answer.
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                msg.role === "user"
                  ? "bg-gradient-to-br from-blue-500 to-violet-600"
                  : "bg-gray-100"
              }`}
            >
              {msg.role === "user" ? (
                <User size={14} className="text-white" />
              ) : (
                <CogniBaseLogo size={20} />
              )}
            </div>

            <div
              className={`max-w-[72%] space-y-2 ${msg.role === "user" ? "items-end flex flex-col" : ""}`}
            >
              <div
                className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.error
                    ? "bg-red-50 border border-red-200 text-red-700 rounded-tl-sm"
                    : msg.role === "user"
                    ? "bg-gradient-to-br from-blue-500 to-violet-600 text-white rounded-tr-sm"
                    : "bg-white border border-gray-200 text-gray-800 rounded-tl-sm"
                }`}
              >
                {msg.error && (
                  <AlertCircle size={14} className="inline mr-1.5 mb-0.5" />
                )}
                {msg.content || (
                  <span className="flex items-center gap-2 text-gray-400">
                    <Loader2 size={13} className="animate-spin" />
                    Thinking…
                  </span>
                )}
              </div>

              {msg.sources && msg.sources.length > 0 && (
                <div className="space-y-1 w-full">
                  {msg.sources.map((s, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2"
                    >
                      <FileText
                        size={12}
                        className="text-blue-400 mt-0.5 flex-shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-blue-700 flex items-center gap-1.5">
                          {s.file}
                          <span className="text-blue-400 font-normal">
                            {s.score}% match
                          </span>
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                          {s.excerpt}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="bg-white border-t border-gray-200 px-6 py-4">
        <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) =>
              e.key === "Enter" && !e.shiftKey && !loading && send()
            }
            placeholder={
              category
                ? `Ask about your ${category.name} documents…`
                : "Select a category first…"
            }
            disabled={!category || loading}
            className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 outline-none disabled:cursor-not-allowed"
          />
          <button
            onClick={send}
            disabled={!input.trim() || loading || !category}
            className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center hover:from-blue-600 hover:to-violet-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            {loading ? (
              <Loader2 size={14} className="text-white animate-spin" />
            ) : (
              <Send size={14} className="text-white" />
            )}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2 text-center">
          Category:{" "}
          <span className="font-medium text-gray-600">
            {category?.name ?? "—"}
          </span>{" "}
          · Press Enter to send
        </p>
      </div>
    </div>
  );
}

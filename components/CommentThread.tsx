"use client";
import { useState, useEffect } from "react";
import { MessageCircle, Send, Trash2, Loader2, X } from "lucide-react";
import { UserAvatar } from "./UserAvatar";

type Comment = {
  id: number;
  content: string;
  created_at: string;
  updated_at: string;
  user_id: number;
  username: string;
  avatar_url: string | null;
};

type Props = {
  documentId?: number;
  conversationId?: number;
  currentUserId?: number;
  isAdmin?: boolean;
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr + "Z").getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (days  > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (mins  > 0) return `${mins}m ago`;
  return "just now";
}

export function CommentThread({ documentId, conversationId, currentUserId, isAdmin }: Props) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [input,    setInput]    = useState("");
  const [posting,  setPosting]  = useState(false);

  const qs = documentId ? `document_id=${documentId}` : `conversation_id=${conversationId}`;

  const load = async () => {
    setLoading(true);
    const res = await fetch(`/api/comments?${qs}`);
    if (res.ok) setComments(await res.json());
    setLoading(false);
  };

  useEffect(() => { load(); }, [documentId, conversationId]); // eslint-disable-line

  const post = async () => {
    if (!input.trim() || posting) return;
    setPosting(true);
    const body: Record<string, string | number> = { content: input.trim() };
    if (documentId)     body.document_id     = documentId;
    if (conversationId) body.conversation_id = conversationId;

    const res = await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const c = await res.json();
      setComments((prev) => [...prev, c]);
      setInput("");
    }
    setPosting(false);
  };

  const remove = async (id: number) => {
    const res = await fetch(`/api/comments/${id}`, { method: "DELETE" });
    if (res.ok) setComments((prev) => prev.filter((c) => c.id !== id));
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-slate-300">
        <MessageCircle size={14} />
        Comments {comments.length > 0 && <span className="text-xs font-normal text-gray-400">({comments.length})</span>}
      </div>

      {loading ? (
        <Loader2 size={16} className="animate-spin text-gray-300 mx-auto" />
      ) : comments.length === 0 ? (
        <p className="text-xs text-gray-400 dark:text-slate-500 text-center py-2">No comments yet. Be the first!</p>
      ) : (
        <div className="space-y-3">
          {comments.map((c) => (
            <div key={c.id} className="flex gap-2.5">
              <UserAvatar username={c.username} avatar_url={c.avatar_url} size={28} />
              <div className="flex-1 min-w-0 bg-gray-50 dark:bg-slate-800/60 rounded-xl px-3 py-2">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-xs font-semibold text-gray-700 dark:text-slate-300">{c.username}</span>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-gray-400 dark:text-slate-500">{timeAgo(c.created_at)}</span>
                    {(c.user_id === currentUserId || isAdmin) && (
                      <button
                        onClick={() => remove(c.id)}
                        className="p-0.5 text-gray-300 hover:text-red-500 transition-colors"
                      >
                        <X size={11} />
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-xs text-gray-600 dark:text-slate-300 leading-relaxed">{c.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="flex items-center gap-2 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2 focus-within:border-cyan-400 transition-colors">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && post()}
          placeholder="Add a comment…"
          className="flex-1 text-xs text-gray-700 dark:text-slate-200 placeholder-gray-400 dark:placeholder-slate-500 outline-none bg-transparent"
        />
        <button
          onClick={post}
          disabled={!input.trim() || posting}
          className="p-1 text-cyan-500 hover:text-cyan-600 disabled:text-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          {posting ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
        </button>
      </div>
    </div>
  );
}

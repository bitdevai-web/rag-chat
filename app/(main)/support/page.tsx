"use client";
import { useState } from "react";
import {
  MessageSquare, ChevronDown, ChevronUp, Mail,
  BookOpen, Upload, Key, Settings, AlertCircle, CheckCircle, Send, Loader2,
} from "lucide-react";

const faqs = [
  {
    q: "How do I get started?",
    a: "Create a Knowledge Base from the dashboard, upload your documents (PDF, DOCX, PPTX, XLSX, TXT), wait for processing to complete, then click the Chat tab to start asking questions.",
  },
  {
    q: "What file formats are supported?",
    a: "CogniBase supports PDF, Microsoft Word (DOCX), PowerPoint (PPTX), Excel (XLSX), plain text (TXT), Markdown (MD), and CSV files.",
  },
  {
    q: "Do I need an API key for document indexing?",
    a: "No. Document indexing uses a local AI model (all-MiniLM-L6-v2) that runs directly on your server — no external API key is required. You only need an API key (Anthropic or OpenAI) for the chat feature.",
  },
  {
    q: "How do I set up my LLM API key?",
    a: "Go to Settings (click your username in the top-right corner). Select your provider (Anthropic or OpenAI), choose a model, enter your API key, and save. You can test the connection before saving.",
  },
  {
    q: "Why is my document stuck on 'Processing'?",
    a: "The first document upload downloads the embedding model (~80 MB) which can take a minute or two on first run. Subsequent uploads are faster. If it stays stuck, check the server logs for errors.",
  },
  {
    q: "How many documents can I upload per knowledge base?",
    a: "Currently up to 5 documents per knowledge base. This limit keeps response quality high by ensuring focused, relevant context for each query.",
  },
  {
    q: "Where is my data stored?",
    a: "All data is stored locally on your server. Documents metadata is in SQLite (data/rag.db), vector embeddings are in LanceDB (data/lancedb/), and the embedding model is cached at data/models/. Nothing is sent to external servers except your chat queries to the LLM provider you configure.",
  },
  {
    q: "How do I change the default login credentials?",
    a: "Set the LOGIN_USERNAME and LOGIN_PASSWORD environment variables before starting the app (see .env.example). Then restart the server.",
  },
  {
    q: "Can I delete a knowledge base?",
    a: "Yes. Open the knowledge base, then click the red Delete button in the top-right corner. This will permanently delete the KB, all its documents, and all associated chat history.",
  },
  {
    q: "What is the AI Summary feature?",
    a: "The Generate button on the Overview tab creates an AI-generated summary of all processed documents in that knowledge base. The summary is stored and displayed until you regenerate it.",
  },
];

const guides = [
  {
    icon: Upload,
    title: "Uploading Documents",
    desc: "Open a knowledge base → Overview tab → Upload Document. Supported formats: PDF, DOCX, PPTX, XLSX, TXT.",
    color: "blue",
  },
  {
    icon: MessageSquare,
    title: "Chatting with Documents",
    desc: "Open a knowledge base → Chat tab → type your question → press Enter. Answers include source citations.",
    color: "violet",
  },
  {
    icon: Key,
    title: "Configuring Your API Key",
    desc: "Click your username → Settings → choose provider → enter your API key → Save Settings.",
    color: "emerald",
  },
  {
    icon: Settings,
    title: "Tuning RAG Parameters",
    desc: "In Settings, adjust Chunk Size, Chunk Overlap, and Top-K to balance response quality vs speed.",
    color: "amber",
  },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-gray-100 last:border-0">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between py-4 text-left gap-4"
      >
        <span className="text-sm font-medium text-gray-800">{q}</span>
        {open ? <ChevronUp size={15} className="text-gray-400 flex-shrink-0" /> : <ChevronDown size={15} className="text-gray-400 flex-shrink-0" />}
      </button>
      {open && (
        <p className="text-sm text-gray-500 leading-relaxed pb-4">{a}</p>
      )}
    </div>
  );
}

const colorMap: Record<string, string> = {
  blue: "bg-blue-50 border-blue-100 text-blue-600",
  violet: "bg-violet-50 border-violet-100 text-violet-600",
  emerald: "bg-emerald-50 border-emerald-100 text-emerald-600",
  amber: "bg-amber-50 border-amber-100 text-amber-600",
};

export default function SupportPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    await new Promise((r) => setTimeout(r, 1000)); // UI demo
    setSent(true);
    setSending(false);
    setName(""); setEmail(""); setMessage("");
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Get Support</h1>
        <p className="text-sm text-gray-500">Find answers, read guides, or send us a message.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left — FAQ + Guides */}
        <div className="lg:col-span-2 space-y-6">

          {/* Quick guides */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-5">
              <BookOpen size={15} className="text-gray-500" />
              <h2 className="text-sm font-semibold text-gray-900">Quick Guides</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {guides.map((g, i) => (
                <div key={i} className="flex items-start gap-3 p-4 rounded-xl bg-gray-50 border border-gray-100">
                  <div className={`w-8 h-8 rounded-lg border flex items-center justify-center flex-shrink-0 ${colorMap[g.color]}`}>
                    <g.icon size={15} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-800 mb-1">{g.title}</p>
                    <p className="text-xs text-gray-500 leading-relaxed">{g.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* FAQ */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle size={15} className="text-gray-500" />
              <h2 className="text-sm font-semibold text-gray-900">Frequently Asked Questions</h2>
            </div>
            <p className="text-xs text-gray-400 mb-5">Answers to the most common questions.</p>
            <div>
              {faqs.map((faq, i) => (
                <FAQItem key={i} q={faq.q} a={faq.a} />
              ))}
            </div>
          </div>
        </div>

        {/* Right — Contact form */}
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-5">
              <Mail size={15} className="text-gray-500" />
              <h2 className="text-sm font-semibold text-gray-900">Send a Message</h2>
            </div>

            {sent ? (
              <div className="text-center py-8">
                <CheckCircle size={32} className="text-emerald-500 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-800 mb-1">Message sent!</p>
                <p className="text-xs text-gray-400">We&apos;ll get back to you shortly.</p>
                <button
                  onClick={() => setSent(false)}
                  className="mt-4 text-xs text-blue-600 hover:text-blue-800"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSend} className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-gray-700 block mb-1.5">Your Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John Smith"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700 block mb-1.5">Email Address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="john@example.com"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700 block mb-1.5">Message</label>
                  <textarea
                    required
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Describe your issue or question..."
                    rows={5}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all resize-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={sending}
                  className="w-full flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-800 disabled:opacity-60 text-white text-sm font-medium py-2.5 rounded-xl transition-colors"
                >
                  {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  {sending ? "Sending…" : "Send Message"}
                </button>
              </form>
            )}
          </div>

          {/* Contact info */}
          <div className="bg-gradient-to-br from-blue-600 to-violet-700 rounded-2xl p-5 text-white">
            <h3 className="text-sm font-semibold mb-3">Contact Details</h3>
            <div className="space-y-2.5 text-xs text-white/80">
              <div className="flex items-center gap-2">
                <Mail size={13} className="text-white/60" />
                <span>support@cognibase.ai</span>
              </div>
              <div className="flex items-center gap-2">
                <MessageSquare size={13} className="text-white/60" />
                <span>Live chat available Mon–Fri, 9am–6pm</span>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-white/20">
              <p className="text-xs text-white/60">Average response time</p>
              <p className="text-sm font-semibold mt-0.5">Under 24 hours</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import {
  FolderOpen,
  Upload,
  Trash2,
  FileText,
  FilePlus,
  ChevronDown,
  CheckCircle,
  Loader2,
  AlertCircle,
  Plus,
  X,
  RefreshCw,
} from "lucide-react";

const MAX_DOCS = 3;

type Category = { id: number; name: string; doc_count: number };
type DocStatus = "ready" | "processing" | "error";
type Doc = {
  id: number;
  filename: string;
  file_type: string;
  size_bytes: number;
  status: DocStatus;
  created_at: string;
};

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 ** 2) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 ** 2).toFixed(1)} MB`;
}

function StatusBadge({ status }: { status: DocStatus }) {
  if (status === "ready")
    return (
      <span className="flex items-center gap-1 text-emerald-600 text-xs font-medium">
        <CheckCircle size={12} /> Ready
      </span>
    );
  if (status === "processing")
    return (
      <span className="flex items-center gap-1 text-amber-600 text-xs font-medium">
        <Loader2 size={12} className="animate-spin" /> Processing
      </span>
    );
  return (
    <span className="flex items-center gap-1 text-red-500 text-xs font-medium">
      <AlertCircle size={12} /> Error
    </span>
  );
}

export default function DocumentsPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategory, setActiveCategory] = useState<Category | null>(null);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newCat, setNewCat] = useState("");
  const [showNewCat, setShowNewCat] = useState(false);
  const [catError, setCatError] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [pollingIds, setPollingIds] = useState<Set<number>>(new Set());
  const fileRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const loadCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/categories");
      const data: Category[] = await res.json();
      setCategories(data);
      if (data.length && !activeCategory) setActiveCategory(data[0]);
    } catch {}
  }, [activeCategory]);

  const loadDocs = useCallback(async (catName: string) => {
    try {
      const res = await fetch(
        `/api/documents?category=${encodeURIComponent(catName)}`
      );
      const data: Doc[] = await res.json();
      setDocs(Array.isArray(data) ? data : []);

      // Track processing docs for polling
      const processing = data
        .filter((d) => d.status === "processing")
        .map((d) => d.id);
      if (processing.length > 0) {
        setPollingIds(new Set(processing));
      } else {
        setPollingIds(new Set());
      }
    } catch {}
  }, []);

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    if (activeCategory) loadDocs(activeCategory.name);
  }, [activeCategory?.name]);

  // Poll for processing documents
  useEffect(() => {
    if (pollingIds.size === 0) {
      if (pollRef.current) clearInterval(pollRef.current);
      return;
    }
    pollRef.current = setInterval(() => {
      if (activeCategory) loadDocs(activeCategory.name);
    }, 2000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [pollingIds.size, activeCategory?.name]);

  const atLimit = docs.length >= MAX_DOCS;

  const uploadFile = async (file: File) => {
    if (!activeCategory) return;
    setUploadError("");
    setUploading(true);

    const form = new FormData();
    form.append("file", file);
    form.append("category", activeCategory.name);

    try {
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        setUploadError(data.error ?? "Upload failed");
      } else {
        await loadDocs(activeCategory.name);
        await loadCategories();
      }
    } catch (e) {
      setUploadError(String(e));
    } finally {
      setUploading(false);
    }
  };

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const allowed = Array.from(files).slice(0, MAX_DOCS - docs.length);
    allowed.forEach((f) => uploadFile(f));
  };

  const deleteDoc = async (id: number) => {
    try {
      await fetch(`/api/documents/${id}`, { method: "DELETE" });
      setDocs((d) => d.filter((dd) => dd.id !== id));
      if (activeCategory) {
        await loadCategories(); // update doc_count
      }
    } catch {}
  };

  const addCategory = async () => {
    const name = newCat.trim();
    if (!name) return;
    setCatError("");
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data: Category & { error?: string } = await res.json();
      if (!res.ok) {
        setCatError(data.error ?? "Failed");
        return;
      }
      await loadCategories();
      setActiveCategory(data);
      setNewCat("");
      setShowNewCat(false);
    } catch (e) {
      setCatError(String(e));
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-gray-900">Documents</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Upload and manage documents per category (max {MAX_DOCS})
          </p>
        </div>

        <div className="flex items-center gap-2">
          {showNewCat ? (
            <div className="flex items-center gap-2">
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <input
                    autoFocus
                    value={newCat}
                    onChange={(e) => {
                      setNewCat(e.target.value);
                      setCatError("");
                    }}
                    onKeyDown={(e) => e.key === "Enter" && addCategory()}
                    placeholder="Category name"
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-400 w-40"
                  />
                  <button
                    onClick={addCategory}
                    className="p-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
                  >
                    <Plus size={14} />
                  </button>
                  <button
                    onClick={() => {
                      setShowNewCat(false);
                      setCatError("");
                    }}
                    className="p-2 rounded-lg text-gray-500 hover:bg-gray-100"
                  >
                    <X size={14} />
                  </button>
                </div>
                {catError && (
                  <p className="text-xs text-red-500 mt-1">{catError}</p>
                )}
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowNewCat(true)}
              className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 font-medium px-3 py-2 rounded-lg hover:bg-indigo-50 transition-colors"
            >
              <Plus size={14} /> New Category
            </button>
          )}

          <div className="relative">
            <button
              onClick={() => setCategoryOpen((o) => !o)}
              className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <FolderOpen size={15} className="text-indigo-500" />
              {activeCategory?.name ?? "Select…"}
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
                      setActiveCategory(c);
                      setCategoryOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm flex items-center justify-between hover:bg-gray-50 ${
                      c.id === activeCategory?.id
                        ? "text-indigo-700 font-medium"
                        : "text-gray-700"
                    }`}
                  >
                    {c.name}
                    <span className="text-xs text-gray-400">
                      {c.doc_count}/{MAX_DOCS}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        {/* Upload error */}
        {uploadError && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
            <AlertCircle size={15} className="flex-shrink-0" />
            {uploadError}
            <button
              onClick={() => setUploadError("")}
              className="ml-auto text-red-400 hover:text-red-600"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Upload zone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            handleFiles(e.dataTransfer.files);
          }}
          onClick={() => !atLimit && !uploading && fileRef.current?.click()}
          className={`relative border-2 border-dashed rounded-2xl flex flex-col items-center justify-center py-12 transition-colors cursor-pointer ${
            atLimit || uploading
              ? "border-gray-200 bg-gray-50 cursor-not-allowed opacity-60"
              : dragging
              ? "border-indigo-400 bg-indigo-50"
              : "border-gray-300 hover:border-indigo-300 hover:bg-indigo-50/30"
          }`}
        >
          <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center mb-3">
            {uploading ? (
              <Loader2 size={22} className="text-indigo-600 animate-spin" />
            ) : (
              <Upload size={22} className="text-indigo-600" />
            )}
          </div>
          <p className="text-sm font-medium text-gray-800">
            {uploading
              ? "Uploading…"
              : atLimit
              ? `Limit reached (${MAX_DOCS} docs max per category)`
              : "Drop files here or click to upload"}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            PDF, DOCX, TXT — up to {MAX_DOCS} per category
          </p>
          <div className="mt-3 flex items-center gap-2">
            <div className="h-1.5 w-32 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all"
                style={{ width: `${(docs.length / MAX_DOCS) * 100}%` }}
              />
            </div>
            <span className="text-xs text-gray-500">
              {docs.length}/{MAX_DOCS}
            </span>
          </div>
          <input
            ref={fileRef}
            type="file"
            multiple
            accept=".pdf,.docx,.txt"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>

        {/* Document list */}
        {docs.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {activeCategory?.name} Documents
              </h2>
              {pollingIds.size > 0 && (
                <span className="flex items-center gap-1 text-xs text-amber-600">
                  <RefreshCw size={11} className="animate-spin" />
                  Processing…
                </span>
              )}
            </div>
            <div className="space-y-2">
              {docs.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center gap-4 bg-white border border-gray-200 rounded-xl px-4 py-3 hover:border-gray-300 transition-colors"
                >
                  <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                    <FileText size={18} className="text-indigo-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {doc.filename}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {formatBytes(doc.size_bytes)} ·{" "}
                      {new Date(doc.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <StatusBadge status={doc.status} />
                  <button
                    onClick={() => deleteDoc(doc.id)}
                    disabled={doc.status === "processing"}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {docs.length === 0 && activeCategory && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FilePlus size={32} className="text-gray-300 mb-3" />
            <p className="text-sm text-gray-500">
              No documents in{" "}
              <span className="font-medium">{activeCategory.name}</span> yet
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Upload up to {MAX_DOCS} documents to get started
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

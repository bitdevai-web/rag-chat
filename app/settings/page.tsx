"use client";
import { useState, useEffect } from "react";
import {
  Key,
  CheckCircle,
  Loader2,
  AlertCircle,
  Eye,
  EyeOff,
  ChevronDown,
  Save,
} from "lucide-react";

const PROVIDERS = [
  {
    id: "anthropic",
    name: "Anthropic",
    models: ["claude-sonnet-4-6", "claude-opus-4-6", "claude-haiku-4-5-20251001"],
    placeholder: "sk-ant-api03-…",
    note: "Used for chat completions. Embeddings run locally — no extra key needed.",
  },
  {
    id: "openai",
    name: "OpenAI",
    models: ["gpt-4o", "gpt-4o-mini", "gpt-3.5-turbo"],
    placeholder: "sk-proj-…",
    note: "Used for chat completions. Embeddings run locally — no extra key needed.",
  },
];

type TestStatus = "idle" | "testing" | "ok" | "error";

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-5">
      <div>
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
        {description && (
          <p className="text-xs text-gray-500 mt-0.5">{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-gray-700">{label}</label>
      {children}
      {hint && <p className="text-xs text-gray-400">{hint}</p>}
    </div>
  );
}

function Dropdown({
  value,
  options,
  onChange,
}: {
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
      >
        {value}
        <ChevronDown
          size={14}
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="absolute top-full mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1">
          {options.map((o) => (
            <button
              key={o}
              onClick={() => {
                onChange(o);
                setOpen(false);
              }}
              className={`w-full text-left px-4 py-2.5 text-sm font-mono hover:bg-gray-50 transition-colors ${
                o === value ? "text-blue-700 font-semibold" : "text-gray-700"
              }`}
            >
              {o}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const [provider, setProvider] = useState(PROVIDERS[0]);
  const [model, setModel] = useState(PROVIDERS[0].models[0]);
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [testStatus, setTestStatus] = useState<TestStatus>("idle");
  const [testMsg, setTestMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [chunkSize, setChunkSize] = useState(512);
  const [overlap, setOverlap] = useState(50);
  const [topK, setTopK] = useState(3);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data: Record<string, string>) => {
        if (data.llm_provider) {
          const p = PROVIDERS.find((p) => p.id === data.llm_provider) ?? PROVIDERS[0];
          setProvider(p);
          if (data.llm_model && p.models.includes(data.llm_model))
            setModel(data.llm_model);
          else setModel(p.models[0]);
        }
        if (data.llm_api_key) setApiKey(data.llm_api_key);
        if (data.chunk_size) setChunkSize(parseInt(data.chunk_size));
        if (data.chunk_overlap) setOverlap(parseInt(data.chunk_overlap));
        if (data.top_k) setTopK(parseInt(data.top_k));
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  const selectProvider = (p: (typeof PROVIDERS)[0]) => {
    setProvider(p);
    setModel(p.models[0]);
    setTestStatus("idle");
    setTestMsg("");
  };

  const testConnection = async () => {
    setTestStatus("testing");
    setTestMsg("");
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_key: apiKey, provider: provider.id }),
      });
      const data = await res.json();
      if (data.ok) {
        setTestStatus("ok");
        setTestMsg("Connected successfully");
      } else {
        setTestStatus("error");
        setTestMsg(data.error?.slice(0, 80) ?? "Connection failed");
      }
    } catch (e) {
      setTestStatus("error");
      setTestMsg(String(e));
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    setSaveError("");
    try {
      const body: Record<string, string | number> = {
        llm_provider: provider.id,
        llm_model: model,
        chunk_size: chunkSize,
        chunk_overlap: overlap,
        top_k: topK,
      };
      if (apiKey && !apiKey.startsWith("•")) body.llm_api_key = apiKey;

      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setSaveError(data.error ?? "Failed to save");
      } else {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      }
    } catch (e) {
      setSaveError(String(e));
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 size={24} className="animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-base font-semibold text-gray-900">Settings</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          Configure your LLM provider and CogniBase RAG parameters
        </p>
      </div>

      <div className="px-6 py-6 space-y-5 max-w-2xl">
        {/* LLM Provider */}
        <Section
          title="LLM Provider"
          description="Choose your AI provider for chat completions"
        >
          <Field label="Provider">
            <div className="relative">
              <button
                onClick={() => {
                  const idx = PROVIDERS.findIndex((p) => p.id === provider.id);
                  const next = PROVIDERS[(idx + 1) % PROVIDERS.length];
                  selectProvider(next);
                }}
                className="w-full flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
              >
                {provider.name}
                <ChevronDown size={14} />
              </button>
            </div>
            <div className="flex gap-2 mt-2">
              {PROVIDERS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => selectProvider(p)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all ${
                    p.id === provider.id
                      ? "bg-gradient-to-r from-blue-500 to-violet-600 text-white border-transparent"
                      : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
            <p className="text-xs text-blue-600 mt-1.5 bg-blue-50 rounded-lg px-3 py-2">
              {provider.note}
            </p>
          </Field>

          <Field label="Model">
            <Dropdown
              value={model}
              options={provider.models}
              onChange={setModel}
            />
          </Field>

          <Field
            label="LLM API Key"
            hint="Used for chat completions. Stored locally in SQLite."
          >
            <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
              <Key size={14} className="text-gray-400 mr-2 flex-shrink-0" />
              <input
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setTestStatus("idle");
                }}
                placeholder={provider.placeholder}
                className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 outline-none font-mono"
              />
              <button
                onClick={() => setShowKey((s) => !s)}
                className="ml-2 text-gray-400 hover:text-gray-600"
              >
                {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </Field>

          {/* Embeddings info banner */}
          <div className="flex items-start gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
            <CheckCircle size={14} className="text-emerald-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-emerald-700">
              <span className="font-semibold">Local embeddings enabled.</span> Documents are embedded using{" "}
              <span className="font-mono">all-MiniLM-L6-v2</span> running on-device via ONNX — no external API key required.
              The model (~80 MB) downloads automatically on first upload.
            </p>
          </div>

          {/* Test */}
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={testConnection}
              disabled={!apiKey || testStatus === "testing" || apiKey.startsWith("•")}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {testStatus === "testing" ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Key size={14} />
              )}
              Test Connection
            </button>
            {testStatus === "ok" && (
              <span className="flex items-center gap-1.5 text-emerald-600 text-sm font-medium">
                <CheckCircle size={14} /> {testMsg}
              </span>
            )}
            {testStatus === "error" && (
              <span className="flex items-center gap-1.5 text-red-500 text-sm">
                <AlertCircle size={14} /> {testMsg}
              </span>
            )}
          </div>
        </Section>

        {/* RAG Parameters */}
        <Section
          title="RAG Parameters"
          description="Tune how CogniBase chunks and retrieves document content"
        >
          <Field
            label={`Chunk Size — ${chunkSize} words`}
            hint="Larger = more context per chunk, but lower precision."
          >
            <input
              type="range"
              min={64}
              max={1024}
              step={64}
              value={chunkSize}
              onChange={(e) => setChunkSize(Number(e.target.value))}
              className="w-full accent-blue-600"
            />
            <div className="flex justify-between text-xs text-gray-400">
              <span>64</span>
              <span>1024</span>
            </div>
          </Field>

          <Field
            label={`Chunk Overlap — ${overlap} words`}
            hint="Overlap preserves context across chunk boundaries."
          >
            <input
              type="range"
              min={0}
              max={256}
              step={16}
              value={overlap}
              onChange={(e) => setOverlap(Number(e.target.value))}
              className="w-full accent-blue-600"
            />
            <div className="flex justify-between text-xs text-gray-400">
              <span>0</span>
              <span>256</span>
            </div>
          </Field>

          <Field
            label={`Top-K Results — ${topK}`}
            hint="Number of document chunks retrieved per query and sent to the LLM."
          >
            <input
              type="range"
              min={1}
              max={8}
              step={1}
              value={topK}
              onChange={(e) => setTopK(Number(e.target.value))}
              className="w-full accent-blue-600"
            />
            <div className="flex justify-between text-xs text-gray-400">
              <span>1</span>
              <span>8</span>
            </div>
          </Field>
        </Section>

        {/* Save */}
        {saveError && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
            <AlertCircle size={14} />
            {saveError}
          </div>
        )}

        <div className="flex justify-end pb-4">
          <button
            onClick={saveSettings}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-500 to-violet-600 hover:from-blue-600 hover:to-violet-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-all"
          >
            {saving ? (
              <Loader2 size={15} className="animate-spin" />
            ) : saved ? (
              <CheckCircle size={15} />
            ) : (
              <Save size={15} />
            )}
            {saving ? "Saving…" : saved ? "Saved!" : "Save Settings"}
          </button>
        </div>
      </div>
    </div>
  );
}

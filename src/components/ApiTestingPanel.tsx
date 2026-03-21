import React, { useState, useRef } from "react";
import {
  Upload, Play, FolderOpen, ChevronDown, ChevronRight,
  CheckCircle2, AlertCircle, Clock, Copy, Check,
  FileJson, Terminal, Loader2, X, Plus, Trash2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export interface ApiEndpoint {
  id: string;
  name: string;
  method: string;
  url: string;
  headers: Record<string, string>;
  body: string;
  folder: string;
  status?: "idle" | "running" | "passed" | "failed";
  response?: {
    statusCode: number;
    body: string;
    time: number;
    size: number;
  };
  aiNotes?: string;
}

interface ApiTestingPanelProps {
  token: string;
  onAuthError?: () => void;
}

const METHOD_COLORS: Record<string, string> = {
  GET: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  POST: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
  PUT: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
  PATCH: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30",
  DELETE: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30",
};

const StatusBadge: React.FC<{ status?: string }> = ({ status }) => {
  if (!status || status === "idle") return null;
  if (status === "running") return <Loader2 size={12} className="animate-spin text-cyan-500" />;
  if (status === "passed") return <CheckCircle2 size={12} className="text-emerald-500" />;
  return <AlertCircle size={12} className="text-rose-500" />;
};

export const ApiTestingPanel: React.FC<ApiTestingPanelProps> = ({ token, onAuthError }) => {
  const [endpoints, setEndpoints] = useState<ApiEndpoint[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [selectedEndpoint, setSelectedEndpoint] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [testing, setTesting] = useState(false);
  const [curlInput, setCurlInput] = useState("");
  const [showCurlInput, setShowCurlInput] = useState(false);
  const [copied, setCopied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const res = await fetch("/api/parse-collection", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ collection: json }),
      });
      if (res.status === 401) { onAuthError?.(); return; }
      const data = await res.json();
      if (data.endpoints) {
        setEndpoints(data.endpoints);
        const folders = new Set(data.endpoints.map((e: ApiEndpoint) => e.folder));
        setExpandedFolders(folders as Set<string>);
      }
    } catch (err: any) {
      alert("Failed to parse collection: " + err.message);
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleCurlImport = async () => {
    if (!curlInput.trim()) return;
    setImporting(true);
    try {
      const res = await fetch("/api/parse-curl", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ curl: curlInput }),
      });
      if (res.status === 401) { onAuthError?.(); return; }
      const data = await res.json();
      if (data.endpoint) {
        setEndpoints(prev => [...prev, data.endpoint]);
        setExpandedFolders(prev => new Set([...prev, data.endpoint.folder]));
      }
      setCurlInput("");
      setShowCurlInput(false);
    } catch (err: any) {
      alert("Failed to parse cURL: " + err.message);
    } finally {
      setImporting(false);
    }
  };

  const runSingleTest = async (endpointId: string) => {
    const ep = endpoints.find(e => e.id === endpointId);
    if (!ep) return;
    setEndpoints(prev => prev.map(e => e.id === endpointId ? { ...e, status: "running", response: undefined } : e));
    try {
      const res = await fetch("/api/run-api-test", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ endpoint: ep }),
      });
      if (res.status === 401) { onAuthError?.(); return; }
      const data = await res.json();
      setEndpoints(prev => prev.map(e => e.id === endpointId ? {
        ...e,
        status: data.passed ? "passed" : "failed",
        response: data.response,
        aiNotes: data.aiNotes,
      } : e));
    } catch {
      setEndpoints(prev => prev.map(e => e.id === endpointId ? { ...e, status: "failed" } : e));
    }
  };

  const runAllTests = async () => {
    setTesting(true);
    for (const ep of endpoints) {
      await runSingleTest(ep.id);
      await new Promise(r => setTimeout(r, 300));
    }
    setTesting(false);
  };

  const removeEndpoint = (id: string) => {
    setEndpoints(prev => prev.filter(e => e.id !== id));
    if (selectedEndpoint === id) setSelectedEndpoint(null);
  };

  const toggleFolder = (folder: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      next.has(folder) ? next.delete(folder) : next.add(folder);
      return next;
    });
  };

  // Group endpoints by folder
  const folders = endpoints.reduce<Record<string, ApiEndpoint[]>>((acc, ep) => {
    (acc[ep.folder] = acc[ep.folder] || []).push(ep);
    return acc;
  }, {});

  const selected = endpoints.find(e => e.id === selectedEndpoint);
  const totalPassed = endpoints.filter(e => e.status === "passed").length;
  const totalFailed = endpoints.filter(e => e.status === "failed").length;
  const totalRun = totalPassed + totalFailed;

  const copyResponse = () => {
    if (selected?.response?.body) {
      navigator.clipboard.writeText(selected.response.body);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Empty state
  if (endpoints.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 flex items-center justify-center">
            <FileJson size={28} className="text-emerald-500" />
          </div>
          <h3 className="text-sm font-bold text-gray-800 dark:text-slate-200">Import API Collection</h3>
          <p className="text-[11px] text-gray-400 dark:text-slate-500 max-w-[280px] leading-relaxed">
            Import a Postman collection (.json) or paste a cURL command to start automated API testing.
          </p>
        </div>

        <div className="flex flex-col gap-3 w-full max-w-xs">
          <input ref={fileRef} type="file" accept=".json" onChange={handleFileImport} className="hidden" />
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => fileRef.current?.click()}
            disabled={importing}
            className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white dark:text-black text-[10px] font-black uppercase tracking-[0.15em] flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 disabled:opacity-50 mono-label"
          >
            {importing ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            {importing ? "Importing..." : "Import Postman Collection"}
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowCurlInput(!showCurlInput)}
            className="w-full py-3.5 rounded-xl border border-gray-200 dark:border-slate-700/30 text-gray-600 dark:text-slate-400 text-[10px] font-black uppercase tracking-[0.15em] flex items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-slate-800/50 mono-label"
          >
            <Terminal size={14} />
            Paste cURL Command
          </motion.button>
        </div>

        <AnimatePresence>
          {showCurlInput && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="w-full max-w-md overflow-hidden"
            >
              <textarea
                value={curlInput}
                onChange={e => setCurlInput(e.target.value)}
                placeholder={"curl -X GET https://api.example.com/users \\\n  -H 'Authorization: Bearer token'"}
                className="w-full h-28 bg-gray-50 dark:bg-slate-950/50 border border-gray-200 dark:border-slate-700/30 rounded-xl p-3 text-xs text-gray-800 dark:text-slate-200 placeholder-gray-400 dark:placeholder-slate-600 font-mono resize-none focus:outline-none focus:border-emerald-400"
              />
              <div className="flex gap-2 mt-2">
                <button onClick={handleCurlImport} disabled={!curlInput.trim() || importing} className="flex-1 py-2 rounded-lg bg-emerald-500 text-white dark:text-black text-[9px] font-black uppercase tracking-[0.15em] disabled:opacity-50 mono-label">
                  {importing ? "Parsing..." : "Import"}
                </button>
                <button onClick={() => { setShowCurlInput(false); setCurlInput(""); }} className="px-4 py-2 rounded-lg border border-gray-200 dark:border-slate-700/30 text-gray-500 text-[9px] font-black uppercase tracking-[0.15em] mono-label">
                  Cancel
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col md:flex-row gap-3 md:gap-4 min-h-0">
      {/* Left: Endpoint List */}
      <div className="w-full md:w-[340px] shrink-0 flex flex-col bg-white dark:bg-slate-950 border border-gray-200 dark:border-emerald-500/10 rounded-xl overflow-hidden neon-border">
        {/* Header */}
        <div className="px-3 py-2.5 bg-gray-50 dark:bg-slate-900/80 border-b border-gray-200 dark:border-emerald-500/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <FileJson size={12} className="text-emerald-500/50" />
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-600/50 dark:text-emerald-500/50 mono-label">
              API Endpoints
            </span>
            <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-500/20 mono-label">
              {endpoints.length}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => fileRef.current?.click()} className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-all" title="Add more">
              <Plus size={12} />
            </button>
            <input ref={fileRef} type="file" accept=".json" onChange={handleFileImport} className="hidden" />
          </div>
        </div>

        {/* Stats bar */}
        {totalRun > 0 && (
          <div className="px-3 py-1.5 bg-gray-50/50 dark:bg-slate-900/40 border-b border-gray-100 dark:border-slate-800/30 flex items-center gap-3 text-[8px] font-bold mono-label shrink-0">
            <span className="text-emerald-600 dark:text-emerald-400">{totalPassed} passed</span>
            <span className="text-rose-500">{totalFailed} failed</span>
            <span className="text-gray-400 dark:text-slate-500">{endpoints.length - totalRun} pending</span>
          </div>
        )}

        {/* Folder list */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {Object.entries(folders).map(([folder, eps]) => (
            <div key={folder}>
              <button
                onClick={() => toggleFolder(folder)}
                className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-slate-900/50 transition-colors border-b border-gray-100 dark:border-slate-800/20"
              >
                {expandedFolders.has(folder) ? <ChevronDown size={10} className="text-gray-400" /> : <ChevronRight size={10} className="text-gray-400" />}
                <FolderOpen size={12} className="text-amber-500/60" />
                <span className="text-[10px] font-bold text-gray-700 dark:text-slate-300 truncate flex-1">{folder}</span>
                <span className="text-[8px] text-gray-400 dark:text-slate-500 mono-label">{eps.length}</span>
              </button>
              <AnimatePresence>
                {expandedFolders.has(folder) && eps.map(ep => (
                  <motion.button
                    key={ep.id}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    onClick={() => setSelectedEndpoint(ep.id)}
                    className={`w-full flex items-center gap-2 pl-8 pr-3 py-2 text-left transition-colors border-b border-gray-50 dark:border-slate-800/10 group ${
                      selectedEndpoint === ep.id ? "bg-emerald-50 dark:bg-emerald-500/5" : "hover:bg-gray-50 dark:hover:bg-slate-900/30"
                    }`}
                  >
                    <span className={`px-1.5 py-0.5 rounded text-[7px] font-black uppercase border mono-label shrink-0 ${METHOD_COLORS[ep.method] || "bg-gray-100 text-gray-500 border-gray-300"}`}>
                      {ep.method}
                    </span>
                    <span className="text-[10px] text-gray-600 dark:text-slate-400 truncate flex-1 font-medium">{ep.name}</span>
                    <StatusBadge status={ep.status} />
                    <button onClick={(e) => { e.stopPropagation(); removeEndpoint(ep.id); }} className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-300 hover:text-rose-500 transition-all">
                      <Trash2 size={10} />
                    </button>
                  </motion.button>
                ))}
              </AnimatePresence>
            </div>
          ))}
        </div>

        {/* Run All Button */}
        <div className="p-3 border-t border-gray-200 dark:border-emerald-500/10 bg-gray-50 dark:bg-slate-900/50 shrink-0 space-y-2">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.95 }}
            onClick={runAllTests}
            disabled={testing || endpoints.length === 0}
            className="w-full py-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white dark:text-black text-[9px] font-black uppercase tracking-[0.15em] flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 disabled:opacity-40 neon-glow mono-label"
          >
            {testing ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} fill="currentColor" />}
            {testing ? "Testing APIs..." : "Run All Tests"}
          </motion.button>
          <button
            onClick={() => setShowCurlInput(!showCurlInput)}
            className="w-full py-2 rounded-lg border border-gray-200 dark:border-slate-700/30 text-gray-500 dark:text-slate-400 text-[8px] font-black uppercase tracking-[0.15em] flex items-center justify-center gap-1.5 hover:bg-gray-100 dark:hover:bg-slate-800/50 mono-label"
          >
            <Terminal size={10} />
            Add cURL
          </button>
        </div>

        {/* cURL input overlay */}
        <AnimatePresence>
          {showCurlInput && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-20 bg-white dark:bg-slate-950 p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-600 dark:text-slate-300 mono-label">Paste cURL</span>
                <button onClick={() => setShowCurlInput(false)} className="p-1 text-gray-400 hover:text-rose-500"><X size={14} /></button>
              </div>
              <textarea
                value={curlInput}
                onChange={e => setCurlInput(e.target.value)}
                placeholder={"curl -X POST https://api.example.com/login \\\n  -H 'Content-Type: application/json' \\\n  -d '{\"email\":\"test@test.com\"}'"}
                className="flex-1 bg-gray-50 dark:bg-slate-900/50 border border-gray-200 dark:border-slate-700/30 rounded-lg p-3 text-xs text-gray-800 dark:text-slate-200 font-mono resize-none focus:outline-none focus:border-emerald-400"
              />
              <button onClick={handleCurlImport} disabled={!curlInput.trim()} className="py-2.5 rounded-lg bg-emerald-500 text-white dark:text-black text-[9px] font-black uppercase tracking-[0.15em] disabled:opacity-50 mono-label">
                Import
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Right: Endpoint Details & Response */}
      <div className="flex-1 flex flex-col min-w-0 gap-3">
        {selected ? (
          <>
            {/* Request Info */}
            <div className="bg-white dark:bg-slate-950 border border-gray-200 dark:border-emerald-500/10 rounded-xl overflow-hidden neon-border">
              <div className="px-4 py-3 bg-gray-50 dark:bg-slate-900/80 border-b border-gray-200 dark:border-emerald-500/10 flex items-center gap-3">
                <span className={`px-2 py-1 rounded text-[8px] font-black uppercase border mono-label ${METHOD_COLORS[selected.method] || ""}`}>
                  {selected.method}
                </span>
                <span className="text-xs text-gray-700 dark:text-slate-300 font-mono truncate flex-1">{selected.url}</span>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => runSingleTest(selected.id)}
                  disabled={selected.status === "running"}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white dark:text-black text-[8px] font-black uppercase tracking-[0.15em] flex items-center gap-1.5 disabled:opacity-50 mono-label"
                >
                  {selected.status === "running" ? <Loader2 size={10} className="animate-spin" /> : <Play size={10} />}
                  Send
                </motion.button>
              </div>

              {/* Headers & Body */}
              <div className="p-3 max-h-32 overflow-y-auto">
                {Object.keys(selected.headers).length > 0 && (
                  <div className="mb-2">
                    <span className="text-[8px] font-black uppercase tracking-[0.15em] text-gray-400 dark:text-slate-500 mono-label">Headers</span>
                    <div className="mt-1 space-y-0.5">
                      {Object.entries(selected.headers).map(([k, v]) => (
                        <div key={k} className="text-[10px] font-mono text-gray-600 dark:text-slate-400">
                          <span className="text-emerald-600 dark:text-emerald-400">{k}</span>: {v}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {selected.body && (
                  <div>
                    <span className="text-[8px] font-black uppercase tracking-[0.15em] text-gray-400 dark:text-slate-500 mono-label">Body</span>
                    <pre className="mt-1 text-[10px] font-mono text-gray-600 dark:text-slate-400 bg-gray-50 dark:bg-slate-900/50 p-2 rounded-lg overflow-x-auto">{selected.body}</pre>
                  </div>
                )}
                {Object.keys(selected.headers).length === 0 && !selected.body && (
                  <span className="text-[10px] text-gray-400 dark:text-slate-500 italic">No headers or body</span>
                )}
              </div>
            </div>

            {/* Response */}
            {selected.response && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex-1 bg-white dark:bg-slate-950 border border-gray-200 dark:border-emerald-500/10 rounded-xl overflow-hidden flex flex-col neon-border"
              >
                <div className="px-4 py-2.5 bg-gray-50 dark:bg-slate-900/80 border-b border-gray-200 dark:border-emerald-500/10 flex items-center gap-3 shrink-0">
                  <span className={`px-2 py-0.5 rounded text-[9px] font-black mono-label border ${
                    selected.response.statusCode < 300 ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20"
                    : selected.response.statusCode < 500 ? "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/20"
                    : "bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-500/20"
                  }`}>
                    {selected.response.statusCode}
                  </span>
                  <div className="flex items-center gap-3 text-[9px] text-gray-400 dark:text-slate-500 mono-label">
                    <span className="flex items-center gap-1"><Clock size={9} /> {selected.response.time}ms</span>
                    <span>{(selected.response.size / 1024).toFixed(1)} KB</span>
                  </div>
                  <div className="flex-1" />
                  <button onClick={copyResponse} className="flex items-center gap-1 px-2 py-1 rounded text-[8px] font-bold text-gray-400 hover:text-emerald-500 transition-colors mono-label">
                    {copied ? <Check size={10} className="text-emerald-500" /> : <Copy size={10} />}
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>

                {/* AI Notes */}
                {selected.aiNotes && (
                  <div className="px-4 py-2 bg-emerald-50/50 dark:bg-emerald-500/5 border-b border-emerald-100 dark:border-emerald-500/10">
                    <span className="text-[8px] font-black uppercase tracking-[0.15em] text-emerald-600/60 dark:text-emerald-500/40 mono-label">AI Analysis</span>
                    <p className="text-[11px] text-gray-600 dark:text-slate-400 mt-0.5 leading-relaxed">{selected.aiNotes}</p>
                  </div>
                )}

                {/* Response Body */}
                <div className="flex-1 overflow-auto p-3 min-h-0">
                  <pre className="text-[11px] font-mono text-gray-700 dark:text-slate-300 whitespace-pre-wrap break-words leading-relaxed">
                    {selected.response.body}
                  </pre>
                </div>
              </motion.div>
            )}

            {/* No response yet */}
            {!selected.response && selected.status !== "running" && (
              <div className="flex-1 flex items-center justify-center bg-white dark:bg-slate-950 border border-gray-200 dark:border-emerald-500/10 rounded-xl neon-border">
                <div className="text-center">
                  <Play size={24} className="mx-auto text-gray-300 dark:text-slate-600 mb-2" />
                  <p className="text-[10px] text-gray-400 dark:text-slate-500 mono-label">Click Send to test this endpoint</p>
                </div>
              </div>
            )}

            {selected.status === "running" && !selected.response && (
              <div className="flex-1 flex items-center justify-center bg-white dark:bg-slate-950 border border-gray-200 dark:border-emerald-500/10 rounded-xl neon-border">
                <div className="text-center">
                  <Loader2 size={24} className="mx-auto text-emerald-500 animate-spin mb-2" />
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mono-label">Testing endpoint...</p>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-white dark:bg-slate-950 border border-gray-200 dark:border-emerald-500/10 rounded-xl neon-border">
            <div className="text-center">
              <FileJson size={32} className="mx-auto text-gray-300 dark:text-slate-600 mb-3" />
              <p className="text-[10px] text-gray-400 dark:text-slate-500 mono-label">Select an endpoint to view details</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

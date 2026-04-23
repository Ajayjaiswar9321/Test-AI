import React, { useEffect, useState } from "react";
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Clock,
  Globe,
  Loader2,
  History,
  ChevronDown,
  Layers,
  RefreshCw,
  Network,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface HistoryScenario {
  title: string;
  status: "passed" | "failed";
  steps: number;
  passed: number;
  failed: number;
  duration: string;
}

interface HistoryApiEndpoint {
  name: string;
  method: string;
  url: string;
  statusCode: number;
  time: number;
  verdict: "proper" | "warning" | "broken";
  notes: string;
}

interface HistoryParsedUi {
  type?: "ui";
  scenarios: HistoryScenario[];
  totalSteps: number;
  totalPassed: number;
  totalFailed: number;
  passRate: number;
  duration: string;
  legacy?: boolean;
  logExcerpt?: string;
}

interface HistoryParsedApi {
  type: "api";
  endpoints: HistoryApiEndpoint[];
  totalEndpoints: number;
  totalPassed: number;
  totalWarning: number;
  totalFailed: number;
  avgTime: number;
  recommendations: string[];
}

interface HistoryEntry {
  id: string;
  url: string;
  status: string;
  summary: string;
  created_at: string;
  parsed?: HistoryParsedUi | HistoryParsedApi;
}

const METHOD_COLOR: Record<string, string> = {
  GET: "text-emerald-600 dark:text-emerald-400",
  POST: "text-amber-600 dark:text-amber-400",
  PUT: "text-blue-600 dark:text-blue-400",
  PATCH: "text-purple-600 dark:text-purple-400",
  DELETE: "text-rose-600 dark:text-rose-400",
};

interface TestHistoryProps {
  token: string;
  onAuthError: () => void;
}

export const TestHistory: React.FC<TestHistoryProps> = ({ token, onAuthError }) => {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/test-history", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) { onAuthError(); return; }
      const data = await res.json();
      const entries: HistoryEntry[] = (data.history || []).map((h: any) => {
        let parsed;
        try { parsed = JSON.parse(h.summary); } catch {}
        return { ...h, parsed };
      });
      setHistory(entries);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchHistory(); }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-400 dark:text-slate-500">
          <Loader2 size={18} className="animate-spin text-emerald-500" />
          <span className="text-[9px] font-black uppercase tracking-[0.2em] mono-label">Loading history...</span>
        </div>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
        <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700/30 flex items-center justify-center">
          <History size={28} className="text-gray-300 dark:text-slate-600" />
        </div>
        <div className="text-center">
          <h3 className="text-sm font-bold text-gray-700 dark:text-slate-300 mb-1">No test history yet</h3>
          <p className="text-[10px] text-gray-400 dark:text-slate-500 mono-label tracking-[0.1em]">
            Run tests to see them appear here
          </p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col h-full bg-white/80 dark:bg-slate-950/80 border border-gray-200 dark:border-emerald-500/10 rounded-xl overflow-hidden neon-border data-stream"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-emerald-500/10 shrink-0 relative z-10">
        <div className="flex items-center gap-2">
          <History size={14} className="text-emerald-500" />
          <h2 className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-600/60 dark:text-emerald-500/60 mono-label">
            Test History
          </h2>
          <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-500/20 mono-label">
            {history.length}
          </span>
        </div>
        <button
          onClick={fetchHistory}
          className="p-1.5 rounded-lg text-gray-400 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-all"
        >
          <RefreshCw size={12} />
        </button>
      </div>

      {/* History List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0 relative z-10">
        <AnimatePresence mode="popLayout">
          {history.map((entry, idx) => {
            const isExpanded = expandedId === entry.id;
            const status = entry.status;
            const isPassed = status === "passed";
            const isWarning = status === "warning";
            const p = entry.parsed;
            const isApi = !!p && (p as HistoryParsedApi).type === "api";
            const ui = !isApi ? (p as HistoryParsedUi | undefined) : undefined;
            const api = isApi ? (p as HistoryParsedApi) : undefined;
            const date = new Date(entry.created_at);
            const timeStr = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
            const dateStr = date.toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" });
            const borderClass = isPassed
              ? "border-emerald-200 dark:border-emerald-500/20"
              : isWarning
              ? "border-amber-200 dark:border-amber-500/20"
              : "border-rose-200 dark:border-rose-500/20";

            return (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
                className={`rounded-lg border transition-all duration-200 bg-white dark:bg-slate-900/30 ${borderClass}`}
              >
                {/* Entry Header */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                  className="w-full flex items-center gap-3 px-3 py-3 text-left"
                >
                  {/* Status icon */}
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                    isPassed
                      ? "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30"
                      : isWarning
                      ? "bg-amber-100 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/30"
                      : "bg-rose-100 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-500/30"
                  }`}>
                    {isApi ? <Network size={16} /> : isPassed ? <CheckCircle2 size={16} /> : isWarning ? <AlertTriangle size={16} /> : <AlertCircle size={16} />}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    {entry.url ? (
                      <div className="text-[10px] text-gray-500 dark:text-slate-400 truncate flex items-center gap-1.5 mb-0.5">
                        {isApi ? (
                          <span className="text-[8px] font-black uppercase tracking-[0.15em] text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-200 dark:border-cyan-500/20 mono-label shrink-0">API</span>
                        ) : (
                          <Globe size={9} className="text-emerald-500/40 shrink-0" />
                        )}
                        {entry.url}
                      </div>
                    ) : (
                      <div className="text-[10px] text-gray-500 dark:text-slate-400 truncate flex items-center gap-1.5 mb-0.5 font-medium">
                        {isPassed ? "Test Passed" : isWarning ? "Warnings" : "Test Failed"}
                        {ui?.legacy && <span className="text-[8px] text-gray-300 dark:text-slate-600 ml-1 mono-label">(legacy)</span>}
                      </div>
                    )}
                    <div className="flex items-center gap-3 text-[10px] text-gray-400 dark:text-slate-500">
                      <span className="flex items-center gap-1">
                        <Clock size={9} />
                        {dateStr} {timeStr}
                      </span>
                      {api && (
                        <>
                          <span className="flex items-center gap-1">
                            <Layers size={9} />
                            {api.totalEndpoints} endpoints
                          </span>
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold">{api.totalPassed} proper</span>
                          {api.totalWarning > 0 && (
                            <span className="text-amber-600 dark:text-amber-400 font-bold">{api.totalWarning} warn</span>
                          )}
                          {api.totalFailed > 0 && (
                            <span className="text-rose-500 dark:text-rose-400 font-bold">{api.totalFailed} broken</span>
                          )}
                        </>
                      )}
                      {ui && !ui.legacy && (
                        <>
                          {ui.scenarios.length > 0 && (
                            <span className="flex items-center gap-1">
                              <Layers size={9} />
                              {ui.scenarios.length} scenarios
                            </span>
                          )}
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold">{ui.totalPassed} passed</span>
                          {ui.totalFailed > 0 && (
                            <span className="text-rose-500 dark:text-rose-400 font-bold">{ui.totalFailed} failed</span>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Pass rate / status badge */}
                  {api ? (
                    <span className={`text-sm font-black shrink-0 ${api.totalFailed > 0 ? "text-rose-500 dark:text-rose-400" : api.totalWarning > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                      {api.totalEndpoints > 0 ? Math.round((api.totalPassed / api.totalEndpoints) * 100) : 0}%
                    </span>
                  ) : ui && !ui.legacy ? (
                    <span className={`text-sm font-black shrink-0 ${isPassed ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500 dark:text-rose-400"}`}>
                      {ui.passRate}%
                    </span>
                  ) : (
                    <span className={`text-[8px] font-black uppercase tracking-[0.15em] px-2 py-1 rounded border shrink-0 mono-label ${
                      isPassed
                        ? "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20"
                        : "text-rose-500 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20"
                    }`}>
                      {entry.status}
                    </span>
                  )}

                  {/* Expand arrow */}
                  <span className="text-gray-400 dark:text-slate-500 shrink-0 transition-transform duration-200" style={{ transform: isExpanded ? "rotate(0deg)" : "rotate(-90deg)" }}>
                    <ChevronDown size={14} />
                  </span>
                </button>

                {/* Expanded: API suite */}
                <AnimatePresence>
                  {isExpanded && api && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-3 pb-3 pt-1 border-t border-gray-100 dark:border-slate-700/20">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                          <div className="bg-gray-50 dark:bg-slate-900/50 rounded-lg p-2 border border-gray-200 dark:border-slate-700/30 text-center">
                            <div className="text-[8px] text-gray-400 dark:text-slate-500 font-black uppercase tracking-[0.15em] mono-label">Total</div>
                            <div className="text-sm font-black text-gray-800 dark:text-slate-200">{api.totalEndpoints}</div>
                          </div>
                          <div className="bg-emerald-50 dark:bg-emerald-500/5 rounded-lg p-2 border border-emerald-200 dark:border-emerald-500/10 text-center">
                            <div className="text-[8px] text-emerald-600 dark:text-emerald-500 font-black uppercase tracking-[0.15em] mono-label">Proper</div>
                            <div className="text-sm font-black text-emerald-600 dark:text-emerald-400">{api.totalPassed}</div>
                          </div>
                          <div className="bg-amber-50 dark:bg-amber-500/5 rounded-lg p-2 border border-amber-200 dark:border-amber-500/10 text-center">
                            <div className="text-[8px] text-amber-600 dark:text-amber-500 font-black uppercase tracking-[0.15em] mono-label">Warning</div>
                            <div className="text-sm font-black text-amber-600 dark:text-amber-400">{api.totalWarning}</div>
                          </div>
                          <div className="bg-rose-50 dark:bg-rose-500/5 rounded-lg p-2 border border-rose-200 dark:border-rose-500/10 text-center">
                            <div className="text-[8px] text-rose-600 dark:text-rose-500 font-black uppercase tracking-[0.15em] mono-label">Broken</div>
                            <div className="text-sm font-black text-rose-500 dark:text-rose-400">{api.totalFailed}</div>
                          </div>
                        </div>

                        <div className="space-y-1.5 mb-3">
                          {api.endpoints.map((e, eIdx) => (
                            <div
                              key={eIdx}
                              className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border text-[11px] ${
                                e.verdict === "proper"
                                  ? "border-emerald-100 dark:border-emerald-500/10 bg-emerald-50/50 dark:bg-emerald-500/[0.02]"
                                  : e.verdict === "warning"
                                  ? "border-amber-100 dark:border-amber-500/10 bg-amber-50/50 dark:bg-amber-500/[0.02]"
                                  : "border-rose-100 dark:border-rose-500/10 bg-rose-50/50 dark:bg-rose-500/[0.02]"
                              }`}
                            >
                              <span className={`text-[8px] font-black uppercase mono-label shrink-0 ${METHOD_COLOR[e.method] || "text-gray-500"}`}>
                                {e.method}
                              </span>
                              <span className="flex-1 text-gray-700 dark:text-slate-300 font-medium truncate">{e.name}</span>
                              <span className={`text-[9px] font-bold mono-label shrink-0 ${
                                e.statusCode === 0 ? "text-rose-500" : e.statusCode < 300 ? "text-emerald-600 dark:text-emerald-400" : e.statusCode < 500 ? "text-amber-600 dark:text-amber-400" : "text-rose-500"
                              }`}>{e.statusCode || "ERR"}</span>
                              <span className="text-[9px] text-gray-400 dark:text-slate-500 mono-label shrink-0">{e.time}ms</span>
                            </div>
                          ))}
                        </div>

                        {api.recommendations.length > 0 && (
                          <div className="bg-gray-50 dark:bg-slate-900/50 rounded-lg p-2 border border-gray-200 dark:border-slate-700/30 space-y-1">
                            <div className="text-[8px] text-gray-400 dark:text-slate-500 font-black uppercase tracking-[0.15em] mono-label">Recommendations</div>
                            {api.recommendations.map((r, rIdx) => (
                              <div key={rIdx} className="text-[10px] text-gray-600 dark:text-slate-400 leading-relaxed flex items-start gap-1.5">
                                <span className="text-cyan-500 mt-0.5">▸</span>
                                <span>{r}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Expanded: legacy + UI scenarios */}
                <AnimatePresence>
                  {isExpanded && ui && ui.legacy && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-3 pb-3 pt-2 border-t border-gray-100 dark:border-slate-700/20">
                        {ui.logExcerpt ? (
                          <pre className="text-[10px] text-gray-500 dark:text-slate-400 bg-gray-50 dark:bg-slate-900/50 rounded-lg p-3 border border-gray-200 dark:border-slate-700/30 whitespace-pre-wrap font-mono leading-relaxed">{ui.logExcerpt}</pre>
                        ) : (
                          <p className="text-[10px] text-gray-400 dark:text-slate-500 italic">No detailed logs available for this run.</p>
                        )}
                      </div>
                    </motion.div>
                  )}
                  {isExpanded && ui && !ui.legacy && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-3 pb-3 pt-1 border-t border-gray-100 dark:border-slate-700/20">
                        {/* Stats row */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                          <div className="bg-gray-50 dark:bg-slate-900/50 rounded-lg p-2 border border-gray-200 dark:border-slate-700/30 text-center">
                            <div className="text-[8px] text-gray-400 dark:text-slate-500 font-black uppercase tracking-[0.15em] mono-label">Steps</div>
                            <div className="text-sm font-black text-gray-800 dark:text-slate-200">{ui.totalSteps}</div>
                          </div>
                          <div className="bg-emerald-50 dark:bg-emerald-500/5 rounded-lg p-2 border border-emerald-200 dark:border-emerald-500/10 text-center">
                            <div className="text-[8px] text-emerald-600 dark:text-emerald-500 font-black uppercase tracking-[0.15em] mono-label">Passed</div>
                            <div className="text-sm font-black text-emerald-600 dark:text-emerald-400">{ui.totalPassed}</div>
                          </div>
                          <div className="bg-rose-50 dark:bg-rose-500/5 rounded-lg p-2 border border-rose-200 dark:border-rose-500/10 text-center">
                            <div className="text-[8px] text-rose-600 dark:text-rose-500 font-black uppercase tracking-[0.15em] mono-label">Failed</div>
                            <div className="text-sm font-black text-rose-500 dark:text-rose-400">{ui.totalFailed}</div>
                          </div>
                          <div className="bg-gray-50 dark:bg-slate-900/50 rounded-lg p-2 border border-gray-200 dark:border-slate-700/30 text-center">
                            <div className="text-[8px] text-gray-400 dark:text-slate-500 font-black uppercase tracking-[0.15em] mono-label">Duration</div>
                            <div className="text-sm font-black text-gray-800 dark:text-slate-200">{ui.duration}</div>
                          </div>
                        </div>

                        {/* Scenarios list */}
                        <div className="space-y-1.5">
                          {ui.scenarios.map((s, sIdx) => (
                            <div
                              key={sIdx}
                              className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border text-[11px] ${
                                s.status === "passed"
                                  ? "border-emerald-100 dark:border-emerald-500/10 bg-emerald-50/50 dark:bg-emerald-500/[0.02]"
                                  : "border-rose-100 dark:border-rose-500/10 bg-rose-50/50 dark:bg-rose-500/[0.02]"
                              }`}
                            >
                              {s.status === "passed" ? (
                                <CheckCircle2 size={12} className="text-emerald-500 dark:text-emerald-400 shrink-0" />
                              ) : (
                                <AlertCircle size={12} className="text-rose-500 dark:text-rose-400 shrink-0" />
                              )}
                              <span className="flex-1 text-gray-700 dark:text-slate-300 font-medium truncate">{s.title}</span>
                              <span className="text-[9px] text-gray-400 dark:text-slate-500 mono-label shrink-0">
                                {s.passed}/{s.steps}
                              </span>
                              <span className="text-[9px] text-gray-400 dark:text-slate-500 mono-label shrink-0">
                                {s.duration}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

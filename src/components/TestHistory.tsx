import React, { useEffect, useState } from "react";
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  Globe,
  Loader2,
  History,
  ChevronDown,
  Layers,
  RefreshCw,
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

interface HistoryEntry {
  id: string;
  url: string;
  status: string;
  summary: string;
  created_at: string;
  parsed?: {
    scenarios: HistoryScenario[];
    totalSteps: number;
    totalPassed: number;
    totalFailed: number;
    passRate: number;
    duration: string;
    legacy?: boolean;
    logExcerpt?: string;
  };
}

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
            const isPassed = entry.status === "passed";
            const p = entry.parsed;
            const date = new Date(entry.created_at);
            const timeStr = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
            const dateStr = date.toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" });

            return (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
                className={`rounded-lg border transition-all duration-200 ${
                  isPassed
                    ? "border-emerald-200 dark:border-emerald-500/20 bg-white dark:bg-slate-900/30"
                    : "border-rose-200 dark:border-rose-500/20 bg-white dark:bg-slate-900/30"
                }`}
              >
                {/* Entry Header */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                  className="w-full flex items-center gap-3 px-3 py-3 text-left"
                >
                  {/* Status icon */}
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    isPassed
                      ? "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30"
                      : "bg-rose-100 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30"
                  }`}>
                    {isPassed ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    {entry.url ? (
                      <div className="text-[10px] text-gray-500 dark:text-slate-400 truncate flex items-center gap-1.5 mb-0.5">
                        <Globe size={9} className="text-emerald-500/40 shrink-0" />
                        {entry.url}
                      </div>
                    ) : (
                      <div className="text-[10px] text-gray-500 dark:text-slate-400 truncate flex items-center gap-1.5 mb-0.5 font-medium">
                        {isPassed ? "Test Passed" : "Test Failed"}
                        {p?.legacy && <span className="text-[8px] text-gray-300 dark:text-slate-600 ml-1 mono-label">(legacy)</span>}
                      </div>
                    )}
                    <div className="flex items-center gap-3 text-[10px] text-gray-400 dark:text-slate-500">
                      <span className="flex items-center gap-1">
                        <Clock size={9} />
                        {dateStr} {timeStr}
                      </span>
                      {p && !p.legacy && (
                        <>
                          {p.scenarios.length > 0 && (
                            <span className="flex items-center gap-1">
                              <Layers size={9} />
                              {p.scenarios.length} scenarios
                            </span>
                          )}
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold">{p.totalPassed} passed</span>
                          {p.totalFailed > 0 && (
                            <span className="text-rose-500 dark:text-rose-400 font-bold">{p.totalFailed} failed</span>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Pass rate / status badge */}
                  {p && !p.legacy ? (
                    <span className={`text-sm font-black shrink-0 ${isPassed ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500 dark:text-rose-400"}`}>
                      {p.passRate}%
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

                {/* Expanded details */}
                <AnimatePresence>
                  {isExpanded && p && p.legacy && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-3 pb-3 pt-2 border-t border-gray-100 dark:border-slate-700/20">
                        {p.logExcerpt ? (
                          <pre className="text-[10px] text-gray-500 dark:text-slate-400 bg-gray-50 dark:bg-slate-900/50 rounded-lg p-3 border border-gray-200 dark:border-slate-700/30 whitespace-pre-wrap font-mono leading-relaxed">{p.logExcerpt}</pre>
                        ) : (
                          <p className="text-[10px] text-gray-400 dark:text-slate-500 italic">No detailed logs available for this run.</p>
                        )}
                      </div>
                    </motion.div>
                  )}
                  {isExpanded && p && !p.legacy && (
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
                            <div className="text-sm font-black text-gray-800 dark:text-slate-200">{p.totalSteps}</div>
                          </div>
                          <div className="bg-emerald-50 dark:bg-emerald-500/5 rounded-lg p-2 border border-emerald-200 dark:border-emerald-500/10 text-center">
                            <div className="text-[8px] text-emerald-600 dark:text-emerald-500 font-black uppercase tracking-[0.15em] mono-label">Passed</div>
                            <div className="text-sm font-black text-emerald-600 dark:text-emerald-400">{p.totalPassed}</div>
                          </div>
                          <div className="bg-rose-50 dark:bg-rose-500/5 rounded-lg p-2 border border-rose-200 dark:border-rose-500/10 text-center">
                            <div className="text-[8px] text-rose-600 dark:text-rose-500 font-black uppercase tracking-[0.15em] mono-label">Failed</div>
                            <div className="text-sm font-black text-rose-500 dark:text-rose-400">{p.totalFailed}</div>
                          </div>
                          <div className="bg-gray-50 dark:bg-slate-900/50 rounded-lg p-2 border border-gray-200 dark:border-slate-700/30 text-center">
                            <div className="text-[8px] text-gray-400 dark:text-slate-500 font-black uppercase tracking-[0.15em] mono-label">Duration</div>
                            <div className="text-sm font-black text-gray-800 dark:text-slate-200">{p.duration}</div>
                          </div>
                        </div>

                        {/* Scenarios list */}
                        <div className="space-y-1.5">
                          {p.scenarios.map((s, sIdx) => (
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

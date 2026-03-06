import React, { useEffect, useRef, useState } from "react";
import { Terminal, CheckCircle2, AlertCircle, Info, Loader2, ChevronDown, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export interface StreamLog {
  message?: string;
  type: "info" | "success" | "error" | "step" | "suggestion" | "script" | "frame";
  preview?: string;
  timestamp: string;
  // Step-specific fields
  step?: number;
  action?: string;
  status?: "running" | "passed" | "failed";
  detail?: string;
  suggestion?: string;
  // Script fields
  code?: string;
  fileName?: string;
}

interface StepData {
  step: number;
  action: string;
  status: "running" | "passed" | "failed";
  detail: string;
  preview?: string;
  timestamp: string;
}

export const ConsoleStream: React.FC<{
  runId: string | null;
  onPreview?: (url: string) => void;
  onLog?: (log: StreamLog) => void;
}> = ({ runId, onPreview, onLog }) => {
  const [steps, setSteps] = useState<StepData[]>([]);
  const [logs, setLogs] = useState<StreamLog[]>([]);
  const [expandedStep, setExpandedStep] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Use refs for callbacks to prevent SSE reconnection on every render
  const onPreviewRef = useRef(onPreview);
  const onLogRef = useRef(onLog);
  useEffect(() => { onPreviewRef.current = onPreview; }, [onPreview]);
  useEffect(() => { onLogRef.current = onLog; }, [onLog]);

  useEffect(() => {
    if (!runId) return; // Keep existing data visible when runId clears

    // New run starting - clear old data
    setSteps([]);
    setLogs([]);
    setExpandedStep(null);

    const eventSource = new EventSource(`/api/events/${runId}`);

    eventSource.onmessage = (event) => {
      const data: StreamLog = JSON.parse(event.data);

      // Continuous frame for live video preview
      if (data.type === "frame") {
        if (data.preview && onPreviewRef.current) onPreviewRef.current(data.preview);
        return;
      }

      if (data.type === "suggestion" || data.type === "script") {
        onLogRef.current?.(data);
        if (data.type === "suggestion") setLogs((prev) => [...prev, data]);
        return;
      }
      if (data.type === "step" && data.step !== undefined) {
        // Step event - update or add step
        setSteps((prev) => {
          const existing = prev.findIndex((s) => s.step === data.step);
          const stepData: StepData = {
            step: data.step!,
            action: data.action || "",
            status: data.status || "running",
            detail: data.detail || "",
            preview: data.preview,
            timestamp: data.timestamp,
          };
          if (existing >= 0) {
            const updated = [...prev];
            updated[existing] = stepData;
            return updated;
          }
          return [...prev, stepData];
        });

        // Send preview to LivePreview panel
        if (data.preview && onPreviewRef.current) onPreviewRef.current(data.preview);
      } else {
        // Regular log
        setLogs((prev) => [...prev, data]);
        if (data.preview && onPreviewRef.current) onPreviewRef.current(data.preview);
      }

      onLogRef.current?.(data);
    };

    eventSource.onerror = () => {
      eventSource.close();
    };

    return () => eventSource.close();
  }, [runId]); // Only reconnect when runId changes

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [steps, logs]);

  const passedCount = steps.filter((s) => s.status === "passed").length;
  const failedCount = steps.filter((s) => s.status === "failed").length;
  const runningCount = steps.filter((s) => s.status === "running").length;

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-950 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-gray-50 dark:bg-slate-900/80 border-b border-gray-200 dark:border-emerald-500/10 shrink-0">
        <div className="flex items-center gap-2 text-gray-500 dark:text-slate-400">
          <Terminal size={14} className="text-emerald-500/50" />
          <span className="font-bold uppercase tracking-[0.15em] text-[9px] mono-label text-emerald-600 dark:text-emerald-500/50">Execution Log</span>
        </div>
        {steps.length > 0 && (
          <div className="flex items-center gap-3 text-[9px] font-bold mono-label">
            {passedCount > 0 && (
              <span className="text-emerald-600 dark:text-emerald-400">{passedCount} passed</span>
            )}
            {failedCount > 0 && (
              <span className="text-rose-500 dark:text-rose-400">{failedCount} failed</span>
            )}
            {runningCount > 0 && (
              <span className="text-cyan-600 dark:text-cyan-400">{runningCount} active</span>
            )}
          </div>
        )}
      </div>

      {/* Steps + Logs */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-emerald-500/10"
      >
        {/* Steps */}
        {steps.length > 0 && (
          <div className="p-3 space-y-1.5">
            {steps.map((s, idx) => (
              <motion.div
                key={s.step}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 25, delay: idx * 0.05 }}
                className="group"
              >
                <button
                  onClick={() => setExpandedStep(expandedStep === s.step ? null : s.step)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-200 ${
                    s.status === "running"
                      ? "bg-cyan-50 dark:bg-cyan-500/5 border border-cyan-200 dark:border-cyan-500/20"
                      : s.status === "passed"
                      ? "bg-emerald-50 dark:bg-emerald-500/5 border border-emerald-200 dark:border-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/10"
                      : "bg-rose-50 dark:bg-rose-500/5 border border-rose-200 dark:border-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/10"
                  }`}
                >
                  {/* Step number */}
                  <span className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold shrink-0 ${
                    s.status === "running"
                      ? "bg-cyan-100 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-500/30"
                      : s.status === "passed"
                      ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30"
                      : "bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30"
                  }`}>
                    {s.status === "running" ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : s.status === "passed" ? (
                      <CheckCircle2 size={12} />
                    ) : (
                      <AlertCircle size={12} />
                    )}
                  </span>

                  {/* Action */}
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-gray-800 dark:text-slate-200 truncate">
                      {s.action}
                    </div>
                    {s.detail && (
                      <div className="text-[10px] text-gray-400 dark:text-slate-500 truncate mt-0.5">
                        {s.detail}
                      </div>
                    )}
                  </div>

                  {/* Expand icon */}
                  {s.preview && (
                    <span className="text-gray-400 dark:text-slate-500 shrink-0">
                      {expandedStep === s.step ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </span>
                  )}
                </button>

                {/* Expanded preview */}
                <AnimatePresence>
                {expandedStep === s.step && s.preview && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="mt-1 ml-9 rounded-lg overflow-hidden border border-gray-200 dark:border-emerald-500/10"
                  >
                    <img src={s.preview} alt={`Step ${s.step}`} className="w-full h-auto" />
                  </motion.div>
                )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        )}

        {/* Regular logs */}
        {logs.length > 0 && (
          <div className="p-3 pt-0 space-y-1 font-mono text-xs">
            {steps.length > 0 && (
              <div className="border-t border-gray-200 dark:border-emerald-500/10 pt-2 mt-1 mb-2">
                <span className="text-[9px] text-emerald-600/40 dark:text-emerald-500/40 uppercase font-bold tracking-[0.2em] mono-label">Playwright Output</span>
              </div>
            )}
            {logs.map((log, i) => (
              <div key={i} className="flex gap-2 animate-in fade-in slide-in-from-left-2 duration-300">
                <span className="text-gray-300 dark:text-slate-600 shrink-0 mono-label">
                  {new Date(log.timestamp).toLocaleTimeString([], { hour12: false })}
                </span>
                <div className="flex gap-1.5">
                  {log.type === "success" && <CheckCircle2 size={12} className="text-emerald-500 shrink-0 mt-0.5" />}
                  {log.type === "error" && <AlertCircle size={12} className="text-rose-500 shrink-0 mt-0.5" />}
                  {log.type === "info" && <Info size={12} className="text-cyan-500 shrink-0 mt-0.5" />}
                  {log.type === "suggestion" && <AlertCircle size={12} className="text-amber-500 shrink-0 mt-0.5" />}
                  {log.type === "suggestion" ? (
                    <div className="bg-amber-50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-500/20 rounded-lg px-3 py-2 text-amber-700 dark:text-amber-300">
                      <div className="text-[8px] font-black uppercase tracking-[0.2em] text-amber-600 dark:text-amber-500 mb-1 mono-label">AI Suggestion</div>
                      <pre className="whitespace-pre-wrap break-all text-xs">{log.suggestion || log.message}</pre>
                    </div>
                  ) : (
                  <pre className="whitespace-pre-wrap break-all text-gray-600 dark:text-slate-400">
                    {log.message}
                  </pre>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {steps.length === 0 && logs.length === 0 && (
          <div className="p-4 text-gray-400 dark:text-slate-600 italic text-xs mono-label">
            Awaiting execution...
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useState, useEffect } from "react";
import {
  Globe,
  Loader2,
  Sparkles,
  Rocket,
  Check,
  X,
  Play,
  Monitor,
  ChevronDown,
  Zap,
  RotateCcw,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Logo } from "./Logo";

export type UiSuiteType = "smoke" | "regression" | "exploratory";
export type UiScenarioStatus = "ready" | "running" | "passed" | "failed";

export interface UiPlanScenario {
  id: string;
  title: string;
  objective: string;
  risk: "low" | "medium" | "high";
  steps: string[];
  status: UiScenarioStatus;
}

export interface UiPlanInput {
  url: string;
  goal: string;
  suiteType: UiSuiteType;
  authNotes: string;
}

interface UiAutomationPlannerProps {
  planning: boolean;
  scenarios: UiPlanScenario[];
  helperText?: string | null;
  initialUrl?: string;
  onGeneratePlan: (input: UiPlanInput) => void;
  onRunScenario: (scenarioId: string, url: string) => void;
  onRunAll?: () => void;
  onStop?: () => void;
  onResetPlan: () => void;
  onApprovePlan?: () => void;
  runQueue?: string[];
  onApproveNext?: () => void;
  onApproveAll?: () => void;
  onCancelQueue?: () => void;
}

type Stage = "landing" | "plan_review";

const riskColor = {
  low: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20",
  medium: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20",
  high: "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20",
};

const statusIcon = {
  ready: null,
  running: <Loader2 size={14} className="animate-spin text-cyan-500 dark:text-cyan-400" />,
  passed: <Check size={14} className="text-emerald-500 dark:text-emerald-400" />,
  failed: <X size={14} className="text-rose-500 dark:text-rose-400" />,
};

export const UiAutomationPlanner: React.FC<UiAutomationPlannerProps> = ({
  planning,
  scenarios,
  helperText,
  initialUrl,
  onGeneratePlan,
  onRunScenario,
  onRunAll,
  onStop,
  onResetPlan,
  runQueue,
  onApproveNext,
  onApproveAll,
  onCancelQueue,
}) => {
  const [url, setUrl] = useState(initialUrl || "");
  const [goal, setGoal] = useState("");
  const [suiteType, setSuiteType] = useState<UiSuiteType>("smoke");
  const [authNotes] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [stage, setStage] = useState<Stage>("landing");

  useEffect(() => {
    if (initialUrl && !url) setUrl(initialUrl);
  }, [initialUrl]);

  useEffect(() => {
    if (scenarios.length > 0) {
      setStage("plan_review");
    } else if (!planning) {
      setStage("landing");
    }
  }, [scenarios, planning]);

  const handleGenerate = () => {
    onGeneratePlan({ url, goal, suiteType, authNotes });
  };

  const isAnyRunning = scenarios.some(s => s.status === "running");
  const passedCount = scenarios.filter(s => s.status === "passed").length;
  const failedCount = scenarios.filter(s => s.status === "failed").length;

  // ===== LANDING =====
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && url && goal && !planning) {
      e.preventDefault();
      handleGenerate();
    }
  };

  if (stage === "landing") {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="flex-1 flex flex-col items-center justify-center min-h-[400px] gap-8 p-4 md:p-12 overflow-y-auto relative"
      >
        {/* Floating background particles */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={`particle-${i}`}
            className="absolute w-1 h-1 rounded-full bg-emerald-500/30 dark:bg-emerald-400/20 pointer-events-none"
            style={{
              left: `${15 + i * 14}%`,
              top: `${20 + (i % 3) * 25}%`,
            }}
            animate={{
              y: [0, -20, 0],
              opacity: [0.2, 0.6, 0.2],
              scale: [1, 1.5, 1],
            }}
            transition={{
              duration: 3 + i * 0.5,
              repeat: Infinity,
              delay: i * 0.4,
              ease: "easeInOut",
            }}
          />
        ))}

        {/* Animated gradient orbs in background */}
        <motion.div
          className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-emerald-500/5 dark:bg-emerald-500/[0.03] blur-3xl pointer-events-none"
          animate={{ scale: [1, 1.2, 1], x: [0, 20, 0], y: [0, -15, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-48 h-48 rounded-full bg-cyan-500/5 dark:bg-cyan-500/[0.03] blur-3xl pointer-events-none"
          animate={{ scale: [1, 1.3, 1], x: [0, -15, 0], y: [0, 20, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        />

        <div className="flex flex-col items-center gap-5 relative z-10">
          {/* Robot with pulse rings */}
          <div className="relative">
            {/* Pulse rings */}
            <motion.div
              className="absolute inset-0 -m-4 rounded-full border border-emerald-500/20 dark:border-emerald-400/15"
              animate={{ scale: [1, 1.8, 1.8], opacity: [0.5, 0, 0] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeOut" }}
            />
            <motion.div
              className="absolute inset-0 -m-4 rounded-full border border-emerald-500/20 dark:border-emerald-400/15"
              animate={{ scale: [1, 1.8, 1.8], opacity: [0.5, 0, 0] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeOut", delay: 0.8 }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.5, rotate: -15 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 12, delay: 0.2 }}
              className="relative z-10"
            >
              <Logo size={80} />
            </motion.div>
          </div>

          {/* Animated title */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, type: "spring", stiffness: 150 }}
            className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-slate-100 text-center neon-text"
          >
            What do you want to{" "}
            <motion.span
              className="text-emerald-500 dark:text-emerald-400 inline-block"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              test
            </motion.span>{" "}
            today?
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="text-[9px] text-emerald-600/60 dark:text-emerald-500/50 text-center max-w-md uppercase tracking-[0.2em] mono-label"
          >
            Enter target URL and describe your testing objective. Press Enter to initialize.
          </motion.p>

          {/* Feature badges */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="flex flex-wrap items-center justify-center gap-2 mt-1"
          >
            {[
              { icon: <Sparkles size={10} />, label: "AI-Powered" },
              { icon: <Monitor size={10} />, label: "Live Preview" },
              { icon: <Zap size={10} />, label: "Auto Generate" },
            ].map((badge, i) => (
              <motion.div
                key={badge.label}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.9 + i * 0.15 }}
                whileHover={{ scale: 1.08, y: -2 }}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700/30 text-[8px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest mono-label cursor-default"
              >
                <span className="text-emerald-500 dark:text-emerald-400">{badge.icon}</span>
                {badge.label}
              </motion.div>
            ))}
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, type: "spring", stiffness: 120, damping: 18 }}
          className="w-full max-w-3xl relative z-10"
        >
          <div className="tech-card rounded-xl p-5 neon-border hover:neon-border-bright transition-all duration-500">
            {/* URL row */}
            <div className="flex items-center gap-3 mb-3">
              <motion.div animate={{ rotate: [0, 360] }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }}>
                <Globe size={16} className="text-emerald-500/50 shrink-0" />
              </motion.div>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="https://target-app.com"
                className="flex-1 bg-transparent text-sm text-gray-800 dark:text-slate-200 placeholder-gray-400 dark:placeholder-slate-600 outline-none ring-0 font-medium focus:outline-none focus:ring-0"
              />
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleGenerate}
                disabled={planning || !url || !goal}
                className="w-9 h-9 bg-emerald-500 hover:bg-emerald-400 text-white dark:text-black rounded-lg flex items-center justify-center transition-colors shrink-0 disabled:opacity-30 shadow-sm shadow-emerald-500/20"
              >
                {planning ? <Loader2 size={16} className="animate-spin" /> : <Rocket size={16} />}
              </motion.button>
            </div>
            {/* Goal / PRD textarea */}
            <textarea
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) handleKeyDown(e); }}
              rows={3}
              placeholder="Describe test objective or paste test case..."
              className="w-full bg-gray-50 dark:bg-slate-950/50 border border-gray-200 dark:border-slate-700/30 rounded-lg px-4 py-3 text-sm text-gray-800 dark:text-slate-200 placeholder-gray-400 dark:placeholder-slate-600 outline-none ring-0 resize-none mb-3 focus:outline-none focus:ring-0 focus:border-emerald-400 dark:focus:border-emerald-500/30"
            />

          </div>
        </motion.div>

        {planning && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 text-gray-500 dark:text-slate-400 relative z-10"
          >
            <div className="relative">
              <Loader2 size={16} className="animate-spin text-emerald-500" />
              <motion.div
                className="absolute inset-0 -m-1 rounded-full border border-emerald-500/30"
                animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
                transition={{ duration: 1, repeat: Infinity }}
              />
            </div>
            <span className="text-[9px] font-bold uppercase tracking-[0.2em] mono-label">
              <motion.span
                animate={{ opacity: [1, 0.4, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                Scanning target & generating test matrix...
              </motion.span>
            </span>
          </motion.div>
        )}
      </motion.div>
    );
  }

  // ===== PLAN REVIEW - All Scenarios =====
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className="flex flex-col h-full bg-white/80 dark:bg-slate-950/80 border border-gray-200 dark:border-emerald-500/10 rounded-xl overflow-hidden neon-border data-stream"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-emerald-500/10 shrink-0 relative z-10">
        <div className="flex items-center gap-2">
          <Zap size={14} className="text-emerald-500" />
          <h2 className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-600/60 dark:text-emerald-500/60 mono-label">
            Test Matrix
          </h2>
          <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-500/20 mono-label">
            {scenarios.length}
          </span>
        </div>
        <div className="flex items-center gap-3 text-[9px] font-bold mono-label">
          {passedCount > 0 && <span className="text-emerald-600 dark:text-emerald-400">{passedCount} passed</span>}
          {failedCount > 0 && <span className="text-rose-500 dark:text-rose-400">{failedCount} failed</span>}
          {isAnyRunning && <span className="text-cyan-600 dark:text-cyan-400 animate-pulse">executing</span>}
        </div>
      </div>

      {/* URL bar */}
      <div className="px-4 py-2 border-b border-gray-200 dark:border-emerald-500/10 shrink-0 relative z-10">
        <div className="text-[10px] text-gray-500 dark:text-slate-400 bg-gray-50 dark:bg-slate-950/50 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700/30 truncate font-medium flex items-center gap-2 mono-label">
          <Globe size={11} className="text-emerald-500/40 shrink-0" />
          {url}
        </div>
      </div>

      {/* Helper text */}
      {helperText && (
        <div className="px-4 py-2 border-b border-gray-200 dark:border-emerald-500/10 shrink-0 relative z-10">
          <p className="text-[10px] text-gray-500 dark:text-slate-500 leading-relaxed">{helperText}</p>
        </div>
      )}

      {/* Scenarios List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0 relative z-10">
        <AnimatePresence mode="popLayout">
          {scenarios.map((scenario, idx) => {
            const isExpanded = expandedId === scenario.id;
            const isRunning = scenario.status === "running";
            const canRun = !isAnyRunning && scenario.status !== "running";

            const isQueued = runQueue?.includes(scenario.id);
            const isNextInQueue = runQueue && runQueue.length > 0 && runQueue[0] === scenario.id;

            return (
              <motion.div
                key={scenario.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                className={`rounded-lg border transition-all duration-200 ${
                  isRunning
                    ? "border-cyan-200 dark:border-cyan-500/30 bg-cyan-50 dark:bg-cyan-500/5 shadow-sm dark:shadow-[0_0_15px_rgba(6,182,212,0.08)]"
                    : scenario.status === "passed"
                    ? "border-emerald-200 dark:border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-500/[0.03]"
                    : scenario.status === "failed"
                    ? "border-rose-200 dark:border-rose-500/20 bg-rose-50/50 dark:bg-rose-500/[0.03]"
                    : isNextInQueue
                    ? "border-amber-300 dark:border-amber-500/40 bg-amber-50/80 dark:bg-amber-500/[0.06] shadow-sm"
                    : isQueued
                    ? "border-amber-200 dark:border-amber-500/20 bg-amber-50/30 dark:bg-amber-500/[0.02]"
                    : "border-gray-200 dark:border-slate-700/30 hover:border-emerald-200 dark:hover:border-emerald-500/20 bg-white dark:bg-slate-900/30"
                }`}
              >
                {/* Scenario Header */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : scenario.id)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-left"
                >
                  {/* Status icon */}
                  <div className={`w-6 h-6 rounded flex items-center justify-center shrink-0 text-[10px] font-bold ${
                    isRunning ? "bg-cyan-100 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-500/30" :
                    scenario.status === "passed" ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30" :
                    scenario.status === "failed" ? "bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30" :
                    isQueued ? "bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30" :
                    "bg-gray-100 dark:bg-slate-800/50 text-gray-500 dark:text-slate-500 border border-gray-200 dark:border-slate-700/30"
                  }`}>
                    {statusIcon[scenario.status] || <span className="mono-label">{idx + 1}</span>}
                  </div>

                  {/* Title */}
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-gray-800 dark:text-slate-200 truncate">
                      {scenario.title}
                    </div>
                    <div className="text-[10px] text-gray-400 dark:text-slate-500 truncate mt-0.5">
                      {scenario.objective}
                    </div>
                  </div>

                  {/* Risk badge */}
                  <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border shrink-0 mono-label ${riskColor[scenario.risk]}`}>
                    {scenario.risk}
                  </span>

                  {/* Expand arrow */}
                  <span className="text-gray-400 dark:text-slate-500 shrink-0 transition-transform duration-200" style={{ transform: isExpanded ? "rotate(0deg)" : "rotate(-90deg)" }}>
                    <ChevronDown size={14} />
                  </span>
                </button>

                {/* Expanded steps + Run button */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-3 pb-3 pt-1 border-t border-gray-100 dark:border-slate-700/20">
                        <div className="space-y-1.5 mb-3">
                          {scenario.steps.map((step, sIdx) => (
                            <div key={sIdx} className="flex items-start gap-2 text-[11px] text-gray-600 dark:text-slate-400">
                              <span className="w-4 h-4 rounded bg-gray-100 dark:bg-slate-800/60 flex items-center justify-center text-[9px] font-bold text-emerald-600/50 dark:text-emerald-500/50 shrink-0 mt-0.5 mono-label border border-gray-200 dark:border-slate-700/20">
                                {sIdx + 1}
                              </span>
                              <span className="leading-relaxed">{step}</span>
                            </div>
                          ))}
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); onRunScenario(scenario.id, url); }}
                          disabled={!canRun}
                          className="w-full py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white dark:text-black text-[9px] font-black uppercase tracking-[0.15em] transition-all flex items-center justify-center gap-2 disabled:opacity-30 active:scale-95 shadow-sm shadow-emerald-500/20 mono-label"
                        >
                          {isRunning ? <Loader2 size={12} className="animate-spin" /> : <Play size={10} fill="currentColor" />}
                          {isRunning ? "Executing..." : scenario.status === "passed" || scenario.status === "failed" ? "Re-run" : "Execute"}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {planning && (
          <div className="flex items-center gap-3 p-3">
            <Loader2 size={14} className="animate-spin text-cyan-500 dark:text-cyan-400" />
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 dark:text-slate-500 animate-pulse mono-label">
              Scanning target...
            </span>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="px-3 py-3 border-t border-gray-200 dark:border-emerald-500/10 space-y-2 shrink-0 relative z-10">
        {isAnyRunning ? (
          <div className="flex gap-2">
            <div className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg bg-cyan-50 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-500/20 text-[9px] font-black uppercase tracking-[0.15em] mono-label">
              <Loader2 size={14} className="animate-spin" /> Executing
            </div>
            {onStop && (
              <button
                onClick={onStop}
                className="py-3 px-5 rounded-lg bg-rose-500 hover:bg-rose-400 text-white text-[9px] font-black uppercase tracking-[0.15em] transition-all flex items-center justify-center gap-2 active:scale-95 shadow-lg shadow-rose-500/20 mono-label"
              >
                <X size={12} /> Abort
              </button>
            )}
          </div>
        ) : runQueue && runQueue.length > 0 ? (
          <div className="space-y-2">
            <div className="text-[9px] font-bold text-center text-amber-600 dark:text-amber-400 uppercase tracking-[0.15em] mono-label">
              {runQueue.length} test{runQueue.length > 1 ? "s" : ""} queued — approve to execute
            </div>
            <div className="flex gap-2">
              <button
                onClick={onCancelQueue}
                className="py-3 px-4 rounded-lg border border-gray-200 dark:border-slate-700/30 text-[9px] font-black uppercase tracking-[0.15em] text-gray-400 dark:text-slate-500 hover:bg-gray-50 dark:hover:bg-slate-800/50 hover:text-gray-700 dark:hover:text-slate-300 transition-all mono-label flex items-center justify-center"
              >
                <X size={10} />
              </button>
              <button
                onClick={onApproveNext}
                className="flex-1 py-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white dark:text-black text-[9px] font-black uppercase tracking-[0.15em] transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 active:scale-95 mono-label"
              >
                <Play size={10} fill="currentColor" /> Run Next
              </button>
              <button
                onClick={onApproveAll}
                className="flex-1 py-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-white dark:text-black text-[9px] font-black uppercase tracking-[0.15em] transition-all shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 active:scale-95 mono-label"
              >
                <Zap size={10} /> Run All
              </button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={onResetPlan}
              disabled={planning}
              className="py-3 px-4 rounded-lg border border-gray-200 dark:border-slate-700/30 text-[9px] font-black uppercase tracking-[0.15em] text-gray-400 dark:text-slate-500 hover:bg-gray-50 dark:hover:bg-slate-800/50 hover:text-gray-700 dark:hover:text-slate-300 transition-all disabled:opacity-50 flex items-center justify-center gap-2 mono-label"
            >
              <RotateCcw size={10} />
            </button>
            {onRunAll && (
              <button
                onClick={onRunAll}
                disabled={planning || isAnyRunning}
                className="flex-1 py-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white dark:text-black text-[9px] font-black uppercase tracking-[0.15em] transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 neon-glow mono-label"
              >
                <Zap size={10} /> Run All Tests
              </button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
};

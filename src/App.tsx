import React, { useState, useEffect, useReducer, useRef } from "react";
import {
  Database,
  Layout,
  Activity,
  LogOut,
  User as UserIcon,
  ChevronRight,
  X,
  Lock,
  FileCode2,
  ClipboardList,
  Copy,
  Check,
  Download,
  Sun,
  Moon,
  History,
} from "lucide-react";
import { Tabs } from "./components/Tabs";
import { ConsoleStream, type StreamLog } from "./components/ConsoleStream";
import { SidebarFixChat } from "./components/SidebarFixChat";
import { CodeViewer } from "./components/CodeViewer";
import { UploadPostman } from "./components/UploadPostman";
import { ApiTestingPanel } from "./components/ApiTestingPanel";
import { UiAutomationPlanner, type UiPlanInput, type UiPlanScenario } from "./components/UiAutomationPlanner";
import { LivePreview } from "./components/LivePreview";
import { Logo, LogoMark } from "./components/Logo";
import { TestReport, type TestReportData, type TestStepResult } from "./components/TestReport";
import { TestHistory } from "./components/TestHistory";
import { motion, AnimatePresence } from "motion/react";

type State = {
  activeTab: "api" | "ui" | "history";
  isChatOpen: boolean;
  isDark: boolean;
  token: string | null;
  loading: boolean;
  error: string | null;
  apiCode: string;
  uiCode: string;
  runId: string | null;
  previewUrl: string | null;
  testRunning: boolean;
};

const initialState: State = {
  activeTab: "ui",
  isChatOpen: false,
  isDark: localStorage.getItem("bro_theme") !== "light",
  token: localStorage.getItem("bro_token"),
  loading: false,
  error: null,
  apiCode: "",
  uiCode: "",
  runId: null,
  previewUrl: null,
  testRunning: false,
};

function reducer(state: State, action: any): State {
  switch (action.type) {
    case "SET_TAB": return { ...state, activeTab: action.payload };
    case "TOGGLE_CHAT": return { ...state, isChatOpen: !state.isChatOpen };
    case "TOGGLE_THEME": return { ...state, isDark: !state.isDark };
    case "SET_TOKEN": return { ...state, token: action.payload };
    case "SET_LOADING": return { ...state, loading: action.payload };
    case "SET_ERROR": return { ...state, error: action.payload };
    case "SET_API_CODE": return { ...state, apiCode: action.payload };
    case "SET_UI_CODE": return { ...state, uiCode: action.payload };
    case "SET_RUN_ID": return { ...state, runId: action.payload };
    case "SET_PREVIEW_URL": return { ...state, previewUrl: action.payload };
    case "SET_TEST_RUNNING": return { ...state, testRunning: action.payload };
    default: return state;
  }
}

export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [email, setEmail] = useState("");
  const [uiPlan, setUiPlan] = useState<UiPlanScenario[]>([]);
  const [uiPlanLoading, setUiPlanLoading] = useState(false);
  const [uiPlanSummary, setUiPlanSummary] = useState<string | null>(null);
  const [uiPlanUrl, setUiPlanUrl] = useState("");
  const [testReport, setTestReport] = useState<TestReportData | null>(null);
  const [allReports, setAllReports] = useState<TestReportData[]>([]);
  const [generatedScript, setGeneratedScript] = useState<string | null>(null);
  const [bottomTab, setBottomTab] = useState<"steps" | "script">("steps");
  const [showFullReport, setShowFullReport] = useState(false);
  const [runQueue, setRunQueue] = useState<string[]>([]);
  const [chatAutoMessage, setChatAutoMessage] = useState<string | null>(null);
  const [chatResetKey, setChatResetKey] = useState(0);
  const autoRunAfterPlanRef = useRef(false);
  const activeScenarioRef = useRef<string | null>(null);
  const runHadErrorRef = useRef(false);
  const stepResultsRef = useRef<TestStepResult[]>([]);
  const testStartTimeRef = useRef<string>("");

  const parseResponse = async (res: Response) => {
    const text = await res.text();
    let data: any = {};
    if (text) {
      try { data = JSON.parse(text); } catch { data = { error: text }; }
    }
    if (!res.ok) {
      const error = new Error(data.error || `Request failed (${res.status})`) as Error & { status?: number };
      error.status = res.status;
      throw error;
    }
    return data;
  };

  const handleAuthFailure = () => {
    localStorage.removeItem("bro_token");
    dispatch({ type: "SET_TOKEN", payload: null });
    dispatch({ type: "SET_ERROR", payload: "Session expired. Please login again." });
  };

  useEffect(() => {
    document.documentElement.classList.toggle("dark", state.isDark);
    localStorage.setItem("bro_theme", state.isDark ? "dark" : "light");
  }, [state.isDark]);

  // Auto-queue tests for approval after plan generates
  useEffect(() => {
    if (autoRunAfterPlanRef.current && uiPlan.length > 0 && !uiPlanLoading) {
      autoRunAfterPlanRef.current = false;
      const ids = uiPlan.map(s => s.id);
      setTimeout(() => setRunQueue(ids), 300);
    }
  }, [uiPlan, uiPlanLoading]);

  // Auto-show full report when all queued tests finish via "Run Next"
  const historySavedRef = useRef(false);
  useEffect(() => {
    if (
      !state.testRunning &&
      runQueue.length === 0 &&
      allReports.length > 1 &&
      !showFullReport &&
      !runAllRef.current &&
      uiPlan.length > 0 &&
      uiPlan.every(s => s.status === "passed" || s.status === "failed")
    ) {
      // Set testReport so the full report view can render
      if (allReports.length > 0) setTestReport(allReports[allReports.length - 1]);
      setShowFullReport(true);
    }
  }, [state.testRunning, runQueue, allReports, uiPlan]);

  // Save to history + auto-open chat with analysis when all scenarios complete
  useEffect(() => {
    if (
      allReports.length > 0 &&
      !state.testRunning &&
      !historySavedRef.current &&
      uiPlan.length > 0 &&
      uiPlan.every(s => s.status === "passed" || s.status === "failed")
    ) {
      historySavedRef.current = true;
      saveTestHistory(allReports);

      // Build test summary and auto-open chat
      const failedScenarios = allReports.filter(r => r.steps.some(s => s.status === "failed"));
      const totalSteps = allReports.reduce((sum, r) => sum + r.steps.length, 0);
      const totalPassed = allReports.reduce((sum, r) => sum + r.steps.filter(s => s.status === "passed").length, 0);
      const totalFailed = totalSteps - totalPassed;

      let summary = `All ${allReports.length} test scenarios completed. ${totalPassed}/${totalSteps} steps passed, ${totalFailed} failed.\n\n`;
      if (failedScenarios.length > 0) {
        summary += "FAILED SCENARIOS:\n";
        for (const r of failedScenarios) {
          summary += `\n- "${r.scenarioTitle}" (${r.url}):\n`;
          for (const s of r.steps.filter(s => s.status === "failed")) {
            summary += `  Step ${s.step}: "${s.action}" — FAILED: ${s.detail}\n`;
          }
        }
        summary += "\nAnalyze each failure above. For each one, explain WHY it likely failed and give a specific Playwright fix or workaround.";
      } else {
        summary += "All tests passed! Give a brief summary of what was tested and confirm everything looks good.";
      }

      setChatAutoMessage(summary);
      if (!state.isChatOpen) dispatch({ type: "TOGGLE_CHAT" });
    }
  }, [allReports, state.testRunning, uiPlan]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    dispatch({ type: "SET_ERROR", payload: null });
    dispatch({ type: "SET_LOADING", payload: true });
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await parseResponse(res);
      if (data.token) {
        localStorage.setItem("bro_token", data.token);
        dispatch({ type: "SET_TOKEN", payload: data.token });
      }
    } catch (err: any) {
      dispatch({ type: "SET_ERROR", payload: err.message });
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("bro_token");
    dispatch({ type: "SET_TOKEN", payload: null });
  };

  const handleImportPostman = async (collection: any) => {
    dispatch({ type: "SET_ERROR", payload: null });
    dispatch({ type: "SET_LOADING", payload: true });
    try {
      const res = await fetch("/api/import-postman", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${state.token}`,
        },
        body: JSON.stringify({ collection }),
      });
      const data = await parseResponse(res);
      if (data.code) dispatch({ type: "SET_API_CODE", payload: data.code });
    } catch (err: any) {
      if (err.status === 401) handleAuthFailure();
      else dispatch({ type: "SET_ERROR", payload: err.message });
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  };

  const handleGenerateUiPlan = async (input: UiPlanInput) => {
    dispatch({ type: "SET_ERROR", payload: null });
    setUiPlanLoading(true);
    setUiPlanUrl(input.url);
    setAllReports([]);
    setChatAutoMessage(null);
    historySavedRef.current = false;
    try {
      const res = await fetch("/api/ui-plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${state.token}`,
        },
        body: JSON.stringify(input),
      });
      const data = await parseResponse(res);
      if (data.scenarios) {
        setUiPlan(data.scenarios);
        setUiPlanSummary(data.summary);
        // Auto-run all tests after plan generates
        autoRunAfterPlanRef.current = true;
      }
    } catch (err: any) {
      if (err.status === 401) handleAuthFailure();
      else dispatch({ type: "SET_ERROR", payload: err.message });
    } finally {
      setUiPlanLoading(false);
    }
  };

  const runAllRef = useRef(false);

  const handleStopTest = async () => {
    runAllRef.current = false;
    setRunQueue([]);
    if (state.runId) {
      try {
        await fetch(`/api/stop-test/${state.runId}`, {
          method: "POST",
          headers: { "Authorization": `Bearer ${state.token}` },
        });
      } catch {}
    }
    dispatch({ type: "SET_TEST_RUNNING", payload: false });
    setUiPlan((prev) =>
      prev.map((s) => (s.status === "running" ? { ...s, status: "failed" } : s))
    );
    activeScenarioRef.current = null;
  };

  // Populate run queue for approval flow
  const handleStartRunQueue = () => {
    const ids = uiPlan
      .filter(s => s.status === "ready" || s.status === "failed" || s.status === "passed")
      .map(s => s.id);
    setRunQueue(ids);
    setTestReport(null);
    setAllReports([]);
    historySavedRef.current = false;
  };

  // Run next test in queue (one at a time)
  const handleApproveNext = () => {
    if (runQueue.length === 0) return;
    const [nextId, ...rest] = runQueue;
    setRunQueue(rest);
    handleRunUiScenario(nextId, uiPlanUrl);
  };

  // Run all remaining queued tests sequentially
  const handleApproveAll = async () => {
    if (runQueue.length === 0) return;
    const queue = [...runQueue];
    setRunQueue([]);
    runAllRef.current = true;

    for (const scenarioId of queue) {
      if (!runAllRef.current) break;
      await handleRunUiScenario(scenarioId, uiPlanUrl);
      await new Promise<void>((resolve) => {
        const interval = setInterval(() => {
          if (!activeScenarioRef.current || activeScenarioRef.current !== scenarioId) {
            clearInterval(interval);
            resolve();
          }
        }, 500);
      });
      if (!runAllRef.current) break;
      await new Promise(r => setTimeout(r, 800));
    }
    runAllRef.current = false;
    // Set testReport from accumulated reports so the full report view renders
    setAllReports((prev) => {
      if (prev.length > 0) setTestReport(prev[prev.length - 1]);
      return prev;
    });
    dispatch({ type: "SET_TEST_RUNNING", payload: false });
    setShowFullReport(true);
  };

  const handleCancelQueue = () => {
    setRunQueue([]);
  };

  const saveTestHistory = async (reports: TestReportData[]) => {
    if (reports.length === 0 || !state.token) return;
    const totalSteps = reports.reduce((sum, r) => sum + r.steps.length, 0);
    const totalPassed = reports.reduce((sum, r) => sum + r.steps.filter(s => s.status === "passed").length, 0);
    const totalFailed = totalSteps - totalPassed;
    const passRate = totalSteps > 0 ? Math.round((totalPassed / totalSteps) * 100) : 0;
    const earliest = Math.min(...reports.map(r => new Date(r.startTime).getTime()));
    const latest = Math.max(...reports.map(r => new Date(r.endTime).getTime()));
    const diffSecs = Math.floor(Math.max(0, latest - earliest) / 1000);
    const duration = diffSecs >= 60 ? `${Math.floor(diffSecs / 60)}m ${diffSecs % 60}s` : `${diffSecs}s`;

    const summary = JSON.stringify({
      scenarios: reports.map(r => {
        const p = r.steps.filter(s => s.status === "passed").length;
        const f = r.steps.length - p;
        const st = new Date(r.startTime).getTime();
        const en = new Date(r.endTime).getTime();
        const ds = Math.floor(Math.max(0, en - st) / 1000);
        return {
          title: r.scenarioTitle,
          status: f > 0 ? "failed" : "passed",
          steps: r.steps.length,
          passed: p,
          failed: f,
          duration: ds >= 60 ? `${Math.floor(ds / 60)}m ${ds % 60}s` : `${ds}s`,
        };
      }),
      totalSteps,
      totalPassed,
      totalFailed,
      passRate,
      duration,
    });

    try {
      await fetch("/api/test-history", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${state.token}` },
        body: JSON.stringify({
          id: `hist_${Date.now()}`,
          url: reports[0].url,
          status: totalFailed > 0 ? "failed" : "passed",
          summary,
        }),
      });
    } catch {}
  };

  const handleRunUiScenario = async (scenarioId: string, url: string) => {
    const effectiveUrl = url || uiPlanUrl;
    const scenario = uiPlan.find((item) => item.id === scenarioId);
    if (!scenario || !effectiveUrl) return;

    activeScenarioRef.current = scenarioId;
    runHadErrorRef.current = false;
    stepResultsRef.current = [];
    testStartTimeRef.current = new Date().toISOString();
    setTestReport(null);
    setGeneratedScript(null);
    setBottomTab("steps");
    dispatch({ type: "SET_TEST_RUNNING", payload: true });
    if (state.isChatOpen) dispatch({ type: "TOGGLE_CHAT" });

    setUiPlan((prev) =>
      prev.map((item) => (item.id === scenarioId ? { ...item, status: "running" } : item))
    );

    try {
      // Directly start test execution - no code generation delay
      const res = await fetch("/api/run-tests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${state.token}`,
        },
        body: JSON.stringify({ url: effectiveUrl, steps: scenario.steps }),
      });
      const data = await parseResponse(res);
      if (data.runId) {
        dispatch({ type: "SET_RUN_ID", payload: data.runId });
      } else {
        throw new Error("No runId received");
      }
    } catch (err: any) {
      if (err.status === 401) handleAuthFailure();
      else dispatch({ type: "SET_ERROR", payload: err.message });
      setUiPlan((prev) =>
        prev.map((item) => (item.id === scenarioId ? { ...item, status: "failed" } : item))
      );
      activeScenarioRef.current = null;
      if (!runAllRef.current) {
        dispatch({ type: "SET_TEST_RUNNING", payload: false });
      }
    }
  };

  const handleConsoleLog = (log: StreamLog) => {
    if (!activeScenarioRef.current) return;

    if (log.type === "error") runHadErrorRef.current = true;

    // Suggestions collected silently — chat opens only after ALL tests complete

    // Capture generated Playwright script
    if (log.type === "script" && log.code) {
      setGeneratedScript(log.code);
    }

    // Collect step results for the report
    if (log.type === "step" && log.step !== undefined && log.status && log.status !== "running") {
      const result: TestStepResult = {
        step: log.step,
        action: log.action || "",
        status: log.status as "passed" | "failed",
        detail: log.detail || "",
        timestamp: log.timestamp,
      };
      const idx = stepResultsRef.current.findIndex((s) => s.step === log.step);
      if (idx >= 0) stepResultsRef.current[idx] = result;
      else stepResultsRef.current.push(result);
    }

    if (log.message?.includes("Run completed.")) {
      const completedScenarioId = activeScenarioRef.current;
      const completedScenario = uiPlan.find((s) => s.id === completedScenarioId);
      const hasFailedSteps = stepResultsRef.current.some((s) => s.status === "failed");
      const nextStatus = (runHadErrorRef.current || hasFailedSteps) ? "failed" : "passed";

      // Build test report
      const completedReport: TestReportData = {
        steps: [...stepResultsRef.current],
        startTime: testStartTimeRef.current,
        endTime: new Date().toISOString(),
        url: uiPlanUrl,
        scenarioTitle: completedScenario?.title || "UI Test",
      };
      setAllReports((prev) => [...prev, completedReport]);

      // Only show individual report if not part of a batch run
      if (!runAllRef.current && runQueue.length === 0) {
        setTestReport(completedReport);
        saveTestHistory([completedReport]);
      }

      setUiPlan((prev) =>
        prev.map((item) => (item.id === completedScenarioId ? { ...item, status: nextStatus } : item))
      );
      activeScenarioRef.current = null;
      runHadErrorRef.current = false;

      // Only mark as not running if not in Run All mode (Run All keeps it alive)
      if (!runAllRef.current) {
        dispatch({ type: "SET_TEST_RUNNING", payload: false });
      }
    }
  };

  // Script viewer mini-component
  const ScriptViewer = ({ code }: { code: string | null }) => {
    const [copied, setCopied] = useState(false);
    if (!code) return null;
    const handleCopy = () => {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };
    const handleDownload = () => {
      const blob = new Blob([code], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "test.spec.ts";
      a.click();
      URL.revokeObjectURL(url);
    };
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-3 py-1.5 bg-gray-100 dark:bg-slate-900/80 border-b border-gray-200 dark:border-emerald-500/10 shrink-0">
          <span className="text-[9px] font-black uppercase tracking-[0.15em] text-emerald-600 dark:text-emerald-500/50 mono-label">test.spec.ts</span>
          <div className="flex items-center gap-1">
            <button onClick={handleCopy} className="flex items-center gap-1 px-2 py-1 rounded text-[8px] font-bold uppercase tracking-[0.15em] text-gray-500 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-all mono-label">
              {copied ? <Check size={10} className="text-emerald-500 dark:text-emerald-400" /> : <Copy size={10} />}
              {copied ? "Copied" : "Copy"}
            </button>
            <button onClick={handleDownload} className="flex items-center gap-1 px-2 py-1 rounded text-[8px] font-bold uppercase tracking-[0.15em] text-gray-500 dark:text-slate-500 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-500/10 transition-all mono-label">
              <Download size={10} /> Download
            </button>
          </div>
        </div>
        <pre className="flex-1 overflow-auto p-3 text-[11px] leading-relaxed font-mono text-emerald-700 dark:text-emerald-300/70 bg-gray-50 dark:bg-slate-950 scrollbar-thin scrollbar-thumb-emerald-500/10">{code}</pre>
      </div>
    );
  };

  if (!state.token) {
    return (
      <div className="min-h-screen tech-login-bg flex items-center justify-center p-4 md:p-6 font-sans text-gray-700 dark:text-slate-200 pb-24 relative overflow-hidden">
        {/* Animated scan line */}
        <div className="absolute inset-0 scan-line pointer-events-none" />

        {/* Floating circuit decorations */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.15 }} transition={{ duration: 2 }} className="absolute top-20 left-10 w-40 h-px bg-gradient-to-r from-emerald-500 to-transparent hidden dark:block" />
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.15 }} transition={{ duration: 2, delay: 0.5 }} className="absolute top-20 left-10 w-px h-20 bg-gradient-to-b from-emerald-500 to-transparent hidden dark:block" />
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.15 }} transition={{ duration: 2, delay: 0.3 }} className="absolute bottom-32 right-16 w-32 h-px bg-gradient-to-l from-emerald-500 to-transparent hidden dark:block" />
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.15 }} transition={{ duration: 2, delay: 0.8 }} className="absolute bottom-32 right-16 w-px h-16 bg-gradient-to-t from-emerald-500 to-transparent hidden dark:block" />
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.1 }} transition={{ duration: 3, delay: 1 }} className="absolute top-1/4 right-1/4 w-2 h-2 rounded-full bg-emerald-500 animate-pulse-glow hidden dark:block" />
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.1 }} transition={{ duration: 3, delay: 1.5 }} className="absolute bottom-1/3 left-1/3 w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse-glow hidden dark:block" />

        {/* Theme toggle on login page */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          onClick={() => dispatch({ type: "TOGGLE_THEME" })}
          className="fixed top-6 right-6 z-50 p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:border-emerald-300 dark:hover:border-emerald-500/30 transition-all shadow-sm"
        >
          {state.isDark ? <Sun size={18} /> : <Moon size={18} />}
        </motion.button>

        <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 120, damping: 18, delay: 0.1 }} className="w-full max-w-md relative z-10">
          {/* Card with neon border */}
          <div className="tech-card rounded-2xl p-5 md:p-8 neon-border hud-corners animate-border-glow">
            <div className="flex flex-col items-center mb-8 text-center">
              <div className="relative mb-4">
                {/* Pulse rings behind robot */}
                <motion.div
                  className="absolute inset-0 -m-5 rounded-full border border-emerald-500/20 dark:border-emerald-400/15"
                  animate={{ scale: [1, 2, 2], opacity: [0.4, 0, 0] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "easeOut" }}
                />
                <motion.div
                  className="absolute inset-0 -m-5 rounded-full border border-emerald-500/20 dark:border-emerald-400/15"
                  animate={{ scale: [1, 2, 2], opacity: [0.4, 0, 0] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "easeOut", delay: 0.8 }}
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.3, rotate: -15 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 180, damping: 12, delay: 0.3 }}
                  className="relative z-10"
                >
                  <Logo size={80} />
                </motion.div>
              </div>
              <motion.h1 initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45, type: "spring", stiffness: 150 }} className="text-2xl font-bold text-gray-900 dark:text-slate-100 neon-text">Test AI</motion.h1>
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6, duration: 0.5 }} className="text-emerald-600 dark:text-emerald-500/70 text-[10px] mt-2 uppercase tracking-[0.25em] font-black mono-label">AI Testing Architect</motion.p>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} className="flex items-center gap-2 mt-3">
                <motion.div
                  className="w-1.5 h-1.5 rounded-full bg-emerald-500"
                  animate={{ boxShadow: ["0 0 4px rgba(16,185,129,0.3)", "0 0 12px rgba(16,185,129,0.6)", "0 0 4px rgba(16,185,129,0.3)"] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <span className="text-[9px] text-emerald-600 dark:text-emerald-500/60 uppercase tracking-widest font-bold mono-label">System Ready</span>
              </motion.div>
            </div>
            <form onSubmit={handleLogin} className="space-y-4">
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5, duration: 0.4 }} className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-600/60 dark:text-emerald-500/50 flex items-center gap-2 mono-label">
                  <UserIcon size={10} /> Email Address
                </label>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-gray-50 dark:bg-slate-950/50 border border-gray-200 dark:border-slate-700/50 rounded-lg p-3 md:p-4 text-sm md:text-base text-gray-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500/40 transition-all font-medium placeholder-gray-400 dark:placeholder-slate-600" placeholder="Enter your email" />
              </motion.div>
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6, duration: 0.4 }} className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-600/60 dark:text-emerald-500/50 flex items-center gap-2 mono-label">
                  <Lock size={10} /> Password
                </label>
                <input type="password" className="w-full bg-gray-50 dark:bg-slate-950/50 border border-gray-200 dark:border-slate-700/50 rounded-lg p-3 md:p-4 text-sm md:text-base text-gray-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500/40 transition-all font-medium placeholder-gray-400 dark:placeholder-slate-600" placeholder="Enter your password" />
              </motion.div>
              {state.error && <motion.p initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-rose-500 dark:text-rose-400 text-xs text-center font-bold px-3 py-2 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-lg mono-label">{state.error}</motion.p>}
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.75, duration: 0.4 }}
                whileHover={{ scale: 1.02, boxShadow: "0 0 30px rgba(16,185,129,0.25), 0 0 60px rgba(16,185,129,0.1)" }}
                whileTap={{ scale: 0.97 }}
                type="submit"
                disabled={state.loading}
                className="w-full py-3 md:py-4 bg-emerald-500 hover:bg-emerald-400 text-white dark:text-black font-black uppercase tracking-[0.2em] text-xs rounded-lg transition-all flex items-center justify-center gap-2 mt-4 shadow-lg shadow-emerald-500/20 neon-glow mono-label"
              >
                {state.loading ? "Logging in..." : "Login"}
                <ChevronRight size={16} />
              </motion.button>
            </form>

            {/* Bottom tech decoration */}
            <div className="flex items-center justify-center gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-slate-800/50">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent to-emerald-500/20" />
              <span className="text-[8px] text-gray-400 dark:text-slate-600 uppercase tracking-[0.3em] mono-label">v2.0 Secure</span>
              <div className="h-px flex-1 bg-gradient-to-l from-transparent to-emerald-500/20" />
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-screen tech-grid-bg text-gray-700 dark:text-slate-300 flex flex-col font-sans overflow-hidden">
      <header className="h-12 md:h-14 tech-header flex items-center justify-between px-3 md:px-6 shrink-0 z-20 relative">
        {/* Header scan line accent */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent hidden dark:block" />

        <div className="flex items-center gap-2 md:gap-4">
          <div className="neon-glow rounded-lg">
            <LogoMark size={28} />
          </div>
          <span className="font-black text-gray-900 dark:text-slate-100 uppercase tracking-wider text-xs md:text-sm leading-none pt-0.5 mono-label neon-text">Test AI</span>
        </div>
        <div className="flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => dispatch({ type: "TOGGLE_THEME" })}
            className="p-2 rounded-lg text-gray-500 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 border border-transparent hover:border-emerald-200 dark:hover:border-emerald-500/20 transition-all duration-300"
          >
            {state.isDark ? <Sun size={18} /> : <Moon size={18} />}
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={handleLogout}
            className="p-2 rounded-lg text-gray-500 dark:text-slate-500 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 border border-transparent hover:border-rose-200 dark:hover:border-rose-500/20 transition-all duration-300"
          >
            <LogOut size={18} />
          </motion.button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        <nav className="hidden md:flex w-14 border-r border-gray-200 dark:border-emerald-500/10 flex-col items-center py-6 gap-4 bg-gray-50/50 dark:bg-slate-950/50 shrink-0">
          {[
            { id: "ui" as const, icon: <Layout size={18} /> },
            { id: "api" as const, icon: <Database size={18} /> },
            { id: "history" as const, icon: <History size={18} /> },
          ].map((item) => (
            <motion.button
              key={item.id}
              whileHover={{ scale: 1.12 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => dispatch({ type: "SET_TAB", payload: item.id })}
              className={`p-2.5 rounded-lg transition-all duration-300 relative ${state.activeTab === item.id ? "bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 shadow-sm dark:shadow-[0_0_15px_rgba(16,185,129,0.15)]" : "text-gray-400 dark:text-slate-600 hover:text-gray-700 dark:hover:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800/50 border border-transparent"}`}
            >
              {item.icon}
              {state.activeTab === item.id && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute -right-px top-1/2 -translate-y-1/2 w-0.5 h-5 bg-emerald-500 rounded-l-full shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
            </motion.button>
          ))}
        </nav>

        <div className="flex-1 flex flex-col overflow-hidden relative">
          <Tabs tabs={[{ id: "ui", label: "UI Automation", icon: <Layout size={14} /> }, { id: "api", label: "API Testing", icon: <Database size={14} /> }, { id: "history", label: "History", icon: <History size={14} /> }]} activeTab={state.activeTab} onChange={(id) => dispatch({ type: "SET_TAB", payload: id as any })} />
          <div className="flex-1 flex overflow-hidden p-2 md:p-5 gap-3 md:gap-5 min-h-0 max-h-full">
            <div className="flex-1 flex flex-col gap-6 min-w-0">
              <AnimatePresence mode="wait">
                {state.activeTab === "history" ? (
                  <motion.div key="history" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex-1 flex flex-col min-h-0">
                    <TestHistory token={state.token || ""} onAuthError={handleAuthFailure} />
                  </motion.div>
                ) : state.activeTab === "api" ? (
                  <motion.div key="api" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex-1 flex flex-col min-h-0">
                    <ApiTestingPanel token={state.token || ""} onAuthError={handleAuthFailure} />
                  </motion.div>
                ) : (
                  <motion.div key="ui" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex-1 flex flex-col min-h-0">
                    {showFullReport && testReport ? (
                      <div className="flex-1 min-h-0">
                        <TestReport
                          report={testReport}
                          onBack={() => { setShowFullReport(false); setChatAutoMessage(null); setChatResetKey(k => k + 1); }}
                          onNewTest={() => { setShowFullReport(false); setUiPlan([]); setUiPlanSummary(null); setUiPlanUrl(""); setTestReport(null); setAllReports([]); setGeneratedScript(null); setBottomTab("steps"); activeScenarioRef.current = null; runAllRef.current = false; setRunQueue([]); dispatch({ type: "SET_RUN_ID", payload: null }); dispatch({ type: "SET_PREVIEW_URL", payload: null }); dispatch({ type: "SET_UI_CODE", payload: "" }); dispatch({ type: "SET_TEST_RUNNING", payload: false }); setChatAutoMessage(null); setChatResetKey(k => k + 1); }}
                          onRerun={() => { setShowFullReport(false); handleStartRunQueue(); }}
                          allReports={allReports}
                        />
                      </div>
                    ) : uiPlan.length === 0 ? (
                      <UiAutomationPlanner planning={uiPlanLoading} scenarios={uiPlan} helperText={uiPlanSummary} initialUrl={uiPlanUrl} onGeneratePlan={handleGenerateUiPlan} onRunScenario={handleRunUiScenario} onRunAll={handleStartRunQueue} onStop={handleStopTest} runQueue={runQueue} onApproveNext={handleApproveNext} onApproveAll={handleApproveAll} onCancelQueue={handleCancelQueue} onResetPlan={() => { setUiPlan([]); setUiPlanSummary(null); setUiPlanUrl(""); setTestReport(null); setAllReports([]); setGeneratedScript(null); setBottomTab("steps"); activeScenarioRef.current = null; runAllRef.current = false; setRunQueue([]); dispatch({ type: "SET_RUN_ID", payload: null }); dispatch({ type: "SET_PREVIEW_URL", payload: null }); dispatch({ type: "SET_UI_CODE", payload: "" }); dispatch({ type: "SET_TEST_RUNNING", payload: false }); setChatAutoMessage(null); setChatResetKey(k => k + 1); }} />
                    ) : (
                      <div className="flex-1 flex flex-col md:flex-row gap-3 md:gap-6 min-h-0">
                        <div className="w-full md:w-[380px] shrink-0 min-h-0 max-h-[45vh] md:max-h-none">
                          <UiAutomationPlanner planning={uiPlanLoading} scenarios={uiPlan} helperText={uiPlanSummary} initialUrl={uiPlanUrl} onGeneratePlan={handleGenerateUiPlan} onRunScenario={handleRunUiScenario} onRunAll={handleStartRunQueue} onStop={handleStopTest} runQueue={runQueue} onApproveNext={handleApproveNext} onApproveAll={handleApproveAll} onCancelQueue={handleCancelQueue} onResetPlan={() => { setUiPlan([]); setUiPlanSummary(null); setUiPlanUrl(""); setTestReport(null); setAllReports([]); setGeneratedScript(null); setBottomTab("steps"); activeScenarioRef.current = null; runAllRef.current = false; setRunQueue([]); dispatch({ type: "SET_RUN_ID", payload: null }); dispatch({ type: "SET_PREVIEW_URL", payload: null }); dispatch({ type: "SET_UI_CODE", payload: "" }); dispatch({ type: "SET_TEST_RUNNING", payload: false }); setChatAutoMessage(null); setChatResetKey(k => k + 1); }} />
                        </div>
                        <div className="flex-1 flex flex-col gap-3 min-w-0">
                          {/* Live Preview */}
                          <div className="flex-1 min-h-0">
                            <LivePreview previewUrl={state.previewUrl || undefined} status={state.testRunning ? "running" : state.runId ? "completed" : "idle"} targetUrl={state.runId ? uiPlanUrl : undefined} />
                          </div>

                          {/* Tabbed Bottom Panel */}
                          {state.runId && (
                            <div className="h-40 md:h-52 shrink-0 flex flex-col bg-white dark:bg-slate-950 border border-gray-200 dark:border-emerald-500/10 rounded-xl overflow-hidden neon-border">
                              {/* Tab Bar */}
                              <div className="flex items-center gap-1 px-2 pt-1.5 pb-0 bg-gray-50 dark:bg-slate-900/80 border-b border-gray-200 dark:border-emerald-500/10 shrink-0">
                                {[
                                  { id: "steps" as const, label: "Steps", icon: <ClipboardList size={11} /> },
                                  { id: "script" as const, label: "Script", icon: <FileCode2 size={11} />, badge: generatedScript ? true : false },
                                ].map((tab) => (
                                  <button
                                    key={tab.id}
                                    onClick={() => setBottomTab(tab.id)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.15em] rounded-t-lg transition-all relative mono-label ${
                                      bottomTab === tab.id
                                        ? "bg-white dark:bg-slate-950 text-emerald-600 dark:text-emerald-400 border-x border-t border-emerald-200 dark:border-emerald-500/20 -mb-px z-10"
                                        : "text-gray-400 dark:text-slate-500 hover:text-gray-700 dark:hover:text-slate-300"
                                    }`}
                                  >
                                    {tab.icon}
                                    {tab.label}
                                    {tab.badge && bottomTab !== tab.id && (
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    )}
                                  </button>
                                ))}
                              </div>

                              {/* Tab Content */}
                              <div className="flex-1 overflow-hidden min-h-0">
                                {bottomTab === "steps" && (
                                  <ConsoleStream runId={state.runId} onPreview={(url) => dispatch({ type: "SET_PREVIEW_URL", payload: url })} onLog={handleConsoleLog} />
                                )}
                                {bottomTab === "script" && (
                                  <ScriptViewer code={generatedScript} />
                                )}
                                {bottomTab === "script" && !generatedScript && (
                                  <div className="flex items-center justify-center h-full text-gray-400 dark:text-slate-600 text-[10px] mono-label tracking-[0.15em]">Script will generate post-execution...</div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </main>

      {/* Floating Chat Widget */}
      <AnimatePresence>
        {state.isChatOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="fixed bottom-20 right-3 md:bottom-24 md:right-6 z-50 w-[92vw] max-w-[480px] h-[75vh] md:h-[80vh] max-h-[720px] rounded-xl shadow-2xl shadow-black/20 dark:shadow-black/40 border border-gray-200 dark:border-emerald-500/20 overflow-hidden neon-border"
          >
            <SidebarFixChat
              key={chatResetKey}
              currentCode={state.activeTab === 'api' ? state.apiCode : state.uiCode}
              onApplyFix={(code) => dispatch({ type: state.activeTab === 'api' ? "SET_API_CODE" : "SET_UI_CODE", payload: code })}
              token={state.token || ""}
              onAuthError={handleAuthFailure}
              onClose={() => dispatch({ type: "TOGGLE_CHAT" })}
              autoMessage={chatAutoMessage}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Chat FAB */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => dispatch({ type: "TOGGLE_CHAT" })}
        className={`fixed bottom-4 right-4 md:bottom-6 md:right-6 z-50 w-12 h-12 md:w-13 md:h-13 rounded-lg flex items-center justify-center shadow-lg transition-colors duration-300 ${
          state.isChatOpen
            ? "bg-gray-200 dark:bg-slate-800 shadow-black/10 dark:shadow-black/30 border border-gray-300 dark:border-slate-700"
            : "bg-emerald-500 shadow-emerald-500/30 border border-emerald-400/30 neon-glow"
        }`}
      >
        <AnimatePresence mode="wait">
          {state.isChatOpen ? (
            <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <X size={24} className="text-gray-600 dark:text-white" />
            </motion.div>
          ) : (
            <motion.div key="open" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white dark:text-black"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  );
}

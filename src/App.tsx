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
  Sun,
  Moon,
  History,
  MessageSquare,
  GitBranch,
  Menu,
  Zap,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { Tabs } from "./components/Tabs";
import { ConsoleStream, type StreamLog } from "./components/ConsoleStream";
import { ProfilePanel } from "./components/ProfilePanel";
import { SidebarSection, SidebarLink } from "./components/SidebarBits";
import { TemplatesModal, FeedbackModal, CICDModal } from "./components/ToolModals";
import { AnalyticsDashboard } from "./components/AnalyticsDashboard";
import { SidebarFixChat } from "./components/SidebarFixChat";
import { CodeViewer } from "./components/CodeViewer";
import { UploadPostman } from "./components/UploadPostman";
import { ApiTestingPanel, AgentSuiteResult } from "./components/ApiTestingPanel";
import { UiAutomationPlanner, type UiPlanInput, type UiPlanScenario } from "./components/UiAutomationPlanner";
import { LivePreview } from "./components/LivePreview";
import { Logo, LogoMark } from "./components/Logo";
import { TestReport, type TestReportData, type TestStepResult } from "./components/TestReport";
import { TestHistory } from "./components/TestHistory";
import { motion, AnimatePresence } from "motion/react";

type State = {
  activeTab: "api" | "ui" | "history" | "analytics";
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
  const [profileOpen, setProfileOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [cicdOpen, setCicdOpen] = useState(false);
  const [oauthMsg, setOauthMsg] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("sidebar_collapsed") === "1";
  });
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  useEffect(() => {
    localStorage.setItem("sidebar_collapsed", sidebarCollapsed ? "1" : "0");
  }, [sidebarCollapsed]);
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

  // Pick up OAuth-issued token from callback redirect: /?token=...
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const err = params.get("oauth_error");
    if (token) {
      localStorage.setItem("bro_token", token);
      dispatch({ type: "SET_TOKEN", payload: token });
      // Clean the URL so a refresh doesn't keep the token in history
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (err) {
      const provider = params.get("provider") || "OAuth";
      setOauthMsg(`${provider} sign-in failed: ${err.replace(/_/g, " ")}`);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleOauthLogin = async (provider: string) => {
    setOauthMsg(null);
    try {
      const res = await fetch(`/api/auth/oauth/${provider}/start`);
      if (res.ok) {
        const { url } = await res.json();
        if (url) { window.location.href = url; return; }
      }
      if (res.status === 503) {
        const providerName = provider.charAt(0).toUpperCase() + provider.slice(1);
        const envVar = `${provider.toUpperCase()}_CLIENT_ID`;
        setOauthMsg(`${providerName} sign-in needs ${envVar} + ${envVar.replace("_ID", "_SECRET")} in server .env`);
        return;
      }
      setOauthMsg(`Failed to start ${provider} login (HTTP ${res.status})`);
    } catch (err: any) {
      setOauthMsg(err?.message || "Sign-in failed");
    }
  };

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

  const saveApiSuiteToHistory = async (suiteResult: AgentSuiteResult) => {
    if (!state.token) return;
    const { lister } = suiteResult;
    // Pull a base URL from the first endpoint for the history card title
    const firstUrl = lister.list[0]?.url || "";
    let baseUrl = "API Suite";
    try { baseUrl = new URL(firstUrl).origin; } catch {}
    const status = lister.totalFailed > 0 ? "failed" : lister.totalWarning > 0 ? "warning" : "passed";
    const summary = JSON.stringify({
      type: "api",
      endpoints: lister.list.map(e => ({
        name: e.name,
        method: e.method,
        url: e.url,
        statusCode: e.statusCode,
        time: e.time,
        verdict: e.verdict,
        notes: e.notes,
      })),
      totalEndpoints: lister.totalEndpoints,
      totalPassed: lister.totalPassed,
      totalWarning: lister.totalWarning,
      totalFailed: lister.totalFailed,
      avgTime: lister.avgTime,
      recommendations: lister.recommendations,
    });
    try {
      await fetch("/api/test-history", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${state.token}` },
        body: JSON.stringify({
          id: `api_${Date.now()}`,
          url: baseUrl,
          status,
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
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-gray-50 dark:bg-slate-950/50 border border-gray-200 dark:border-slate-700/50 rounded-lg p-3 md:p-4 text-base text-gray-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500/40 transition-all font-medium placeholder-gray-400 dark:placeholder-slate-600" placeholder="Enter your email" />
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

            {/* OAuth / Social login */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.85, duration: 0.4 }} className="mt-5 space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent to-gray-200 dark:to-slate-800" />
                <span className="text-[9px] text-gray-400 dark:text-slate-600 uppercase tracking-[0.25em] mono-label">Or continue with</span>
                <div className="h-px flex-1 bg-gradient-to-l from-transparent to-gray-200 dark:to-slate-800" />
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleOauthLogin("google")}
                  className="flex items-center justify-center gap-2 py-2.5 rounded-lg border border-gray-200 dark:border-slate-700/60 bg-white dark:bg-slate-900/60 text-gray-700 dark:text-slate-200 hover:border-emerald-400 dark:hover:border-emerald-500/40 hover:shadow-[0_0_15px_rgba(16,185,129,0.15)] transition-all"
                  aria-label="Continue with Google"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                  <span className="text-[10px] font-black uppercase tracking-[0.18em] mono-label">Google</span>
                </motion.button>
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleOauthLogin("github")}
                  className="flex items-center justify-center gap-2 py-2.5 rounded-lg border border-gray-200 dark:border-slate-700/60 bg-white dark:bg-slate-900/60 text-gray-700 dark:text-slate-200 hover:border-emerald-400 dark:hover:border-emerald-500/40 hover:shadow-[0_0_15px_rgba(16,185,129,0.15)] transition-all"
                  aria-label="Continue with GitHub"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 .5A11.5 11.5 0 0 0 .5 12a11.5 11.5 0 0 0 7.86 10.92c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.52-1.33-1.28-1.68-1.28-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.03 1.76 2.69 1.25 3.35.96.1-.74.4-1.25.73-1.54-2.55-.29-5.23-1.28-5.23-5.69 0-1.26.45-2.29 1.18-3.09-.12-.29-.51-1.46.11-3.05 0 0 .96-.31 3.15 1.18a11 11 0 0 1 5.74 0C17.1 4.47 18.06 4.78 18.06 4.78c.62 1.59.23 2.76.11 3.05.73.8 1.18 1.83 1.18 3.09 0 4.42-2.69 5.4-5.25 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12 11.5 11.5 0 0 0 12 .5z"/></svg>
                  <span className="text-[10px] font-black uppercase tracking-[0.18em] mono-label">GitHub</span>
                </motion.button>
              </div>
              {oauthMsg && (
                <p className="text-[10px] text-rose-500 dark:text-rose-400 text-center font-bold px-3 py-2 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-lg mono-label">{oauthMsg}</p>
              )}
            </motion.div>

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
          <button
            onClick={() => setMobileNavOpen(true)}
            aria-label="Open menu"
            className="md:hidden p-2 -ml-1 rounded-lg text-gray-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 border border-transparent hover:border-emerald-200 dark:hover:border-emerald-500/20 transition-all"
          >
            <Menu size={18} />
          </button>
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
            onClick={() => setProfileOpen(true)}
            aria-label="Profile"
            className="p-2 rounded-lg text-gray-500 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 border border-transparent hover:border-emerald-200 dark:hover:border-emerald-500/20 transition-all duration-300"
          >
            <UserIcon size={18} />
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
        {/* Mobile backdrop */}
        <AnimatePresence>
          {mobileNavOpen && (
            <motion.div
              key="nav-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileNavOpen(false)}
              className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            />
          )}
        </AnimatePresence>

        <motion.nav
          animate={{
            width: sidebarCollapsed && !mobileNavOpen ? 56 : 224,
          }}
          transition={{ type: "spring", stiffness: 320, damping: 32 }}
          className={`border-r border-gray-200 dark:border-emerald-500/10 flex-col bg-white dark:bg-slate-950 md:bg-gray-50/50 md:dark:bg-slate-950/50 shrink-0 overflow-hidden z-50 md:z-auto
            fixed md:relative inset-y-0 left-0 md:inset-auto
            ${mobileNavOpen ? "flex" : "hidden"} md:flex
            shadow-2xl md:shadow-none
          `}
        >
          {/* Mobile drawer header (close button) */}
          <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-emerald-500/10">
            <span className="text-[11px] font-black uppercase tracking-[0.22em] text-emerald-600 dark:text-emerald-400 mono-label">Menu</span>
            <button
              onClick={() => setMobileNavOpen(false)}
              aria-label="Close menu"
              className="p-1.5 rounded-lg text-gray-500 dark:text-slate-500 hover:text-gray-900 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800/50 transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Sections */}
          <div className="flex-1 flex flex-col py-3 overflow-y-auto scrollbar-thin">
            <SidebarSection label="Testing" collapsed={sidebarCollapsed}>
              {[
                { id: "ui" as const, label: "UI Automation", icon: <Layout size={16} /> },
                { id: "api" as const, label: "API Testing", icon: <Database size={16} /> },
                { id: "history" as const, label: "History", icon: <History size={16} /> },
              ].map((item) => {
                const isActive = state.activeTab === item.id;
                return (
                  <motion.button
                    key={item.id}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => { dispatch({ type: "SET_TAB", payload: item.id }); setMobileNavOpen(false); }}
                    title={sidebarCollapsed ? item.label : undefined}
                    className={`group w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all relative mono-label ${
                      isActive
                        ? "bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30"
                        : "text-gray-500 dark:text-slate-500 hover:text-gray-900 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800/50 border border-transparent"
                    }`}
                  >
                    <span className="shrink-0">{item.icon}</span>
                    {!sidebarCollapsed && (
                      <span className="text-[11px] font-black uppercase tracking-[0.12em] truncate">{item.label}</span>
                    )}
                    {isActive && (
                      <motion.div
                        layoutId="nav-indicator"
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-emerald-500 rounded-r-full shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      />
                    )}
                  </motion.button>
                );
              })}
            </SidebarSection>

            <SidebarSection label="Tools" collapsed={sidebarCollapsed}>
              <SidebarLink
                collapsed={sidebarCollapsed}
                icon={<Zap size={16} />}
                label="Templates"
                title="Playwright templates (a11y, perf, e2e)"
                onClick={() => { setTemplatesOpen(true); setMobileNavOpen(false); }}
              />
              <SidebarLink
                collapsed={sidebarCollapsed}
                icon={<Activity size={16} />}
                label="Analytics"
                title="Live dashboard + test history"
                onClick={() => { dispatch({ type: "SET_TAB", payload: "analytics" }); setMobileNavOpen(false); }}
              />
              <SidebarLink
                collapsed={sidebarCollapsed}
                icon={<GitBranch size={16} />}
                label="CI/CD"
                title="Generate pipeline config (GitHub Actions, CircleCI, Jenkins, GitLab)"
                onClick={() => { setCicdOpen(true); setMobileNavOpen(false); }}
              />
              <SidebarLink
                collapsed={sidebarCollapsed}
                icon={<MessageSquare size={16} />}
                label="Feedback"
                title="Send feedback"
                onClick={() => { setFeedbackOpen(true); setMobileNavOpen(false); }}
              />
            </SidebarSection>

            <SidebarSection label="Account" collapsed={sidebarCollapsed}>
              <SidebarLink
                collapsed={sidebarCollapsed}
                icon={<UserIcon size={16} />}
                label="Profile"
                title="Profile"
                onClick={() => { setProfileOpen(true); setMobileNavOpen(false); }}
              />
            </SidebarSection>
          </div>

          {/* Collapse toggle — desktop only */}
          <button
            onClick={() => setSidebarCollapsed((c) => !c)}
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="hidden md:flex border-t border-gray-200 dark:border-emerald-500/10 px-3 py-2.5 items-center justify-center gap-2 text-gray-400 dark:text-slate-600 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-gray-100 dark:hover:bg-emerald-500/5 transition-colors"
          >
            {sidebarCollapsed ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}
            {!sidebarCollapsed && <span className="text-[9px] font-black uppercase tracking-[0.2em] mono-label">Collapse</span>}
          </button>
        </motion.nav>

        <div className="flex-1 flex flex-col overflow-hidden relative">
          <Tabs tabs={[{ id: "ui", label: "UI Automation", icon: <Layout size={14} /> }, { id: "api", label: "API Testing", icon: <Database size={14} /> }, { id: "analytics", label: "Analytics", icon: <Activity size={14} /> }, { id: "history", label: "History", icon: <History size={14} /> }]} activeTab={state.activeTab} onChange={(id) => dispatch({ type: "SET_TAB", payload: id as any })} />
          <div className="flex-1 flex overflow-hidden p-2 md:p-5 gap-3 md:gap-5 min-h-0 max-h-full">
            <div className="flex-1 flex flex-col gap-6 min-w-0">
              <AnimatePresence mode="wait">
                {state.activeTab === "analytics" ? (
                  <motion.div key="analytics" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex-1 flex flex-col min-h-0">
                    <AnalyticsDashboard token={state.token || ""} />
                  </motion.div>
                ) : state.activeTab === "history" ? (
                  <motion.div key="history" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex-1 flex flex-col min-h-0">
                    <TestHistory token={state.token || ""} onAuthError={handleAuthFailure} />
                  </motion.div>
                ) : state.activeTab === "api" ? (
                  <motion.div key="api" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex-1 flex flex-col min-h-0">
                    <ApiTestingPanel token={state.token || ""} onAuthError={handleAuthFailure} onSuiteComplete={saveApiSuiteToHistory} />
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
                        <div className="w-full md:w-[380px] shrink-0 min-h-0 max-h-[65vh] md:max-h-none">
                          <UiAutomationPlanner planning={uiPlanLoading} scenarios={uiPlan} helperText={uiPlanSummary} initialUrl={uiPlanUrl} onGeneratePlan={handleGenerateUiPlan} onRunScenario={handleRunUiScenario} onRunAll={handleStartRunQueue} onStop={handleStopTest} runQueue={runQueue} onApproveNext={handleApproveNext} onApproveAll={handleApproveAll} onCancelQueue={handleCancelQueue} onResetPlan={() => { setUiPlan([]); setUiPlanSummary(null); setUiPlanUrl(""); setTestReport(null); setAllReports([]); setGeneratedScript(null); setBottomTab("steps"); activeScenarioRef.current = null; runAllRef.current = false; setRunQueue([]); dispatch({ type: "SET_RUN_ID", payload: null }); dispatch({ type: "SET_PREVIEW_URL", payload: null }); dispatch({ type: "SET_UI_CODE", payload: "" }); dispatch({ type: "SET_TEST_RUNNING", payload: false }); setChatAutoMessage(null); setChatResetKey(k => k + 1); }} />
                        </div>
                        <div className="flex-1 flex flex-col gap-3 min-w-0">
                          {/* Live Preview (full-height) */}
                          <div className="flex-1 min-h-0">
                            <LivePreview previewUrl={state.previewUrl || undefined} status={state.testRunning ? "running" : state.runId ? "completed" : "idle"} targetUrl={state.runId ? uiPlanUrl : undefined} />
                          </div>

                          {/* Hidden — drives test report + script capture via onLog */}
                          {state.runId && (
                            <div className="hidden" aria-hidden="true">
                              <ConsoleStream runId={state.runId} onPreview={(url) => dispatch({ type: "SET_PREVIEW_URL", payload: url })} onLog={handleConsoleLog} />
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

      {/* Profile drawer */}
      <ProfilePanel
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        token={state.token || ""}
        onLogout={handleLogout}
      />

      {/* Tool modals */}
      <TemplatesModal open={templatesOpen} onClose={() => setTemplatesOpen(false)} />
      <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
      <CICDModal open={cicdOpen} onClose={() => setCicdOpen(false)} />

      {/* Floating Chat Widget */}
      <AnimatePresence>
        {state.isChatOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="fixed inset-x-3 bottom-20 md:inset-x-auto md:bottom-24 md:right-6 z-50 md:w-[92vw] md:max-w-[480px] h-[72vh] md:h-[80vh] max-h-[720px] rounded-xl shadow-2xl shadow-black/20 dark:shadow-black/40 border border-gray-200 dark:border-emerald-500/20 overflow-hidden neon-border"
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

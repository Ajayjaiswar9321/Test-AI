import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Copy, Check, Zap, MessageSquare, Activity, Loader2, GitBranch, Download } from "lucide-react";

const TEMPLATE_TYPES = [
  { id: "e2e", label: "End-to-End", hint: "Homepage smoke test" },
  { id: "accessibility", label: "Accessibility", hint: "WCAG checks: lang, alt, labels, focus" },
  { id: "performance", label: "Performance", hint: "TTFB, FCP, total transfer budget" },
] as const;

const ModalShell: React.FC<{
  open: boolean;
  onClose: () => void;
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: string;
}> = ({ open, onClose, title, icon, children, maxWidth = "max-w-xl" }) => (
  <AnimatePresence>
    {open && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={(e) => e.target === e.currentTarget && onClose()}
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4"
      >
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 28 }}
          className={`w-full ${maxWidth} bg-white dark:bg-slate-950 border border-gray-200 dark:border-emerald-500/20 rounded-t-2xl md:rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] md:max-h-[85vh] flex flex-col`}
          role="dialog"
          aria-modal="true"
          aria-label={title}
        >
          <div className="px-5 py-4 border-b border-gray-200 dark:border-emerald-500/10 flex items-center justify-between shrink-0">
            <h2 className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400 mono-label">
              {icon} {title}
            </h2>
            <button
              onClick={onClose}
              aria-label="Close"
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:text-slate-500 dark:hover:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800/50 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">{children}</div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

// ================================================================
// Templates modal
// ================================================================
export const TemplatesModal: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const [type, setType] = useState<"e2e" | "accessibility" | "performance">("accessibility");
  const [baseUrl, setBaseUrl] = useState("https://example.com");
  const [code, setCode] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/test-templates/${type}?baseUrl=${encodeURIComponent(baseUrl)}`);
      const data = await res.json();
      setCode(data?.code || data?.error || "");
    } catch (err: any) {
      setCode(`// ${err?.message || "Failed to load template"}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, type]);

  const onCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const onDownload = () => {
    const blob = new Blob([code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${type}.spec.ts`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <ModalShell open={open} onClose={onClose} title="Test Templates" icon={<Zap size={12} />} maxWidth="max-w-3xl">
      <div className="p-5 space-y-4">
        <div>
          <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-gray-500 dark:text-slate-500 mono-label mb-2">Type</label>
          <div className="grid grid-cols-3 gap-2">
            {TEMPLATE_TYPES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setType(t.id)}
                className={`text-left p-3 rounded-lg border transition-all ${
                  type === t.id
                    ? "bg-emerald-50 dark:bg-emerald-500/15 border-emerald-400 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-300"
                    : "bg-white dark:bg-slate-900/50 border-gray-200 dark:border-slate-800 text-gray-700 dark:text-slate-300 hover:border-gray-300 dark:hover:border-slate-700"
                }`}
              >
                <div className="text-[11px] font-black uppercase tracking-[0.1em] mono-label">{t.label}</div>
                <div className="text-[10px] text-gray-500 dark:text-slate-500 mt-1">{t.hint}</div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-gray-500 dark:text-slate-500 mono-label mb-2">Base URL</label>
          <input
            type="url"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            onBlur={load}
            placeholder="https://example.com"
            className="w-full bg-gray-50 dark:bg-slate-950/50 border border-gray-200 dark:border-slate-700/50 rounded-lg px-3 py-2.5 text-sm text-gray-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500/40 transition-all"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-500 dark:text-slate-500 mono-label">Generated code</label>
            <div className="flex items-center gap-2">
              <button
                onClick={onCopy}
                disabled={!code || loading}
                className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] rounded-md text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 border border-emerald-200 dark:border-emerald-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors mono-label"
              >
                {copied ? <Check size={11} /> : <Copy size={11} />} {copied ? "Copied" : "Copy"}
              </button>
              <button
                onClick={onDownload}
                disabled={!code || loading}
                className="px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] rounded-md text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-500/10 hover:bg-cyan-100 dark:hover:bg-cyan-500/20 border border-cyan-200 dark:border-cyan-500/20 disabled:opacity-40 transition-colors mono-label"
              >
                Download
              </button>
            </div>
          </div>
          <pre className="bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-lg p-3 text-[11px] leading-relaxed font-mono text-emerald-700 dark:text-emerald-300/80 overflow-x-auto max-h-[40vh] scrollbar-thin">
            {loading ? <span className="flex items-center gap-2 text-gray-400"><Loader2 size={12} className="animate-spin" /> Generating…</span> : code || "// No code"}
          </pre>
        </div>
      </div>
    </ModalShell>
  );
};

// ================================================================
// Feedback modal
// ================================================================
const CATEGORIES = [
  { id: "bug", label: "🐛 Bug" },
  { id: "idea", label: "💡 Idea" },
  { id: "question", label: "❓ Question" },
  { id: "other", label: "💬 Other" },
] as const;

export const FeedbackModal: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const [category, setCategory] = useState<"bug" | "idea" | "question" | "other">("idea");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<"idle" | "ok" | "error">("idle");
  const [errMsg, setErrMsg] = useState("");

  useEffect(() => {
    if (open) { setStatus("idle"); setErrMsg(""); }
  }, [open]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setSubmitting(true);
    setErrMsg("");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          message: message.trim(),
          email: email.trim() || undefined,
          page: window.location.pathname,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      setStatus("ok");
      setMessage(""); setEmail("");
      setTimeout(onClose, 1200);
    } catch (err: any) {
      setStatus("error");
      setErrMsg(err?.message || "Failed to send");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalShell open={open} onClose={onClose} title="Send feedback" icon={<MessageSquare size={12} />}>
      {status === "ok" ? (
        <div className="p-10 text-center">
          <div className="w-14 h-14 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto mb-3">
            <Check className="text-emerald-500" size={26} />
          </div>
          <p className="text-emerald-600 dark:text-emerald-400 font-bold text-sm">Thanks for the feedback!</p>
        </div>
      ) : (
        <form onSubmit={submit} className="p-5 space-y-4">
          <div>
            <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-gray-500 dark:text-slate-500 mono-label mb-2">Category</label>
            <div className="grid grid-cols-4 gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategory(c.id)}
                  className={`px-2 py-2.5 text-[11px] rounded-lg border transition-all ${
                    category === c.id
                      ? "bg-emerald-50 dark:bg-emerald-500/15 border-emerald-400 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-300"
                      : "bg-white dark:bg-slate-900/50 border-gray-200 dark:border-slate-800 text-gray-600 dark:text-slate-400 hover:border-gray-300 dark:hover:border-slate-700"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-gray-500 dark:text-slate-500 mono-label mb-2">Your feedback *</label>
            <textarea
              required
              rows={4}
              maxLength={5000}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tell us what's on your mind…"
              className="w-full bg-gray-50 dark:bg-slate-950/50 border border-gray-200 dark:border-slate-700/50 rounded-lg px-3 py-2.5 text-sm text-gray-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500/40 transition-all resize-none"
            />
            <div className="text-[10px] text-gray-400 dark:text-slate-600 text-right mt-1 mono-label">{message.length} / 5000</div>
          </div>

          <div>
            <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-gray-500 dark:text-slate-500 mono-label mb-2">Email (optional)</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full bg-gray-50 dark:bg-slate-950/50 border border-gray-200 dark:border-slate-700/50 rounded-lg px-3 py-2.5 text-sm text-gray-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500/40 transition-all"
            />
          </div>

          {status === "error" && (
            <p className="text-sm text-rose-500 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-lg px-3 py-2">{errMsg}</p>
          )}

          <button
            type="submit"
            disabled={submitting || !message.trim()}
            className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 disabled:bg-gray-300 dark:disabled:bg-slate-800 disabled:text-gray-500 text-white dark:text-black font-black uppercase tracking-[0.2em] text-xs rounded-lg transition-all flex items-center justify-center gap-2 mono-label"
          >
            {submitting ? <Loader2 size={14} className="animate-spin" /> : null}
            {submitting ? "Sending…" : "Send feedback"}
          </button>
        </form>
      )}
    </ModalShell>
  );
};

// ================================================================
// Analytics modal — calls /api/analytics/summary
// ================================================================
type Analytics = {
  windowDays: number;
  totalRuns: number;
  byStatus: Array<{ status: string; n: number }>;
  byBrowser: Array<{ browser: string; n: number; avg_duration: number }>;
  daily: Array<{ day: string; total: number; passed: number; failed: number }>;
  flakyTests: Array<{ test_id: string; runs: number; fails: number }>;
};

export const AnalyticsModal: React.FC<{ open: boolean; onClose: () => void; token: string }> = ({ open, onClose, token }) => {
  const [data, setData] = useState<Analytics | null>(null);
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let aborted = false;
    setLoading(true);
    setErr(null);
    fetch(`/api/analytics/summary?days=${days}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const json = await r.json();
        if (!aborted) setData(json);
      })
      .catch((e) => { if (!aborted) setErr(e?.message || "Failed to load"); })
      .finally(() => { if (!aborted) setLoading(false); });
    return () => { aborted = true; };
  }, [open, days, token]);

  const passed = data?.byStatus.find((s) => s.status === "passed")?.n || 0;
  const failed = data?.byStatus.find((s) => s.status === "failed")?.n || 0;
  const passRate = data && data.totalRuns > 0 ? Math.round((passed / data.totalRuns) * 100) : 0;
  const maxDaily = data?.daily.length ? Math.max(...data.daily.map((d) => d.total)) : 1;

  return (
    <ModalShell open={open} onClose={onClose} title="Test Analytics" icon={<Activity size={12} />} maxWidth="max-w-3xl">
      <div className="p-5 space-y-4">
        {/* Time-range picker */}
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-500 dark:text-slate-500 mono-label mr-1">Range</span>
          {[7, 14, 30, 90].map((n) => (
            <button
              key={n}
              onClick={() => setDays(n)}
              className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] rounded-md border transition-all mono-label ${
                days === n
                  ? "bg-emerald-50 dark:bg-emerald-500/15 border-emerald-400 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-300"
                  : "bg-white dark:bg-slate-900/50 border-gray-200 dark:border-slate-800 text-gray-500 dark:text-slate-400 hover:border-gray-300"
              }`}
            >
              {n}d
            </button>
          ))}
        </div>

        {loading && (
          <div className="py-12 text-center text-gray-400 dark:text-slate-600 flex items-center justify-center gap-2 mono-label text-xs">
            <Loader2 size={14} className="animate-spin" /> Loading…
          </div>
        )}

        {err && !loading && (
          <div className="p-4 rounded-lg bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 text-sm">
            {err}
          </div>
        )}

        {!loading && !err && data && (
          <>
            {/* KPI cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Kpi label="Total runs" value={data.totalRuns} tint="emerald" />
              <Kpi label="Passed" value={passed} tint="emerald" />
              <Kpi label="Failed" value={failed} tint="rose" />
              <Kpi label="Pass rate" value={`${passRate}%`} tint={passRate >= 80 ? "emerald" : passRate >= 50 ? "amber" : "rose"} />
            </div>

            {/* Daily trend bars */}
            <div>
              <div className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-500 dark:text-slate-500 mono-label mb-2">Daily activity</div>
              {data.daily.length === 0 ? (
                <div className="p-6 text-center text-xs text-gray-400 dark:text-slate-600 border border-dashed border-gray-200 dark:border-slate-800 rounded-lg mono-label">No runs in this window</div>
              ) : (
                <div className="bg-gray-50 dark:bg-slate-900/50 border border-gray-200 dark:border-slate-800 rounded-lg p-3">
                  <div className="flex items-end gap-1 h-32">
                    {data.daily.map((d) => {
                      const hP = maxDaily ? (d.passed / maxDaily) * 100 : 0;
                      const hF = maxDaily ? (d.failed / maxDaily) * 100 : 0;
                      return (
                        <div key={d.day} className="flex-1 flex flex-col items-center gap-0.5 group" title={`${d.day}: ${d.passed} passed, ${d.failed} failed`}>
                          <div className="w-full flex flex-col justify-end items-stretch h-full gap-px">
                            {d.failed > 0 && <div className="bg-rose-500/80 rounded-sm" style={{ height: `${hF}%` }} />}
                            {d.passed > 0 && <div className="bg-emerald-500/80 rounded-sm" style={{ height: `${hP}%` }} />}
                          </div>
                          <div className="text-[8px] text-gray-400 dark:text-slate-600 mono-label truncate">{d.day.slice(5)}</div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex items-center gap-3 text-[9px] text-gray-500 dark:text-slate-500 mt-2 mono-label uppercase tracking-wider">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-emerald-500/80" /> Passed</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-rose-500/80" /> Failed</span>
                  </div>
                </div>
              )}
            </div>

            {/* Browser breakdown */}
            <div>
              <div className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-500 dark:text-slate-500 mono-label mb-2">By browser</div>
              {data.byBrowser.length === 0 ? (
                <div className="p-4 text-center text-xs text-gray-400 dark:text-slate-600 border border-dashed border-gray-200 dark:border-slate-800 rounded-lg mono-label">No browser data</div>
              ) : (
                <div className="bg-gray-50 dark:bg-slate-900/50 border border-gray-200 dark:border-slate-800 rounded-lg divide-y divide-gray-200 dark:divide-slate-800">
                  {data.byBrowser.map((b) => (
                    <div key={b.browser} className="flex items-center justify-between px-3 py-2">
                      <span className="text-sm font-bold text-gray-800 dark:text-slate-200 capitalize">{b.browser || "unknown"}</span>
                      <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-slate-500">
                        <span className="mono-label">{b.n} runs</span>
                        <span className="mono-label">{Math.round(b.avg_duration)}ms avg</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Flaky tests */}
            <div>
              <div className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-500 dark:text-slate-500 mono-label mb-2">
                Flaky tests {data.flakyTests.length > 0 && <span className="text-amber-600 dark:text-amber-400">({data.flakyTests.length})</span>}
              </div>
              {data.flakyTests.length === 0 ? (
                <div className="p-4 text-center text-xs text-gray-400 dark:text-slate-600 border border-dashed border-gray-200 dark:border-slate-800 rounded-lg mono-label">No flaky tests — nice!</div>
              ) : (
                <div className="bg-gray-50 dark:bg-slate-900/50 border border-gray-200 dark:border-slate-800 rounded-lg divide-y divide-gray-200 dark:divide-slate-800">
                  {data.flakyTests.map((f) => (
                    <div key={f.test_id} className="flex items-center justify-between px-3 py-2">
                      <span className="text-sm font-mono text-gray-800 dark:text-slate-200 truncate">{f.test_id}</span>
                      <span className="text-[10px] font-black mono-label text-amber-600 dark:text-amber-400 uppercase tracking-widest">{f.fails}/{f.runs} failing</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </ModalShell>
  );
};

const Kpi: React.FC<{ label: string; value: string | number; tint: "emerald" | "rose" | "amber" }> = ({ label, value, tint }) => {
  const tints: Record<string, string> = {
    emerald: "text-emerald-600 dark:text-emerald-400",
    rose: "text-rose-600 dark:text-rose-400",
    amber: "text-amber-600 dark:text-amber-400",
  };
  return (
    <div className="bg-gray-50 dark:bg-slate-900/50 border border-gray-200 dark:border-slate-800 rounded-lg p-3">
      <div className="text-[8px] font-black uppercase tracking-[0.2em] text-gray-500 dark:text-slate-500 mono-label">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${tints[tint]}`}>{value}</div>
    </div>
  );
};

// ================================================================
// CI/CD modal — generate config for GitHub Actions / CircleCI / Jenkins / GitLab
// ================================================================
const PROVIDERS = [
  {
    id: "github",
    label: "GitHub Actions",
    filename: ".github/workflows/playwright.yml",
    icon: (
      <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
        <path fillRule="evenodd" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z"/>
      </svg>
    ),
    tint: "slate",
  },
  {
    id: "circleci",
    label: "CircleCI",
    filename: ".circleci/config.yml",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <circle cx="12" cy="12" r="3.3"/>
        <path d="M9.83 12.49A2.17 2.17 0 0 1 12 10.32c1.13 0 2.07.86 2.17 1.96h8.27C22.23 5.74 17.65 1.1 12 1.1c-5.63 0-10.21 4.52-10.43 10.1.05.67.22 1.3.47 1.89h7.35a2.17 2.17 0 0 1-.01-.6z"/>
      </svg>
    ),
    tint: "emerald",
  },
  {
    id: "jenkins",
    label: "Jenkins",
    filename: "Jenkinsfile",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 4.5c1.38 0 2.5 1.12 2.5 2.5S13.38 11.5 12 11.5 9.5 10.38 9.5 9 10.62 6.5 12 6.5zm5 11H7v-.5c0-1.66 3.34-2.5 5-2.5s5 .84 5 2.5v.5z"/>
      </svg>
    ),
    tint: "rose",
  },
  {
    id: "gitlab",
    label: "GitLab CI",
    filename: ".gitlab-ci.yml",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="m23.6 9.6-.03-.09L20.56 1.9a.79.79 0 0 0-.75-.5.77.77 0 0 0-.44.16.77.77 0 0 0-.28.4l-2.05 6.26H6.97L4.92 1.96A.78.78 0 0 0 4.2 1.4a.78.78 0 0 0-.73.5L.43 9.5l-.03.1a5.46 5.46 0 0 0 1.82 6.3l.01.01.03.02 4.5 3.37 2.23 1.69 1.36 1.03a.92.92 0 0 0 1.12 0l1.36-1.03 2.23-1.69 4.53-3.39.01-.01a5.47 5.47 0 0 0 2-6.3z"/>
      </svg>
    ),
    tint: "amber",
  },
] as const;

export const CICDModal: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const [provider, setProvider] = useState<string>("github");
  const [testCmd, setTestCmd] = useState("npx playwright test");
  const [nodeVer, setNodeVer] = useState("20");
  const [config, setConfig] = useState<{ filename: string; content: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ command: testCmd, node: nodeVer });
      const res = await fetch(`/api/cicd/${provider}?${params}`);
      const data = await res.json();
      if (res.ok) setConfig(data);
      else setConfig({ filename: "error", content: `// ${data?.error || "Failed"}` });
    } catch (err: any) {
      setConfig({ filename: "error", content: `// ${err?.message || "Failed"}` });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, provider]);

  const copy = () => {
    if (!config) return;
    navigator.clipboard.writeText(config.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const download = () => {
    if (!config) return;
    const blob = new Blob([config.content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const name = config.filename.split("/").pop() || "config.yml";
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const current = PROVIDERS.find((p) => p.id === provider);

  return (
    <ModalShell open={open} onClose={onClose} title="CI/CD Integrations" icon={<GitBranch size={12} />} maxWidth="max-w-3xl">
      <div className="p-5 space-y-4">
        <div>
          <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-gray-500 dark:text-slate-500 mono-label mb-2">Pipeline provider</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {PROVIDERS.map((p) => {
              const active = provider === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setProvider(p.id)}
                  className={`flex flex-col items-center justify-center gap-2 p-3 rounded-lg border transition-all ${
                    active
                      ? "bg-emerald-50 dark:bg-emerald-500/15 border-emerald-400 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-300"
                      : "bg-white dark:bg-slate-900/50 border-gray-200 dark:border-slate-800 text-gray-600 dark:text-slate-400 hover:border-gray-300 dark:hover:border-slate-700"
                  }`}
                >
                  <span className={active ? "text-emerald-600 dark:text-emerald-400" : "text-gray-500 dark:text-slate-500"}>{p.icon}</span>
                  <span className="text-[10px] font-black uppercase tracking-[0.12em] mono-label text-center">{p.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_100px] gap-3">
          <div>
            <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-gray-500 dark:text-slate-500 mono-label mb-2">Test command</label>
            <input
              type="text"
              value={testCmd}
              onChange={(e) => setTestCmd(e.target.value)}
              onBlur={load}
              placeholder="npx playwright test"
              className="w-full bg-gray-50 dark:bg-slate-950/50 border border-gray-200 dark:border-slate-700/50 rounded-lg px-3 py-2.5 text-sm text-gray-800 dark:text-slate-200 font-mono focus:outline-none focus:border-emerald-500/40 transition-all"
            />
          </div>
          <div>
            <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-gray-500 dark:text-slate-500 mono-label mb-2">Node</label>
            <select
              value={nodeVer}
              onChange={(e) => { setNodeVer(e.target.value); setTimeout(load, 0); }}
              className="w-full bg-gray-50 dark:bg-slate-950/50 border border-gray-200 dark:border-slate-700/50 rounded-lg px-3 py-2.5 text-sm text-gray-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500/40 transition-all"
            >
              <option value="18">18</option>
              <option value="20">20</option>
              <option value="22">22</option>
            </select>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-500 dark:text-slate-500 mono-label">File</div>
              <div className="text-sm font-mono text-gray-800 dark:text-slate-200 mt-0.5">{config?.filename || "—"}</div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={copy}
                disabled={!config || loading}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] rounded-md text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 border border-emerald-200 dark:border-emerald-500/20 disabled:opacity-40 transition-colors mono-label"
              >
                {copied ? <Check size={11} /> : <Copy size={11} />} {copied ? "Copied" : "Copy"}
              </button>
              <button
                onClick={download}
                disabled={!config || loading}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] rounded-md text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-500/10 hover:bg-cyan-100 dark:hover:bg-cyan-500/20 border border-cyan-200 dark:border-cyan-500/20 disabled:opacity-40 transition-colors mono-label"
              >
                <Download size={11} /> Download
              </button>
            </div>
          </div>
          <pre className="bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-lg p-3 text-[11px] leading-relaxed font-mono text-emerald-700 dark:text-emerald-300/80 overflow-x-auto max-h-[45vh] scrollbar-thin">
            {loading ? (
              <span className="flex items-center gap-2 text-gray-400"><Loader2 size={12} className="animate-spin" /> Generating…</span>
            ) : (
              config?.content || "// No config"
            )}
          </pre>
          <p className="text-[10px] text-gray-500 dark:text-slate-500 mt-2 mono-label uppercase tracking-wider">
            Drop this in <code className="bg-gray-100 dark:bg-slate-800 px-1 rounded font-mono normal-case tracking-normal">{config?.filename}</code> at the repo root and commit.
          </p>
        </div>
      </div>
    </ModalShell>
  );
};

// keep tint field used in PROVIDERS (silences unused-member TS warnings for future extension)
void PROVIDERS.map((p) => p.tint);

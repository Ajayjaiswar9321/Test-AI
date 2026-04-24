import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Activity, Loader2, Play, Square, TrendingUp, AlertTriangle, Zap, RefreshCw, CircleDot } from "lucide-react";

type Analytics = {
  windowDays: number;
  totalRuns: number;
  byStatus: Array<{ status: string; n: number }>;
  byBrowser: Array<{ browser: string; n: number; avg_duration: number }>;
  daily: Array<{ day: string; total: number; passed: number; failed: number }>;
  flakyTests: Array<{ test_id: string; runs: number; fails: number }>;
};

type LiveRun = {
  runId: string;
  url: string | null;
  startedAt: string | null;
  elapsedMs: number | null;
  currentAction: string | null;
  currentStepStatus: string | null;
  latestMessage: string | null;
  eventCount: number;
  stopRequested: boolean;
};

type RecentRun = {
  id: string;
  test_id: string | null;
  browser: string | null;
  status: string;
  duration_ms: number;
  summary: string | null;
  created_at: string;
  tags: string | null;
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function formatMs(ms: number | null): string {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60_000)}m ${Math.floor((ms % 60_000) / 1000)}s`;
}

export const AnalyticsDashboard: React.FC<{ token: string }> = ({ token }) => {
  const [data, setData] = useState<Analytics | null>(null);
  const [live, setLive] = useState<LiveRun[]>([]);
  const [recent, setRecent] = useState<RecentRun[]>([]);
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const mountedRef = useRef(true);

  // Force re-render every 1s so elapsed times update without extra fetches
  useEffect(() => {
    const i = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(i);
  }, []);

  // Slow poll: summary + recent runs (every 10s when autoRefresh)
  useEffect(() => {
    mountedRef.current = true;
    let timer: number | null = null;
    const slow = async () => {
      try {
        setErr(null);
        const [sumRes, histRes] = await Promise.all([
          fetch(`/api/analytics/summary?days=${days}`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`/api/run-history?limit=25`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        if (!sumRes.ok) throw new Error(`analytics HTTP ${sumRes.status}`);
        const sum = await sumRes.json();
        const hist = histRes.ok ? await histRes.json() : { runs: [] };
        if (!mountedRef.current) return;
        setData(sum);
        setRecent(hist.runs || []);
      } catch (e: any) {
        if (mountedRef.current) setErr(e?.message || "Failed to load");
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    };
    slow();
    if (autoRefresh) timer = window.setInterval(slow, 10_000);
    return () => {
      mountedRef.current = false;
      if (timer) window.clearInterval(timer);
    };
  }, [days, token, autoRefresh]);

  // Fast poll: live runs (every 2s when autoRefresh)
  useEffect(() => {
    mountedRef.current = true;
    let timer: number | null = null;
    const fast = async () => {
      try {
        const res = await fetch("/api/runs/live", { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) return;
        const { runs } = await res.json();
        if (mountedRef.current) setLive(runs || []);
      } catch {}
    };
    fast();
    if (autoRefresh) timer = window.setInterval(fast, 2000);
    return () => {
      if (timer) window.clearInterval(timer);
    };
  }, [token, autoRefresh]);

  const refresh = () => { setLoading(true); setTick((t) => t + 1); };

  const passed = data?.byStatus.find((s) => s.status === "passed")?.n || 0;
  const failed = data?.byStatus.find((s) => s.status === "failed")?.n || 0;
  const passRate = data && data.totalRuns > 0 ? Math.round((passed / data.totalRuns) * 100) : 0;
  const maxDaily = data?.daily.length ? Math.max(...data.daily.map((d) => d.total), 1) : 1;
  const avgDuration = data?.byBrowser.length
    ? Math.round(data.byBrowser.reduce((s, b) => s + (b.avg_duration || 0) * b.n, 0) / Math.max(data.byBrowser.reduce((s, b) => s + b.n, 0), 1))
    : 0;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-3 md:px-6 py-3 md:py-4 border-b border-gray-200 dark:border-emerald-500/10 flex flex-col md:flex-row md:flex-wrap md:items-center gap-3 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
            <Activity size={14} className="text-white" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm md:text-base font-black text-gray-900 dark:text-slate-100 leading-tight">Analytics Dashboard</h2>
            <p className="text-[9px] uppercase tracking-[0.25em] text-gray-500 dark:text-slate-500 mono-label truncate">Live · Real-time</p>
          </div>
        </div>

        <div className="md:ml-auto flex items-center gap-2 flex-wrap">
          {/* Live indicator */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20">
            <motion.span
              animate={{ opacity: autoRefresh ? [1, 0.3, 1] : 0.4 }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-1.5 h-1.5 rounded-full bg-emerald-500"
            />
            <span className="text-[9px] font-black uppercase tracking-[0.15em] text-emerald-700 dark:text-emerald-400 mono-label">{autoRefresh ? "Live" : "Paused"}</span>
          </div>

          <div className="flex items-center gap-1 bg-gray-100 dark:bg-slate-900/50 border border-gray-200 dark:border-slate-800 rounded-lg p-0.5">
            {[7, 14, 30, 90].map((n) => (
              <button
                key={n}
                onClick={() => setDays(n)}
                className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] rounded-md transition-all mono-label ${
                  days === n
                    ? "bg-white dark:bg-slate-950 text-emerald-600 dark:text-emerald-400 shadow-sm"
                    : "text-gray-500 dark:text-slate-500 hover:text-gray-800 dark:hover:text-slate-300"
                }`}
              >
                {n}d
              </button>
            ))}
          </div>

          <button
            onClick={() => setAutoRefresh((a) => !a)}
            className="px-2.5 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] rounded-lg border transition-all mono-label bg-white dark:bg-slate-900/50 border-gray-200 dark:border-slate-800 text-gray-600 dark:text-slate-400 hover:border-emerald-400 dark:hover:border-emerald-500/40"
          >
            {autoRefresh ? "Pause" : "Resume"}
          </button>

          <button
            onClick={refresh}
            title="Refresh now"
            className="p-1.5 rounded-lg border border-gray-200 dark:border-slate-800 text-gray-500 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 hover:border-emerald-400 dark:hover:border-emerald-500/40 transition-all"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {err && (
        <div className="mx-4 md:mx-6 mt-3 p-3 rounded-lg bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs">
          {err}
        </div>
      )}

      {/* Scroll region */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5">
        {/* Live Runs — always at top */}
        <section>
          <SectionHeader
            icon={<Play size={11} />}
            label="Currently running"
            badge={live.length}
            badgeColor={live.length > 0 ? "emerald" : "gray"}
          />
          {live.length === 0 ? (
            <div className="p-6 text-center text-xs text-gray-400 dark:text-slate-600 border border-dashed border-gray-200 dark:border-slate-800 rounded-xl mono-label">
              No active tests. Kick off a run from UI Automation or API Testing.
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <AnimatePresence>
                {live.map((r) => {
                  // ref tick to force elapsed-time re-render
                  void tick;
                  const elapsed = r.startedAt ? Date.now() - new Date(r.startedAt).getTime() : r.elapsedMs;
                  return (
                    <motion.div
                      key={r.runId}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="relative bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-500/10 dark:to-slate-900/60 border border-emerald-200 dark:border-emerald-500/30 rounded-xl p-4 overflow-hidden"
                    >
                      <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30">
                        <motion.span animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.2, repeat: Infinity }} className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span className="text-[9px] font-black uppercase tracking-[0.15em] text-emerald-700 dark:text-emerald-400 mono-label">
                          {r.stopRequested ? "Stopping" : "Running"}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mb-2">
                        <CircleDot size={12} className="text-emerald-600 dark:text-emerald-400" />
                        <span className="text-[10px] font-mono text-gray-500 dark:text-slate-500 truncate">#{r.runId.slice(0, 8)}</span>
                      </div>

                      {r.url && (
                        <div className="text-sm font-bold text-gray-900 dark:text-slate-100 truncate mb-1">{r.url}</div>
                      )}

                      {r.currentAction && (
                        <div className="text-xs text-gray-600 dark:text-slate-400 flex items-center gap-1.5 mt-1">
                          <span className="text-[9px] uppercase tracking-wider text-gray-400 mono-label">Step:</span>
                          <span className="truncate">{r.currentAction}</span>
                        </div>
                      )}

                      {r.latestMessage && (
                        <div className="mt-2 text-[11px] text-gray-500 dark:text-slate-500 truncate font-mono">{r.latestMessage}</div>
                      )}

                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-emerald-200/50 dark:border-emerald-500/10">
                        <span className="text-[10px] text-gray-500 dark:text-slate-500 mono-label">
                          {r.eventCount} events
                        </span>
                        <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 mono-label">
                          {formatMs(elapsed)}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </section>

        {/* KPIs */}
        <section>
          <SectionHeader icon={<TrendingUp size={11} />} label={`Overview — last ${days} days`} />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Kpi label="Total runs" value={data?.totalRuns ?? "—"} tint="cyan" loading={loading} />
            <Kpi label="Passed" value={passed} tint="emerald" loading={loading} />
            <Kpi label="Failed" value={failed} tint="rose" loading={loading} />
            <Kpi
              label="Pass rate"
              value={data ? `${passRate}%` : "—"}
              tint={passRate >= 80 ? "emerald" : passRate >= 50 ? "amber" : "rose"}
              loading={loading}
            />
          </div>
          {avgDuration > 0 && (
            <div className="mt-2 text-[10px] text-gray-500 dark:text-slate-500 mono-label uppercase tracking-wider">
              Avg duration across all runs: <span className="text-gray-800 dark:text-slate-300 font-bold">{formatMs(avgDuration)}</span>
            </div>
          )}
        </section>

        {/* Daily trend */}
        <section>
          <SectionHeader icon={<TrendingUp size={11} />} label="Daily activity" />
          {!data || data.daily.length === 0 ? (
            <div className="p-6 text-center text-xs text-gray-400 dark:text-slate-600 border border-dashed border-gray-200 dark:border-slate-800 rounded-xl mono-label">
              No runs in this window yet. Start a test to populate.
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900/50 border border-gray-200 dark:border-slate-800 rounded-xl p-4">
              <div className="flex items-end gap-1.5 h-36">
                {data.daily.map((d) => {
                  const hP = maxDaily ? (d.passed / maxDaily) * 100 : 0;
                  const hF = maxDaily ? (d.failed / maxDaily) * 100 : 0;
                  return (
                    <div
                      key={d.day}
                      className="flex-1 flex flex-col items-center gap-1 group"
                      title={`${d.day} — ${d.passed} passed, ${d.failed} failed`}
                    >
                      <div className="w-full flex flex-col justify-end items-stretch h-full gap-0.5">
                        {d.failed > 0 && (
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: `${hF}%` }}
                            transition={{ duration: 0.4 }}
                            className="bg-rose-500/80 rounded-sm group-hover:bg-rose-500"
                          />
                        )}
                        {d.passed > 0 && (
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: `${hP}%` }}
                            transition={{ duration: 0.4 }}
                            className="bg-emerald-500/80 rounded-sm group-hover:bg-emerald-500"
                          />
                        )}
                      </div>
                      <div className="text-[8px] text-gray-400 dark:text-slate-600 mono-label">{d.day.slice(5)}</div>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-200 dark:border-slate-800 text-[9px] uppercase tracking-widest mono-label text-gray-500 dark:text-slate-500">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-emerald-500" /> Passed</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-rose-500" /> Failed</span>
              </div>
            </div>
          )}
        </section>

        {/* Bottom split */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Browser breakdown */}
          <section>
            <SectionHeader icon={<Zap size={11} />} label="By browser" />
            {!data || data.byBrowser.length === 0 ? (
              <div className="p-6 text-center text-xs text-gray-400 dark:text-slate-600 border border-dashed border-gray-200 dark:border-slate-800 rounded-xl mono-label">
                No browser data yet.
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-900/50 border border-gray-200 dark:border-slate-800 rounded-xl divide-y divide-gray-200 dark:divide-slate-800">
                {data.byBrowser.map((b) => {
                  const maxN = Math.max(...data.byBrowser.map((x) => x.n), 1);
                  const pct = (b.n / maxN) * 100;
                  return (
                    <div key={b.browser} className="px-4 py-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-bold text-gray-900 dark:text-slate-200 capitalize">{b.browser || "unknown"}</span>
                        <span className="text-[10px] text-gray-500 dark:text-slate-500 mono-label">
                          {b.n} runs · {formatMs(Math.round(b.avg_duration))}
                        </span>
                      </div>
                      <div className="h-1.5 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.6 }}
                          className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Flaky tests */}
          <section>
            <SectionHeader
              icon={<AlertTriangle size={11} />}
              label="Flaky tests"
              badge={data?.flakyTests.length || 0}
              badgeColor={(data?.flakyTests.length || 0) > 0 ? "amber" : "gray"}
            />
            {!data || data.flakyTests.length === 0 ? (
              <div className="p-6 text-center text-xs text-gray-400 dark:text-slate-600 border border-dashed border-gray-200 dark:border-slate-800 rounded-xl mono-label">
                No flaky tests. Clean run!
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-900/50 border border-gray-200 dark:border-slate-800 rounded-xl divide-y divide-gray-200 dark:divide-slate-800">
                {data.flakyTests.map((f) => (
                  <div key={f.test_id} className="flex items-center justify-between px-4 py-3">
                    <span className="text-sm font-mono text-gray-800 dark:text-slate-200 truncate">{f.test_id}</span>
                    <span className="text-[10px] font-black mono-label text-amber-600 dark:text-amber-400 uppercase tracking-widest whitespace-nowrap">
                      {f.fails}/{f.runs} failing
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Recent runs table */}
        <section>
          <SectionHeader icon={<Square size={11} />} label="Recent runs" badge={recent.length} badgeColor="cyan" />
          {recent.length === 0 ? (
            <div className="p-6 text-center text-xs text-gray-400 dark:text-slate-600 border border-dashed border-gray-200 dark:border-slate-800 rounded-xl mono-label">
              No runs recorded yet.
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900/50 border border-gray-200 dark:border-slate-800 rounded-xl overflow-hidden">
              <div className="grid grid-cols-[1fr_auto_auto_auto] md:grid-cols-[1fr_120px_120px_120px_100px] gap-3 px-4 py-2 bg-gray-50 dark:bg-slate-900/80 border-b border-gray-200 dark:border-slate-800 text-[9px] uppercase tracking-[0.15em] font-black text-gray-500 dark:text-slate-500 mono-label">
                <div>Summary</div>
                <div className="hidden md:block">Test</div>
                <div>Browser</div>
                <div>Duration</div>
                <div>When</div>
              </div>
              <div className="max-h-80 overflow-y-auto scrollbar-thin">
                {recent.map((r) => (
                  <div
                    key={r.id}
                    className="grid grid-cols-[1fr_auto_auto_auto] md:grid-cols-[1fr_120px_120px_120px_100px] gap-3 px-4 py-2.5 border-b border-gray-100 dark:border-slate-800/50 last:border-0 text-xs hover:bg-gray-50 dark:hover:bg-slate-900/40 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          r.status === "passed" ? "bg-emerald-500" :
                          r.status === "failed" ? "bg-rose-500" :
                          r.status === "scheduled" ? "bg-cyan-500" : "bg-amber-500"
                        }`} />
                        <span className={`text-[9px] font-black uppercase tracking-[0.12em] mono-label ${
                          r.status === "passed" ? "text-emerald-600 dark:text-emerald-400" :
                          r.status === "failed" ? "text-rose-600 dark:text-rose-400" :
                          r.status === "scheduled" ? "text-cyan-600 dark:text-cyan-400" : "text-amber-600 dark:text-amber-400"
                        }`}>{r.status}</span>
                      </div>
                      <div className="text-gray-800 dark:text-slate-300 truncate mt-0.5">{r.summary || "—"}</div>
                    </div>
                    <div className="hidden md:block text-gray-500 dark:text-slate-500 font-mono truncate">{r.test_id || "—"}</div>
                    <div className="text-gray-500 dark:text-slate-500 capitalize">{r.browser || "—"}</div>
                    <div className="text-gray-500 dark:text-slate-500 mono-label">{formatMs(r.duration_ms)}</div>
                    <div className="text-gray-400 dark:text-slate-600 mono-label">{timeAgo(r.created_at)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        <div className="h-4" />
      </div>
    </div>
  );
};

const SectionHeader: React.FC<{
  icon: React.ReactNode;
  label: string;
  badge?: number;
  badgeColor?: "emerald" | "amber" | "rose" | "cyan" | "gray";
}> = ({ icon, label, badge, badgeColor = "emerald" }) => {
  const tints: Record<string, string> = {
    emerald: "text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-500/15",
    amber: "text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-500/15",
    rose: "text-rose-700 dark:text-rose-400 bg-rose-100 dark:bg-rose-500/15",
    cyan: "text-cyan-700 dark:text-cyan-400 bg-cyan-100 dark:bg-cyan-500/15",
    gray: "text-gray-500 dark:text-slate-500 bg-gray-100 dark:bg-slate-800",
  };
  return (
    <div className="flex items-center gap-2 mb-2.5">
      <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">{icon}</span>
      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-700 dark:text-slate-300 mono-label">{label}</span>
      {badge !== undefined && (
        <span className={`text-[9px] font-black uppercase tracking-[0.12em] px-1.5 py-0.5 rounded mono-label ${tints[badgeColor]}`}>{badge}</span>
      )}
    </div>
  );
};

const Kpi: React.FC<{ label: string; value: string | number; tint: "emerald" | "rose" | "amber" | "cyan"; loading: boolean }> = ({
  label,
  value,
  tint,
  loading,
}) => {
  const tints: Record<string, string> = {
    emerald: "text-emerald-600 dark:text-emerald-400 from-emerald-500/5",
    rose: "text-rose-600 dark:text-rose-400 from-rose-500/5",
    amber: "text-amber-600 dark:text-amber-400 from-amber-500/5",
    cyan: "text-cyan-600 dark:text-cyan-400 from-cyan-500/5",
  };
  return (
    <div className={`bg-gradient-to-br ${tints[tint].split(" ")[2]} to-transparent border border-gray-200 dark:border-slate-800 rounded-xl p-3.5`}>
      <div className="text-[9px] font-black uppercase tracking-[0.22em] text-gray-500 dark:text-slate-500 mono-label">{label}</div>
      <div className={`text-2xl md:text-3xl font-bold mt-1.5 ${tints[tint].split(" ")[0]} ${tints[tint].split(" ")[1]} tabular-nums`}>
        {loading && value === "—" ? <Loader2 size={20} className="animate-spin inline" /> : value}
      </div>
    </div>
  );
};

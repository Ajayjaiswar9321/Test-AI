"use client";

import { useState, useEffect } from "react";
import {
  BarChart3,
  GitCompare,
  Gauge,
  Download,
  FileCode,
  FileJson,
  Loader2,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Clock,
} from "lucide-react";

type Tab = "compare" | "perf" | "export";

interface Run {
  id: string;
  status: string;
  duration: number | null;
  createdAt: string;
  test: { id: string; name: string };
}

export default function ReportsPage() {
  const [tab, setTab] = useState<Tab>("compare");

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-emerald-400" />
          Enhanced Reporting
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Compare runs, track performance over time, and export industry-standard reports.
        </p>
      </div>

      <div className="border-b border-gray-800 mb-6">
        <nav className="flex gap-4">
          {[
            { id: "compare" as Tab, label: "Comparative Analysis", icon: GitCompare },
            { id: "perf" as Tab, label: "Performance Metrics", icon: Gauge },
            { id: "export" as Tab, label: "Export", icon: Download },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm border-b-2 transition-colors ${
                tab === t.id
                  ? "border-emerald-500 text-emerald-400"
                  : "border-transparent text-gray-400 hover:text-gray-200"
              }`}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {tab === "compare" && <Comparison />}
      {tab === "perf" && <Performance />}
      {tab === "export" && <Exports />}
    </div>
  );
}

function Comparison() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [a, setA] = useState<string>("");
  const [b, setB] = useState<string>("");
  const [diff, setDiff] = useState<any>(null);

  useEffect(() => {
    fetch("/api/runs")
      .then((r) => r.json())
      .then((d) => {
        const list = d.runs || [];
        setRuns(list);
        if (list[0]) setA(list[0].id);
        if (list[1]) setB(list[1].id);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!a || !b) return;
    const runA = runs.find((r) => r.id === a);
    const runB = runs.find((r) => r.id === b);
    if (!runA || !runB) return;

    setDiff({
      a: runA,
      b: runB,
      durationDelta: (runA.duration || 0) - (runB.duration || 0),
      statusChanged: runA.status !== runB.status,
    });
  }, [a, b, runs]);

  return (
    <div className="space-y-4">
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-100 mb-1">
          Compare two runs
        </h2>
        <p className="text-sm text-gray-400 mb-4">
          Spot regressions by comparing status, duration, and outcomes across runs.
        </p>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Run A (baseline)</label>
            <select
              value={a}
              onChange={(e) => setA(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-100"
            >
              {runs.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.test.name} — {new Date(r.createdAt).toLocaleString()}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Run B (comparison)</label>
            <select
              value={b}
              onChange={(e) => setB(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-100"
            >
              {runs.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.test.name} — {new Date(r.createdAt).toLocaleString()}
                </option>
              ))}
            </select>
          </div>
        </div>

        {diff && (
          <div className="grid grid-cols-3 gap-4">
            <MetricCard
              label="Status"
              a={diff.a.status}
              b={diff.b.status}
              changed={diff.statusChanged}
            />
            <MetricCard
              label="Duration"
              a={`${((diff.a.duration || 0) / 1000).toFixed(2)}s`}
              b={`${((diff.b.duration || 0) / 1000).toFixed(2)}s`}
              changed={Math.abs(diff.durationDelta) > 100}
              delta={`${diff.durationDelta > 0 ? "+" : ""}${(diff.durationDelta / 1000).toFixed(2)}s`}
              deltaNegative={diff.durationDelta > 0}
            />
            <MetricCard
              label="Test"
              a={diff.a.test.name}
              b={diff.b.test.name}
              changed={diff.a.test.id !== diff.b.test.id}
            />
          </div>
        )}

        {runs.length === 0 && (
          <div className="text-sm text-gray-500 py-6 text-center">
            No runs yet. Trigger a few to start comparing.
          </div>
        )}
      </div>
    </div>
  );
}

function MetricCard({
  label,
  a,
  b,
  changed,
  delta,
  deltaNegative,
}: {
  label: string;
  a: string;
  b: string;
  changed: boolean;
  delta?: string;
  deltaNegative?: boolean;
}) {
  return (
    <div
      className={`rounded-lg p-4 border ${
        changed ? "border-orange-500/40 bg-orange-950/20" : "border-gray-800 bg-gray-800/40"
      }`}
    >
      <div className="text-xs text-gray-400 mb-2">{label}</div>
      <div className="flex items-center gap-2 text-sm">
        <span className="text-gray-300 truncate">{a}</span>
        <ArrowRight className="h-3 w-3 text-gray-500" />
        <span className="text-gray-100 font-medium truncate">{b}</span>
      </div>
      {delta && (
        <div
          className={`text-xs mt-2 flex items-center gap-1 ${
            deltaNegative ? "text-red-400" : "text-green-400"
          }`}
        >
          {deltaNegative ? (
            <TrendingUp className="h-3 w-3" />
          ) : (
            <TrendingDown className="h-3 w-3" />
          )}
          {delta}
        </div>
      )}
    </div>
  );
}

function Performance() {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/reports/performance")
      .then((r) => r.json())
      .then((d) => {
        setMetrics(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-12 text-center">
        <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-gray-400" />
        <span className="text-sm text-gray-400">Loading metrics...</span>
      </div>
    );
  }

  if (!metrics || metrics.timeline?.length === 0) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-12 text-center text-sm text-gray-400">
        No performance data yet. Run some tests to populate metrics.
      </div>
    );
  }

  const maxDuration = Math.max(...metrics.timeline.map((p: any) => p.avgDuration));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          icon={Clock}
          label="Avg Duration"
          value={`${(metrics.avgDuration / 1000).toFixed(2)}s`}
          color="text-blue-400"
        />
        <StatCard
          icon={Gauge}
          label="p95 Duration"
          value={`${(metrics.p95Duration / 1000).toFixed(2)}s`}
          color="text-purple-400"
        />
        <StatCard
          icon={TrendingUp}
          label="Pass Rate"
          value={`${metrics.passRate.toFixed(1)}%`}
          color="text-green-400"
        />
        <StatCard
          icon={BarChart3}
          label="Total Runs"
          value={`${metrics.totalRuns}`}
          color="text-gray-300"
        />
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        <h3 className="font-semibold text-gray-100 mb-4">
          Duration over time (last 30 days)
        </h3>
        <div className="h-48 flex items-end gap-1">
          {metrics.timeline.map((p: any, i: number) => {
            const h = maxDuration > 0 ? (p.avgDuration / maxDuration) * 100 : 0;
            return (
              <div
                key={i}
                className="flex-1 bg-blue-500/40 hover:bg-blue-500/70 transition-colors rounded-t relative group"
                style={{ height: `${Math.max(h, 4)}%` }}
                title={`${p.date}: ${(p.avgDuration / 1000).toFixed(2)}s (${p.count} runs)`}
              >
                <div className="opacity-0 group-hover:opacity-100 absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-950 border border-gray-700 rounded px-2 py-1 text-xs text-gray-200 whitespace-nowrap pointer-events-none">
                  {p.date}: {(p.avgDuration / 1000).toFixed(2)}s
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-2">
          <span>{metrics.timeline[0]?.date}</span>
          <span>{metrics.timeline[metrics.timeline.length - 1]?.date}</span>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: any;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
      <div className="flex items-center gap-2 text-gray-400 text-xs mb-2">
        <Icon className={`h-3.5 w-3.5 ${color}`} />
        {label}
      </div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
    </div>
  );
}

function Exports() {
  const [downloading, setDownloading] = useState<string | null>(null);

  async function download(format: "junit" | "json" | "csv") {
    setDownloading(format);
    try {
      const res = await fetch(`/api/reports/export?format=${format}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const ext = format === "junit" ? "xml" : format;
      a.download = `test-report.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-100 mb-1">
          Export test results
        </h2>
        <p className="text-sm text-gray-400 mb-4">
          Download results in industry-standard formats for Jenkins, CircleCI, Allure, and more.
        </p>

        <div className="grid grid-cols-3 gap-4">
          <ExportCard
            icon={FileCode}
            title="JUnit XML"
            description="Standard for Jenkins, GitLab CI, GitHub Actions. Opens in most test dashboards."
            format="junit"
            onDownload={download}
            loading={downloading === "junit"}
          />
          <ExportCard
            icon={FileJson}
            title="JSON"
            description="Full run payload with steps, timings, and metadata for custom pipelines."
            format="json"
            onDownload={download}
            loading={downloading === "json"}
          />
          <ExportCard
            icon={Download}
            title="CSV"
            description="Spreadsheet-friendly format for analysis in Excel, Sheets, or BI tools."
            format="csv"
            onDownload={download}
            loading={downloading === "csv"}
          />
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        <h3 className="font-semibold text-gray-100 mb-3">Sample JUnit XML output</h3>
        <pre className="bg-gray-950 rounded p-4 text-xs text-gray-300 overflow-x-auto font-mono">
{`<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="TestPlatform" tests="42" failures="3" time="128.4">
  <testsuite name="Checkout Flow" tests="12" failures="1" time="45.2">
    <testcase name="User can add item to cart" time="3.2" classname="checkout"/>
    <testcase name="Cart persists across refresh" time="2.8" classname="checkout">
      <failure message="Expected item count 1, got 0">
        TimeoutError at cart.spec.ts:42
      </failure>
    </testcase>
  </testsuite>
</testsuites>`}
        </pre>
      </div>
    </div>
  );
}

function ExportCard({
  icon: Icon,
  title,
  description,
  format,
  onDownload,
  loading,
}: {
  icon: any;
  title: string;
  description: string;
  format: "junit" | "json" | "csv";
  onDownload: (f: "junit" | "json" | "csv") => void;
  loading: boolean;
}) {
  return (
    <div className="bg-gray-800/50 rounded-lg p-5 border border-gray-800 hover:border-gray-700 transition-colors">
      <Icon className="h-6 w-6 text-emerald-400 mb-3" />
      <div className="font-medium text-gray-100 mb-1">{title}</div>
      <div className="text-xs text-gray-400 mb-4">{description}</div>
      <button
        disabled={loading}
        onClick={() => onDownload(format)}
        className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded text-sm font-medium text-white"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Download className="h-4 w-4" />
        )}
        Download
      </button>
    </div>
  );
}

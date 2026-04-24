"use client";

import { useState, useEffect } from "react";
import {
  Zap,
  Shield,
  GitBranch,
  Play,
  Copy,
  Check,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";

type Tab = "parallel" | "priority" | "cicd";

interface Test {
  id: string;
  name: string;
  status: string;
}

interface RiskScore {
  id: string;
  name: string;
  failureRate: number;
  avgDuration: number;
  lastRunStatus: string | null;
  riskScore: number;
  priority: "critical" | "high" | "medium" | "low";
}

export default function WorkflowPage() {
  const [tab, setTab] = useState<Tab>("parallel");

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
          <Zap className="h-6 w-6 text-yellow-400" />
          Workflow Optimization
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Run tests in parallel, prioritize by risk, and integrate with CI/CD.
        </p>
      </div>

      <div className="border-b border-gray-800 mb-6">
        <nav className="flex gap-4">
          {[
            { id: "parallel" as Tab, label: "Parallel Execution", icon: Zap },
            { id: "priority" as Tab, label: "Risk Prioritization", icon: Shield },
            { id: "cicd" as Tab, label: "CI/CD Integration", icon: GitBranch },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm border-b-2 transition-colors ${
                tab === t.id
                  ? "border-blue-500 text-blue-400"
                  : "border-transparent text-gray-400 hover:text-gray-200"
              }`}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {tab === "parallel" && <ParallelExecution />}
      {tab === "priority" && <RiskPrioritization />}
      {tab === "cicd" && <CicdHooks />}
    </div>
  );
}

function ParallelExecution() {
  const [tests, setTests] = useState<Test[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [concurrency, setConcurrency] = useState(4);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<
    { id: string; name: string; status: string; duration?: number }[]
  >([]);

  useEffect(() => {
    fetch("/api/tests")
      .then((r) => r.json())
      .then((d) => setTests(Array.isArray(d) ? d : d.tests || []))
      .catch(() => {});
  }, []);

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  async function runParallel() {
    setRunning(true);
    setResults([]);
    const ids = Array.from(selected);
    const startTime = Date.now();

    const results: { id: string; name: string; status: string; duration?: number }[] = [];
    const queue = [...ids];
    const active: Promise<void>[] = [];

    const runOne = async (id: string) => {
      const test = tests.find((t) => t.id === id);
      const name = test?.name || id;
      const t0 = Date.now();
      try {
        const res = await fetch(`/api/tests/${id}/run`, { method: "POST" });
        if (res.ok) {
          results.push({ id, name, status: "RUNNING", duration: Date.now() - t0 });
        } else {
          results.push({ id, name, status: "FAILED", duration: Date.now() - t0 });
        }
      } catch {
        results.push({ id, name, status: "FAILED", duration: Date.now() - t0 });
      }
      setResults([...results]);
    };

    while (queue.length > 0 || active.length > 0) {
      while (active.length < concurrency && queue.length > 0) {
        const id = queue.shift()!;
        const p = runOne(id).finally(() => {
          active.splice(active.indexOf(p), 1);
        });
        active.push(p);
      }
      if (active.length > 0) {
        await Promise.race(active);
      }
    }

    setRunning(false);
  }

  return (
    <div className="space-y-6">
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-100">
              Select tests to run in parallel
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              {selected.size} of {tests.length} selected
            </p>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-400">Concurrency</label>
            <input
              type="number"
              min={1}
              max={16}
              value={concurrency}
              onChange={(e) => setConcurrency(parseInt(e.target.value) || 1)}
              className="w-16 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-gray-100"
            />
            <button
              disabled={selected.size === 0 || running}
              onClick={runParallel}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded text-sm font-medium text-white"
            >
              {running ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              Run Parallel
            </button>
          </div>
        </div>

        <div className="max-h-96 overflow-y-auto divide-y divide-gray-800">
          {tests.length === 0 && (
            <div className="text-sm text-gray-500 py-6 text-center">
              No tests found. Create tests first.
            </div>
          )}
          {tests.map((t) => (
            <label
              key={t.id}
              className="flex items-center gap-3 py-2 cursor-pointer hover:bg-gray-800/40 px-2 rounded"
            >
              <input
                type="checkbox"
                checked={selected.has(t.id)}
                onChange={() => toggle(t.id)}
                className="rounded"
              />
              <span className="text-sm text-gray-200 flex-1">{t.name}</span>
              <span className="text-xs text-gray-500">{t.status}</span>
            </label>
          ))}
        </div>
      </div>

      {results.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <h3 className="font-semibold text-gray-100 mb-3">Execution Results</h3>
          <div className="space-y-2">
            {results.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between bg-gray-800/50 rounded px-3 py-2"
              >
                <span className="text-sm text-gray-200">{r.name}</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-500">
                    {r.duration}ms
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${
                      r.status === "FAILED"
                        ? "bg-red-500/20 text-red-400"
                        : "bg-green-500/20 text-green-400"
                    }`}
                  >
                    {r.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RiskPrioritization() {
  const [scores, setScores] = useState<RiskScore[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/workflow/risk-scores")
      .then((r) => r.json())
      .then((d) => {
        setScores(d.scores || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const priorityColors = {
    critical: "bg-red-500/20 text-red-400 border-red-500/40",
    high: "bg-orange-500/20 text-orange-400 border-orange-500/40",
    medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/40",
    low: "bg-green-500/20 text-green-400 border-green-500/40",
  };

  return (
    <div className="space-y-4">
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-100 mb-1">
          Risk-Based Test Prioritization
        </h2>
        <p className="text-sm text-gray-400 mb-4">
          Tests ranked by historical failure rate, duration, and recency. Run critical tests first.
        </p>

        {loading ? (
          <div className="text-sm text-gray-500 py-6 text-center">
            <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
            Computing risk scores...
          </div>
        ) : scores.length === 0 ? (
          <div className="text-sm text-gray-500 py-6 text-center">
            No run data available yet. Run some tests to generate risk scores.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 border-b border-gray-800">
                  <th className="py-2 pr-4">#</th>
                  <th className="py-2 pr-4">Test</th>
                  <th className="py-2 pr-4">Failure Rate</th>
                  <th className="py-2 pr-4">Avg Duration</th>
                  <th className="py-2 pr-4">Last Status</th>
                  <th className="py-2 pr-4">Risk Score</th>
                  <th className="py-2">Priority</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {scores.map((s, i) => (
                  <tr key={s.id}>
                    <td className="py-3 pr-4 text-gray-500">{i + 1}</td>
                    <td className="py-3 pr-4 text-gray-200">{s.name}</td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        {s.failureRate > 30 ? (
                          <TrendingUp className="h-3 w-3 text-red-400" />
                        ) : (
                          <TrendingDown className="h-3 w-3 text-green-400" />
                        )}
                        <span className="text-gray-300">
                          {s.failureRate.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-gray-300">
                      {s.avgDuration ? `${(s.avgDuration / 1000).toFixed(1)}s` : "—"}
                    </td>
                    <td className="py-3 pr-4 text-gray-300">
                      {s.lastRunStatus || "—"}
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-gray-800 rounded-full h-1.5">
                          <div
                            className="bg-gradient-to-r from-green-500 to-red-500 h-1.5 rounded-full"
                            style={{ width: `${Math.min(s.riskScore, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-400">
                          {s.riskScore.toFixed(0)}
                        </span>
                      </div>
                    </td>
                    <td className="py-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded border ${
                          priorityColors[s.priority]
                        }`}
                      >
                        {s.priority.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function CicdHooks() {
  const [copied, setCopied] = useState<string | null>(null);
  const [hooks, setHooks] = useState<
    { id: string; name: string; url: string; events: string[] }[]
  >([
    {
      id: "1",
      name: "GitHub Actions",
      url: "https://api.testplatform.dev/webhooks/gh/abc123",
      events: ["push", "pull_request"],
    },
  ]);
  const [newName, setNewName] = useState("");

  function copy(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
  }

  function addHook() {
    if (!newName) return;
    const id = Math.random().toString(36).slice(2);
    setHooks([
      ...hooks,
      {
        id,
        name: newName,
        url: `https://api.testplatform.dev/webhooks/${newName
          .toLowerCase()
          .replace(/\s+/g, "-")}/${id}`,
        events: ["push"],
      },
    ]);
    setNewName("");
  }

  return (
    <div className="space-y-6">
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-100 mb-1">
          CI/CD Webhook Endpoints
        </h2>
        <p className="text-sm text-gray-400 mb-4">
          Trigger test runs from GitHub Actions, GitLab CI, Jenkins, or any HTTP client.
        </p>

        <div className="flex items-center gap-2 mb-4">
          <input
            type="text"
            placeholder="Hook name (e.g. GitLab CI)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-100"
          />
          <button
            onClick={addHook}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-500 rounded text-sm text-white"
          >
            <Plus className="h-4 w-4" />
            Add Hook
          </button>
        </div>

        <div className="space-y-3">
          {hooks.map((h) => (
            <div key={h.id} className="bg-gray-800/50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-200">{h.name}</span>
                <button
                  onClick={() => setHooks(hooks.filter((x) => x.id !== h.id))}
                  className="text-gray-500 hover:text-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="flex items-center gap-2 bg-gray-950 rounded px-3 py-2 font-mono text-xs text-gray-400">
                <span className="flex-1 truncate">{h.url}</span>
                <button
                  onClick={() => copy(h.url, h.id)}
                  className="text-gray-400 hover:text-gray-200"
                >
                  {copied === h.id ? (
                    <Check className="h-3.5 w-3.5 text-green-400" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
              <div className="flex gap-2 mt-2">
                {h.events.map((e) => (
                  <span
                    key={e}
                    className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-400"
                  >
                    {e}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        <h3 className="font-semibold text-gray-100 mb-3">
          Example: GitHub Actions workflow
        </h3>
        <div className="relative">
          <pre className="bg-gray-950 rounded p-4 text-xs text-gray-300 overflow-x-auto font-mono">
{`name: Run E2E Tests
on: [push, pull_request]
jobs:
  trigger-tests:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger TestPlatform
        run: |
          curl -X POST \\
            -H "Authorization: Bearer \${{ secrets.TP_TOKEN }}" \\
            -H "Content-Type: application/json" \\
            -d '{"ref":"\${{ github.sha }}", "branch":"\${{ github.ref_name }}"}' \\
            https://api.testplatform.dev/webhooks/gh/abc123`}
          </pre>
          <button
            onClick={() => copy("curl -X POST ... endpoint", "yaml")}
            className="absolute top-2 right-2 p-1.5 bg-gray-800 hover:bg-gray-700 rounded"
          >
            {copied === "yaml" ? (
              <Check className="h-3.5 w-3.5 text-green-400" />
            ) : (
              <Copy className="h-3.5 w-3.5 text-gray-400" />
            )}
          </button>
        </div>
      </div>

      <div className="bg-blue-950/30 border border-blue-500/30 rounded-lg p-4 flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
        <div className="text-sm text-gray-300">
          <strong className="text-blue-400">Exit codes:</strong> Webhook responses
          include <code className="bg-gray-800 px-1 rounded">passed</code>,{" "}
          <code className="bg-gray-800 px-1 rounded">failed</code>, and run URLs
          — wire them into your CI gate to block merges on failure.
        </div>
      </div>
    </div>
  );
}

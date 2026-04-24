"use client";

import { useState, useEffect } from "react";
import {
  Sparkles,
  Wand2,
  Heart,
  AlertCircle,
  Loader2,
  Copy,
  Check,
  Activity,
  ShieldCheck,
} from "lucide-react";

type Tab = "generate" | "heal" | "anomaly";

export default function AiLabPage() {
  const [tab, setTab] = useState<Tab>("generate");

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-purple-400" />
          AI Lab
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Generate tests from plain English, auto-heal broken selectors, and surface run anomalies.
        </p>
      </div>

      <div className="border-b border-gray-800 mb-6">
        <nav className="flex gap-4">
          {[
            { id: "generate" as Tab, label: "Test Generation", icon: Wand2 },
            { id: "heal" as Tab, label: "Self-Healing", icon: Heart },
            { id: "anomaly" as Tab, label: "Anomaly Detection", icon: AlertCircle },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm border-b-2 transition-colors ${
                tab === t.id
                  ? "border-purple-500 text-purple-400"
                  : "border-transparent text-gray-400 hover:text-gray-200"
              }`}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {tab === "generate" && <TestGeneration />}
      {tab === "heal" && <SelfHealing />}
      {tab === "anomaly" && <AnomalyDetection />}
    </div>
  );
}

function TestGeneration() {
  const [requirement, setRequirement] = useState(
    "When a user signs up with valid email and password, they should be redirected to the dashboard and see a welcome banner."
  );
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<{
    name: string;
    code: string;
    steps: string[];
  } | null>(null);
  const [copied, setCopied] = useState(false);

  async function generate() {
    setGenerating(true);
    setResult(null);
    try {
      const res = await fetch("/api/ai-lab/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requirement }),
      });
      const data = await res.json();
      setResult(data);
    } finally {
      setGenerating(false);
    }
  }

  function copy() {
    if (!result) return;
    navigator.clipboard.writeText(result.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="space-y-4">
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-100 mb-1">
          Generate test from requirement
        </h2>
        <p className="text-sm text-gray-400 mb-4">
          Describe what the user should be able to do — the AI scaffolds a Playwright test.
        </p>

        <textarea
          value={requirement}
          onChange={(e) => setRequirement(e.target.value)}
          rows={4}
          className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-100 mb-3"
          placeholder="e.g. When a user clicks the checkout button with items in cart, they should see the payment form..."
        />

        <button
          disabled={!requirement || generating}
          onClick={generate}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 rounded text-sm font-medium text-white"
        >
          {generating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Wand2 className="h-4 w-4" />
          )}
          Generate Test
        </button>
      </div>

      {result && (
        <>
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
            <div className="text-xs text-gray-400 mb-1">Suggested name</div>
            <div className="text-lg font-semibold text-gray-100 mb-4">{result.name}</div>

            <div className="text-xs text-gray-400 mb-2">Steps extracted</div>
            <ol className="space-y-1.5 mb-4">
              {result.steps.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-200">
                  <span className="text-purple-400 font-mono text-xs mt-0.5">{i + 1}.</span>
                  <span>{s}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-100">Generated Playwright code</h3>
              <button
                onClick={copy}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-800 hover:bg-gray-700 rounded text-xs text-gray-300"
              >
                {copied ? (
                  <>
                    <Check className="h-3 w-3 text-green-400" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" /> Copy
                  </>
                )}
              </button>
            </div>
            <pre className="bg-gray-950 rounded p-4 text-xs text-gray-300 overflow-x-auto font-mono">
              {result.code}
            </pre>
          </div>
        </>
      )}
    </div>
  );
}

function SelfHealing() {
  const [brokenSelector, setBrokenSelector] = useState("#submit-btn");
  const [dom, setDom] = useState(
    `<form class="checkout-form">
  <input name="email" type="email" />
  <input name="password" type="password" />
  <button class="btn-primary" data-testid="submit-checkout" type="submit">Continue</button>
</form>`
  );
  const [healed, setHealed] = useState<
    { selector: string; confidence: number; reason: string }[] | null
  >(null);
  const [healing, setHealing] = useState(false);

  async function heal() {
    setHealing(true);
    setHealed(null);
    try {
      const res = await fetch("/api/ai-lab/heal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brokenSelector, dom }),
      });
      const data = await res.json();
      setHealed(data.candidates || []);
    } finally {
      setHealing(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-100 mb-1">
          Self-healing selectors
        </h2>
        <p className="text-sm text-gray-400 mb-4">
          When a selector breaks after a UI change, propose healed candidates based on element semantics.
        </p>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Broken selector</label>
            <input
              value={brokenSelector}
              onChange={(e) => setBrokenSelector(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm font-mono text-gray-100"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={heal}
              disabled={healing}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 rounded text-sm font-medium text-white"
            >
              {healing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Heart className="h-4 w-4" />
              )}
              Heal Selector
            </button>
          </div>
        </div>

        <label className="text-xs text-gray-400 mb-1 block">Current DOM snapshot</label>
        <textarea
          value={dom}
          onChange={(e) => setDom(e.target.value)}
          rows={8}
          className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm font-mono text-gray-100"
        />
      </div>

      {healed && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <h3 className="font-semibold text-gray-100 mb-3 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-green-400" />
            Healed candidates
          </h3>
          <div className="space-y-2">
            {healed.map((c, i) => (
              <div
                key={i}
                className="flex items-center gap-4 bg-gray-800/50 rounded-lg p-3"
              >
                <code className="bg-gray-950 px-2 py-1 rounded text-xs text-purple-300 font-mono flex-1">
                  {c.selector}
                </code>
                <div className="flex items-center gap-2">
                  <div className="w-20 bg-gray-900 rounded-full h-1.5">
                    <div
                      className="bg-green-500 h-1.5 rounded-full"
                      style={{ width: `${c.confidence}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-400 w-10">{c.confidence}%</span>
                </div>
                <span className="text-xs text-gray-500 w-48 text-right">{c.reason}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface Anomaly {
  runId: string;
  testName: string;
  type: string;
  severity: "high" | "medium" | "low";
  message: string;
  detectedAt: string;
}

function AnomalyDetection() {
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/ai-lab/anomalies")
      .then((r) => r.json())
      .then((d) => {
        setAnomalies(d.anomalies || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const severityColors = {
    high: "text-red-400 bg-red-500/10 border-red-500/30",
    medium: "text-orange-400 bg-orange-500/10 border-orange-500/30",
    low: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30",
  };

  return (
    <div className="space-y-4">
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-100 mb-1 flex items-center gap-2">
          <Activity className="h-5 w-5 text-purple-400" />
          Detected anomalies
        </h2>
        <p className="text-sm text-gray-400 mb-4">
          Surfaces duration spikes, flakiness, and error pattern clusters across recent runs.
        </p>

        {loading ? (
          <div className="text-sm text-gray-500 py-6 text-center">
            <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
            Analyzing runs...
          </div>
        ) : anomalies.length === 0 ? (
          <div className="text-sm text-gray-500 py-6 text-center">
            No anomalies detected. All clear.
          </div>
        ) : (
          <div className="space-y-2">
            {anomalies.map((a, i) => (
              <div
                key={i}
                className={`rounded-lg border p-4 ${severityColors[a.severity]}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs uppercase tracking-wide font-semibold">
                        {a.type}
                      </span>
                      <span className="text-xs px-1.5 py-0.5 rounded bg-black/30">
                        {a.severity}
                      </span>
                    </div>
                    <div className="font-medium text-gray-100">{a.testName}</div>
                    <div className="text-sm text-gray-400 mt-1">{a.message}</div>
                  </div>
                  <div className="text-xs text-gray-500 whitespace-nowrap">
                    {new Date(a.detectedAt).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import StatusBadge from "@/components/StatusBadge";
import { SuiteRun, Run } from "@/types";
import { formatDuration, formatDate, cn } from "@/lib/utils";

export default function SuiteRunDetailPage() {
  const params = useParams();
  const router = useRouter();
  const suiteId = params.id as string;
  const runId = params.runId as string;

  const [suiteRun, setSuiteRun] = useState<SuiteRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSuiteRun() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/suites/${suiteId}/runs/${runId}`);
        if (!res.ok) throw new Error("Failed to fetch suite run");
        const data = await res.json();
        setSuiteRun(data.suiteRun ?? data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setLoading(false);
      }
    }
    fetchSuiteRun();
  }, [suiteId, runId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !suiteRun) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => router.push(`/suites/${suiteId}`)}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-200 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Suite
        </button>
        <div className="bg-red-900/10 border border-red-800/30 rounded-lg p-4 text-sm text-red-400">
          {error ?? "Suite run not found"}
        </div>
      </div>
    );
  }

  const testRuns: Run[] = suiteRun.runs ?? [];
  const totalTests = testRuns.length;
  const passedTests = testRuns.filter((r) => r.status === "PASSED").length;
  const failedTests = testRuns.filter((r) => r.status === "FAILED").length;
  const runningTests = testRuns.filter((r) => r.status === "RUNNING").length;
  const queuedTests = testRuns.filter(
    (r) => r.status === "QUEUED"
  ).length;

  const passedPct = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;
  const failedPct = totalTests > 0 ? (failedTests / totalTests) * 100 : 0;
  const runningPct = totalTests > 0 ? (runningTests / totalTests) * 100 : 0;
  const queuedPct = totalTests > 0 ? (queuedTests / totalTests) * 100 : 0;

  const stats = [
    { label: "Total Tests", value: totalTests, color: "text-gray-100" },
    { label: "Passed", value: passedTests, color: "text-green-400" },
    { label: "Failed", value: failedTests, color: "text-red-400" },
    { label: "Running", value: runningTests, color: "text-blue-400" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <button
          onClick={() => router.push(`/suites/${suiteId}`)}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-200 transition-colors w-fit"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Suite
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-100">Suite Run</h1>
              <StatusBadge status={suiteRun.status} />
            </div>
            <p className="text-sm text-gray-500 font-mono mt-1">{suiteRun.id}</p>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-gray-900 border border-gray-800 rounded-xl p-4"
          >
            <p className="text-xs text-gray-500 uppercase tracking-wider">
              {stat.label}
            </p>
            <p className={cn("text-2xl font-bold mt-1", stat.color)}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Progress Bar */}
      {totalTests > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-300">Progress</span>
            <span className="text-sm text-gray-500">
              {passedTests + failedTests} / {totalTests} completed
            </span>
          </div>
          <div className="w-full h-3 bg-gray-800 rounded-full overflow-hidden flex">
            {passedPct > 0 && (
              <div
                className="h-full bg-green-500 transition-all duration-500"
                style={{ width: `${passedPct}%` }}
              />
            )}
            {failedPct > 0 && (
              <div
                className="h-full bg-red-500 transition-all duration-500"
                style={{ width: `${failedPct}%` }}
              />
            )}
            {runningPct > 0 && (
              <div
                className="h-full bg-blue-500 transition-all duration-500 animate-pulse"
                style={{ width: `${runningPct}%` }}
              />
            )}
            {queuedPct > 0 && (
              <div
                className="h-full bg-gray-600 transition-all duration-500"
                style={{ width: `${queuedPct}%` }}
              />
            )}
          </div>
          <div className="flex gap-4 mt-2">
            <span className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              Passed
            </span>
            <span className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              Failed
            </span>
            <span className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              Running
            </span>
            <span className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className="w-2 h-2 rounded-full bg-gray-600" />
              Queued
            </span>
          </div>
        </div>
      )}

      {/* Test Runs List */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-800">
          <h2 className="text-base font-semibold text-gray-100">Test Runs</h2>
        </div>

        {testRuns.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-gray-500">
            No test runs in this suite run
          </div>
        ) : (
          <div className="divide-y divide-gray-800">
            {testRuns.map((testRun) => (
              <div
                key={testRun.id}
                onClick={() => router.push(`/runs/${testRun.id}`)}
                className="flex items-center gap-4 px-5 py-3 hover:bg-gray-800/50 cursor-pointer transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-gray-200 font-medium truncate block">
                    {testRun.test?.name ?? "Unnamed Test"}
                  </span>
                </div>
                <StatusBadge status={testRun.status} />
                <span className="text-sm text-gray-400 shrink-0">
                  {testRun.duration ? formatDuration(testRun.duration) : "-"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  RefreshCw,
  Play,
  Pencil,
  Trash2,
  CheckCircle,
  Loader2,
  Circle,
  ChevronDown,
  ChevronUp,
  Copy,
  Plus,
  Clock,
} from "lucide-react";
import type { Test, Run, ProcessingStep } from "@/types";
import StatusBadge from "@/components/StatusBadge";
import {
  formatDate,
  formatDuration,
  maskSecret,
  getStatusColor,
} from "@/lib/utils";

type Schedule = "none" | "every_5_min" | "hourly" | "daily" | "weekly";
type NotificationSetting = "off" | "default" | "custom";

export default function TestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [test, setTest] = useState<Test | null>(null);
  const [recentRuns, setRecentRuns] = useState<Run[]>([]);
  const [processingSteps, setProcessingSteps] = useState<ProcessingStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bannerExpanded, setBannerExpanded] = useState(true);
  const [codeCopied, setCodeCopied] = useState(false);
  const [schedule, setSchedule] = useState<Schedule>("none");
  const [notification, setNotification] = useState<NotificationSetting>("off");
  const [runningAction, setRunningAction] = useState<string | null>(null);

  const fetchTestData = useCallback(async () => {
    try {
      const res = await fetch(`/api/tests/${id}`);
      if (!res.ok) throw new Error("Failed to fetch test data");
      const data = await res.json();
      setTest(data.test);
      setRecentRuns(data.recentRuns ?? []);
      setProcessingSteps(data.processingSteps ?? []);
      if (data.test.schedule) setSchedule(data.test.schedule);
      if (data.test.notification) setNotification(data.test.notification);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchTestData();
  }, [fetchTestData]);

  const handleRunTest = async () => {
    setRunningAction("run");
    try {
      const res = await fetch(`/api/tests/${id}/run`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to run test");
      const data = await res.json();
      if (data.runId) {
        router.push(`/runs/${data.runId}`);
      } else {
        await fetchTestData();
      }
    } catch {
      // Allow UI to recover
    } finally {
      setRunningAction(null);
    }
  };

  const handleReprocess = async () => {
    setRunningAction("reprocess");
    try {
      const res = await fetch(`/api/tests/${id}/reprocess`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to reprocess test");
      await fetchTestData();
    } catch {
      // Allow UI to recover
    } finally {
      setRunningAction(null);
    }
  };

  const handleDelete = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this test? This action cannot be undone."
    );
    if (!confirmed) return;

    setRunningAction("delete");
    try {
      const res = await fetch(`/api/tests/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete test");
      router.push("/tests");
    } catch {
      setRunningAction(null);
    }
  };

  const handleCopyCode = async () => {
    if (!test?.generatedCode) return;
    await navigator.clipboard.writeText(test.generatedCode);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const handleSaveSettings = async () => {
    try {
      await fetch(`/api/tests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schedule, notification }),
      });
    } catch {
      // Silently fail for now
    }
  };

  const highlightSyntax = (code: string): string => {
    return code
      .replace(
        /(\/\/.*$)/gm,
        '<span class="text-gray-500">$1</span>'
      )
      .replace(
        /(\/\*[\s\S]*?\*\/)/g,
        '<span class="text-gray-500">$1</span>'
      )
      .replace(
        /\b(import|from|export|default|const|let|var|function|async|await|return|if|else|for|while|new|class|extends|try|catch|throw|typeof|instanceof)\b/g,
        '<span class="text-purple-400">$1</span>'
      )
      .replace(
        /\b(true|false|null|undefined|this)\b/g,
        '<span class="text-orange-400">$1</span>'
      )
      .replace(
        /(["'`])(?:(?=(\\?))\2.)*?\1/g,
        '<span class="text-green-400">$&</span>'
      )
      .replace(
        /\b(\d+)\b/g,
        '<span class="text-cyan-400">$1</span>'
      );
  };

  const renderCodeWithLineNumbers = (code: string) => {
    const lines = code.split("\n");
    const highlighted = highlightSyntax(code);
    const highlightedLines = highlighted.split("\n");

    return lines.map((_, i) => (
      <div key={i} className="flex">
        <span className="text-gray-600 mr-4 select-none inline-block w-8 text-right">
          {i + 1}
        </span>
        <span
          className="text-gray-200"
          dangerouslySetInnerHTML={{ __html: highlightedLines[i] }}
        />
      </div>
    ));
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-gray-100">
        <div className="sticky top-0 z-10 bg-gray-950/80 backdrop-blur border-b border-gray-800 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-7 w-48 bg-gray-800 rounded animate-pulse" />
              <div className="h-6 w-20 bg-gray-800 rounded animate-pulse" />
            </div>
            <div className="flex items-center gap-2">
              <div className="h-9 w-28 bg-gray-800 rounded-lg animate-pulse" />
              <div className="h-9 w-24 bg-gray-800 rounded-lg animate-pulse" />
              <div className="h-9 w-20 bg-gray-800 rounded-lg animate-pulse" />
              <div className="h-9 w-20 bg-gray-800 rounded-lg animate-pulse" />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 p-6">
          <div className="lg:col-span-3 space-y-4">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 h-40 animate-pulse" />
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 h-64 animate-pulse" />
          </div>
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 h-48 animate-pulse" />
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 h-36 animate-pulse" />
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 h-48 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !test) {
    return (
      <div className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 max-w-md text-center">
          <p className="text-red-400 text-lg font-medium mb-2">
            Failed to load test
          </p>
          <p className="text-gray-400 text-sm mb-4">
            {error ?? "Test not found"}
          </p>
          <button
            onClick={() => router.push("/tests")}
            className="bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-lg px-4 py-2 text-sm"
          >
            Back to Tests
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Sticky Header Bar */}
      <div className="sticky top-0 z-10 bg-gray-950/80 backdrop-blur border-b border-gray-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-gray-100">{test.name}</h1>
            <StatusBadge status={test.status} />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleReprocess}
              disabled={runningAction === "reprocess"}
              className="inline-flex items-center gap-2 border border-gray-700 text-gray-300 hover:bg-gray-800 rounded-lg px-4 py-2 text-sm disabled:opacity-50 transition-colors"
            >
              <RefreshCw
                size={14}
                className={
                  runningAction === "reprocess" ? "animate-spin" : ""
                }
              />
              Reprocess
            </button>
            <button
              onClick={handleRunTest}
              disabled={runningAction === "run"}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50 transition-colors"
            >
              <Play size={14} />
              Run Test
            </button>
            <button
              onClick={() => router.push(`/tests/${id}/edit`)}
              className="inline-flex items-center gap-2 border border-gray-700 text-gray-300 hover:bg-gray-800 rounded-lg px-4 py-2 text-sm transition-colors"
            >
              <Pencil size={14} />
              Edit
            </button>
            <button
              onClick={handleDelete}
              disabled={runningAction === "delete"}
              className="inline-flex items-center gap-2 border border-red-700/50 text-red-400 hover:bg-red-900/20 rounded-lg px-4 py-2 text-sm disabled:opacity-50 transition-colors"
            >
              <Trash2 size={14} />
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Processing Banner */}
      {test.status === "READY" && (
        <div className="px-6 pt-4">
          <div className="bg-green-900/20 border border-green-800/30 rounded-lg p-4">
            <button
              onClick={() => setBannerExpanded(!bannerExpanded)}
              className="w-full flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <CheckCircle size={18} className="text-green-400" />
                <span className="text-green-300 font-medium text-sm">
                  Processing Complete
                </span>
              </div>
              {bannerExpanded ? (
                <ChevronUp size={16} className="text-green-400" />
              ) : (
                <ChevronDown size={16} className="text-green-400" />
              )}
            </button>
            {bannerExpanded && processingSteps.length > 0 && (
              <div className="mt-4 space-y-3 pl-1">
                {processingSteps.map((step, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-green-900/40 text-green-400 flex items-center justify-center text-xs font-medium">
                      {index + 1}
                    </div>
                    <span className="text-sm text-gray-300">{step.title}</span>
                    <CheckCircle
                      size={14}
                      className="text-green-400 ml-auto"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {test.status === "PROCESSING" && (
        <div className="px-6 pt-4">
          <div className="bg-blue-900/20 border border-blue-800/30 rounded-lg p-4">
            <button
              onClick={() => setBannerExpanded(!bannerExpanded)}
              className="w-full flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <Loader2 size={18} className="text-blue-400 animate-spin" />
                <span className="text-blue-300 font-medium text-sm">
                  Processing...
                </span>
              </div>
              {bannerExpanded ? (
                <ChevronUp size={16} className="text-blue-400" />
              ) : (
                <ChevronDown size={16} className="text-blue-400" />
              )}
            </button>
            {bannerExpanded && processingSteps.length > 0 && (
              <div className="mt-4 space-y-3 pl-1">
                {processingSteps.map((step, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                        step.status === "completed"
                          ? "bg-green-900/40 text-green-400"
                          : step.status === "running"
                            ? "bg-blue-900/40 text-blue-400"
                            : "bg-gray-800 text-gray-500"
                      }`}
                    >
                      {index + 1}
                    </div>
                    <span className="text-sm text-gray-300">{step.title}</span>
                    <div className="ml-auto">
                      {step.status === "completed" && (
                        <CheckCircle size={14} className="text-green-400" />
                      )}
                      {step.status === "running" && (
                        <Loader2
                          size={14}
                          className="text-blue-400 animate-spin"
                        />
                      )}
                      {step.status === "pending" && (
                        <Circle size={14} className="text-gray-500" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 p-6">
        {/* Left Column */}
        <div className="lg:col-span-3">
          {/* Test Instructions */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-3">
              Test Instructions
            </h2>
            <div className="bg-gray-800 rounded-lg p-4 text-sm text-gray-200 whitespace-pre-wrap">
              {test.instructions ?? "No instructions provided."}
            </div>
            <div className="flex justify-end mt-3">
              <button
                onClick={() => router.push(`/tests/${id}/edit`)}
                className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
              >
                Edit
              </button>
            </div>
          </div>

          {/* Generated Test Code */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mt-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wide">
                Generated Test Code (Playwright)
              </h2>
              <button
                onClick={handleCopyCode}
                className="inline-flex items-center gap-1.5 text-gray-400 hover:text-gray-200 text-xs transition-colors"
              >
                <Copy size={13} />
                {codeCopied ? "Copied!" : "Copy"}
              </button>
            </div>
            <div className="bg-gray-950 rounded-lg p-4 overflow-x-auto">
              <pre className="font-mono text-sm leading-relaxed">
                <code>
                  {test.generatedCode
                    ? renderCodeWithLineNumbers(test.generatedCode)
                    : (
                        <span className="text-gray-500">
                          No code generated yet.
                        </span>
                      )}
                </code>
              </pre>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-2">
          {/* Test Settings */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-4">
              Test Settings
            </h2>

            {/* Schedule */}
            <div className="mb-4">
              <label className="block text-sm text-gray-300 mb-1.5">
                Schedule
              </label>
              <select
                value={schedule}
                onChange={(e) => setSchedule(e.target.value as Schedule)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="none">None</option>
                <option value="every_5_min">Every 5 minutes</option>
                <option value="hourly">Hourly</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>

            {/* Notification Settings */}
            <div className="mb-5">
              <label className="block text-sm text-gray-300 mb-2">
                Notification Settings
              </label>
              <div className="space-y-2">
                {(
                  [
                    { value: "off", label: "Off" },
                    { value: "default", label: "Default" },
                    { value: "custom", label: "Custom" },
                  ] as const
                ).map((option) => (
                  <label
                    key={option.value}
                    className="flex items-center gap-2.5 cursor-pointer group"
                  >
                    <div
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                        notification === option.value
                          ? "border-blue-500 bg-blue-500"
                          : "border-gray-600 bg-transparent group-hover:border-gray-500"
                      }`}
                    >
                      {notification === option.value && (
                        <div className="w-1.5 h-1.5 rounded-full bg-white" />
                      )}
                    </div>
                    <span className="text-sm text-gray-300">
                      {option.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <button
              onClick={handleSaveSettings}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
            >
              Save Settings
            </button>
          </div>

          {/* Test Secrets */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mt-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wide">
                Test Secrets
              </h2>
              <button className="w-7 h-7 rounded bg-gray-800 hover:bg-gray-700 flex items-center justify-center transition-colors">
                <Plus size={14} className="text-gray-400" />
              </button>
            </div>
            {test.secrets && test.secrets.length > 0 ? (
              <div>
                {test.secrets.map((secret, index) => (
                  <div
                    key={index}
                    className={`flex items-center justify-between py-2 ${
                      index < test.secrets!.length - 1
                        ? "border-b border-gray-800"
                        : ""
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-200 font-mono">
                        {secret.key}
                      </span>
                      <span className="text-xs bg-blue-400/10 text-blue-400 px-1.5 py-0.5 rounded">
                        Test
                      </span>
                    </div>
                    <span className="text-sm text-gray-500 font-mono">
                      {maskSecret(secret.value)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No secrets configured</p>
            )}
          </div>

          {/* Run History */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mt-4">
            <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-3">
              Recent Runs
            </h2>
            {recentRuns.length > 0 ? (
              <div>
                {recentRuns.slice(0, 5).map((run) => (
                  <div
                    key={run.id}
                    className="flex items-center justify-between py-2"
                  >
                    <div className="flex items-center gap-2">
                      <StatusBadge status={run.status} />
                      <span className="text-sm text-gray-400">
                        {formatDate(run.createdAt)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <Clock size={12} />
                      {run.duration != null ? formatDuration(run.duration) : "-"}
                    </div>
                  </div>
                ))}
                <div className="mt-3 pt-3 border-t border-gray-800">
                  <button
                    onClick={() => router.push(`/runs?testId=${id}`)}
                    className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    View All Runs
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">No runs yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

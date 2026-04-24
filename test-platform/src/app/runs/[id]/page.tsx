"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  X,
  Loader2,
  Circle,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Play,
} from "lucide-react";
import StatusBadge from "@/components/StatusBadge";
import SessionReplay from "@/components/SessionReplay";
import { Run, RunStep } from "@/types";
import { formatDuration, formatDate, cn } from "@/lib/utils";

const tabs = ["Steps", "Console", "Session Replay", "Screenshots", "Error"] as const;
type Tab = (typeof tabs)[number];

interface ParsedLog {
  timestamp: string;
  level: string;
  message: string;
}

function parseConsoleLogs(consoleOutput: string | null): ParsedLog[] {
  if (!consoleOutput) return [];
  return consoleOutput.split("\n").filter(Boolean).map((line) => {
    const match = line.match(/^\[([^\]]+)\]\s*(INFO|ERROR|DEBUG|WARN|WARNING):\s*(.*)/i);
    if (match) {
      return { timestamp: match[1], level: match[2].toUpperCase(), message: match[3] };
    }
    return { timestamp: "", level: "INFO", message: line };
  });
}

export default function RunDetailPage() {
  const params = useParams();
  const router = useRouter();
  const runId = params.id as string;

  const [run, setRun] = useState<Run | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("Steps");
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());
  const [autoScroll, setAutoScroll] = useState(true);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const consoleEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchRun() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/runs/${runId}`);
        if (!res.ok) throw new Error("Failed to fetch run");
        const data = await res.json();
        setRun(data.run ?? data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setLoading(false);
      }
    }
    fetchRun();
  }, [runId]);

  const consoleLogs = run ? parseConsoleLogs(run.consoleOutput) : [];

  useEffect(() => {
    if (autoScroll && consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [consoleLogs.length, autoScroll]);

  const toggleStep = (index: number) => {
    setExpandedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const visibleTabs = tabs.filter((tab) => {
    if (tab === "Error") return run?.errorMessage;
    return true;
  });

  // Collect screenshots from steps
  const screenshots = run?.steps?.filter((s) => s.screenshot).map((s, i) => ({
    url: s.screenshot!,
    label: `Step ${s.stepIndex + 1}: ${s.action}`,
  })) ?? [];

  function getStepIcon(status?: string) {
    switch (status) {
      case "PASSED":
        return <Check className="h-4 w-4 text-green-400" />;
      case "FAILED":
        return <X className="h-4 w-4 text-red-400" />;
      case "RUNNING":
        return <Loader2 className="h-4 w-4 text-blue-400 animate-spin" />;
      default:
        return <Circle className="h-4 w-4 text-gray-500" />;
    }
  }

  function getLogLevelColor(level: string) {
    switch (level) {
      case "ERROR":
        return "text-red-400";
      case "WARN":
      case "WARNING":
        return "text-yellow-400";
      case "DEBUG":
        return "text-purple-400";
      case "INFO":
      default:
        return "text-blue-400";
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !run) {
    return (
      <div className="p-6 space-y-4">
        <button
          onClick={() => router.push("/runs")}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-200 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Runs
        </button>
        <div className="bg-red-900/10 border border-red-800/30 rounded-lg p-4 text-sm text-red-400">
          {error ?? "Run not found"}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <button
          onClick={() => router.push("/runs")}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-200 transition-colors w-fit"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Runs
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-100 truncate">
                {run.test?.name ?? "Run Details"}
              </h1>
              <StatusBadge status={run.status} />
            </div>
            <p className="text-sm text-gray-500 font-mono mt-1">{run.id}</p>
          </div>
          {run.duration != null && (
            <div className="text-sm text-gray-400">
              Duration: <span className="text-gray-200">{formatDuration(run.duration)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-800">
        {visibleTabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-4 py-2 text-sm transition-colors relative",
              activeTab === tab
                ? "text-blue-400 border-b-2 border-blue-400"
                : "text-gray-500 hover:text-gray-300"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "Steps" && (
        <div className="space-y-0">
          {(!run.steps || run.steps.length === 0) && (
            <div className="text-center py-12 text-gray-500 text-sm">
              No steps recorded for this run
            </div>
          )}
          {run.steps?.map((step: RunStep, index: number) => (
            <div key={step.id || index} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className="bg-gray-800 w-8 h-8 rounded-full flex items-center justify-center text-sm text-gray-300 shrink-0 z-10">
                  {index + 1}
                </div>
                {index < (run.steps?.length ?? 0) - 1 && (
                  <div className="border-l-2 border-gray-800 flex-1 min-h-[24px]" />
                )}
              </div>

              <div className="flex-1 pb-4">
                <div
                  className="flex items-start gap-3 cursor-pointer group"
                  onClick={() => step.screenshot && toggleStep(index)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-200">{step.action}</span>
                      {getStepIcon(step.status)}
                      {step.duration != null && (
                        <span className="text-xs text-gray-500">
                          {formatDuration(step.duration)}
                        </span>
                      )}
                    </div>
                    {step.selector && (
                      <p className="text-xs text-gray-500 font-mono mt-0.5 truncate">
                        {step.selector}
                      </p>
                    )}
                    {step.error && (
                      <p className="text-xs text-red-400 mt-1">{step.error}</p>
                    )}
                  </div>
                  {step.screenshot && (
                    <button className="text-gray-600 hover:text-gray-400 transition-colors">
                      {expandedSteps.has(index) ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </button>
                  )}
                </div>

                {expandedSteps.has(index) && step.screenshot && (
                  <div className="mt-2 bg-gray-900 border border-gray-800 rounded-lg overflow-hidden max-w-md">
                    <img
                      src={step.screenshot}
                      alt={`Step ${index + 1} screenshot`}
                      className="w-full cursor-pointer"
                      onClick={() => setLightboxImage(step.screenshot!)}
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "Console" && (
        <div className="space-y-3">
          <div className="flex items-center justify-end">
            <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
                className="rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-blue-500/40"
              />
              Auto-scroll
            </label>
          </div>

          <div className="bg-gray-950 rounded-lg p-4 font-mono text-sm max-h-[600px] overflow-y-auto">
            {consoleLogs.length === 0 && (
              <div className="text-gray-600">No console output available</div>
            )}
            {consoleLogs.map((log, index) => (
              <div key={index} className="flex gap-2 py-0.5 hover:bg-gray-900/50">
                {log.timestamp && (
                  <span className="text-gray-600 shrink-0 text-xs">
                    {log.timestamp}
                  </span>
                )}
                <span
                  className={cn(
                    "shrink-0 uppercase font-semibold w-14 text-xs",
                    getLogLevelColor(log.level)
                  )}
                >
                  {log.level}
                </span>
                <span className="text-gray-300">{log.message}</span>
              </div>
            ))}
            <div ref={consoleEndRef} />
          </div>
        </div>
      )}

      {activeTab === "Session Replay" && (
        <SessionReplay events={run.rrwebEvents} />
      )}

      {activeTab === "Screenshots" && (
        <div>
          {screenshots.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="bg-gray-900 p-4 rounded-full mb-4">
                <ImageIcon className="h-8 w-8 text-gray-600" />
              </div>
              <p className="text-sm text-gray-400">No screenshots captured</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {screenshots.map((screenshot, index) => (
                <div
                  key={index}
                  className="bg-gray-900 rounded-lg overflow-hidden border border-gray-800 cursor-pointer hover:border-gray-700 transition-colors"
                  onClick={() => setLightboxImage(screenshot.url)}
                >
                  <img
                    src={screenshot.url}
                    alt={screenshot.label}
                    className="w-full object-cover"
                  />
                  <div className="px-3 py-2">
                    <p className="text-xs text-gray-400">{screenshot.label}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "Error" && run.errorMessage && (
        <div className="space-y-4">
          <div className="bg-red-900/10 border border-red-800/30 rounded-lg p-4">
            <p className="text-sm text-red-400 font-medium">{run.errorMessage.split("\n")[0]}</p>
          </div>
          {run.errorMessage.includes("\n") && (
            <pre className="bg-gray-950 border border-gray-800 rounded-lg p-4 text-xs text-gray-400 font-mono overflow-x-auto whitespace-pre-wrap">
              {run.errorMessage}
            </pre>
          )}
        </div>
      )}

      {/* Lightbox modal */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] overflow-auto">
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute top-2 right-2 bg-gray-900/80 p-2 rounded-full text-gray-300 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
            <img
              src={lightboxImage}
              alt="Screenshot full view"
              className="max-w-full max-h-[85vh] object-contain rounded-lg"
            />
          </div>
        </div>
      )}
    </div>
  );
}

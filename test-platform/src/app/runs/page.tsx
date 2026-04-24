"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, Activity, ChevronLeft, ChevronRight } from "lucide-react";
import StatusBadge from "@/components/StatusBadge";
import EmptyState from "@/components/EmptyState";
import { Run } from "@/types";
import { formatDuration, formatDate, cn } from "@/lib/utils";

const PAGE_SIZE = 20;

export default function RunsPage() {
  const router = useRouter();
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateRange, setDateRange] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchRuns = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (dateRange !== "all") params.set("dateRange", dateRange);
      params.set("page", String(page));
      params.set("limit", String(PAGE_SIZE));

      const res = await fetch(`/api/runs?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch runs");
      const data = await res.json();
      setRuns(data.runs ?? data.data ?? []);
      setTotalPages(data.totalPages ?? (Math.ceil((data.total ?? 0) / PAGE_SIZE) || 1));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, dateRange, page]);

  useEffect(() => {
    fetchRuns();
  }, [fetchRuns]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, dateRange]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-100">Runs</h1>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search runs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
        >
          <option value="all">All Statuses</option>
          <option value="running">Running</option>
          <option value="passed">Passed</option>
          <option value="failed">Failed</option>
          <option value="queued">Queued</option>
        </select>

        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
        >
          <option value="all">All Time</option>
          <option value="24h">Last 24h</option>
          <option value="7d">Last 7 Days</option>
          <option value="30d">Last 30 Days</option>
        </select>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-900/10 border border-red-800/30 rounded-lg p-4 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && runs.length === 0 && (
        <EmptyState
          icon={<Activity className="h-8 w-8" />}
          title="No runs yet"
          description="Run a test to see results here"
        />
      )}

      {/* Table */}
      {!loading && !error && runs.length > 0 && (
        <>
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Run ID
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Test Name
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Duration
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Started
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Completed
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {runs.map((run) => (
                    <tr
                      key={run.id}
                      onClick={() => router.push(`/runs/${run.id}`)}
                      className="hover:bg-gray-800/50 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3">
                        <span
                          className="text-sm text-gray-400 font-mono"
                          title={run.id}
                        >
                          {run.id.slice(0, 8)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/tests/${run.testId}`);
                          }}
                          className="text-sm text-gray-100 font-medium hover:text-blue-400 transition-colors"
                        >
                          {run.test?.name ?? "Unnamed Test"}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={run.status} />
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-400">
                        {run.duration ? formatDuration(run.duration) : "-"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-400">
                        {run.startedAt ? formatDate(run.startedAt) : "-"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-400">
                        {run.completedAt ? formatDate(run.completedAt) : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className={cn(
                "flex items-center gap-1 px-3 py-2 text-sm rounded-lg border transition-colors",
                page <= 1
                  ? "border-gray-800 text-gray-600 cursor-not-allowed"
                  : "border-gray-700 text-gray-300 hover:bg-gray-800"
              )}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>

            <span className="text-sm text-gray-400">
              Page {page} of {totalPages}
            </span>

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className={cn(
                "flex items-center gap-1 px-3 py-2 text-sm rounded-lg border transition-colors",
                page >= totalPages
                  ? "border-gray-800 text-gray-600 cursor-not-allowed"
                  : "border-gray-700 text-gray-300 hover:bg-gray-800"
              )}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}

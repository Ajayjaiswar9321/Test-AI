"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Play,
  GripVertical,
  X,
  Plus,
  Pencil,
  Trash2,
  Check,
} from "lucide-react";
import StatusBadge from "@/components/StatusBadge";
import { Suite, Test, SuiteRun } from "@/types";
import { formatDuration, formatDate, cn } from "@/lib/utils";

export default function SuiteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const suiteId = params.id as string;

  const [suite, setSuite] = useState<Suite | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [runningSuite, setRunningSuite] = useState(false);
  const [showAddTests, setShowAddTests] = useState(false);
  const [availableTests, setAvailableTests] = useState<Test[]>([]);
  const [loadingAvailable, setLoadingAvailable] = useState(false);
  const [selectedTestIds, setSelectedTestIds] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");

  const fetchSuite = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/suites/${suiteId}`);
      if (!res.ok) throw new Error("Failed to fetch suite");
      const data = await res.json();
      setSuite(data.suite ?? data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [suiteId]);

  useEffect(() => {
    fetchSuite();
  }, [fetchSuite]);

  const handleRunSuite = async () => {
    setRunningSuite(true);
    try {
      const res = await fetch(`/api/suites/${suiteId}/run`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to run suite");
      fetchSuite();
    } catch {
      // handle error silently
    } finally {
      setRunningSuite(false);
    }
  };

  const handleRemoveTest = async (testId: string) => {
    try {
      const res = await fetch(`/api/suites/${suiteId}/tests/${testId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to remove test");
      fetchSuite();
    } catch {
      // handle error silently
    }
  };

  const handleAddTests = async () => {
    if (selectedTestIds.size === 0) return;
    try {
      const res = await fetch(`/api/suites/${suiteId}/tests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testIds: Array.from(selectedTestIds) }),
      });
      if (!res.ok) throw new Error("Failed to add tests");
      setShowAddTests(false);
      setSelectedTestIds(new Set());
      fetchSuite();
    } catch {
      // handle error silently
    }
  };

  const openAddTests = async () => {
    setShowAddTests(true);
    setLoadingAvailable(true);
    try {
      const res = await fetch("/api/tests");
      if (!res.ok) throw new Error("Failed to fetch tests");
      const data = await res.json();
      const allTests: Test[] = data.tests ?? data.data ?? [];
      const existingIds = new Set(suite?.tests?.map((t) => t.id) ?? []);
      setAvailableTests(allTests.filter((t) => !existingIds.has(t.id)));
    } catch {
      setAvailableTests([]);
    } finally {
      setLoadingAvailable(false);
    }
  };

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/suites/${suiteId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete suite");
      router.push("/suites");
    } catch {
      // handle error silently
    }
  };

  const handleEdit = async () => {
    try {
      const res = await fetch(`/api/suites/${suiteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          description: editDescription.trim(),
        }),
      });
      if (!res.ok) throw new Error("Failed to update suite");
      setEditing(false);
      fetchSuite();
    } catch {
      // handle error silently
    }
  };

  const startEditing = () => {
    setEditName(suite?.name ?? "");
    setEditDescription(suite?.description ?? "");
    setEditing(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !suite) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => router.push("/suites")}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-200 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Suites
        </button>
        <div className="bg-red-900/10 border border-red-800/30 rounded-lg p-4 text-sm text-red-400">
          {error ?? "Suite not found"}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <button
          onClick={() => router.push("/suites")}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-200 transition-colors w-fit"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Suites
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            {editing ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-lg font-bold text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
                />
                <input
                  type="text"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Description..."
                  className="block w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleEdit}
                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-colors"
                  >
                    <Check className="h-3 w-3" />
                    Save
                  </button>
                  <button
                    onClick={() => setEditing(false)}
                    className="px-3 py-1.5 text-gray-400 hover:text-gray-200 text-xs transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <h1 className="text-2xl font-bold text-gray-100">{suite.name}</h1>
                {suite.description && (
                  <p className="text-sm text-gray-400 mt-1">{suite.description}</p>
                )}
              </>
            )}
          </div>

          {!editing && (
            <div className="flex items-center gap-2">
              <button
                onClick={startEditing}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-400 hover:text-gray-200 border border-gray-700 hover:border-gray-600 rounded-lg transition-colors"
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-red-400 hover:text-red-300 border border-gray-700 hover:border-red-800 rounded-lg transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Section A: Tests in Suite */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <h2 className="text-base font-semibold text-gray-100">
            Tests in Suite ({suite.tests?.length ?? 0})
          </h2>
          <button
            onClick={openAddTests}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-400 hover:text-blue-300 border border-gray-700 hover:border-blue-800 rounded-lg transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Test
          </button>
        </div>

        {(!suite.tests || suite.tests.length === 0) ? (
          <div className="px-5 py-8 text-center text-sm text-gray-500">
            No tests in this suite yet. Add tests to get started.
          </div>
        ) : (
          <div className="divide-y divide-gray-800">
            {suite.tests.map((test, index) => (
              <div
                key={test.id}
                className="flex items-center gap-3 px-5 py-3 hover:bg-gray-800/50 transition-colors group"
              >
                <GripVertical className="h-4 w-4 text-gray-600 cursor-grab shrink-0" />
                <span className="text-xs text-gray-600 w-6 text-center">{index + 1}</span>
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-gray-200 font-medium truncate block">
                    {test.test?.name ?? "Unnamed Test"}
                  </span>
                </div>
                {test.test?.status && <StatusBadge status={test.test.status} />}
                <button
                  onClick={() => handleRemoveTest(test.id)}
                  className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition-all"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section B: Suite Runs */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <h2 className="text-base font-semibold text-gray-100">Suite Runs</h2>
          <button
            onClick={handleRunSuite}
            disabled={runningSuite}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              runningSuite
                ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 text-white"
            )}
          >
            {runningSuite ? (
              <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Play className="h-3.5 w-3.5" />
            )}
            Run Suite
          </button>
        </div>

        {(!suite.runs || suite.runs.length === 0) ? (
          <div className="px-5 py-8 text-center text-sm text-gray-500">
            No suite runs yet. Click &quot;Run Suite&quot; to execute all tests.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Started
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Completed
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tests
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {suite.runs.map((run: SuiteRun) => (
                  <tr
                    key={run.id}
                    onClick={() => router.push(`/suites/${suiteId}/${run.id}`)}
                    className="hover:bg-gray-800/50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-400 font-mono">
                        {run.id.slice(0, 8)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={run.status} />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400">
                      {run.startedAt ? formatDate(run.startedAt) : "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400">
                      {run.completedAt ? formatDate(run.completedAt) : "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400">
                      {run.runs?.length ?? 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Tests Modal */}
      {showAddTests && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
              <h2 className="text-lg font-semibold text-gray-100">Add Tests</h2>
              <button
                onClick={() => {
                  setShowAddTests(false);
                  setSelectedTestIds(new Set());
                }}
                className="text-gray-500 hover:text-gray-300 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-6 py-4 max-h-80 overflow-y-auto">
              {loadingAvailable ? (
                <div className="flex items-center justify-center py-8">
                  <div className="h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : availableTests.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  No more tests available to add
                </p>
              ) : (
                <div className="space-y-1">
                  {availableTests.map((test) => (
                    <label
                      key={test.id}
                      className="flex items-center gap-3 px-3 py-2 hover:bg-gray-800 rounded-lg cursor-pointer transition-colors"
                    >
                      <div
                        className={cn(
                          "w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors",
                          selectedTestIds.has(test.id)
                            ? "bg-blue-600 border-blue-600"
                            : "border-gray-600 bg-transparent"
                        )}
                      >
                        {selectedTestIds.has(test.id) && (
                          <Check className="h-3 w-3 text-white" />
                        )}
                      </div>
                      <span className="text-sm text-gray-300 truncate">{test.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-800">
              <button
                onClick={() => {
                  setShowAddTests(false);
                  setSelectedTestIds(new Set());
                }}
                className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddTests}
                disabled={selectedTestIds.size === 0}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                  selectedTestIds.size > 0
                    ? "bg-blue-600 hover:bg-blue-700 text-white"
                    : "bg-gray-700 text-gray-500 cursor-not-allowed"
                )}
              >
                Add {selectedTestIds.size > 0 ? `(${selectedTestIds.size})` : ""}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-sm shadow-xl p-6">
            <h3 className="text-lg font-semibold text-gray-100 mb-2">Delete Suite</h3>
            <p className="text-sm text-gray-400 mb-6">
              Are you sure you want to delete &quot;{suite.name}&quot;? This action cannot be
              undone.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

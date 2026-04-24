"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, Layers, X, Check } from "lucide-react";
import StatusBadge from "@/components/StatusBadge";
import EmptyState from "@/components/EmptyState";
import { Suite, Test } from "@/types";
import { cn } from "@/lib/utils";

export default function SuitesPage() {
  const router = useRouter();
  const [suites, setSuites] = useState<Suite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);

  const fetchSuites = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/suites");
      if (!res.ok) throw new Error("Failed to fetch suites");
      const data = await res.json();
      setSuites(data.suites ?? data.data ?? []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSuites();
  }, [fetchSuites]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-100">Test Suites</h1>
        <button
          onClick={() => setShowNewModal(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Suite
        </button>
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
      {!loading && !error && suites.length === 0 && (
        <EmptyState
          icon={<Layers className="h-8 w-8" />}
          title="No test suites"
          description="Group your tests into suites for organized execution"
        />
      )}

      {/* Suite cards grid */}
      {!loading && !error && suites.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {suites.map((suite) => (
            <div
              key={suite.id}
              onClick={() => router.push(`/suites/${suite.id}`)}
              className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition cursor-pointer"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-lg font-medium text-gray-100 truncate">
                  {suite.name}
                </h3>
              </div>

              {suite.description && (
                <p className="text-sm text-gray-400 mt-1 line-clamp-2">
                  {suite.description}
                </p>
              )}

              <div className="flex gap-4 mt-3">
                <span className="text-xs text-gray-500">
                  {suite._count?.tests ?? suite.tests?.length ?? 0} tests
                </span>
                <span className="text-xs text-gray-500">
                  {suite._count?.runs ?? 0} runs
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Suite Modal */}
      {showNewModal && (
        <NewSuiteModal
          onClose={() => setShowNewModal(false)}
          onCreated={() => {
            setShowNewModal(false);
            fetchSuites();
          }}
        />
      )}
    </div>
  );
}

function NewSuiteModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tests, setTests] = useState<Test[]>([]);
  const [selectedTestIds, setSelectedTestIds] = useState<Set<string>>(new Set());
  const [loadingTests, setLoadingTests] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTests() {
      try {
        const res = await fetch("/api/tests");
        if (!res.ok) throw new Error("Failed to fetch tests");
        const data = await res.json();
        setTests(data.tests ?? data.data ?? []);
      } catch {
        // silently fail
      } finally {
        setLoadingTests(false);
      }
    }
    fetchTests();
  }, []);

  const toggleTest = (testId: string) => {
    setSelectedTestIds((prev) => {
      const next = new Set(prev);
      if (next.has(testId)) next.delete(testId);
      else next.add(testId);
      return next;
    });
  };

  const handleCreate = async () => {
    if (!name.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/suites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          testIds: Array.from(selectedTestIds),
        }),
      });
      if (!res.ok) throw new Error("Failed to create suite");
      onCreated();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-lg shadow-xl">
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <h2 className="text-lg font-semibold text-gray-100">New Test Suite</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-300 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal body */}
        <div className="px-6 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
          {error && (
            <div className="bg-red-900/10 border border-red-800/30 rounded-lg p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Suite Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Smoke Tests"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the purpose of this suite..."
              rows={3}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Select Tests
            </label>
            {loadingTests ? (
              <div className="flex items-center justify-center py-4">
                <div className="h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : tests.length === 0 ? (
              <p className="text-sm text-gray-500 py-2">No tests available</p>
            ) : (
              <div className="space-y-1 max-h-48 overflow-y-auto rounded-lg border border-gray-700 bg-gray-800/50">
                {tests.map((test) => (
                  <label
                    key={test.id}
                    className="flex items-center gap-3 px-3 py-2 hover:bg-gray-800 cursor-pointer transition-colors"
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
            {selectedTestIds.size > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                {selectedTestIds.size} test{selectedTestIds.size !== 1 ? "s" : ""} selected
              </p>
            )}
          </div>
        </div>

        {/* Modal footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!name.trim() || creating}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              name.trim() && !creating
                ? "bg-blue-600 hover:bg-blue-700 text-white"
                : "bg-gray-700 text-gray-500 cursor-not-allowed"
            )}
          >
            {creating && (
              <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            Create Suite
          </button>
        </div>
      </div>
    </div>
  );
}

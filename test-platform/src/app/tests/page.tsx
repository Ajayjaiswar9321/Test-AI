"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  Search,
  SlidersHorizontal,
  Pencil,
  Copy,
  Trash2,
  FlaskConical,
  X,
  MoreHorizontal,
} from "lucide-react";
import StatusBadge from "@/components/StatusBadge";
import DropdownMenu from "@/components/DropdownMenu";
import EmptyState from "@/components/EmptyState";
import { getStatusColor, formatDate } from "@/lib/utils";

interface Test {
  id: string;
  name: string;
  status: string;
  schedule: string | null;
  lastRunStatus: string | null;
  lastModified: string;
}

export default function TestsPage() {
  const router = useRouter();
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showModal, setShowModal] = useState(false);
  const [newTest, setNewTest] = useState({
    name: "",
    baseUrl: "",
    instructions: "",
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchTests();
  }, []);

  async function fetchTests() {
    setLoading(true);
    try {
      const res = await fetch("/api/tests");
      if (res.ok) {
        const data = await res.json();
        setTests(data);
      }
    } catch (err) {
      console.error("Failed to fetch tests:", err);
    } finally {
      setLoading(false);
    }
  }

  const filteredTests = tests.filter((test) => {
    const matchesSearch = test.name
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchesFilter =
      filter === "all" || test.status.toLowerCase() === filter.toLowerCase();
    return matchesSearch && matchesFilter;
  });

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === filteredTests.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredTests.map((t) => t.id)));
    }
  }

  async function handleCreateTest(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newTest.name,
          baseUrl: newTest.baseUrl,
          instructions: newTest.instructions,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setShowModal(false);
        setNewTest({ name: "", baseUrl: "", instructions: "" });
        if (data.id) {
          router.push(`/tests/${data.id}`);
        } else {
          fetchTests();
        }
      }
    } catch (err) {
      console.error("Failed to create test:", err);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/tests/${id}`, { method: "DELETE" });
      if (res.ok) {
        setTests((prev) => prev.filter((t) => t.id !== id));
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    } catch (err) {
      console.error("Failed to delete test:", err);
    }
  }

  async function handleDuplicate(id: string) {
    try {
      const res = await fetch(`/api/tests/${id}/duplicate`, { method: "POST" });
      if (res.ok) {
        fetchTests();
      }
    } catch (err) {
      console.error("Failed to duplicate test:", err);
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Tests</h1>
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-medium flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Test
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-3 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search tests..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-9 pr-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
            />
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
          >
            <option value="all">All</option>
            <option value="ready">Ready</option>
            <option value="processing">Processing</option>
            <option value="failed">Failed</option>
            <option value="draft">Draft</option>
          </select>
          <button className="bg-gray-800 border border-gray-700 rounded-lg p-2 text-gray-400 hover:text-gray-200 hover:border-gray-600 transition-colors">
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="h-14 bg-gray-900 rounded-lg animate-pulse"
              />
            ))}
          </div>
        ) : filteredTests.length === 0 && tests.length === 0 ? (
          <EmptyState
            icon={<FlaskConical className="h-8 w-8" />}
            title="No tests yet"
            description="Create your first test to get started"
            action={{ label: "+ Create your first test", onClick: () => setShowModal(true) }}
          />
        ) : filteredTests.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500 text-sm">
              No tests match your search or filter.
            </p>
          </div>
        ) : (
          <>
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="text-xs text-gray-500 uppercase tracking-wider border-b border-gray-800">
                    <th className="w-10 px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={
                          filteredTests.length > 0 &&
                          selectedIds.size === filteredTests.length
                        }
                        onChange={toggleSelectAll}
                        className="rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                      />
                    </th>
                    <th className="px-4 py-3 text-left">Name</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Schedule</th>
                    <th className="px-4 py-3 text-left">Last Run Status</th>
                    <th className="px-4 py-3 text-left">Last Modified</th>
                    <th className="w-10 px-4 py-3 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTests.map((test) => (
                    <tr
                      key={test.id}
                      className="border-b border-gray-800/50 hover:bg-gray-800/30 transition"
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(test.id)}
                          onChange={() => toggleSelect(test.id)}
                          className="rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/tests/${test.id}`}
                          className="text-sm text-gray-100 font-medium hover:text-blue-400 transition-colors"
                        >
                          {test.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={test.status} />
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-400">
                        {test.schedule || "None"}
                      </td>
                      <td className="px-4 py-3">
                        {test.lastRunStatus ? (
                          <StatusBadge status={test.lastRunStatus} />
                        ) : (
                          <span className="text-sm text-gray-500">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-400">
                        {formatDate(test.lastModified)}
                      </td>
                      <td className="px-4 py-3">
                        <DropdownMenu
                          trigger={
                            <button className="p-1 text-gray-400 hover:text-gray-200 rounded-md hover:bg-gray-800 transition-colors">
                              <MoreHorizontal className="w-4 h-4" />
                            </button>
                          }
                          items={[
                            {
                              label: "Edit",
                              icon: <Pencil className="h-4 w-4" />,
                              onClick: () => router.push(`/tests/${test.id}`),
                            },
                            {
                              label: "Duplicate",
                              icon: <Copy className="h-4 w-4" />,
                              onClick: () => handleDuplicate(test.id),
                            },
                            {
                              label: "Delete",
                              icon: <Trash2 className="h-4 w-4" />,
                              variant: "danger" as const,
                              onClick: () => handleDelete(test.id),
                            },
                          ]}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="mt-4">
              <p className="text-sm text-gray-500">
                {selectedIds.size} of {filteredTests.length} test(s) selected.
              </p>
            </div>
          </>
        )}
      </div>

      {/* New Test Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold">Create New Test</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateTest} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Test Name
                </label>
                <input
                  type="text"
                  value={newTest.name}
                  onChange={(e) =>
                    setNewTest((prev) => ({ ...prev, name: e.target.value }))
                  }
                  required
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
                  placeholder="My test"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Base URL
                </label>
                <input
                  type="url"
                  value={newTest.baseUrl}
                  onChange={(e) =>
                    setNewTest((prev) => ({ ...prev, baseUrl: e.target.value }))
                  }
                  required
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
                  placeholder="https://example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Test Instructions
                </label>
                <textarea
                  value={newTest.instructions}
                  onChange={(e) =>
                    setNewTest((prev) => ({
                      ...prev,
                      instructions: e.target.value,
                    }))
                  }
                  rows={4}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors resize-none"
                  placeholder="Describe what you want to test..."
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-200 text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
                >
                  {submitting ? "Creating..." : "Create Test"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

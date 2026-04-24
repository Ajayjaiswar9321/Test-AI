"use client";

import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Plus,
  X,
  Save,
  Users,
  Settings as SettingsIcon,
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  BarChart3,
  Sparkles,
  Loader2,
  Bookmark,
  Trash2,
  UserPlus,
} from "lucide-react";

type WidgetType =
  | "passRate"
  | "recentRuns"
  | "riskTests"
  | "anomalies"
  | "perfTrend"
  | "team";

interface Widget {
  id: string;
  type: WidgetType;
  title: string;
  size: "small" | "medium" | "large";
}

interface SavedConfig {
  id: string;
  name: string;
  widgets: Widget[];
}

const defaultWidgets: Widget[] = [
  { id: "1", type: "passRate", title: "Pass Rate", size: "small" },
  { id: "2", type: "recentRuns", title: "Recent Runs", size: "medium" },
  { id: "3", type: "riskTests", title: "Top Risk Tests", size: "medium" },
  { id: "4", type: "anomalies", title: "Anomalies", size: "small" },
  { id: "5", type: "perfTrend", title: "Performance Trend", size: "large" },
];

const availableWidgets: { type: WidgetType; label: string; icon: any }[] = [
  { type: "passRate", label: "Pass Rate", icon: CheckCircle2 },
  { type: "recentRuns", label: "Recent Runs", icon: Activity },
  { type: "riskTests", label: "Top Risk Tests", icon: BarChart3 },
  { type: "anomalies", label: "Anomalies", icon: Sparkles },
  { type: "perfTrend", label: "Performance Trend", icon: Clock },
  { type: "team", label: "Team Activity", icon: Users },
];

const STORAGE_KEY = "tp:dashboard";
const CONFIGS_KEY = "tp:dashboard:configs";

export default function DashboardPage() {
  const [widgets, setWidgets] = useState<Widget[]>(defaultWidgets);
  const [configs, setConfigs] = useState<SavedConfig[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [showSave, setShowSave] = useState(false);
  const [newConfigName, setNewConfigName] = useState("");
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setWidgets(JSON.parse(saved));
      const savedConfigs = localStorage.getItem(CONFIGS_KEY);
      if (savedConfigs) setConfigs(JSON.parse(savedConfigs));
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(widgets));
  }, [widgets]);

  useEffect(() => {
    localStorage.setItem(CONFIGS_KEY, JSON.stringify(configs));
  }, [configs]);

  function addWidget(type: WidgetType) {
    const label = availableWidgets.find((w) => w.type === type)?.label || type;
    setWidgets([
      ...widgets,
      {
        id: Math.random().toString(36).slice(2),
        type,
        title: label,
        size: "medium",
      },
    ]);
    setShowAdd(false);
  }

  function removeWidget(id: string) {
    setWidgets(widgets.filter((w) => w.id !== id));
  }

  function cycleSize(id: string) {
    setWidgets(
      widgets.map((w) =>
        w.id === id
          ? {
              ...w,
              size:
                w.size === "small" ? "medium" : w.size === "medium" ? "large" : "small",
            }
          : w
      )
    );
  }

  function saveConfig() {
    if (!newConfigName.trim()) return;
    setConfigs([
      ...configs,
      {
        id: Math.random().toString(36).slice(2),
        name: newConfigName.trim(),
        widgets,
      },
    ]);
    setNewConfigName("");
    setShowSave(false);
  }

  function loadConfig(c: SavedConfig) {
    setWidgets(c.widgets);
  }

  function deleteConfig(id: string) {
    setConfigs(configs.filter((c) => c.id !== id));
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
            <LayoutDashboard className="h-6 w-6 text-blue-400" />
            Dashboard
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Customizable widgets with saved configurations and team views.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setEditMode(!editMode)}
            className={`flex items-center gap-2 px-3 py-2 rounded text-sm ${
              editMode
                ? "bg-blue-600 text-white"
                : "bg-gray-800 text-gray-300 hover:bg-gray-700"
            }`}
          >
            <SettingsIcon className="h-4 w-4" />
            {editMode ? "Done" : "Customize"}
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded text-sm text-gray-300"
          >
            <Plus className="h-4 w-4" /> Add Widget
          </button>
          <button
            onClick={() => setShowSave(true)}
            className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded text-sm text-gray-300"
          >
            <Save className="h-4 w-4" /> Save Layout
          </button>
        </div>
      </div>

      {configs.length > 0 && (
        <div className="mb-6 bg-gray-900 border border-gray-800 rounded-lg p-4">
          <div className="text-xs text-gray-400 mb-2 flex items-center gap-1">
            <Bookmark className="h-3 w-3" /> Saved layouts
          </div>
          <div className="flex flex-wrap gap-2">
            {configs.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-2 bg-gray-800 rounded px-3 py-1.5 group"
              >
                <button
                  onClick={() => loadConfig(c)}
                  className="text-sm text-gray-200 hover:text-blue-400"
                >
                  {c.name}
                </button>
                <button
                  onClick={() => deleteConfig(c.id)}
                  className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-6 gap-4 auto-rows-fr">
        {widgets.map((w) => (
          <WidgetCard
            key={w.id}
            widget={w}
            editMode={editMode}
            onRemove={() => removeWidget(w.id)}
            onResize={() => cycleSize(w.id)}
          />
        ))}
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-100">Add widget</h3>
              <button onClick={() => setShowAdd(false)}>
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {availableWidgets.map((w) => (
                <button
                  key={w.type}
                  onClick={() => addWidget(w.type)}
                  className="flex flex-col items-center gap-2 p-4 bg-gray-800 hover:bg-gray-700 rounded"
                >
                  <w.icon className="h-5 w-5 text-blue-400" />
                  <span className="text-sm text-gray-200">{w.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {showSave && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-100">Save layout</h3>
              <button onClick={() => setShowSave(false)}>
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>
            <input
              autoFocus
              value={newConfigName}
              onChange={(e) => setNewConfigName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && saveConfig()}
              placeholder="Layout name (e.g. QA Daily, Dev Triage)"
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-100 mb-3"
            />
            <button
              onClick={saveConfig}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded text-sm font-medium text-white"
            >
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function WidgetCard({
  widget,
  editMode,
  onRemove,
  onResize,
}: {
  widget: Widget;
  editMode: boolean;
  onRemove: () => void;
  onResize: () => void;
}) {
  const sizeClass = {
    small: "col-span-2",
    medium: "col-span-3",
    large: "col-span-6",
  }[widget.size];

  return (
    <div
      className={`${sizeClass} bg-gray-900 border border-gray-800 rounded-lg p-4 relative group`}
    >
      {editMode && (
        <div className="absolute top-2 right-2 flex gap-1 z-10">
          <button
            onClick={onResize}
            className="p-1 bg-gray-800 hover:bg-gray-700 rounded text-xs text-gray-400"
            title="Change size"
          >
            {widget.size}
          </button>
          <button
            onClick={onRemove}
            className="p-1 bg-gray-800 hover:bg-red-500/30 rounded"
          >
            <X className="h-3 w-3 text-red-400" />
          </button>
        </div>
      )}
      <div className="text-sm text-gray-400 mb-3">{widget.title}</div>
      <WidgetBody type={widget.type} />
    </div>
  );
}

function WidgetBody({ type }: { type: WidgetType }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const url =
      type === "passRate" || type === "perfTrend"
        ? "/api/reports/performance"
        : type === "recentRuns"
        ? "/api/runs"
        : type === "riskTests"
        ? "/api/workflow/risk-scores"
        : type === "anomalies"
        ? "/api/ai-lab/anomalies"
        : null;

    if (url) {
      fetch(url)
        .then((r) => r.json())
        .then((d) => {
          setData(d);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [type]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
      </div>
    );
  }

  if (type === "passRate") {
    const rate = data?.passRate || 0;
    return (
      <div>
        <div className="text-4xl font-bold text-green-400">{rate.toFixed(1)}%</div>
        <div className="text-xs text-gray-500 mt-1">
          {data?.totalRuns || 0} runs · last 30 days
        </div>
        <div className="mt-3 w-full bg-gray-800 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-green-500 to-emerald-400 h-2 rounded-full"
            style={{ width: `${rate}%` }}
          />
        </div>
      </div>
    );
  }

  if (type === "recentRuns") {
    const runs = (data?.runs || []).slice(0, 5);
    return (
      <div className="space-y-1.5">
        {runs.length === 0 && (
          <div className="text-xs text-gray-500 py-3">No runs yet.</div>
        )}
        {runs.map((r: any) => (
          <div
            key={r.id}
            className="flex items-center gap-2 text-sm"
          >
            {r.status === "PASSED" ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-green-400 shrink-0" />
            ) : r.status === "FAILED" ? (
              <XCircle className="h-3.5 w-3.5 text-red-400 shrink-0" />
            ) : (
              <Clock className="h-3.5 w-3.5 text-yellow-400 shrink-0" />
            )}
            <span className="text-gray-200 truncate flex-1">{r.test?.name}</span>
            <span className="text-xs text-gray-500">
              {r.duration ? `${(r.duration / 1000).toFixed(1)}s` : "—"}
            </span>
          </div>
        ))}
      </div>
    );
  }

  if (type === "riskTests") {
    const top = (data?.scores || []).slice(0, 5);
    return (
      <div className="space-y-2">
        {top.length === 0 && (
          <div className="text-xs text-gray-500 py-3">No data.</div>
        )}
        {top.map((s: any) => (
          <div key={s.id} className="flex items-center gap-2">
            <span className="text-sm text-gray-200 truncate flex-1">{s.name}</span>
            <div className="w-16 bg-gray-800 rounded-full h-1.5">
              <div
                className="bg-red-500 h-1.5 rounded-full"
                style={{ width: `${Math.min(s.riskScore, 100)}%` }}
              />
            </div>
            <span className="text-xs text-gray-400 w-8 text-right">
              {s.riskScore.toFixed(0)}
            </span>
          </div>
        ))}
      </div>
    );
  }

  if (type === "anomalies") {
    const anomalies = (data?.anomalies || []).slice(0, 3);
    return (
      <div>
        <div className="text-4xl font-bold text-orange-400">
          {data?.anomalies?.length || 0}
        </div>
        <div className="text-xs text-gray-500 mt-1 mb-3">active anomalies</div>
        <div className="space-y-1">
          {anomalies.map((a: any, i: number) => (
            <div key={i} className="text-xs text-gray-400 truncate">
              · {a.type}: {a.testName}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (type === "perfTrend") {
    const timeline = data?.timeline || [];
    if (timeline.length === 0) {
      return <div className="text-xs text-gray-500 py-3">No data.</div>;
    }
    const max = Math.max(...timeline.map((p: any) => p.avgDuration));
    return (
      <div>
        <div className="h-24 flex items-end gap-0.5">
          {timeline.map((p: any, i: number) => (
            <div
              key={i}
              className="flex-1 bg-blue-500/50 hover:bg-blue-500 rounded-t"
              style={{
                height: `${Math.max((p.avgDuration / max) * 100, 4)}%`,
              }}
              title={`${p.date}: ${(p.avgDuration / 1000).toFixed(2)}s`}
            />
          ))}
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-2">
          <span>{timeline[0]?.date}</span>
          <span>{timeline[timeline.length - 1]?.date}</span>
        </div>
      </div>
    );
  }

  if (type === "team") {
    return <TeamWidget />;
  }

  return null;
}

function TeamWidget() {
  const [members, setMembers] = useState<{ name: string; role: string }[]>([
    { name: "Ajay Jaiswar", role: "Owner" },
    { name: "Alisha", role: "QA Lead" },
  ]);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");

  function invite() {
    if (!newName.trim()) return;
    setMembers([...members, { name: newName.trim(), role: "Member" }]);
    setNewName("");
    setAdding(false);
  }

  return (
    <div className="space-y-2">
      {members.map((m, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-xs font-medium text-white">
            {m.name
              .split(" ")
              .map((s) => s[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
          </div>
          <span className="text-sm text-gray-200 flex-1">{m.name}</span>
          <span className="text-xs text-gray-500">{m.role}</span>
        </div>
      ))}
      {adding ? (
        <div className="flex gap-1 mt-2">
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && invite()}
            placeholder="Teammate email or name"
            className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-gray-100"
          />
          <button
            onClick={invite}
            className="px-2 py-1 bg-blue-600 hover:bg-blue-500 rounded text-xs text-white"
          >
            Invite
          </button>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 mt-2"
        >
          <UserPlus className="h-3 w-3" /> Invite teammate
        </button>
      )}
    </div>
  );
}

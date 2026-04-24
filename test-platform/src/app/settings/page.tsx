"use client";

import { useState } from "react";
import { Save } from "lucide-react";

export default function GeneralSettingsPage() {
  const [appName, setAppName] = useState("TestPlatform");
  const [baseUrl, setBaseUrl] = useState("");
  const [browser, setBrowser] = useState("chromium");
  const [viewportWidth, setViewportWidth] = useState(1280);
  const [viewportHeight, setViewportHeight] = useState(720);
  const [timeout, setTimeout_] = useState(30000);
  const [headless, setHeadless] = useState(true);
  const [parallel, setParallel] = useState(false);
  const [maxWorkers, setMaxWorkers] = useState(4);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appName,
          baseUrl,
          browser,
          viewportWidth,
          viewportHeight,
          timeout,
          headless,
          parallel,
          maxWorkers,
        }),
      });
    } catch (err) {
      console.error("Failed to save settings:", err);
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none";
  const labelClass = "text-sm font-medium text-gray-300";

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-100 mb-6">General Settings</h1>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-6">
        {/* App Name */}
        <div className="space-y-1.5">
          <label className={labelClass}>App Name</label>
          <input
            type="text"
            value={appName}
            onChange={(e) => setAppName(e.target.value)}
            className={inputClass}
          />
        </div>

        {/* Default Base URL */}
        <div className="space-y-1.5">
          <label className={labelClass}>Default Base URL</label>
          <input
            type="text"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="https://..."
            className={inputClass}
          />
        </div>

        {/* Browser */}
        <div className="space-y-1.5">
          <label className={labelClass}>Browser</label>
          <select
            value={browser}
            onChange={(e) => setBrowser(e.target.value)}
            className={inputClass}
          >
            <option value="chromium">Chromium</option>
            <option value="firefox">Firefox</option>
            <option value="webkit">WebKit</option>
          </select>
        </div>

        {/* Viewport */}
        <div className="space-y-1.5">
          <label className={labelClass}>Viewport</label>
          <div className="flex gap-4">
            <div className="flex-1">
              <input
                type="number"
                value={viewportWidth}
                onChange={(e) => setViewportWidth(Number(e.target.value))}
                placeholder="Width"
                className={inputClass}
              />
              <span className="text-xs text-gray-500 mt-1 block">Width</span>
            </div>
            <div className="flex-1">
              <input
                type="number"
                value={viewportHeight}
                onChange={(e) => setViewportHeight(Number(e.target.value))}
                placeholder="Height"
                className={inputClass}
              />
              <span className="text-xs text-gray-500 mt-1 block">Height</span>
            </div>
          </div>
        </div>

        {/* Timeout */}
        <div className="space-y-1.5">
          <label className={labelClass}>Timeout (ms)</label>
          <input
            type="number"
            value={timeout}
            onChange={(e) => setTimeout_(Number(e.target.value))}
            className={inputClass}
          />
        </div>

        {/* Headless Mode */}
        <div className="space-y-1.5">
          <label className={labelClass}>Headless Mode</label>
          <div className="flex items-center gap-3">
            <div
              onClick={() => setHeadless(!headless)}
              className={`w-11 h-6 rounded-full relative cursor-pointer transition-colors ${
                headless ? "bg-blue-600" : "bg-gray-700"
              }`}
            >
              <div
                className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                  headless ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </div>
            <span className="text-sm text-gray-400">
              {headless ? "Enabled" : "Disabled"}
            </span>
          </div>
        </div>

        {/* Parallel Execution */}
        <div className="space-y-1.5">
          <label className={labelClass}>Parallel Execution</label>
          <div className="flex items-center gap-3">
            <div
              onClick={() => setParallel(!parallel)}
              className={`w-11 h-6 rounded-full relative cursor-pointer transition-colors ${
                parallel ? "bg-blue-600" : "bg-gray-700"
              }`}
            >
              <div
                className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                  parallel ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </div>
            <span className="text-sm text-gray-400">
              {parallel ? "Enabled" : "Disabled"}
            </span>
          </div>
        </div>

        {/* Max Workers */}
        <div className="space-y-1.5">
          <label className={labelClass}>Max Workers</label>
          <input
            type="number"
            value={maxWorkers}
            onChange={(e) => setMaxWorkers(Number(e.target.value))}
            className={inputClass}
          />
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>
    </div>
  );
}

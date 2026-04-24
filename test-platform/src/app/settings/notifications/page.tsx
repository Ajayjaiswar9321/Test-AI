"use client";

import { useState } from "react";
import { Save, Bell } from "lucide-react";

export default function NotificationsSettingsPage() {
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [emailAddress, setEmailAddress] = useState("");
  const [slackWebhook, setSlackWebhook] = useState("");
  const [notifyOn, setNotifyOn] = useState({
    testPassed: false,
    testFailed: true,
    suiteCompleted: true,
    processingComplete: false,
  });
  const [frequency, setFrequency] = useState<"immediate" | "hourly" | "daily">(
    "immediate"
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch("/api/settings/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailEnabled,
          emailAddress,
          slackWebhook,
          notifyOn,
          frequency,
        }),
      });
    } catch (err) {
      console.error("Failed to save notification settings:", err);
    } finally {
      setSaving(false);
    }
  };

  const toggleNotifyOn = (key: keyof typeof notifyOn) => {
    setNotifyOn((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const inputClass =
    "w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none";
  const labelClass = "text-sm font-medium text-gray-300";

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-100 mb-6">
        Notification Settings
      </h1>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-6">
        {/* Email Notifications Toggle */}
        <div className="space-y-1.5">
          <label className={labelClass}>Email Notifications</label>
          <div className="flex items-center gap-3">
            <div
              onClick={() => setEmailEnabled(!emailEnabled)}
              className={`w-11 h-6 rounded-full relative cursor-pointer transition-colors ${
                emailEnabled ? "bg-blue-600" : "bg-gray-700"
              }`}
            >
              <div
                className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                  emailEnabled ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </div>
            <span className="text-sm text-gray-400">
              {emailEnabled ? "Enabled" : "Disabled"}
            </span>
          </div>
        </div>

        {/* Email Address (shown when email enabled) */}
        {emailEnabled && (
          <div className="space-y-1.5">
            <label className={labelClass}>Email Address</label>
            <input
              type="email"
              value={emailAddress}
              onChange={(e) => setEmailAddress(e.target.value)}
              placeholder="you@example.com"
              className={inputClass}
            />
          </div>
        )}

        {/* Slack Webhook */}
        <div className="space-y-1.5">
          <label className={labelClass}>Slack Webhook URL</label>
          <input
            type="text"
            value={slackWebhook}
            onChange={(e) => setSlackWebhook(e.target.value)}
            placeholder="https://hooks.slack.com/services/..."
            className={inputClass}
          />
        </div>

        {/* Notify On */}
        <div className="space-y-1.5">
          <label className={labelClass}>Notify On</label>
          <div className="space-y-3 pt-1">
            {[
              { key: "testPassed" as const, label: "Test Passed" },
              { key: "testFailed" as const, label: "Test Failed" },
              { key: "suiteCompleted" as const, label: "Suite Completed" },
              {
                key: "processingComplete" as const,
                label: "Processing Complete",
              },
            ].map(({ key, label }) => (
              <label
                key={key}
                className="flex items-center gap-3 cursor-pointer"
              >
                <div
                  onClick={() => toggleNotifyOn(key)}
                  className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                    notifyOn[key]
                      ? "bg-blue-600 border-blue-600"
                      : "bg-gray-800 border-gray-600"
                  }`}
                >
                  {notifyOn[key] && (
                    <svg
                      className="w-3 h-3 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </div>
                <span className="text-sm text-gray-300">{label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Notification Frequency */}
        <div className="space-y-1.5">
          <label className={labelClass}>Notification Frequency</label>
          <div className="space-y-3 pt-1">
            {[
              { value: "immediate" as const, label: "Immediate" },
              { value: "hourly" as const, label: "Hourly Digest" },
              { value: "daily" as const, label: "Daily Digest" },
            ].map(({ value, label }) => (
              <label
                key={value}
                className="flex items-center gap-3 cursor-pointer"
              >
                <div
                  onClick={() => setFrequency(value)}
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                    frequency === value
                      ? "border-blue-600"
                      : "border-gray-600"
                  }`}
                >
                  {frequency === value && (
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                  )}
                </div>
                <span className="text-sm text-gray-300">{label}</span>
              </label>
            ))}
          </div>
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

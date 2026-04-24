"use client";

import { useState, useEffect } from "react";
import {
  KeyRound,
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  X,
} from "lucide-react";

interface Secret {
  id: string;
  key: string;
  value: string;
  scope: string;
}

export default function SecretsSettingsPage() {
  const [secrets, setSecrets] = useState<Secret[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSecret, setEditingSecret] = useState<Secret | null>(null);
  const [formKey, setFormKey] = useState("");
  const [formValue, setFormValue] = useState("");
  const [formScope, setFormScope] = useState("global");
  const [showValue, setShowValue] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSecrets();
  }, []);

  const fetchSecrets = async () => {
    try {
      const res = await fetch("/api/secrets");
      if (res.ok) {
        const data = await res.json();
        setSecrets(data);
      }
    } catch (err) {
      console.error("Failed to fetch secrets:", err);
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingSecret(null);
    setFormKey("");
    setFormValue("");
    setFormScope("global");
    setShowValue(false);
    setModalOpen(true);
  };

  const openEditModal = (secret: Secret) => {
    setEditingSecret(secret);
    setFormKey(secret.key);
    setFormValue(secret.value);
    setFormScope(secret.scope);
    setShowValue(false);
    setModalOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const method = editingSecret ? "PUT" : "POST";
      const url = editingSecret
        ? `/api/secrets/${editingSecret.id}`
        : "/api/secrets";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: formKey,
          value: formValue,
          scope: formScope,
        }),
      });
      if (res.ok) {
        await fetchSecrets();
        setModalOpen(false);
      }
    } catch (err) {
      console.error("Failed to save secret:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/secrets/${id}`, { method: "DELETE" });
      if (res.ok) {
        setSecrets((prev) => prev.filter((s) => s.id !== id));
      }
    } catch (err) {
      console.error("Failed to delete secret:", err);
    }
  };

  const maskValue = (value: string) => {
    return "\u2022".repeat(Math.min(value.length, 20));
  };

  const inputClass =
    "w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none";
  const labelClass = "text-sm font-medium text-gray-300";

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-100">Secrets</h1>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Secret
        </button>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">
            Loading secrets...
          </div>
        ) : secrets.length === 0 ? (
          <div className="p-12 text-center">
            <KeyRound className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-300 mb-1">
              No secrets
            </h3>
            <p className="text-sm text-gray-500">
              Add secrets to use in your tests
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Key
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Value
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Scope
                </th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {secrets.map((secret) => (
                <tr
                  key={secret.id}
                  className="border-b border-gray-800 last:border-0"
                >
                  <td className="px-4 py-3 text-sm font-mono text-gray-100">
                    {secret.key}
                  </td>
                  <td className="px-4 py-3 text-sm font-mono text-gray-400">
                    {maskValue(secret.value)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${
                        secret.scope === "global"
                          ? "bg-blue-600/20 text-blue-400"
                          : "bg-purple-600/20 text-purple-400"
                      }`}
                    >
                      {secret.scope === "global" ? "Global" : secret.scope}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEditModal(secret)}
                        className="p-1.5 text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded-lg transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(secret.id)}
                        className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-gray-800 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 w-full max-w-md mx-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-100">
                {editingSecret ? "Edit Secret" : "Add Secret"}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className={labelClass}>Key</label>
              <input
                type="text"
                value={formKey}
                onChange={(e) => setFormKey(e.target.value)}
                placeholder="SECRET_KEY"
                className={inputClass}
              />
            </div>

            <div className="space-y-1.5">
              <label className={labelClass}>Value</label>
              <div className="relative">
                <input
                  type={showValue ? "text" : "password"}
                  value={formValue}
                  onChange={(e) => setFormValue(e.target.value)}
                  placeholder="Enter secret value"
                  className={`${inputClass} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowValue(!showValue)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-200"
                >
                  {showValue ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className={labelClass}>Scope</label>
              <select
                value={formScope}
                onChange={(e) => setFormScope(e.target.value)}
                className={inputClass}
              >
                <option value="global">Global</option>
                <option value="login-test">Login Test</option>
                <option value="checkout-test">Checkout Test</option>
                <option value="api-test">API Test</option>
              </select>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setModalOpen(false)}
                className="text-sm font-medium text-gray-400 hover:text-gray-200 px-4 py-2 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !formKey || !formValue}
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

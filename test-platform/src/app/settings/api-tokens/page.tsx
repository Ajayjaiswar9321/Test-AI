"use client";

import { useState, useEffect } from "react";
import { Plus, Copy, Code, Trash2, X, Check } from "lucide-react";

interface ApiToken {
  id: string;
  name: string;
  token: string;
  lastUsed: string | null;
  created: string;
  expires: string | null;
}

export default function ApiTokensSettingsPage() {
  const [tokens, setTokens] = useState<ApiToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [tokenName, setTokenName] = useState("");
  const [expiration, setExpiration] = useState("never");
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedGenerated, setCopiedGenerated] = useState(false);

  useEffect(() => {
    fetchTokens();
  }, []);

  const fetchTokens = async () => {
    try {
      const res = await fetch("/api/tokens");
      if (res.ok) {
        const data = await res.json();
        setTokens(data);
      }
    } catch (err) {
      console.error("Failed to fetch tokens:", err);
    } finally {
      setLoading(false);
    }
  };

  const openModal = () => {
    setTokenName("");
    setExpiration("never");
    setGeneratedToken(null);
    setCopiedGenerated(false);
    setModalOpen(true);
  };

  const handleGenerate = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: tokenName, expiration }),
      });
      if (res.ok) {
        const data = await res.json();
        setGeneratedToken(data.token);
        await fetchTokens();
      }
    } catch (err) {
      console.error("Failed to generate token:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleRevoke = async (id: string) => {
    try {
      const res = await fetch(`/api/tokens/${id}`, { method: "DELETE" });
      if (res.ok) {
        setTokens((prev) => prev.filter((t) => t.id !== id));
      }
    } catch (err) {
      console.error("Failed to revoke token:", err);
    }
  };

  const copyToClipboard = async (text: string, id?: string) => {
    try {
      await navigator.clipboard.writeText(text);
      if (id) {
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
      } else {
        setCopiedGenerated(true);
        setTimeout(() => setCopiedGenerated(false), 2000);
      }
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const maskToken = (token: string) => {
    if (token.length <= 8) return token;
    return token.slice(0, 8) + "\u2022".repeat(24);
  };

  const inputClass =
    "w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none";
  const labelClass = "text-sm font-medium text-gray-300";

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-100">API Tokens</h1>
        <button
          onClick={openModal}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Generate Token
        </button>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">
            Loading tokens...
          </div>
        ) : tokens.length === 0 ? (
          <div className="p-12 text-center">
            <Code className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-300 mb-1">
              No API tokens
            </h3>
            <p className="text-sm text-gray-500">
              Generate a token to access the API
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Name
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Token
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Last Used
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Created
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Expires
                </th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {tokens.map((token) => (
                <tr
                  key={token.id}
                  className="border-b border-gray-800 last:border-0"
                >
                  <td className="px-4 py-3 text-sm text-gray-100">
                    {token.name}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <code className="font-mono text-sm text-gray-400">
                        {maskToken(token.token)}
                      </code>
                      <button
                        onClick={() =>
                          copyToClipboard(token.token, token.id)
                        }
                        className="p-1 text-gray-500 hover:text-gray-300 transition-colors"
                      >
                        {copiedId === token.id ? (
                          <Check className="w-3.5 h-3.5 text-green-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-400">
                    {token.lastUsed || "Never"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-400">
                    {token.created}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-400">
                    {token.expires || "Never"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleRevoke(token.id)}
                      className="inline-flex items-center gap-1.5 text-sm text-red-400 hover:text-red-300 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      Revoke
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Generate Token Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 w-full max-w-md mx-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-100">
                {generatedToken ? "Token Generated" : "Generate API Token"}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {generatedToken ? (
              <div className="space-y-3">
                <p className="text-sm text-yellow-400">
                  Make sure to copy your token now. You will not be able to see
                  it again.
                </p>
                <div className="relative">
                  <code className="block w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-3 font-mono text-sm text-gray-100 break-all">
                    {generatedToken}
                  </code>
                  <button
                    onClick={() => copyToClipboard(generatedToken)}
                    className="absolute top-2 right-2 p-1.5 text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded transition-colors"
                  >
                    {copiedGenerated ? (
                      <Check className="w-4 h-4 text-green-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => setModalOpen(false)}
                    className="bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-1.5">
                  <label className={labelClass}>Token Name</label>
                  <input
                    type="text"
                    value={tokenName}
                    onChange={(e) => setTokenName(e.target.value)}
                    placeholder="e.g., CI/CD Pipeline"
                    className={inputClass}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className={labelClass}>Expiration</label>
                  <select
                    value={expiration}
                    onChange={(e) => setExpiration(e.target.value)}
                    className={inputClass}
                  >
                    <option value="never">Never</option>
                    <option value="30">30 days</option>
                    <option value="90">90 days</option>
                    <option value="365">1 year</option>
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
                    onClick={handleGenerate}
                    disabled={saving || !tokenName}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {saving ? "Generating..." : "Generate"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState } from "react";
import { Globe, FileText, Sparkles, Loader2 } from "lucide-react";

interface UiTestFormProps {
  onGenerate: (prd: string, url: string) => void;
  loading: boolean;
}

export const UiTestForm: React.FC<UiTestFormProps> = ({ onGenerate, loading }) => {
  const [url, setUrl] = useState("");
  const [prd, setPrd] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url && prd) onGenerate(prd, url);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-xs font-bold text-zinc-500 uppercase tracking-widest">
          <Globe size={12} />
          Target URL
        </label>
        <input
          type="url"
          required
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com"
          className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-xl p-4 text-zinc-900 dark:text-zinc-200 focus:outline-none focus:border-emerald-500/50 transition-colors shadow-sm"
        />
      </div>

      <div className="space-y-2">
        <label className="flex items-center gap-2 text-xs font-bold text-zinc-500 dark:text-zinc-500 uppercase tracking-widest">
          <FileText size={12} />
          Enter testing requirements
        </label>
        <textarea
          required
          value={prd}
          onChange={(e) => setPrd(e.target.value)}
          placeholder="Type what you want to test (e.g. 'check if login works')..."
          className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-xl p-4 text-zinc-900 dark:text-zinc-200 focus:outline-none focus:border-emerald-500/50 transition-colors h-48 resize-none shadow-sm"
        />
      </div>

      <button
        type="submit"
        disabled={loading || !url || !prd}
        className="w-full flex items-center justify-center gap-3 py-4 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:hover:bg-emerald-500 text-black font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.2)]"
      >
        {loading ? (
          <>
            <Loader2 size={20} className="animate-spin" />
            Generating Playwright Tests...
          </>
        ) : (
          <>
            <Sparkles size={20} />
            Generate & Run UI Test
          </>
        )}
      </button>
    </form>
  );
};

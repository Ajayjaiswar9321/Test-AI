import React from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Copy, Download, FileCode } from "lucide-react";

interface CodeViewerProps {
  code: string;
  filename: string;
}

export const CodeViewer: React.FC<CodeViewerProps> = ({ code, filename }) => {
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
  };

  const handleDownload = () => {
    const blob = new Blob([code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-xl overflow-hidden shadow-sm transition-colors">
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-50 dark:bg-zinc-800 border-b border-zinc-200 dark:border-white/10">
        <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-300 text-sm">
          <FileCode size={16} className="text-emerald-600 dark:text-emerald-400" />
          <span className="font-bold tracking-tight">{filename}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="p-1.5 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-white/5 rounded-md transition-colors"
            title="Copy Code"
          >
            <Copy size={16} />
          </button>
          <button
            onClick={handleDownload}
            className="p-1.5 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-white/5 rounded-md transition-colors"
            title="Download File"
          >
            <Download size={16} />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto text-sm">
        <SyntaxHighlighter
          language="typescript"
          style={vscDarkPlus}
          customStyle={{
            margin: 0,
            padding: "1.5rem",
            background: "transparent",
            fontSize: "0.85rem",
          }}
        >
          {code}
        </SyntaxHighlighter>
      </div>
    </div>
  );
};

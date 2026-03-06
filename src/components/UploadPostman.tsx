import React, { useState } from "react";
import { Upload, FileJson, Loader2, CheckCircle } from "lucide-react";

interface UploadPostmanProps {
  onImport: (collection: any) => void;
  loading: boolean;
}

export const UploadPostman: React.FC<UploadPostmanProps> = ({ onImport, loading }) => {
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFile = (file: File) => {
    const isJson = file.type === "application/json" || file.name.toLowerCase().endsWith(".json");
    if (!isJson) {
      alert("Please upload a valid JSON file");
      return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        onImport(json);
      } catch (err) {
        alert("Invalid JSON file");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
      onDragLeave={() => setDragActive(false)}
      onDrop={(e) => { e.preventDefault(); setDragActive(false); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); }}
      className={`relative group flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-xl transition-all duration-300 ${
        dragActive ? "border-emerald-400 dark:border-emerald-500/40 bg-emerald-50 dark:bg-emerald-500/5 scale-[1.01]" : "border-gray-200 dark:border-slate-700/30 hover:border-emerald-300 dark:hover:border-emerald-500/20 bg-gray-50/50 dark:bg-slate-900/30"
      }`}
    >
      <input
        type="file"
        accept=".json"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        className="absolute inset-0 opacity-0 cursor-pointer"
      />

      <div className="flex flex-col items-center gap-4 text-center">
        <div className={`p-4 rounded-xl transition-transform duration-500 border border-gray-200 dark:border-slate-700/20 ${loading ? "animate-spin" : "group-hover:scale-110"}`}>
          {loading ? (
            <Loader2 size={40} className="text-emerald-500" />
          ) : fileName ? (
            <CheckCircle size={40} className="text-emerald-500 dark:text-emerald-400" />
          ) : (
            <FileJson size={40} className="text-gray-400 dark:text-slate-500" />
          )}
        </div>

        <div>
          <h3 className="text-sm font-bold text-gray-800 dark:text-slate-200">
            {loading ? "AI is generating tests..." : fileName || "Import Postman Collection"}
          </h3>
          <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-1 mono-label">
            {fileName ? "File ready for generation" : "Drag and drop your collection.json here"}
          </p>
        </div>

        {!loading && !fileName && (
          <button className="mt-2 px-6 py-2 bg-gray-100 dark:bg-slate-800/50 hover:bg-gray-200 dark:hover:bg-slate-700/50 text-gray-700 dark:text-slate-300 border border-gray-200 dark:border-slate-700/30 hover:border-emerald-300 dark:hover:border-emerald-500/20 rounded-lg text-[10px] font-bold uppercase tracking-[0.15em] transition-all duration-200 active:scale-95 mono-label">
            Browse Files
          </button>
        )}
      </div>
    </div>
  );
};

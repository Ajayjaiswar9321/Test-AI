import React, { useState } from "react";
import {
  CheckCircle2,
  AlertCircle,
  Download,
  Clock,
  Globe,
  FileSpreadsheet,
  RotateCcw,
  Play,
  ArrowLeft,
  ChevronDown,
  Layers,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export interface TestStepResult {
  step: number;
  action: string;
  status: "passed" | "failed";
  detail: string;
  timestamp: string;
}

export interface TestReportData {
  steps: TestStepResult[];
  startTime: string;
  endTime: string;
  url: string;
  scenarioTitle: string;
}

interface TestReportProps {
  report: TestReportData;
  onNewTest: () => void;
  onRerun: () => void;
  onBack?: () => void;
  allReports?: TestReportData[];
}

const calcDuration = (startTime: string, endTime: string) => {
  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();
  const diff = Math.max(0, end - start);
  const secs = Math.floor(diff / 1000);
  const mins = Math.floor(secs / 60);
  const remainSecs = secs % 60;
  return mins > 0 ? `${mins}m ${remainSecs}s` : `${remainSecs}s`;
};

// Single scenario report card
const ScenarioCard: React.FC<{ report: TestReportData; index: number; defaultExpanded?: boolean }> = ({ report, index, defaultExpanded }) => {
  const [expanded, setExpanded] = useState(defaultExpanded ?? false);
  const passed = report.steps.filter((s) => s.status === "passed").length;
  const failed = report.steps.filter((s) => s.status === "failed").length;
  const total = report.steps.length;
  const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;
  const status = failed > 0 ? "failed" : "passed";
  const duration = calcDuration(report.startTime, report.endTime);

  return (
    <div className={`rounded-xl border transition-all ${
      status === "passed"
        ? "border-emerald-200 dark:border-emerald-500/20"
        : "border-rose-200 dark:border-rose-500/20"
    }`}>
      {/* Scenario Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
      >
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-[10px] font-bold ${
          status === "passed"
            ? "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30"
            : "bg-rose-100 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30"
        }`}>
          {status === "passed" ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-bold text-gray-800 dark:text-slate-200 truncate">
            {index + 1}. {report.scenarioTitle}
          </div>
          <div className="text-[10px] text-gray-400 dark:text-slate-500 mt-0.5 flex items-center gap-3">
            <span>{passed}/{total} passed</span>
            <span>{duration}</span>
          </div>
        </div>
        <span className={`text-sm font-black ${status === "passed" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500 dark:text-rose-400"}`}>
          {passRate}%
        </span>
        <span className="text-gray-400 dark:text-slate-500 shrink-0 transition-transform duration-200" style={{ transform: expanded ? "rotate(0deg)" : "rotate(-90deg)" }}>
          <ChevronDown size={14} />
        </span>
      </button>

      {/* Expanded steps table */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-gray-100 dark:border-slate-800/30">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 dark:bg-slate-900/80 border-b border-gray-200 dark:border-emerald-500/10">
                    <th className="text-left px-3 py-2 text-[8px] font-black text-emerald-600/40 dark:text-emerald-500/40 uppercase tracking-[0.2em] w-10 mono-label">#</th>
                    <th className="text-left px-3 py-2 text-[8px] font-black text-emerald-600/40 dark:text-emerald-500/40 uppercase tracking-[0.2em] mono-label">Step</th>
                    <th className="text-left px-3 py-2 text-[8px] font-black text-emerald-600/40 dark:text-emerald-500/40 uppercase tracking-[0.2em] w-20 mono-label">Status</th>
                    <th className="text-left px-3 py-2 text-[8px] font-black text-emerald-600/40 dark:text-emerald-500/40 uppercase tracking-[0.2em] hidden md:table-cell mono-label">Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {report.steps.map((s) => (
                    <tr
                      key={s.step}
                      className="border-b border-gray-100 dark:border-slate-800/30 last:border-0 hover:bg-emerald-50/50 dark:hover:bg-emerald-500/[0.02] transition-colors"
                    >
                      <td className="px-3 py-2.5 font-black text-gray-400 dark:text-slate-500 mono-label">{s.step}</td>
                      <td className="px-3 py-2.5 font-bold text-gray-800 dark:text-slate-200">{s.action}</td>
                      <td className="px-3 py-2.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-[0.15em] mono-label ${
                            s.status === "passed"
                              ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20"
                              : "bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20"
                          }`}
                        >
                          {s.status === "passed" ? <CheckCircle2 size={9} /> : <AlertCircle size={9} />}
                          {s.status}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-gray-400 dark:text-slate-500 truncate max-w-[200px] hidden md:table-cell">
                        {s.detail}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const TestReport: React.FC<TestReportProps> = ({ report, onNewTest, onRerun, onBack, allReports }) => {
  const reports = allReports && allReports.length > 1 ? allReports : [report];
  const isMulti = reports.length > 1;

  // Aggregate stats across all reports
  const totalSteps = reports.reduce((sum, r) => sum + r.steps.length, 0);
  const totalPassed = reports.reduce((sum, r) => sum + r.steps.filter(s => s.status === "passed").length, 0);
  const totalFailed = reports.reduce((sum, r) => sum + r.steps.filter(s => s.status === "failed").length, 0);
  const passRate = totalSteps > 0 ? Math.round((totalPassed / totalSteps) * 100) : 0;

  const scenariosPassed = reports.filter(r => r.steps.every(s => s.status === "passed")).length;
  const scenariosFailed = reports.length - scenariosPassed;
  const overallStatus = totalFailed > 0 ? "failed" : "passed";

  const totalDuration = (() => {
    const earliest = Math.min(...reports.map(r => new Date(r.startTime).getTime()));
    const latest = Math.max(...reports.map(r => new Date(r.endTime).getTime()));
    const diff = Math.max(0, latest - earliest);
    const secs = Math.floor(diff / 1000);
    const mins = Math.floor(secs / 60);
    const remainSecs = secs % 60;
    return mins > 0 ? `${mins}m ${remainSecs}s` : `${remainSecs}s`;
  })();

  const downloadCSV = () => {
    const allRows: any[][] = [
      ["Test Report Summary"],
      ["URL", reports[0].url],
      ["Date", new Date(reports[0].startTime).toLocaleDateString()],
      ["Total Scenarios", reports.length],
      ["Scenarios Passed", scenariosPassed],
      ["Scenarios Failed", scenariosFailed],
      ["Total Steps", totalSteps],
      ["Steps Passed", totalPassed],
      ["Steps Failed", totalFailed],
      ["Pass Rate", `${passRate}%`],
      ["Duration", totalDuration],
      ["Overall", overallStatus.toUpperCase()],
      [],
    ];

    for (const r of reports) {
      allRows.push(["Scenario", r.scenarioTitle]);
      allRows.push(["Start", new Date(r.startTime).toLocaleTimeString()]);
      allRows.push(["End", new Date(r.endTime).toLocaleTimeString()]);
      allRows.push(["Step #", "Action", "Status", "Detail", "Timestamp"]);
      for (const s of r.steps) {
        allRows.push([
          s.step,
          `"${s.action.replace(/"/g, '""')}"`,
          s.status.toUpperCase(),
          `"${s.detail.replace(/"/g, '""')}"`,
          new Date(s.timestamp).toLocaleString(),
        ]);
      }
      allRows.push([]);
    }

    const csv = allRows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `test-report-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col h-full bg-white dark:bg-slate-950 border border-gray-200 dark:border-emerald-500/10 rounded-xl overflow-hidden neon-border"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 md:px-5 py-2.5 md:py-3 bg-gray-50 dark:bg-slate-900/80 border-b border-gray-200 dark:border-emerald-500/10 shrink-0">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700/30 text-gray-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:border-emerald-200 dark:hover:border-emerald-500/30 hover:bg-emerald-50 dark:hover:bg-emerald-500/5 transition-all text-[9px] font-black uppercase tracking-[0.15em] mono-label"
            >
              <ArrowLeft size={12} />
              Back
            </button>
          )}
          <div className="flex items-center gap-2">
            <FileSpreadsheet size={12} className="text-emerald-500/50" />
            <span className="font-black uppercase tracking-[0.2em] text-[9px] text-emerald-600/50 dark:text-emerald-500/50 mono-label">
              Test Report
            </span>
            {isMulti && (
              <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-500/20 mono-label">
                {reports.length} scenarios
              </span>
            )}
          </div>
        </div>
        <button
          onClick={downloadCSV}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-white dark:text-black text-[9px] font-black uppercase tracking-[0.15em] rounded-lg transition-all shadow-sm active:scale-95 mono-label"
        >
          <Download size={10} />
          Export
        </button>
      </div>

      {/* Report Content */}
      <div className="flex-1 overflow-y-auto p-3 md:p-5 space-y-4 md:space-y-5">
        {/* Overall Status Banner */}
        <div
          className={`flex items-center justify-between p-3 md:p-4 rounded-xl border ${
            overallStatus === "passed"
              ? "bg-emerald-50 dark:bg-emerald-500/5 border-emerald-200 dark:border-emerald-500/20"
              : "bg-rose-50 dark:bg-rose-500/5 border-rose-200 dark:border-rose-500/20"
          }`}
        >
          <div className="flex items-center gap-3">
            {overallStatus === "passed" ? (
              <CheckCircle2 size={24} className="text-emerald-500 dark:text-emerald-400" />
            ) : (
              <AlertCircle size={24} className="text-rose-500 dark:text-rose-400" />
            )}
            <div>
              <div
                className={`text-[10px] font-black uppercase tracking-[0.2em] mono-label ${
                  overallStatus === "passed"
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-rose-600 dark:text-rose-400"
                }`}
              >
                {isMulti ? `${scenariosPassed}/${reports.length} Scenarios Passed` : `Test ${overallStatus}`}
              </div>
              <div className="text-[10px] text-gray-500 dark:text-slate-500 mt-0.5 font-medium">
                {isMulti ? reports[0].url : report.scenarioTitle}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className={`text-2xl font-black ${overallStatus === "passed" ? "text-emerald-600 dark:text-emerald-400 neon-text" : "text-rose-500 dark:text-rose-400"}`}>{passRate}%</div>
            <div className="text-[8px] text-gray-400 dark:text-slate-500 font-black uppercase tracking-[0.2em] mono-label">Pass Rate</div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className={`grid gap-2 md:gap-3 ${isMulti ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-5" : "grid-cols-2 md:grid-cols-4"}`}>
          {isMulti && (
            <div className="bg-gray-50 dark:bg-slate-900/50 rounded-lg p-3 border border-gray-200 dark:border-slate-700/30">
              <div className="text-[8px] text-gray-400 dark:text-slate-500 font-black uppercase tracking-[0.2em] mb-1 mono-label">Scenarios</div>
              <div className="text-lg font-black text-gray-800 dark:text-slate-200">{reports.length}</div>
            </div>
          )}
          <div className="bg-gray-50 dark:bg-slate-900/50 rounded-lg p-3 border border-gray-200 dark:border-slate-700/30">
            <div className="text-[8px] text-gray-400 dark:text-slate-500 font-black uppercase tracking-[0.2em] mb-1 mono-label">Steps</div>
            <div className="text-lg font-black text-gray-800 dark:text-slate-200">{totalSteps}</div>
          </div>
          <div className="bg-emerald-50 dark:bg-emerald-500/5 rounded-lg p-3 border border-emerald-200 dark:border-emerald-500/10">
            <div className="text-[8px] text-emerald-600 dark:text-emerald-500 font-black uppercase tracking-[0.2em] mb-1 mono-label">Passed</div>
            <div className="text-lg font-black text-emerald-600 dark:text-emerald-400">{totalPassed}</div>
          </div>
          <div className="bg-rose-50 dark:bg-rose-500/5 rounded-lg p-3 border border-rose-200 dark:border-rose-500/10">
            <div className="text-[8px] text-rose-600 dark:text-rose-500 font-black uppercase tracking-[0.2em] mb-1 mono-label">Failed</div>
            <div className="text-lg font-black text-rose-500 dark:text-rose-400">{totalFailed}</div>
          </div>
          <div className="bg-gray-50 dark:bg-slate-900/50 rounded-lg p-3 border border-gray-200 dark:border-slate-700/30">
            <div className="text-[8px] text-gray-400 dark:text-slate-500 font-black uppercase tracking-[0.2em] mb-1 mono-label">Duration</div>
            <div className="text-lg font-black text-gray-800 dark:text-slate-200">{totalDuration}</div>
          </div>
        </div>

        {/* Meta Info */}
        <div className="flex flex-wrap gap-4 text-[10px] text-gray-500 dark:text-slate-500 font-medium mono-label">
          <div className="flex items-center gap-1.5">
            <Globe size={10} className="text-emerald-500/40" />
            <span className="truncate max-w-[200px]">{reports[0].url}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock size={10} className="text-emerald-500/40" />
            <span>{new Date(reports[0].startTime).toLocaleString()}</span>
          </div>
        </div>

        {/* Scenario Reports */}
        {isMulti ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-emerald-600/50 dark:text-emerald-500/50 mono-label">
              <Layers size={12} />
              Scenario Results
            </div>
            {reports.map((r, idx) => (
              <ScenarioCard key={idx} report={r} index={idx} />
            ))}
          </div>
        ) : (
          /* Single scenario: inline steps table */
          <div className="border border-gray-200 dark:border-emerald-500/10 rounded-xl overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 dark:bg-slate-900/80 border-b border-gray-200 dark:border-emerald-500/10">
                  <th className="text-left px-3 py-2 text-[8px] font-black text-emerald-600/40 dark:text-emerald-500/40 uppercase tracking-[0.2em] w-10 mono-label">#</th>
                  <th className="text-left px-3 py-2 text-[8px] font-black text-emerald-600/40 dark:text-emerald-500/40 uppercase tracking-[0.2em] mono-label">Step</th>
                  <th className="text-left px-3 py-2 text-[8px] font-black text-emerald-600/40 dark:text-emerald-500/40 uppercase tracking-[0.2em] w-20 mono-label">Status</th>
                  <th className="text-left px-3 py-2 text-[8px] font-black text-emerald-600/40 dark:text-emerald-500/40 uppercase tracking-[0.2em] hidden md:table-cell mono-label">Detail</th>
                </tr>
              </thead>
              <tbody>
                {report.steps.map((s) => (
                  <tr
                    key={s.step}
                    className="border-b border-gray-100 dark:border-slate-800/30 last:border-0 hover:bg-emerald-50/50 dark:hover:bg-emerald-500/[0.02] transition-colors"
                  >
                    <td className="px-3 py-2.5 font-black text-gray-400 dark:text-slate-500 mono-label">{s.step}</td>
                    <td className="px-3 py-2.5 font-bold text-gray-800 dark:text-slate-200">{s.action}</td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-[0.15em] mono-label ${
                          s.status === "passed"
                            ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20"
                            : "bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20"
                        }`}
                      >
                        {s.status === "passed" ? <CheckCircle2 size={9} /> : <AlertCircle size={9} />}
                        {s.status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-gray-400 dark:text-slate-500 truncate max-w-[200px] hidden md:table-cell">
                      {s.detail}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="px-3 md:px-5 py-2.5 md:py-3 border-t border-gray-200 dark:border-emerald-500/10 bg-gray-50 dark:bg-slate-900/50 flex gap-2 md:gap-3 shrink-0">
        <button
          onClick={onNewTest}
          className="flex-1 py-3 rounded-lg border border-gray-200 dark:border-slate-700/30 text-[9px] font-black uppercase tracking-[0.15em] text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800/50 hover:text-gray-700 dark:hover:text-slate-200 transition-all flex items-center justify-center gap-2 mono-label"
        >
          <RotateCcw size={12} />
          New Test
        </button>
        <button
          onClick={onRerun}
          className="flex-[2] py-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white dark:text-black text-[9px] font-black uppercase tracking-[0.15em] transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 active:scale-95 neon-glow mono-label"
        >
          <Play size={12} fill="currentColor" />
          Re-Run All
        </button>
      </div>
    </motion.div>
  );
};

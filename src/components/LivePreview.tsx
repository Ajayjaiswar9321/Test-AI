import React, { useState, useEffect, useRef } from "react";
import { Globe, Lock, ExternalLink } from "lucide-react";
import { LogoMark, RobotOrb } from "./Logo";

interface LivePreviewProps {
    previewUrl?: string;
    status: "idle" | "running" | "completed" | "failed";
    targetUrl?: string;
}

export const LivePreview: React.FC<LivePreviewProps> = ({ previewUrl, status, targetUrl }) => {
    const [iframeLoaded, setIframeLoaded] = useState(false);
    const [iframeError, setIframeError] = useState(false);
    const prevUrlRef = useRef(targetUrl);
    const showIframe = !!targetUrl;

    // Reset iframe state when targetUrl changes
    useEffect(() => {
        if (targetUrl !== prevUrlRef.current) {
            setIframeLoaded(false);
            setIframeError(false);
            prevUrlRef.current = targetUrl;
        }
    }, [targetUrl]);

    return (
        <div className="flex flex-col h-full bg-white dark:bg-slate-950 border border-gray-200 dark:border-emerald-500/10 rounded-xl overflow-hidden neon-border transition-colors group">
            {/* Browser Chrome */}
            <div className="flex flex-col bg-gray-50 dark:bg-slate-900 transition-colors shrink-0">
                {/* Tabs Bar */}
                <div className="flex items-center gap-1 px-2 md:px-3 pt-1.5 md:pt-2">
                    <div className="flex items-center gap-1 md:gap-1.5 px-1 md:px-2 mr-1 md:mr-2">
                        <div className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full bg-rose-500/70 border border-rose-500/30" />
                        <div className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full bg-amber-500/70 border border-amber-500/30" />
                        <div className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full bg-emerald-500/70 border border-emerald-500/30" />
                    </div>
                    <div className="flex items-center gap-1.5 md:gap-2 px-2 md:px-4 py-1 md:py-1.5 bg-white dark:bg-slate-950 rounded-t-lg border-x border-t border-gray-200 dark:border-emerald-500/10 text-[8px] md:text-[9px] font-black uppercase tracking-[0.12em] md:tracking-[0.15em] text-gray-700 dark:text-slate-300 min-w-0 relative mono-label">
                        <LogoMark size={16} />
                        <span className="truncate">{status === "running" ? "Testing..." : "Live Preview"}</span>
                    </div>
                    {targetUrl && (
                        <a href={targetUrl} target="_blank" rel="noopener noreferrer" className="p-1 px-2 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded transition-colors cursor-pointer ml-1">
                            <ExternalLink size={12} className="text-gray-400 dark:text-slate-500" />
                        </a>
                    )}
                </div>

                {/* Toolbar */}
                <div className="flex items-center gap-2 md:gap-3 px-2 md:px-3 py-1 md:py-1.5 bg-white dark:bg-slate-950 border-b border-gray-200 dark:border-emerald-500/10 relative z-10">
                    <div className="hidden md:flex items-center gap-3 text-gray-400 dark:text-slate-500">
                        <button className="hover:bg-emerald-50 dark:hover:bg-emerald-500/10 p-1.5 rounded transition-colors"><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 13L5 8L10 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg></button>
                        <button className="hover:bg-emerald-50 dark:hover:bg-emerald-500/10 p-1.5 rounded transition-colors opacity-40"><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 3L11 8L6 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg></button>
                    </div>

                    {/* Address Bar */}
                    <div className="flex-1 flex items-center gap-1.5 md:gap-2 bg-gray-50 dark:bg-slate-900/50 rounded-lg px-2 md:px-4 py-1 md:py-1.5 border border-gray-200 dark:border-slate-700/30 transition-all">
                        <Lock size={10} className="text-emerald-500/40 shrink-0" />
                        <span className="text-[10px] text-gray-500 dark:text-slate-500 truncate flex-1 leading-none font-medium mono-label">
                            {targetUrl || "awaiting target..."}
                        </span>
                        {status === "running" && (
                            <div className="flex items-center gap-2 shrink-0">
                                <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.5)] animate-pulse" />
                                <span className="text-[8px] text-cyan-600 dark:text-cyan-400 font-black uppercase tracking-[0.2em] mono-label">Scanning</span>
                            </div>
                        )}
                        {status === "completed" && targetUrl && (
                            <div className="flex items-center gap-2 shrink-0">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                <span className="text-[8px] text-emerald-600 dark:text-emerald-400 font-black uppercase tracking-[0.2em] mono-label">Complete</span>
                            </div>
                        )}
                        {status === "idle" && targetUrl && (
                            <div className="flex items-center gap-2 shrink-0">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                <span className="text-[8px] text-gray-400 dark:text-slate-500 font-black uppercase tracking-[0.2em] mono-label">Secure</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Browser Viewport */}
            <div className="flex-1 relative bg-gray-50 dark:bg-slate-950 overflow-hidden">
                {/* Layer 1: Live iframe of the actual website */}
                {showIframe && (
                    <iframe
                        src={targetUrl}
                        title="Live Preview"
                        className={`absolute inset-0 w-full h-full border-0 transition-opacity duration-500 ${iframeLoaded && !iframeError ? "opacity-100" : "opacity-0"}`}
                        onLoad={() => setIframeLoaded(true)}
                        onError={() => setIframeError(true)}
                        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                    />
                )}

                {/* Layer 2: Live video feed during/after testing */}
                {previewUrl && (status === "running" || status === "completed") && (
                    <div className="absolute inset-0 z-10">
                        <img
                            src={previewUrl}
                            alt="Live Test Feed"
                            className="w-full h-full object-contain bg-gray-50 dark:bg-slate-950"
                        />
                    </div>
                )}

                {/* Layer 3: Empty state when no URL */}
                {!showIframe && !previewUrl && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="flex flex-col items-center gap-4 text-gray-400 dark:text-slate-600">
                            <RobotOrb size={90} />
                            <div className="text-center px-8">
                                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-600 dark:text-slate-300 mono-label">Viewport Ready</h3>
                                <p className="text-[9px] mt-2 text-gray-400 dark:text-slate-600 max-w-[200px] leading-relaxed font-bold mono-label">Enter target URL and generate test matrix to begin.</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Loading spinner for iframe */}
                {showIframe && !iframeLoaded && (
                    <div className="absolute inset-0 flex items-center justify-center z-5">
                        <div className="flex flex-col items-center gap-3">
                            <div className="w-8 h-8 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                            <span className="text-[9px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-[0.2em] mono-label">Loading target...</span>
                        </div>
                    </div>
                )}

                {/* Scanning overlay when running */}
                {status === "running" && (
                    <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
                        <div className="w-full h-1 bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent shadow-[0_0_20px_rgba(6,182,212,0.4)] absolute top-0 animate-[scan_4s_linear_infinite]" />
                        {/* Corner brackets during scanning */}
                        <div className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-cyan-500/40" />
                        <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-cyan-500/40" />
                        <div className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 border-cyan-500/40" />
                        <div className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 border-cyan-500/40" />
                    </div>
                )}
            </div>

            <style>{`
                @keyframes scan {
                    0% { top: -5%; }
                    50% { top: 105%; }
                    100% { top: -5%; }
                }
            `}</style>
        </div>
    );
};

import React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { motion } from "motion/react";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface TabsProps {
  tabs: { id: string; label: string; icon?: React.ReactNode }[];
  activeTab: string;
  onChange: (id: string) => void;
}

export const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onChange }) => {
  return (
    <div className="flex overflow-x-auto border-b border-gray-200 dark:border-emerald-500/10 bg-gray-50/60 dark:bg-slate-900/60 backdrop-blur-md sticky top-0 z-10 md:hidden scrollbar-none">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            "flex items-center gap-1.5 px-4 py-2.5 text-[9px] font-black uppercase tracking-[0.12em] transition-all duration-200 relative mono-label whitespace-nowrap shrink-0",
            activeTab === tab.id
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-gray-400 dark:text-slate-500 hover:text-gray-700 dark:hover:text-slate-300 hover:bg-gray-100/50 dark:hover:bg-slate-800/30"
          )}
        >
          {tab.icon}
          {tab.label}
          {activeTab === tab.id && (
            <motion.div
              layoutId="tab-indicator"
              className="absolute bottom-0 left-0 right-0 h-[2px] bg-emerald-500"
              style={{ boxShadow: "0 0 12px rgba(16,185,129,0.5), 0 0 4px rgba(16,185,129,0.3)" }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          )}
        </button>
      ))}
    </div>
  );
};

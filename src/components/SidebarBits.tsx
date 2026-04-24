import React from "react";
import { motion } from "motion/react";

export const SidebarSection: React.FC<{
  label: string;
  collapsed: boolean;
  children: React.ReactNode;
}> = ({ label, collapsed, children }) => (
  <div className="px-2.5 mb-2">
    {!collapsed && (
      <div className="px-2 pt-3 pb-1.5 text-[8px] font-black uppercase tracking-[0.25em] text-gray-400 dark:text-slate-700 mono-label">
        {label}
      </div>
    )}
    {collapsed && <div className="h-2" />}
    <div className="flex flex-col gap-0.5">{children}</div>
  </div>
);

export const SidebarLink: React.FC<{
  collapsed: boolean;
  icon: React.ReactNode;
  label: string;
  title?: string;
  onClick: () => void;
}> = ({ collapsed, icon, label, title, onClick }) => (
  <motion.button
    whileTap={{ scale: 0.97 }}
    onClick={onClick}
    title={collapsed ? (title || label) : title}
    className="group w-full flex items-center gap-3 px-3 py-2 rounded-lg text-gray-500 dark:text-slate-500 hover:text-gray-900 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800/50 border border-transparent transition-all mono-label"
  >
    <span className="shrink-0">{icon}</span>
    {!collapsed && (
      <span className="text-[11px] font-black uppercase tracking-[0.12em] truncate">{label}</span>
    )}
  </motion.button>
);

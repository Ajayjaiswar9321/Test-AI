"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FlaskConical,
  Activity,
  Layers,
  Settings as SettingsIcon,
  Bell,
  KeyRound,
  CreditCard,
  Code,
  ChevronDown,
  ChevronRight,
  Zap,
  BarChart3,
  Sparkles,
  LayoutDashboard,
} from "lucide-react";

const mainNavItems = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
  { label: "Tests", icon: FlaskConical, href: "/tests" },
  { label: "Runs", icon: Activity, href: "/runs" },
  { label: "Suites", icon: Layers, href: "/suites" },
  { label: "Workflow", icon: Zap, href: "/workflow" },
  { label: "Reports", icon: BarChart3, href: "/reports" },
  { label: "AI Lab", icon: Sparkles, href: "/ai-lab" },
];

const settingsItems = [
  { label: "General", icon: SettingsIcon, href: "/settings" },
  { label: "Notifications", icon: Bell, href: "/settings/notifications" },
  { label: "Secrets", icon: KeyRound, href: "/settings/secrets" },
  { label: "Billing", icon: CreditCard, href: "/settings/billing" },
  { label: "API Tokens", icon: Code, href: "/settings/api-tokens" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === "/settings") {
      return pathname === "/settings";
    }
    return pathname.startsWith(href);
  };

  return (
    <aside className="w-56 bg-gray-900 fixed inset-y-0 left-0 border-r border-gray-800 flex flex-col z-40">
      {/* Logo */}
      <Link
        href="/tests"
        className="flex items-center gap-2 px-4 py-5 border-b border-gray-800"
      >
        <FlaskConical className="h-5 w-5 text-blue-500" />
        <span className="text-lg font-bold text-gray-100">TestPlatform</span>
      </Link>

      {/* Main Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {mainNavItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                active
                  ? "bg-gray-800 text-white"
                  : "text-gray-400 hover:text-gray-200 hover:bg-gray-800/50"
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}

        {/* Settings Section */}
        <div className="pt-4">
          <button
            onClick={() => setSettingsOpen(!settingsOpen)}
            className="flex items-center gap-2 px-3 py-2 w-full text-sm text-gray-400 hover:text-gray-200 transition-colors"
          >
            {settingsOpen ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            <span className="font-medium">Settings</span>
          </button>

          {settingsOpen && (
            <div className="mt-1 space-y-1">
              {settingsItems.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 pl-4 px-3 py-2 rounded-lg text-sm transition-colors ${
                      active
                        ? "bg-gray-800 text-white"
                        : "text-gray-400 hover:text-gray-200 hover:bg-gray-800/50"
                    }`}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </nav>

      {/* User Profile */}
      <div className="mt-auto border-t border-gray-800 p-4 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-sm font-medium">
          AJ
        </div>
        <span className="text-sm text-gray-200 flex-1">Ajay Jaiswar</span>
        <Link href="/settings" className="text-gray-400 hover:text-gray-200 transition-colors">
          <SettingsIcon className="h-4 w-4" />
        </Link>
      </div>
    </aside>
  );
}

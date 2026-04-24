"use client";

import { CreditCard, Zap, HardDrive, ArrowUpRight } from "lucide-react";

export default function BillingSettingsPage() {
  const usedRuns = 67;
  const totalRuns = 100;
  const usagePercent = (usedRuns / totalRuns) * 100;

  const billingHistory = [
    { date: "2026-03-01", description: "Free Tier - Monthly", amount: "$0.00" },
    { date: "2026-02-01", description: "Free Tier - Monthly", amount: "$0.00" },
    { date: "2026-01-01", description: "Free Tier - Monthly", amount: "$0.00" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-100 mb-6">
        Billing & Usage
      </h1>

      <div className="space-y-6">
        {/* Current Plan */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <h2 className="text-lg font-semibold text-gray-100">
                  Current Plan
                </h2>
                <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-green-600/20 text-green-400">
                  Free Tier
                </span>
              </div>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-sm text-gray-400">
                  <Zap className="w-4 h-4 text-gray-500" />
                  100 test runs / month
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-400">
                  <CreditCard className="w-4 h-4 text-gray-500" />
                  5 test suites
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-400">
                  <HardDrive className="w-4 h-4 text-gray-500" />
                  Basic reporting
                </li>
              </ul>
            </div>
            <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
              <ArrowUpRight className="w-4 h-4" />
              Upgrade
            </button>
          </div>
        </div>

        {/* Usage */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-5">
          <h2 className="text-lg font-semibold text-gray-100">Usage</h2>

          {/* Test Runs Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-300">Test Runs</span>
              <span className="text-gray-400">
                {usedRuns} / {totalRuns} runs used this month
              </span>
            </div>
            <div className="w-full h-2.5 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full transition-all"
                style={{ width: `${usagePercent}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4">
              <p className="text-sm text-gray-400 mb-1">Tests Created</p>
              <p className="text-2xl font-semibold text-gray-100">12</p>
            </div>
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4">
              <p className="text-sm text-gray-400 mb-1">Storage Used</p>
              <p className="text-2xl font-semibold text-gray-100">
                1.2 <span className="text-sm text-gray-400 font-normal">/ 5 GB</span>
              </p>
            </div>
          </div>
        </div>

        {/* Billing History */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-800">
            <h2 className="text-lg font-semibold text-gray-100">
              Billing History
            </h2>
          </div>

          {billingHistory.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">
              No billing history available
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {billingHistory.map((item, index) => (
                  <tr
                    key={index}
                    className="border-b border-gray-800 last:border-0"
                  >
                    <td className="px-6 py-3 text-sm text-gray-300">
                      {item.date}
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-300">
                      {item.description}
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-300 text-right">
                      {item.amount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

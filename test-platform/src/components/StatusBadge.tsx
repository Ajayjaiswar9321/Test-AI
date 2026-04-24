"use client";

import { getStatusColor } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  pulse?: boolean;
  className?: string;
}

export default function StatusBadge({ status, pulse, className = "" }: StatusBadgeProps) {
  const colorClasses = getStatusColor(status);
  const shouldPulse =
    pulse && (status.toUpperCase() === "PROCESSING" || status.toUpperCase() === "RUNNING");

  const displayStatus = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${colorClasses} ${
        shouldPulse ? "animate-pulse" : ""
      } ${className}`}
    >
      {displayStatus}
    </span>
  );
}

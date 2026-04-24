import { type ClassValue, clsx } from "clsx";

// Simple cn utility without tailwind-merge to avoid extra dependency
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

export function maskSecret(value: string): string {
  if (value.length <= 4) return "****";
  return value.slice(0, 2) + "******" + value.slice(-2);
}

export function getStatusColor(status: string): string {
  switch (status) {
    case "READY":
    case "PASSED":
    case "completed":
      return "text-green-400 bg-green-400/10 border-green-400/20";
    case "PROCESSING":
    case "RUNNING":
    case "running":
    case "QUEUED":
      return "text-blue-400 bg-blue-400/10 border-blue-400/20";
    case "FAILED":
    case "failed":
      return "text-red-400 bg-red-400/10 border-red-400/20";
    case "DRAFT":
    case "pending":
      return "text-gray-400 bg-gray-400/10 border-gray-400/20";
    case "CANCELLED":
      return "text-yellow-400 bg-yellow-400/10 border-yellow-400/20";
    default:
      return "text-gray-400 bg-gray-400/10 border-gray-400/20";
  }
}

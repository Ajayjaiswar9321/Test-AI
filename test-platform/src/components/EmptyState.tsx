"use client";

import React from "react";

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="rounded-full bg-gray-800 p-4 text-gray-500">{icon}</div>
      <h3 className="text-lg font-medium text-gray-200 mt-4">{title}</h3>
      <p className="text-sm text-gray-500 mt-1">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

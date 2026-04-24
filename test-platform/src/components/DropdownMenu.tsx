"use client";

import { useState, useRef, useEffect } from "react";
import React from "react";

interface DropdownItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: "default" | "danger";
}

interface DropdownMenuProps {
  trigger: React.ReactNode;
  items: DropdownItem[];
}

export default function DropdownMenu({ trigger, items }: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  return (
    <div className="relative" ref={menuRef}>
      <button onClick={() => setOpen(!open)} className="focus:outline-none">
        {trigger}
      </button>

      {open && (
        <div className="absolute right-0 mt-1 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 py-1 transition-all">
          {items.map((item, index) => (
            <button
              key={index}
              onClick={() => {
                item.onClick();
                setOpen(false);
              }}
              className={`w-full px-3 py-2 text-sm text-left flex items-center gap-2 transition-colors ${
                item.variant === "danger"
                  ? "text-red-400 hover:text-red-300 hover:bg-gray-700"
                  : "text-gray-300 hover:text-gray-100 hover:bg-gray-700"
              }`}
            >
              {item.icon && <span className="h-4 w-4">{item.icon}</span>}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

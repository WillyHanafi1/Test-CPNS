"use client";

import React from "react";

interface AdminSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
  tone?: "accent" | "success" | "warning";
}

const ACTIVE_BG = {
  accent: "bg-accent-solid",
  success: "bg-success",
  warning: "bg-warning-solid",
};

export function AdminSwitch({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  tone = "accent",
}: AdminSwitchProps) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-line bg-surface-subtle/60 px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-ink">{label}</p>
        {description && (
          <p className="text-xs text-muted mt-0.5 leading-relaxed">
            {description}
          </p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-label={label}
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border border-transparent transition-colors focus-visible:outline-none disabled:opacity-50 ${
          checked ? ACTIVE_BG[tone] : "bg-line"
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
            checked ? "translate-x-5" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}

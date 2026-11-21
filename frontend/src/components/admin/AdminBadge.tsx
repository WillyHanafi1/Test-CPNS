"use client";

import React from "react";

export type AdminTone = "neutral" | "accent" | "success" | "warning" | "danger";

const TONE_CLASSES: Record<AdminTone, string> = {
  neutral: "bg-surface-hover text-muted border-line",
  accent: "bg-accent-soft text-accent border-accent-border",
  success: "bg-success-soft text-success border-transparent",
  warning: "bg-warning-soft text-warning border-transparent",
  danger: "bg-danger-soft text-danger border-transparent",
};

const DOT_CLASSES: Record<AdminTone, string> = {
  neutral: "bg-muted",
  accent: "bg-accent-solid",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger-solid",
};

interface AdminBadgeProps {
  children: React.ReactNode;
  tone?: AdminTone;
  dot?: boolean;
  className?: string;
}

export function AdminBadge({
  children,
  tone = "neutral",
  dot = false,
  className = "",
}: AdminBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold leading-5 whitespace-nowrap ${TONE_CLASSES[tone]} ${className}`}
    >
      {dot && (
        <span
          className={`h-1.5 w-1.5 rounded-full shrink-0 ${DOT_CLASSES[tone]}`}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
}

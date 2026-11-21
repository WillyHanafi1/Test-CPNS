"use client";

import React from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import type { AdminTone } from "./AdminBadge";

const ICON_TONE: Record<AdminTone, string> = {
  neutral: "bg-surface-subtle text-muted border-line",
  accent: "bg-accent-soft text-accent border-accent-border",
  success: "bg-success-soft text-success border-transparent",
  warning: "bg-warning-soft text-warning border-transparent",
  danger: "bg-danger-soft text-danger border-transparent",
};

interface AdminStatCardProps {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  tone?: AdminTone;
  badge?: string;
  href?: string;
  loading?: boolean;
}

export function AdminStatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "accent",
  badge,
  href,
  loading = false,
}: AdminStatCardProps) {
  const content = (
    <div
      className={`rounded-2xl border border-line bg-surface p-4 sm:p-5 transition-colors ${
        href ? "hover:border-accent-border hover:bg-surface-subtle/50" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted truncate">{label}</p>
          {loading ? (
            <div className="mt-2 h-7 w-24 rounded-md bg-surface-hover animate-pulse" />
          ) : (
            <p className="mt-1.5 text-2xl font-semibold tracking-tight text-ink tabular-nums">
              {value}
            </p>
          )}
        </div>
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${ICON_TONE[tone]}`}
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
        </div>
      </div>
      {(hint || badge) && (
        <div className="mt-3 flex items-center justify-between gap-2 text-xs text-muted">
          <span className="truncate">{hint}</span>
          {badge && (
            <span className="shrink-0 rounded-full bg-surface-hover px-2 py-0.5 text-xs font-semibold text-ink">
              {badge}
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block focus-visible:outline-none">
        {content}
      </Link>
    );
  }

  return content;
}

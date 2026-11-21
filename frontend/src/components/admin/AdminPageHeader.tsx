"use client";

import React from "react";

interface AdminPageHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function AdminPageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
}: AdminPageHeaderProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-1">
            {eyebrow}
          </p>
        )}
        <h1 className="text-2xl sm:text-[28px] font-semibold tracking-tight text-ink leading-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-muted mt-1 leading-relaxed">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}

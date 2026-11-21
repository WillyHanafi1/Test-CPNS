"use client";

import React from "react";
import { Search, X } from "lucide-react";

interface AdminFilterBarProps {
  search?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  children?: React.ReactNode;
  hasActiveFilters?: boolean;
  onResetFilters?: () => void;
  resultLabel?: string;
}

export function AdminFilterBar({
  search,
  onSearchChange,
  searchPlaceholder = "Cari data…",
  children,
  hasActiveFilters = false,
  onResetFilters,
  resultLabel,
}: AdminFilterBarProps) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-3 sm:p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        {onSearchChange !== undefined && (
          <div className="relative flex-1 min-w-0">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
              aria-hidden="true"
            />
            <input
              type="search"
              value={search ?? ""}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              className="h-10 w-full rounded-xl border border-control-line bg-canvas pl-9 pr-9 text-sm text-ink placeholder:text-muted focus:border-accent focus:outline-none"
            />
            {search && (
              <button
                type="button"
                aria-label="Hapus pencarian"
                onClick={() => onSearchChange("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1 text-muted hover:bg-surface-hover hover:text-ink"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}
        {children && (
          <div className="flex flex-wrap items-center gap-2">{children}</div>
        )}
        {hasActiveFilters && onResetFilters && (
          <button
            type="button"
            onClick={onResetFilters}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-line bg-surface-subtle px-3 text-xs font-semibold text-muted hover:bg-surface-hover hover:text-ink"
          >
            <X className="h-3.5 w-3.5" />
            Reset filter
          </button>
        )}
      </div>
      {resultLabel && (
        <p className="mt-2.5 text-xs text-muted">{resultLabel}</p>
      )}
    </div>
  );
}

"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface AdminPaginationProps {
  page: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export function AdminPagination({
  page,
  total,
  pageSize,
  onPageChange,
}: AdminPaginationProps) {
  const start = total ? (page - 1) * pageSize + 1 : 0;
  const end = Math.min(page * pageSize, total);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-line bg-surface px-4 py-3">
      <p className="text-xs text-muted tabular-nums">
        Menampilkan <strong className="text-ink">{start}</strong>–
        <strong className="text-ink">{end}</strong> dari{" "}
        <strong className="text-ink">{total}</strong> data
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Halaman sebelumnya"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-canvas text-ink hover:bg-surface-hover disabled:opacity-45"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="min-w-[84px] text-center text-xs font-semibold text-ink tabular-nums">
          Hal {page} / {totalPages}
        </span>
        <button
          type="button"
          aria-label="Halaman berikutnya"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-canvas text-ink hover:bg-surface-hover disabled:opacity-45"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

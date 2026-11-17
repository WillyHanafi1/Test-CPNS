"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

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

  return (
    <div className="bg-surface px-8 py-6 flex items-center justify-between border-t border-line">
      <p className="text-xs font-bold text-muted uppercase tracking-wide">
        Menampilkan <span className="text-ink">{start}</span>–{" "}
        <span className="text-ink">{end}</span> dari{" "}
        <span className="text-ink">{total}</span>
      </p>
      <div className="flex items-center space-x-2">
        <Button
          aria-label="Halaman sebelumnya"
          variant="outline"
          size="icon"
          className="w-10 h-10 rounded-xl border-line bg-canvas"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page === 1}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <div className="bg-accent-solid text-white w-10 h-10 rounded-xl flex items-center justify-center text-sm font-semibold shadow-lg ">
          {page}
        </div>
        <Button
          aria-label="Halaman berikutnya"
          variant="outline"
          size="icon"
          className="w-10 h-10 rounded-xl border-line bg-canvas"
          onClick={() => onPageChange(page + 1)}
          disabled={page * pageSize >= total}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

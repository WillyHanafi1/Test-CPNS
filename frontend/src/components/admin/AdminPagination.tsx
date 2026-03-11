"use client";

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AdminPaginationProps {
  page: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export function AdminPagination({ page, total, pageSize, onPageChange }: AdminPaginationProps) {
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="bg-slate-900/50 px-8 py-6 flex items-center justify-between border-t border-slate-800">
      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
        Showing <span className="text-slate-300">{start}</span> to <span className="text-slate-300">{end}</span> of <span className="text-slate-300">{total}</span>
      </p>
      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="icon"
          className="w-10 h-10 rounded-xl border-slate-800 bg-slate-950"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page === 1}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <div className="bg-indigo-600 text-white w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black shadow-lg shadow-indigo-600/20">
          {page}
        </div>
        <Button
          variant="outline"
          size="icon"
          className="w-10 h-10 rounded-xl border-slate-800 bg-slate-950"
          onClick={() => onPageChange(page + 1)}
          disabled={page * pageSize >= total}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

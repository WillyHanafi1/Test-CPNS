"use client";

import React from 'react';
import { Card } from '@/components/ui/card';

export interface Column<T> {
  header: string;
  accessor?: keyof T;
  render?: (item: T) => React.ReactNode;
  className?: string;
}

interface AdminDataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyIcon?: React.ReactNode;
  emptyText?: string;
}

export function AdminDataTable<T extends { id: string | number }>({
  columns,
  data,
  loading = false,
  emptyIcon,
  emptyText = "Belum ada data ditemukan",
}: AdminDataTableProps<T>) {
  return (
    <div className="bg-slate-900/20 border border-slate-800/40 rounded-[2.5rem] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-900/50 border-b border-slate-800">
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  className={`px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-500 ${col.className || ''}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td colSpan={columns.length} className="px-8 py-8">
                    <div className="h-4 bg-slate-800 rounded w-full" />
                  </td>
                </tr>
              ))
            ) : data.length > 0 ? (
              data.map((item) => (
                <tr key={item.id} className="hover:bg-slate-900/30 transition-colors group">
                  {columns.map((col, idx) => (
                    <td key={idx} className={`px-8 py-6 ${col.className || ''}`}>
                      {col.render ? col.render(item) : col.accessor ? String(item[col.accessor]) : null}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="px-8 py-20 text-center">
                  {emptyIcon && <div className="mx-auto mb-4">{emptyIcon}</div>}
                  <p className="text-slate-600 font-bold uppercase tracking-widest text-xs">
                    {emptyText}
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

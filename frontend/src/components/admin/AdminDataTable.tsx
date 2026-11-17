"use client";

import React from "react";
import { Card } from "@/components/ui/card";

export interface Column<T> {
  header: string;
  accessor?: keyof T;
  render?: (item: T) => React.ReactNode;
  className?: string;
  id?: string;
}

interface AdminDataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyIcon?: React.ReactNode;
  emptyText?: string;
  selectedIds?: Set<string | number>;
  onSelectToggle?: (id: string | number) => void;
  onSelectAll?: (allIds: (string | number)[]) => void;
}

export function AdminDataTable<T extends { id: string | number }>({
  columns,
  data,
  loading = false,
  emptyIcon,
  emptyText = "Belum ada data ditemukan",
  selectedIds = new Set(),
  onSelectToggle,
  onSelectAll,
}: AdminDataTableProps<T>) {
  const isAllSelected = data.length > 0 && selectedIds.size === data.length;

  return (
    <div className="bg-surface border border-line rounded-2xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface border-b border-line">
              {onSelectAll && (
                <th className="px-8 py-6 w-10">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-line bg-canvas accent-indigo-500 cursor-pointer"
                    checked={isAllSelected}
                    onChange={() => onSelectAll(data.map((d) => d.id))}
                  />
                </th>
              )}
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  className={`px-8 py-6 text-xs font-semibold uppercase tracking-wide text-muted ${col.className || ""}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td colSpan={columns.length} className="px-8 py-8">
                    <div className="h-4 bg-surface-hover rounded w-full" />
                  </td>
                </tr>
              ))
            ) : data.length > 0 ? (
              data.map((item) => (
                <tr
                  key={item.id}
                  className={`hover:bg-surface transition-all group border-b border-line font-medium ${
                    selectedIds.has(item.id) ? "bg-accent-soft" : ""
                  }`}
                >
                  {onSelectToggle && (
                    <td className="px-8 py-6">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-line bg-canvas accent-indigo-500 cursor-pointer"
                        checked={selectedIds.has(item.id)}
                        onChange={() => onSelectToggle(item.id)}
                      />
                    </td>
                  )}
                  {columns.map((col, idx) => (
                    <td
                      key={idx}
                      className={`px-8 py-6 ${col.className || ""}`}
                    >
                      {col.render
                        ? col.render(item)
                        : col.accessor
                          ? String(item[col.accessor])
                          : null}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="px-8 py-20 text-center">
                  {emptyIcon && <div className="mx-auto mb-4">{emptyIcon}</div>}
                  <p className="text-muted font-bold uppercase tracking-wide text-xs">
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

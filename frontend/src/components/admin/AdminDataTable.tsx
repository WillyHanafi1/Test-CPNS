"use client";

import React from "react";

export interface Column<T> {
  header: string;
  accessor?: keyof T;
  render?: (item: T) => React.ReactNode;
  className?: string;
  headerClassName?: string;
  id?: string;
}

interface AdminDataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyIcon?: React.ReactNode;
  emptyText?: string;
  emptyHint?: string;
  selectedIds?: Set<string | number>;
  onSelectToggle?: (id: string | number) => void;
  onSelectAll?: (allIds: (string | number)[]) => void;
  onRowClick?: (item: T) => void;
}

export function AdminDataTable<T extends { id: string | number }>({
  columns,
  data,
  loading = false,
  emptyIcon,
  emptyText = "Belum ada data ditemukan",
  emptyHint,
  selectedIds = new Set(),
  onSelectToggle,
  onSelectAll,
  onRowClick,
}: AdminDataTableProps<T>) {
  const hasSelection = Boolean(onSelectAll || onSelectToggle);
  const totalColSpan = columns.length + (hasSelection ? 1 : 0);
  const isAllSelected =
    data.length > 0 && data.every((item) => selectedIds.has(item.id));

  return (
    <div className="rounded-2xl border border-line bg-surface overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-line bg-surface-subtle/70">
              {hasSelection && (
                <th className="w-11 px-4 py-3">
                  {onSelectAll && (
                    <input
                      type="checkbox"
                      aria-label="Pilih semua baris di halaman ini"
                      className="h-4 w-4 rounded border-control-line bg-canvas cursor-pointer"
                      checked={isAllSelected}
                      onChange={() => onSelectAll(data.map((d) => d.id))}
                    />
                  )}
                </th>
              )}
              {columns.map((col, idx) => (
                <th
                  key={col.id ?? `${col.header}-${idx}`}
                  className={`px-4 py-3 text-xs font-semibold text-muted whitespace-nowrap ${col.headerClassName ?? col.className ?? ""}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={totalColSpan} className="px-4 py-4">
                    <div className="h-4 w-full rounded-md bg-surface-hover animate-pulse" />
                  </td>
                </tr>
              ))
            ) : data.length > 0 ? (
              data.map((item) => {
                const selected = selectedIds.has(item.id);
                return (
                  <tr
                    key={item.id}
                    onClick={onRowClick ? () => onRowClick(item) : undefined}
                    className={`transition-colors ${
                      onRowClick ? "cursor-pointer" : ""
                    } ${
                      selected
                        ? "bg-accent-soft/70 hover:bg-accent-soft"
                        : "hover:bg-surface-hover/60"
                    }`}
                  >
                    {hasSelection && (
                      <td
                        className="px-4 py-3.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {onSelectToggle && (
                          <input
                            type="checkbox"
                            aria-label="Pilih baris"
                            className="h-4 w-4 rounded border-control-line bg-canvas cursor-pointer"
                            checked={selected}
                            onChange={() => onSelectToggle(item.id)}
                          />
                        )}
                      </td>
                    )}
                    {columns.map((col, idx) => (
                      <td
                        key={col.id ?? `${col.header}-${idx}`}
                        className={`px-4 py-3.5 align-middle text-sm text-ink ${col.className ?? ""}`}
                      >
                        {col.render
                          ? col.render(item)
                          : col.accessor
                            ? String(item[col.accessor] ?? "")
                            : null}
                      </td>
                    ))}
                  </tr>
                );
              })
            ) : (
              <tr>
                <td
                  colSpan={totalColSpan}
                  className="px-6 py-14 text-center"
                >
                  {emptyIcon && (
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-subtle text-muted">
                      {emptyIcon}
                    </div>
                  )}
                  <p className="text-sm font-semibold text-ink">{emptyText}</p>
                  {emptyHint && (
                    <p className="mt-1 text-xs text-muted">{emptyHint}</p>
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

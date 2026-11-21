"use client";

import React from "react";
import { AlertCircle, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import AdminDialog from "./AdminDialog";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "info";
  loading?: boolean;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Konfirmasi",
  cancelText = "Batal",
  variant = "danger",
  loading = false,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const icon =
    variant === "danger" ? (
      <AlertCircle className="h-5 w-5 text-danger" />
    ) : variant === "warning" ? (
      <AlertTriangle className="h-5 w-5 text-warning" />
    ) : (
      <CheckCircle2 className="h-5 w-5 text-accent" />
    );

  const iconWrap =
    variant === "danger"
      ? "bg-danger-soft"
      : variant === "warning"
        ? "bg-warning-soft"
        : "bg-accent-soft";

  const confirmClass =
    variant === "danger"
      ? "bg-danger-solid text-white hover:opacity-90"
      : variant === "warning"
        ? "bg-warning-solid text-white hover:opacity-90"
        : "bg-accent-solid text-white hover:opacity-90";

  return (
    <AdminDialog
      label={title}
      title={title}
      size="sm"
      onClose={() => !loading && onClose()}
      footer={
        <>
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="inline-flex h-9 items-center justify-center rounded-xl border border-line bg-surface px-4 text-sm font-medium text-ink hover:bg-surface-hover disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className={`inline-flex h-9 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold disabled:opacity-50 ${confirmClass}`}
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {confirmText}
          </button>
        </>
      }
    >
      <div className="flex items-start gap-3.5">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconWrap}`}
        >
          {icon}
        </div>
        <p className="text-sm text-muted leading-relaxed">{description}</p>
      </div>
    </AdminDialog>
  );
}

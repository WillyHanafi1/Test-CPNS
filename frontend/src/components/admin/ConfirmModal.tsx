"use client";
import AdminDialog from "@/components/admin/AdminDialog";

import React from "react";
import { X, AlertCircle, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

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

  const getIcon = () => {
    switch (variant) {
      case "danger":
        return <AlertCircle className="w-6 h-6 text-danger" />;
      case "warning":
        return <AlertTriangle className="w-6 h-6 text-warning" />;
      default:
        return <CheckCircle2 className="w-6 h-6 text-accent" />;
    }
  };

  const getButtonStyle = () => {
    switch (variant) {
      case "danger":
        return "bg-danger-solid hover:bg-danger-solid ";
      case "warning":
        return "bg-warning-solid hover:bg-warning-solid ";
      default:
        return "bg-accent-solid hover:bg-accent-solid ";
    }
  };

  return (
    <AdminDialog label={title} onClose={onClose}>
      <Card className="relative w-full max-w-md bg-surface border-line border rounded-2xl shadow-sm overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${
                  variant === "danger"
                    ? "bg-danger-soft border-line"
                    : variant === "warning"
                      ? "bg-warning-soft border-line"
                      : "bg-accent-soft border-accent-border"
                }`}
              >
                {getIcon()}
              </div>
              <div>
                <h2 className="text-xl font-semibold tracking-tight">
                  {title}
                </h2>
                <p className="text-xs font-bold text-muted uppercase tracking-wide">
                  Konfirmasi Tindakan
                </p>
              </div>
            </div>
            <button
              aria-label="Tutup dialog"
              onClick={onClose}
              className="text-muted hover:text-ink transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <p className="text-muted font-medium leading-relaxed mb-8">
            {description}
          </p>

          <div className="flex space-x-3">
            <Button
              type="button"
              variant="ghost"
              className="flex-1 py-7 rounded-2xl font-bold text-muted"
              onClick={onClose}
              disabled={loading}
            >
              {cancelText}
            </Button>
            <Button
              type="button"
              className={`flex-1 py-7 rounded-2xl font-bold shadow-sm transition-all ${getButtonStyle()}`}
              onClick={onConfirm}
              disabled={loading}
            >
              {loading ? (
                <div className="w-5 h-5 border border-white border-t-transparent rounded-full animate-spin mr-2" />
              ) : null}
              {confirmText}
            </Button>
          </div>
        </div>
      </Card>
    </AdminDialog>
  );
}

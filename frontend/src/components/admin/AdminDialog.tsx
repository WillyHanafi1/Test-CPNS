"use client";

import React, { useEffect, useRef } from "react";
import { X } from "lucide-react";

type DialogSize = "sm" | "md" | "lg" | "xl";

const MODAL_WIDTH: Record<DialogSize, string> = {
  sm: "max-w-md",
  md: "max-w-xl",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
};

const DRAWER_WIDTH: Record<DialogSize, string> = {
  sm: "max-w-md",
  md: "max-w-xl",
  lg: "max-w-3xl",
  xl: "max-w-5xl",
};

interface AdminDialogProps {
  children: React.ReactNode;
  onClose: () => void;
  label: string;
  title?: string;
  subtitle?: string;
  variant?: "modal" | "drawer";
  size?: DialogSize;
  footer?: React.ReactNode;
}

/** Accessible native <dialog> supporting both centered modals and right slide-over drawers. */
export default function AdminDialog({
  children,
  onClose,
  label,
  title,
  subtitle,
  variant = "modal",
  size = "md",
  footer,
}: AdminDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
    };
  }, []);

  if (variant === "drawer") {
    return (
      <dialog
        ref={ref}
        className="admin-drawer"
        aria-label={label}
        onCancel={(event) => {
          event.preventDefault();
          onClose();
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) onClose();
        }}
      >
        <div
          className={`ml-auto flex h-full w-full flex-col border-l border-line bg-surface text-ink shadow-xl ${DRAWER_WIDTH[size]}`}
        >
          {title && (
            <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4 shrink-0">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-ink leading-snug">
                  {title}
                </h2>
                {subtitle && (
                  <p className="text-xs text-muted mt-0.5">{subtitle}</p>
                )}
              </div>
              <button
                type="button"
                aria-label="Tutup panel"
                onClick={onClose}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-surface-hover hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
          {footer && (
            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line bg-surface-subtle/60 px-5 py-3.5 shrink-0">
              {footer}
            </div>
          )}
        </div>
      </dialog>
    );
  }

  return (
    <dialog
      ref={ref}
      className="admin-dialog"
      aria-label={label}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      {title ? (
        <div
          className={`w-[calc(100vw-24px)] rounded-2xl border border-line bg-surface text-ink shadow-xl overflow-hidden flex flex-col max-h-[calc(100dvh-32px)] ${MODAL_WIDTH[size]}`}
        >
          <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4 shrink-0">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-ink leading-snug">
                {title}
              </h2>
              {subtitle && (
                <p className="text-xs text-muted mt-0.5">{subtitle}</p>
              )}
            </div>
            <button
              type="button"
              aria-label="Tutup dialog"
              onClick={onClose}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-surface-hover hover:text-ink"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="overflow-y-auto px-5 py-5">{children}</div>
          {footer && (
            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line bg-surface-subtle/60 px-5 py-3.5 shrink-0">
              {footer}
            </div>
          )}
        </div>
      ) : (
        children
      )}
    </dialog>
  );
}

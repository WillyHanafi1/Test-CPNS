"use client";
import { ReactNode, useEffect, useId, useRef } from "react";
export default function Modal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (open && !dialog?.open) dialog?.showModal();
    if (!open && dialog?.open) dialog.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      className="dialog-panel app-surface"
      style={{ margin: "auto", border: 0, minHeight: 0 }}
      aria-labelledby={id}
      onCancel={onClose}
      onClose={onClose}
    >
      <div className="stack">
        <div className="between">
          <h2 id={id}>{title}</h2>
          <button
            className="button button-secondary button-small"
            aria-label="Tutup dialog"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}

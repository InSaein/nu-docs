"use client";

import { useEffect, useRef } from "react";

type PickupActionDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  error?: string;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function PickupActionDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  error,
  busy,
  onCancel,
  onConfirm,
}: PickupActionDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className="pickup-action-dialog"
      aria-labelledby="pickup-action-dialog-title"
      aria-describedby="pickup-action-dialog-description"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onCancel();
      }}
    >
      <h2 id="pickup-action-dialog-title">{title}</h2>
      <p id="pickup-action-dialog-description">{description}</p>
      {error && <p className="notice notice-blue pickup-dialog-error" role="alert">{error}</p>}
      <div className="pickup-action-dialog-buttons">
        <button className="btn btn-secondary" type="button" disabled={busy} onClick={onCancel}>
          {cancelLabel}
        </button>
        <button className="btn btn-primary" type="button" disabled={busy} onClick={onConfirm} autoFocus>
          {busy ? "Working…" : confirmLabel}
        </button>
      </div>
    </dialog>
  );
}

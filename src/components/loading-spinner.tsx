"use client";

import { useEffect } from "react";

export function LoadingSpinner({ label = "Loading", inline = false }: { label?: string; inline?: boolean }) {
  useEffect(() => {
    if (inline) return;
    window.dispatchEvent(new CustomEvent("nu-docs:route-loading", { detail: true }));
    return () => {
      window.dispatchEvent(new CustomEvent("nu-docs:route-loading", { detail: false }));
    };
  }, [inline]);

  if (inline) {
    return <span className="route-loading-spinner route-loading-spinner-inline" aria-hidden="true" />;
  }

  return (
    <div className="route-loading" role="status" aria-live="polite" aria-busy="true">
      <span className="route-loading-spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

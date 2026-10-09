"use client";

import { useEffect } from "react";

export function LoadingSpinner({
  label = "Loading",
  inline = false,
  fullPageEnabled = true,
}: {
  label?: string;
  inline?: boolean;
  fullPageEnabled?: boolean;
}) {
  useEffect(() => {
    if (inline || !fullPageEnabled) return;
    window.dispatchEvent(new CustomEvent("nu-docs:route-loading", { detail: true }));
    return () => {
      window.dispatchEvent(new CustomEvent("nu-docs:route-loading", { detail: false }));
    };
  }, [inline, fullPageEnabled]);

  if (inline) {
    return <span className="route-loading-spinner route-loading-spinner-inline" aria-hidden="true" />;
  }

  if (!fullPageEnabled) {
    return null;
  }

  return (
    <div className="route-loading" role="status" aria-live="polite" aria-busy="true">
      <span className="route-loading-spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

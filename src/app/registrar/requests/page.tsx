"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/app-shell";
import { LoadingSpinner } from "@/components/loading-spinner";
import { RegistrarBreadcrumb, RegistrarPortalShell } from "@/components/registrar-portal-shell";

export default function RegistrarRequestsPage() {
  const router = useRouter();
  const [reference, setReference] = useState("");
  const [error, setError] = useState("");
  const [searching, setSearching] = useState(false);
  const searchInProgress = useRef(false);

  const searchRequest = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (searchInProgress.current) return;
    const normalizedReference = reference.trim();
    if (!normalizedReference) {
      setError("Enter a request reference to continue.");
      return;
    }
    setError("");
    searchInProgress.current = true;
    setSearching(true);
    router.push(`/registrar/requests/${encodeURIComponent(normalizedReference)}`);
  };

  return <RegistrarPortalShell><RegistrarBreadcrumb currentPage="Request Search" /><PageHeader eyebrow="Registrar Portal / Request management" title="Find a Request" description="Enter a request reference to review its details and status." /><form className="surface pad registrar-request-search" onSubmit={searchRequest} aria-busy={searching}><div className="field"><label htmlFor="request-reference">Request reference</label><input id="request-reference" value={reference} onChange={(event) => setReference(event.target.value)} placeholder="Enter request number" autoComplete="off" /></div>{error && <p className="notice notice-blue" role="alert">{error}</p>}<button className="btn btn-primary registrar-action-loading-button" type="submit" disabled={searching} aria-busy={searching}>{searching && <LoadingSpinner inline label="Searching" />}{searching ? "Searching..." : "View Request"}</button></form></RegistrarPortalShell>;
}

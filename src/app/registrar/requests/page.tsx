"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/app-shell";
import { RegistrarBreadcrumb, RegistrarPortalShell } from "@/components/registrar-portal-shell";

export default function RegistrarRequestsPage() {
  const router = useRouter();
  const [reference, setReference] = useState("");
  const [error, setError] = useState("");

  const searchRequest = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedReference = reference.trim();
    if (!normalizedReference) {
      setError("Enter a request reference to continue.");
      return;
    }
    setError("");
    router.push(`/registrar/requests/${encodeURIComponent(normalizedReference)}`);
  };

  return <RegistrarPortalShell><RegistrarBreadcrumb currentPage="Request Search" /><PageHeader eyebrow="Registrar Portal / Request management" title="Find a Request" description="Enter a request reference to review its details and status." /><form className="surface pad registrar-request-search" onSubmit={searchRequest}><div className="field"><label htmlFor="request-reference">Request reference</label><input id="request-reference" value={reference} onChange={(event) => setReference(event.target.value)} placeholder="Enter request number" autoComplete="off" /></div>{error && <p className="notice notice-blue" role="alert">{error}</p>}<button className="btn btn-primary" type="submit">View Request</button></form></RegistrarPortalShell>;
}

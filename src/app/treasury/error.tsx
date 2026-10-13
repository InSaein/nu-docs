"use client";

import Link from "next/link";

export default function TreasuryError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="registrar-main treasury-error">
      <div className="surface pad">
        <h1>Unable to load Treasury data</h1>
        <p className="muted">The payment information could not be loaded. Please try again.</p>
        <div className="treasury-error-actions">
          <button className="btn btn-primary" type="button" onClick={reset}>Try again</button>
          <Link className="link" href="/treasury/dashboard">Return to dashboard</Link>
        </div>
      </div>
    </main>
  );
}

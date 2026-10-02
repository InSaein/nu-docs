"use client";

import { useFormStatus } from "react-dom";
import { LoadingSpinner } from "@/components/loading-spinner";
import { adminLogout } from "@/lib/server/auth";

function RegistrarLogoutButton() {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending} aria-busy={pending} className="registrar-action-loading-button">
      {pending && <LoadingSpinner inline label="Signing out" />}
      <span aria-live="polite">{pending ? "Signing out..." : "Sign out"}</span>
    </button>
  );
}

export function RegistrarLogoutForm() {
  return (
    <form className="registrar-sidebar-logout" action={adminLogout}>
      <RegistrarLogoutButton />
    </form>
  );
}

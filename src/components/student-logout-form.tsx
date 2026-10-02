"use client";

import { useFormStatus } from "react-dom";
import { LoadingSpinner } from "@/components/loading-spinner";
import { logout } from "@/lib/server/auth";

function StudentLogoutButton() {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending} aria-busy={pending}>
      {pending && <LoadingSpinner inline label="Logging out" />}
      <span className="student-logout-icon" aria-hidden="true">{pending ? "" : "↪"}</span>
      <span aria-live="polite">{pending ? "Logging out..." : "Sign out"}</span>
    </button>
  );
}

export function StudentLogoutForm() {
  return (
    <form className="student-sidebar-logout" action={logout}>
      <StudentLogoutButton />
    </form>
  );
}

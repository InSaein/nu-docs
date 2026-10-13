"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useActionState, useRef, useState } from "react";
import { LoadingSpinner } from "@/components/loading-spinner";
import { adminLogin, login, treasuryDemoLogin, treasuryLogin, type LoginState } from "@/lib/server/auth";

type LoginMode = "student" | "admin" | "treasury";

const initialState: LoginState = {};

function RoleIcon({ mode }: { mode: LoginMode }) {
  return mode === "student" ? (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m2.5 9 9.5-5 9.5 5-9.5 5-9.5-5Z" />
      <path d="M6.5 11.2v4.3c3.4 2.8 7.6 2.8 11 0v-4.3M21.5 9v6" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </svg>
  );
}

function LoginForm({
  mode,
  registered,
  showDemoLogin,
  onModeChange,
}: {
  mode: LoginMode;
  registered: boolean;
  showDemoLogin: boolean;
  onModeChange: (mode: LoginMode) => void;
}) {
  const authenticate = (previousState: LoginState, formData: FormData) =>
    mode === "admin"
      ? adminLogin(previousState, formData)
      : mode === "treasury"
        ? treasuryLogin(previousState, formData)
        : login(previousState, formData);
  const [state, formAction, pending] = useActionState(authenticate, initialState);
  const [treasuryDemoState, treasuryDemoAction, treasuryDemoPending] = useActionState(treasuryDemoLogin, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const identifierRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const isAdmin = mode === "admin";
  const isTreasury = mode === "treasury";
  const isStaff = isAdmin || isTreasury;
  const identifierId = isStaff ? `${mode}-identifier` : "student-number";

  function submitDemoLogin() {
    if (pending || !formRef.current || !identifierRef.current || !passwordRef.current) {
      return;
    }

    identifierRef.current.value = isAdmin ? "ADMIN-00001" : "2026-00001";
    passwordRef.current.value = isAdmin ? "admin" : "password";
    formRef.current.requestSubmit();
  }

  return (
    <form ref={formRef} className="surface login-card" action={formAction}>
      <div className="login-role-toggle" role="group" aria-label="Choose account type">
        <button
          className="login-role-option"
          type="button"
          data-active={mode === "student"}
          aria-pressed={mode === "student"}
          disabled={pending || treasuryDemoPending}
          onClick={() => onModeChange("student")}
        >
          <RoleIcon mode="student" />
          <span>Student</span>
        </button>
        <button
          className="login-role-option"
          type="button"
          data-active={isAdmin}
          aria-pressed={isAdmin}
          disabled={pending || treasuryDemoPending}
          onClick={() => onModeChange("admin")}
        >
          <RoleIcon mode="admin" />
          <span>Admin</span>
        </button>
        <button
          className="login-role-option"
          type="button"
          data-active={isTreasury}
          aria-pressed={isTreasury}
          disabled={pending || treasuryDemoPending}
          onClick={() => onModeChange("treasury")}
        >
          <RoleIcon mode="admin" />
          <span>Treasury</span>
        </button>
      </div>
      <span className="brand-mark">N</span>
      <h1 className="display-font">{isTreasury ? "Treasury sign in" : isAdmin ? "Admin sign in" : "Sign in"}</h1>
      <p className="muted login-description">
        {isTreasury
          ? "Use your National University Treasury account."
          : isAdmin
            ? "Use your National University administrator account."
            : "Use your National University account."}
      </p>
      {registered && !isStaff && <p className="notice" role="status">Account created successfully. Please log in.</p>}
      <div className="field">
        <label htmlFor={identifierId}>{isTreasury ? "Treasury ID" : isAdmin ? "Admin ID" : "Student Number"}</label>
        <input
          id={identifierId}
          ref={identifierRef}
          name="studentNumber"
          autoComplete="username"
          required
          placeholder={isTreasury ? "Treasury ID" : isAdmin ? "ADMIN-00001" : "2026-00001"}
        />
      </div>
      <div className="field">
        <label htmlFor={`${mode}-password`}>Password</label>
        <input
          id={`${mode}-password`}
          ref={passwordRef}
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder={isAdmin ? "admin" : "password"}
        />
      </div>
      {(isTreasury ? state.error ?? treasuryDemoState.error : state.error) && (
        <p className="notice notice-blue" role="alert">
          {isTreasury ? state.error ?? treasuryDemoState.error : state.error}
        </p>
      )}
      <button
        className="btn btn-primary student-action-loading-button"
        type="submit"
        disabled={pending || treasuryDemoPending}
        aria-busy={pending || treasuryDemoPending}
        style={{ width: "100%", marginTop: 6 }}
      >
        {pending && <LoadingSpinner inline label="Logging in" />}
        <span aria-live="polite">{pending ? "Logging in..." : "Login"}</span>
      </button>
      {showDemoLogin && !isTreasury && (
        <button
          className="btn login-demo-button"
          type="button"
          onClick={submitDemoLogin}
          disabled={pending || treasuryDemoPending}
          aria-label={`Demo Login as ${isAdmin ? "Admin" : "Student"}`}
          style={{ width: "100%", marginTop: 9 }}
        >
          Demo Login
        </button>
      )}
      {showDemoLogin && isTreasury && (
        <button
          className="btn login-demo-button"
          type="submit"
          formAction={treasuryDemoAction}
          formNoValidate
          disabled={pending || treasuryDemoPending}
          aria-busy={treasuryDemoPending}
          style={{ width: "100%", marginTop: 9 }}
        >
          {treasuryDemoPending ? "Logging in..." : "Treasury Demo Login"}
        </button>
      )}
      {!isStaff && (
        <>
          <Link className="link" href="/register" style={{ display: "block", textAlign: "center", marginTop: 18 }}>
            Create an account
          </Link>
          <p className="muted login-footnote">Use your National University account to sign in.</p>
        </>
      )}
      {isAdmin && <p className="muted login-footnote">Administrator access is restricted to authorized staff.</p>}
      {isTreasury && <p className="muted login-footnote">Treasury access is restricted to authorized staff.</p>}
    </form>
  );
}

function LoginContent({ showDemoLogin }: { showDemoLogin: boolean }) {
  const searchParams = useSearchParams();
  const initialMode = searchParams.get("mode");
  const [mode, setMode] = useState<LoginMode>(
    initialMode === "admin" || initialMode === "treasury" ? initialMode : "student",
  );
  const registered = searchParams.get("registered") === "1";

  return (
    <main className="hero login-hero">
      <section className="hero-copy">
        <span className="eyebrow" style={{ marginTop: 80 }}>
          {mode === "treasury" ? "Treasury access" : mode === "admin" ? "Registrar access" : "Welcome back"}
        </span>
        <h1 className="display-font hero-title">
          {mode === "treasury"
            ? <>Treasury<br />portal.</>
            : mode === "admin"
              ? <>Admin<br />portal.</>
              : <>Your campus<br />is moving.</>}
        </h1>
        <p>
          {mode === "treasury"
            ? "Sign in to review payments and view Treasury reports."
            : mode === "admin"
              ? "Sign in to review and process student document requests."
              : "Sign in to request documents and check your latest updates."}
        </p>
      </section>
      <section className="login-panel">
        <LoginForm key={mode} mode={mode} registered={registered} showDemoLogin={showDemoLogin} onModeChange={setMode} />
      </section>
    </main>
  );
}

export default function LoginClient({ showDemoLogin }: { showDemoLogin: boolean }) {
  return <Suspense fallback={<main className="hero" />}><LoginContent showDemoLogin={showDemoLogin} /></Suspense>;
}

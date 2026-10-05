"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useActionState, useRef, useState } from "react";
import { LoadingSpinner } from "@/components/loading-spinner";
import { adminLogin, login, type LoginState } from "@/lib/server/auth";

type LoginMode = "student" | "admin";

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
  onModeChange,
}: {
  mode: LoginMode;
  registered: boolean;
  onModeChange: (mode: LoginMode) => void;
}) {
  const authenticate = (previousState: LoginState, formData: FormData) =>
    mode === "admin" ? adminLogin(previousState, formData) : login(previousState, formData);
  const [state, formAction, pending] = useActionState(authenticate, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const identifierRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const isAdmin = mode === "admin";
  const identifierId = isAdmin ? "admin-identifier" : "student-number";
  const showDemoLogin = process.env.NODE_ENV !== "production";

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
          data-active={!isAdmin}
          aria-pressed={!isAdmin}
          disabled={pending}
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
          disabled={pending}
          onClick={() => onModeChange("admin")}
        >
          <RoleIcon mode="admin" />
          <span>Admin</span>
        </button>
      </div>
      <span className="brand-mark">N</span>
      <h1 className="display-font">{isAdmin ? "Admin sign in" : "Sign in"}</h1>
      <p className="muted login-description">
        {isAdmin
          ? "Use your National University administrator account."
          : "Use your National University account."}
      </p>
      {registered && !isAdmin && <p className="notice" role="status">Account created successfully. Please log in.</p>}
      <div className="field">
        <label htmlFor={identifierId}>{isAdmin ? "Admin ID" : "Student Number"}</label>
        <input
          id={identifierId}
          ref={identifierRef}
          name="studentNumber"
          autoComplete="username"
          required
          placeholder={isAdmin ? "ADMIN-00001" : "2026-00001"}
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
      {state.error && <p className="notice notice-blue" role="alert">{state.error}</p>}
      <button
        className="btn btn-primary student-action-loading-button"
        type="submit"
        disabled={pending}
        aria-busy={pending}
        style={{ width: "100%", marginTop: 6 }}
      >
        {pending && <LoadingSpinner inline label="Logging in" />}
        <span aria-live="polite">{pending ? "Logging in..." : "Login"}</span>
      </button>
      {showDemoLogin && (
        <button
          className="btn login-demo-button"
          type="button"
          onClick={submitDemoLogin}
          disabled={pending}
          aria-label={`Demo Login as ${isAdmin ? "Admin" : "Student"}`}
          style={{ width: "100%", marginTop: 9 }}
        >
          Demo Login
        </button>
      )}
      {!isAdmin && (
        <>
          <Link className="link" href="/register" style={{ display: "block", textAlign: "center", marginTop: 18 }}>
            Create an account
          </Link>
          <p className="muted login-footnote">Use your National University account to sign in.</p>
        </>
      )}
      {isAdmin && <p className="muted login-footnote">Administrator access is restricted to authorized staff.</p>}
    </form>
  );
}

function LoginContent() {
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<LoginMode>(searchParams.get("mode") === "admin" ? "admin" : "student");
  const registered = searchParams.get("registered") === "1";

  return (
    <main className="hero login-hero">
      <section className="hero-copy">
        <Link href="/" style={{ fontWeight: 800, color: "var(--primary-dark)" }}>← Back to NU-Docs</Link>
        <span className="eyebrow" style={{ marginTop: 80 }}>{mode === "admin" ? "Registrar access" : "Welcome back"}</span>
        <h1 className="display-font hero-title">
          {mode === "admin" ? <>Admin<br />portal.</> : <>Your campus<br />is moving.</>}
        </h1>
        <p>
          {mode === "admin"
            ? "Sign in to review and process student document requests."
            : "Sign in to request documents and check your latest updates."}
        </p>
      </section>
      <section className="login-panel">
        <LoginForm key={mode} mode={mode} registered={registered} onModeChange={setMode} />
      </section>
    </main>
  );
}

export default function LoginPage() {
  return <Suspense fallback={<main className="hero" />}><LoginContent /></Suspense>;
}

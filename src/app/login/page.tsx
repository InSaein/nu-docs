"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login, type LoginState } from "@/lib/server/auth";

const initialState: LoginState = {};

export default function LoginPage() {
  const [state, formAction] = useActionState(login, initialState);
  return <main className="hero"><section className="hero-copy"><Link href="/" style={{ fontWeight: 800, color: "var(--primary-dark)" }}>← Back to NU-Docs</Link><span className="eyebrow" style={{ marginTop: 80 }}>Welcome back</span><h1 className="display-font hero-title">Your campus<br />is moving.</h1><p>Sign in to request documents and check your latest updates.</p></section><section className="login-panel"><form className="surface login-card" action={formAction}><span className="brand-mark">N</span><h1 className="display-font">Sign in</h1><p className="muted" style={{ marginBottom: 28 }}>Use your National University account.</p><div className="field"><label htmlFor="student-number">Student number</label><input id="student-number" name="studentNumber" required placeholder="e.g. 202312345" /></div><div className="field"><label htmlFor="password">Password</label><input id="password" name="password" type="password" required placeholder="Enter your password" /></div>{state.error && <p className="notice notice-blue" role="alert">{state.error}</p>}<button className="btn btn-primary" type="submit" style={{ width: "100%", marginTop: 6 }}>Sign in to portal →</button><p className="muted" style={{ textAlign: "center", fontSize: 12, marginTop: 22 }}>Use your National University account to sign in.</p></form></section></main>;
}
"use client";

import Link from "next/link";
import { useActionState } from "react";
import { adminLogin, type LoginState } from "@/lib/server/auth";

const initialState: LoginState = {};

export default function AdminLoginPage() {
  const [state, formAction] = useActionState(adminLogin, initialState);

  return <main className="hero"><section className="hero-copy"><Link href="/" style={{ fontWeight: 800, color: "var(--primary-dark)" }}>← Back to NU-Docs</Link><span className="eyebrow" style={{ marginTop: 80 }}>Registrar access</span><h1 className="display-font hero-title">Admin<br />portal.</h1><p>Sign in to review and process student document requests.</p></section><section className="login-panel"><form className="surface login-card" action={formAction}><span className="brand-mark">N</span><h1 className="display-font">Admin sign in</h1><p className="muted" style={{ marginBottom: 28 }}>Use your National University administrator account.</p><div className="field"><label htmlFor="admin-student-number">Student/Admin number</label><input id="admin-student-number" name="studentNumber" required placeholder="ADMIN-00001" /></div><div className="field"><label htmlFor="admin-password">Password</label><input id="admin-password" name="password" type="password" required placeholder="admin" /></div>{state.error && <p className="notice notice-blue" role="alert">{state.error}</p>}<button className="btn btn-primary" type="submit" style={{ width: "100%", marginTop: 6 }}>Sign in to registrar portal →</button><p className="muted" style={{ textAlign: "center", fontSize: 12, marginTop: 22 }}>Administrator access is restricted to authorized staff.</p></form></section></main>;
}
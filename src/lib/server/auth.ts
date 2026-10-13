"use server";

import { redirect } from "next/navigation";
import { clearAuthSession, createAuthSession, verifyPassword } from "@/lib/auth";
import { portalHomePath } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

export type LoginState = {
  error?: string;
};

const invalidCredentialsMessage = "Invalid student number or password.";
export async function logout() {
  await clearAuthSession();
  redirect("/login");
}

export async function adminLogout() {
  await clearAuthSession();
  redirect("/admin/login");
}

export async function login(previousState: LoginState, formData: FormData): Promise<LoginState> {
  void previousState;

  const studentNumber = String(formData.get("studentNumber") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!studentNumber || !password) {
    return { error: invalidCredentialsMessage };
  }

  const user = await prisma.user.findUnique({
    where: { studentNumber },
    select: {
      id: true,
      password: true,
      role: true,
    },
  });

  if (!user || user.role !== "STUDENT" || !(await verifyPassword(password, user.password))) {
    return { error: invalidCredentialsMessage };
  }

  await createAuthSession({ userId: user.id, role: user.role });
  redirect(portalHomePath(user.role));
}

export async function adminLogin(previousState: LoginState, formData: FormData): Promise<LoginState> {
  void previousState;

  const studentNumber = String(formData.get("studentNumber") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!studentNumber || !password) {
    return { error: invalidCredentialsMessage };
  }

  const user = await prisma.user.findUnique({
    where: { studentNumber },
    select: {
      id: true,
      password: true,
      role: true,
    },
  });

  if (!user || (user.role !== "REGISTRAR" && user.role !== "TREASURY") || !(await verifyPassword(password, user.password))) {
    return { error: invalidCredentialsMessage };
  }

  await createAuthSession({ userId: user.id, role: user.role });
  redirect(portalHomePath(user.role));
}

export async function treasuryLogin(previousState: LoginState, formData: FormData): Promise<LoginState> {
  void previousState;

  const studentNumber = String(formData.get("studentNumber") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  return authenticateTreasury(studentNumber, password);
}

export async function treasuryDemoLogin(previousState: LoginState, formData: FormData): Promise<LoginState> {
  void previousState;
  void formData;

  if (process.env.ENABLE_DEMO_LOGIN !== "true") {
    return { error: "Treasury demo login is not available." };
  }

  const studentNumber = process.env.DEMO_TREASURY_STUDENT_NUMBER;
  const password = process.env.DEMO_TREASURY_PASSWORD;
  if (!studentNumber || !password) {
    return { error: "Treasury demo login is not configured." };
  }

  return authenticateTreasury(studentNumber, password);
}

async function authenticateTreasury(studentNumber: string, password: string): Promise<LoginState> {
  if (!studentNumber || !password) {
    return { error: invalidCredentialsMessage };
  }

  const user = await prisma.user.findUnique({
    where: { studentNumber },
    select: {
      id: true,
      password: true,
      role: true,
    },
  });

  if (!user || user.role !== "TREASURY" || !(await verifyPassword(password, user.password))) {
    return { error: invalidCredentialsMessage };
  }

  await createAuthSession({ userId: user.id, role: user.role });
  redirect(portalHomePath(user.role));
}

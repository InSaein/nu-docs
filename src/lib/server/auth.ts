"use server";

import { redirect } from "next/navigation";
import { createAuthSession, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type LoginState = {
  error?: string;
};

const invalidCredentialsMessage = "Invalid student number or password.";

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

  if (!user || !(await verifyPassword(password, user.password))) {
    return { error: invalidCredentialsMessage };
  }

  await createAuthSession({ userId: user.id, role: user.role });
  redirect(user.role === "ADMIN" ? "/registrar/dashboard" : "/student/dashboard");
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

  if (!user || user.role !== "ADMIN" || !(await verifyPassword(password, user.password))) {
    return { error: invalidCredentialsMessage };
  }

  await createAuthSession({ userId: user.id, role: user.role });
  redirect("/registrar/dashboard");
}

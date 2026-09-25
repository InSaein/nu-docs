"use server";

import { redirect } from "next/navigation";
import { hashPassword } from "@/lib/auth";
import { formatDisplayName } from "@/lib/display-name";
import { prisma } from "@/lib/prisma";

export type RegistrationState = {
  error?: string;
  success?: string;
};

const invalidRegistrationMessage = "Please check your registration details.";
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function registerStudent(previousState: RegistrationState, formData: FormData): Promise<RegistrationState> {
  void previousState;

  const firstName = String(formData.get("firstName") ?? "").trim();
  const middleName = String(formData.get("middleName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const course = String(formData.get("course") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const studentNumber = String(formData.get("studentNumber") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!firstName || !lastName || !course || !email || !studentNumber || !password || !confirmPassword) {
    return { error: invalidRegistrationMessage };
  }

  if (!emailPattern.test(email)) {
    return { error: "Enter a valid email address." };
  }

  if (password !== confirmPassword) {
    return { error: "Passwords do not match." };
  }

  const duplicate = await prisma.user.findFirst({
    where: { OR: [{ email }, { studentNumber }] },
    select: { email: true, studentNumber: true },
  });

  if (duplicate?.email === email) {
    return { error: "An account with that email already exists." };
  }

  if (duplicate?.studentNumber === studentNumber) {
    return { error: "An account with that student number already exists." };
  }

  await prisma.user.create({
    data: {
      name: formatDisplayName({ name: "", firstName, middleName, lastName }),
      firstName,
      middleName: middleName || null,
      lastName,
      course,
      email,
      studentNumber,
      password: await hashPassword(password),
      role: "STUDENT",
    },
  });

  redirect("/login?registered=1");
}

"use server";

import { redirect } from "next/navigation";
import { hashPassword } from "@/lib/auth";
import { isValidCourse, normalizeOptionalNameExtension } from "@/lib/course-options";
import { formatDisplayName } from "@/lib/display-name";
import { getStudentEmailValidationError, getStudentNumberValidationError } from "@/lib/registration-validation";
import { prisma } from "@/lib/prisma";

export type RegistrationFieldName =
  | "firstName"
  | "middleName"
  | "lastName"
  | "course"
  | "email"
  | "studentNumber"
  | "password"
  | "confirmPassword";

export type RegistrationState = {
  error?: string;
  success?: string;
  fieldErrors?: Partial<Record<RegistrationFieldName, string>>;
};

const invalidRegistrationMessage = "Please check your registration details.";

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
  const nameExtension = normalizeOptionalNameExtension(String(formData.get("nameExtension") ?? ""));

  const fieldErrors: Partial<Record<RegistrationFieldName, string>> = {};

  if (!firstName) {
    fieldErrors.firstName = "First name is required.";
  }

  if (!middleName) {
    fieldErrors.middleName = "Middle name is required.";
  }

  if (!lastName) {
    fieldErrors.lastName = "Last name is required.";
  }

  if (!course) {
    fieldErrors.course = "Course is required.";
  } else if (!isValidCourse(course)) {
    fieldErrors.course = "Select a valid course.";
  }

  if (!email) {
    fieldErrors.email = "NU email is required.";
  } else {
    const emailError = getStudentEmailValidationError(email);

    if (emailError) fieldErrors.email = emailError;
  }

  if (!studentNumber) {
    fieldErrors.studentNumber = "Student number is required.";
  } else {
    const studentNumberError = getStudentNumberValidationError(studentNumber);

    if (studentNumberError) fieldErrors.studentNumber = studentNumberError;
  }

  if (!password) {
    fieldErrors.password = "Password is required.";
  }

  if (!confirmPassword) {
    fieldErrors.confirmPassword = "Confirm password is required.";
  }

  if (password && confirmPassword && password !== confirmPassword) {
    fieldErrors.confirmPassword = "Passwords do not match.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { error: invalidRegistrationMessage, fieldErrors };
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
      name: formatDisplayName({ name: "", firstName, middleName, lastName, nameExtension }),
      firstName,
      middleName: middleName || null,
      lastName,
      nameExtension,
      course,
      email,
      studentNumber,
      password: await hashPassword(password),
      role: "STUDENT",
    },
  });

  redirect("/login?registered=1");
}

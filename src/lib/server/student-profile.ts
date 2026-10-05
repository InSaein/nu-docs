"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth";
import { isValidCourse, isValidNameExtension, normalizeOptionalNameExtension } from "@/lib/course-options";
import { formatDisplayName } from "@/lib/display-name";
import { getStudentEmailValidationError } from "@/lib/registration-validation";
import { prisma } from "@/lib/prisma";

export type StudentProfileValues = {
  firstName: string;
  middleName: string;
  lastName: string;
  nameExtension: string;
  course: string;
  email: string;
};

export type StudentProfileField = keyof StudentProfileValues;

export type StudentProfileUpdateResult = {
  success?: string;
  error?: string;
  fieldErrors?: Partial<Record<StudentProfileField, string>>;
  profile?: StudentProfileValues;
};

const maximumNameLength = 100;

export async function updateStudentProfile(formData: FormData): Promise<StudentProfileUpdateResult> {
  const session = await getCurrentSession();
  if (!session || session.role !== "STUDENT") {
    redirect("/login");
  }

  const firstName = String(formData.get("firstName") ?? "").trim();
  const middleName = String(formData.get("middleName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const rawNameExtension = String(formData.get("nameExtension") ?? "").trim();
  const course = String(formData.get("course") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const nameExtension = normalizeOptionalNameExtension(rawNameExtension);
  const fieldErrors: Partial<Record<StudentProfileField, string>> = {};

  if (!firstName) {
    fieldErrors.firstName = "First name is required.";
  } else if (firstName.length > maximumNameLength) {
    fieldErrors.firstName = "First name must be 100 characters or fewer.";
  }

  if (middleName.length > maximumNameLength) {
    fieldErrors.middleName = "Middle name must be 100 characters or fewer.";
  }

  if (!lastName) {
    fieldErrors.lastName = "Last name is required.";
  } else if (lastName.length > maximumNameLength) {
    fieldErrors.lastName = "Last name must be 100 characters or fewer.";
  }

  if (nameExtension && !isValidNameExtension(nameExtension)) {
    fieldErrors.nameExtension = "Select a valid name extension.";
  }

  if (!isValidCourse(course)) {
    fieldErrors.course = "Select a valid course.";
  }

  if (!email) {
    fieldErrors.email = "NU email is required.";
  } else if (email.length > 254) {
    fieldErrors.email = "Email must be 254 characters or fewer.";
  } else {
    const emailError = getStudentEmailValidationError(email);
    if (emailError) fieldErrors.email = emailError;
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { error: "Please correct the highlighted profile details.", fieldErrors };
  }

  const duplicateEmail = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (duplicateEmail && duplicateEmail.id !== session.userId) {
    return { error: "An account with that email already exists.", fieldErrors: { email: "An account with that email already exists." } };
  }

  const profile = {
    firstName,
    middleName,
    lastName,
    nameExtension: nameExtension ?? "",
    course,
    email,
  };

  try {
    const updateResult = await prisma.user.updateMany({
      where: { id: session.userId, role: "STUDENT" },
      data: {
        ...profile,
        middleName: middleName || null,
        nameExtension,
        name: formatDisplayName({
          name: "",
          firstName,
          middleName,
          lastName,
          nameExtension,
        }),
      },
    });

    if (updateResult.count !== 1) {
      return { error: "Your student profile could not be updated. Please sign in again." };
    }
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: "An account with that email already exists.", fieldErrors: { email: "An account with that email already exists." } };
    }
    throw error;
  }

  revalidatePath("/student/profile");
  revalidatePath("/student/dashboard");

  return { success: "Your profile has been updated.", profile };
}

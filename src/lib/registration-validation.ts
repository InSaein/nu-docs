const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const studentEmailDomain = "@students.nu-baliwag.edu.ph";
const studentNumberPattern = /^20\d{2}-\d{6}$/;

export const studentEmailDomainError =
  "Use your NU Baliwag student email (e.g. name@students.nu-baliwag.edu.ph).";
export const studentNumberFormatError = "Student number must follow the format 20XX-XXXXXX.";

export function getStudentEmailValidationError(email: string): string | null {
  if (!emailPattern.test(email)) {
    return "Enter a valid email address.";
  }

  if (!email.endsWith(studentEmailDomain)) {
    return studentEmailDomainError;
  }

  return null;
}

export function getStudentNumberValidationError(studentNumber: string): string | null {
  return studentNumberPattern.test(studentNumber) ? null : studentNumberFormatError;
}

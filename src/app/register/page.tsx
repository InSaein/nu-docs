"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { COURSE_OPTIONS, isValidCourse, NAME_EXTENSION_OPTIONS } from "@/lib/course-options";
import { getStudentEmailValidationError, getStudentNumberValidationError } from "@/lib/registration-validation";
import { registerStudent, type RegistrationFieldName, type RegistrationState } from "@/lib/server/registration";

const initialState: RegistrationState = { fieldErrors: {} };

function RequiredLabel({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor}>
      <span>{children}</span>
      <span aria-hidden="true" style={{ marginLeft: 4, color: "#c94d4d" }}>*</span>
    </label>
  );
}

function validateRegistrationForm(form: HTMLFormElement): Partial<Record<RegistrationFieldName, string>> {
  const formData = new FormData(form);
  const errors: Partial<Record<RegistrationFieldName, string>> = {};

  const firstName = String(formData.get("firstName") ?? "").trim();
  const middleName = String(formData.get("middleName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const course = String(formData.get("course") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const studentNumber = String(formData.get("studentNumber") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!firstName) errors.firstName = "First name is required.";
  if (!middleName) errors.middleName = "Middle name is required.";
  if (!lastName) errors.lastName = "Last name is required.";

  if (!course) {
    errors.course = "Course is required.";
  } else if (!isValidCourse(course)) {
    errors.course = "Select a valid course.";
  }

  if (!email) {
    errors.email = "NU email is required.";
  } else {
    const emailError = getStudentEmailValidationError(email);

    if (emailError) errors.email = emailError;
  }

  if (!studentNumber) {
    errors.studentNumber = "Student number is required.";
  } else {
    const studentNumberError = getStudentNumberValidationError(studentNumber);

    if (studentNumberError) errors.studentNumber = studentNumberError;
  }
  if (!password) errors.password = "Password is required.";
  if (!confirmPassword) {
    errors.confirmPassword = "Confirm password is required.";
  } else if (password && password !== confirmPassword) {
    errors.confirmPassword = "Passwords do not match.";
  }

  return errors;
}

export default function RegisterPage() {
  const [state, formAction] = useActionState(registerStudent, initialState);
  const [clientErrors, setClientErrors] = useState<Partial<Record<RegistrationFieldName, string>>>({});
  const fieldErrors = { ...(state.fieldErrors ?? {}), ...clientErrors };

  const renderFieldError = (field: RegistrationFieldName) => {
    const error = fieldErrors[field];

    if (!error) {
      return null;
    }

    return (
      <p role="alert" style={{ color: "#a03d3d", fontSize: 11, margin: "4px 0 0" }}>
        {error}
      </p>
    );
  };

  return (
    <main className="hero">
      <section className="hero-copy">
        <Link href="/login" style={{ fontWeight: 800, color: "var(--primary-dark)" }}>← Back to sign in</Link>
        <span className="eyebrow" style={{ marginTop: 80 }}>NU-Docs student access</span>
        <h1 className="display-font hero-title">
          Start your
          <br />
          next step.
        </h1>
        <p>Create a student account to request and track your official university documents.</p>
      </section>
      <section className="login-panel">
        <form
          className="surface login-card registration-card"
          action={formAction}
          noValidate
          onSubmit={(event) => {
            const errors = validateRegistrationForm(event.currentTarget);

            if (Object.keys(errors).length > 0) {
              event.preventDefault();
              setClientErrors(errors);
              return;
            }

            setClientErrors({});
          }}
        >
          <span className="brand-mark">N</span>
          <h1 className="display-font">Create your account</h1>
          <p className="muted" style={{ marginBottom: 24 }}>For National University students.</p>
          {state.error && <p className="notice notice-blue" role="alert">{state.error}</p>}

          <div className="registration-name-grid">
            <div className="field">
              <RequiredLabel htmlFor="first-name">First name</RequiredLabel>
              <input id="first-name" name="firstName" required autoComplete="given-name" aria-invalid={Boolean(fieldErrors.firstName)} />
              {renderFieldError("firstName")}
            </div>
            <div className="field">
              <RequiredLabel htmlFor="middle-name">Middle name</RequiredLabel>
              <input id="middle-name" name="middleName" required autoComplete="additional-name" aria-invalid={Boolean(fieldErrors.middleName)} />
              {renderFieldError("middleName")}
            </div>
            <div className="field">
              <RequiredLabel htmlFor="last-name">Last name</RequiredLabel>
              <input id="last-name" name="lastName" required autoComplete="family-name" aria-invalid={Boolean(fieldErrors.lastName)} />
              {renderFieldError("lastName")}
            </div>
          </div>

          <div className="field">
            <RequiredLabel htmlFor="course">Course</RequiredLabel>
            <select id="course" name="course" required defaultValue="" aria-invalid={Boolean(fieldErrors.course)}>
              <option value="" disabled>
                Select a course
              </option>
              {COURSE_OPTIONS.map((group) => (
                <optgroup key={group.label} label={group.label}>
                  {group.options.map((courseName) => (
                    <option key={courseName} value={courseName}>
                      {courseName}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            {renderFieldError("course")}
          </div>

          <div className="field">
            <label htmlFor="name-extension">Name extension</label>
            <select id="name-extension" name="nameExtension" defaultValue="None">
              <option value="None">None</option>
              {NAME_EXTENSION_OPTIONS.map((extension) => (
                <option key={extension} value={extension}>
                  {extension}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <RequiredLabel htmlFor="email">NU email</RequiredLabel>
            <input id="email" name="email" type="email" required autoComplete="email" aria-invalid={Boolean(fieldErrors.email)} />
            {renderFieldError("email")}
          </div>
          <div className="field">
            <RequiredLabel htmlFor="student-number">Student number</RequiredLabel>
            <input id="student-number" name="studentNumber" required autoComplete="username" pattern="20[0-9]{2}-[0-9]{6}" title="Student number must follow the format 20XX-XXXXXX." aria-invalid={Boolean(fieldErrors.studentNumber)} />
            {renderFieldError("studentNumber")}
          </div>
          <div className="field">
            <RequiredLabel htmlFor="password">Password</RequiredLabel>
            <input id="password" name="password" type="password" required autoComplete="new-password" aria-invalid={Boolean(fieldErrors.password)} />
            {renderFieldError("password")}
          </div>
          <div className="field">
            <RequiredLabel htmlFor="confirm-password">Confirm password</RequiredLabel>
            <input id="confirm-password" name="confirmPassword" type="password" required autoComplete="new-password" aria-invalid={Boolean(fieldErrors.confirmPassword)} />
            {renderFieldError("confirmPassword")}
          </div>

          <button className="btn btn-primary" type="submit" style={{ width: "100%", marginTop: 6 }}>
            Create student account →
          </button>
          <p className="muted" style={{ textAlign: "center", fontSize: 12, marginTop: 18 }}>
            Already have an account? <Link className="link" href="/login">Sign in</Link>
          </p>
        </form>
      </section>
    </main>
  );
}

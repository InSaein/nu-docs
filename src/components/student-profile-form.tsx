"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { COURSE_OPTIONS, NAME_EXTENSION_OPTIONS } from "@/lib/course-options";
import {
  updateStudentProfile,
  type StudentProfileField,
  type StudentProfileUpdateResult,
  type StudentProfileValues,
} from "@/lib/server/student-profile";

type StudentProfileFormProps = {
  profile: StudentProfileValues;
  studentNumber: string;
  initials: string;
};

export function StudentProfileForm({ profile: initialProfile, studentNumber, initials }: StudentProfileFormProps) {
  const router = useRouter();
  const [profile, setProfile] = useState(initialProfile);
  const [savedProfile, setSavedProfile] = useState(initialProfile);
  const [result, setResult] = useState<StudentProfileUpdateResult | null>(null);
  const [isPending, startTransition] = useTransition();

  function updateField(field: StudentProfileField, value: string) {
    setProfile((current) => ({ ...current, [field]: value }));
    setResult(null);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const response = await updateStudentProfile(formData);
      setResult(response);

      if (response.profile) {
        setProfile(response.profile);
        setSavedProfile(response.profile);
        router.refresh();
      }
    });
  }

  function handleCancel() {
    setProfile(savedProfile);
    setResult(null);
  }

  function fieldError(field: StudentProfileField) {
    return result?.fieldErrors?.[field] ?? null;
  }

  return (
    <div className="student-profile-layout">
      <section className="surface student-profile-card" aria-labelledby="student-profile-details-heading">
        <div className="student-profile-section-heading">
          <h2 id="student-profile-details-heading">Profile details</h2>
          <p>Keep your student information up to date.</p>
        </div>

        {result?.error && !result.fieldErrors && <p className="student-profile-message student-profile-error" role="alert">{result.error}</p>}
        {result?.success && <p className="student-profile-message student-profile-success" role="status">{result.success}</p>}

        <form className="student-profile-form" onSubmit={handleSubmit}>
          <div className="student-profile-fields">
            <div className="field">
              <label htmlFor="student-profile-first-name">First name</label>
              <input id="student-profile-first-name" name="firstName" value={profile.firstName} onChange={(event) => updateField("firstName", event.target.value)} required maxLength={100} autoComplete="given-name" aria-invalid={Boolean(fieldError("firstName"))} aria-describedby={fieldError("firstName") ? "student-profile-first-name-error" : undefined} />
              {fieldError("firstName") && <span className="student-profile-field-error" id="student-profile-first-name-error">{fieldError("firstName")}</span>}
            </div>
            <div className="field">
              <label htmlFor="student-profile-middle-name">Middle name <span className="student-profile-optional">(optional)</span></label>
              <input id="student-profile-middle-name" name="middleName" value={profile.middleName} onChange={(event) => updateField("middleName", event.target.value)} maxLength={100} autoComplete="additional-name" aria-invalid={Boolean(fieldError("middleName"))} aria-describedby={fieldError("middleName") ? "student-profile-middle-name-error" : undefined} />
              {fieldError("middleName") && <span className="student-profile-field-error" id="student-profile-middle-name-error">{fieldError("middleName")}</span>}
            </div>
            <div className="field">
              <label htmlFor="student-profile-last-name">Last name</label>
              <input id="student-profile-last-name" name="lastName" value={profile.lastName} onChange={(event) => updateField("lastName", event.target.value)} required maxLength={100} autoComplete="family-name" aria-invalid={Boolean(fieldError("lastName"))} aria-describedby={fieldError("lastName") ? "student-profile-last-name-error" : undefined} />
              {fieldError("lastName") && <span className="student-profile-field-error" id="student-profile-last-name-error">{fieldError("lastName")}</span>}
            </div>
            <div className="field">
              <label htmlFor="student-profile-name-extension">Name extension</label>
              <select id="student-profile-name-extension" name="nameExtension" value={profile.nameExtension || "None"} onChange={(event) => updateField("nameExtension", event.target.value === "None" ? "" : event.target.value)} aria-invalid={Boolean(fieldError("nameExtension"))} aria-describedby={fieldError("nameExtension") ? "student-profile-name-extension-error" : undefined}>
                <option value="None">None</option>
                {NAME_EXTENSION_OPTIONS.map((extension) => <option key={extension} value={extension}>{extension}</option>)}
              </select>
              {fieldError("nameExtension") && <span className="student-profile-field-error" id="student-profile-name-extension-error">{fieldError("nameExtension")}</span>}
            </div>
            <div className="field">
              <label htmlFor="student-profile-course">Course</label>
              <select id="student-profile-course" name="course" value={profile.course} onChange={(event) => updateField("course", event.target.value)} required aria-invalid={Boolean(fieldError("course"))} aria-describedby={fieldError("course") ? "student-profile-course-error" : undefined}>
                <option value="" disabled>Select a course</option>
                {COURSE_OPTIONS.map((group) => (
                  <optgroup key={group.label} label={group.label}>
                    {group.options.map((course) => <option key={course} value={course}>{course}</option>)}
                  </optgroup>
                ))}
              </select>
              {fieldError("course") && <span className="student-profile-field-error" id="student-profile-course-error">{fieldError("course")}</span>}
            </div>
            <div className="field">
              <label htmlFor="student-profile-email">NU email</label>
              <input id="student-profile-email" name="email" type="email" value={profile.email} onChange={(event) => updateField("email", event.target.value)} required maxLength={254} autoComplete="email" aria-invalid={Boolean(fieldError("email"))} aria-describedby={fieldError("email") ? "student-profile-email-error" : undefined} />
              {fieldError("email") && <span className="student-profile-field-error" id="student-profile-email-error">{fieldError("email")}</span>}
            </div>
            <div className="field">
              <label htmlFor="student-profile-student-number">Student number</label>
              <input id="student-profile-student-number" value={studentNumber} readOnly aria-readonly="true" />
            </div>
            <div className="field">
              <label htmlFor="student-profile-role">Role</label>
              <input id="student-profile-role" value="Student" readOnly aria-readonly="true" />
            </div>
          </div>

          {result?.error && result.fieldErrors && <p className="student-profile-message student-profile-error" role="alert">{result.error}</p>}

          <div className="student-profile-actions">
            <button className="btn btn-primary" type="submit" disabled={isPending}>
              {isPending && <span className="student-profile-spinner" aria-hidden="true" />}
              {isPending ? "Saving..." : "Save Changes"}
            </button>
            <button className="btn student-profile-cancel" type="button" onClick={handleCancel} disabled={isPending}>Cancel</button>
          </div>
        </form>
      </section>

      <aside className="surface student-profile-photo-card" aria-labelledby="student-profile-photo-heading">
        <div className="student-profile-section-heading">
          <h2 id="student-profile-photo-heading">Profile photo</h2>
          <p>Personalize your student account.</p>
        </div>
        <div className="student-profile-photo-placeholder" aria-label={`${initials} profile initials`}><span>{initials}</span></div>
        <p className="student-profile-photo-note">Profile photo uploads are not available yet because no photo storage is configured. Your initials are shown instead.</p>
      </aside>
    </div>
  );
}

"use client";

import { useEffect, useRef } from "react";
import type { DocumentType } from "@prisma/client";
import { documentLabels } from "@/lib/document-pricing";
import type { StudentPreviewProfile } from "@/components/student-portal-header";

type Props = {
  documentType: DocumentType | null;
  student: StudentPreviewProfile;
  onClose: () => void;
};

const sampleCourses = [
  { code: "CS101", description: "Introduction to Computing", units: "3", grade: "1.50", remarks: "Passed" },
  { code: "MATH101", description: "College Mathematics", units: "3", grade: "1.75", remarks: "Passed" },
  { code: "ENG101", description: "Communication Skills", units: "3", grade: "1.50", remarks: "Passed" },
];

function UniversityMasthead() {
  return <div className="preview-masthead"><span className="preview-logo" aria-hidden="true">NU</span><div><strong>NATIONAL UNIVERSITY</strong><span>BALIWAG CAMPUS · OFFICE OF THE REGISTRAR</span></div></div>;
}

function SampleNotice() {
  return <div className="preview-sample-notice">SAMPLE — FOR PREVIEW ONLY <span>Not an official academic record</span></div>;
}

function StudentDetails({ student, includeEmail = false }: { student: StudentPreviewProfile; includeEmail?: boolean }) {
  return <dl className="preview-student-details">
    <div><dt>Student Name</dt><dd>{student.fullName}</dd></div>
    <div><dt>Student Number</dt><dd>{student.studentNumber}</dd></div>
    <div><dt>Course / Program</dt><dd>{student.course}</dd></div>
    {includeEmail && <div><dt>Student Email</dt><dd>{student.email}</dd></div>}
  </dl>;
}

function AcademicTable({ certified = false }: { certified?: boolean }) {
  return <div className="preview-table-wrap"><table className="preview-table"><thead><tr><th>Course Code</th><th>Course Description</th>{certified ? <><th>Grade</th><th>Units</th></> : <><th>Units</th><th>Grade</th><th>Remarks</th></>}</tr></thead><tbody>{sampleCourses.map((course) => <tr key={course.code}><td>{course.code}</td><td>{course.description}</td>{certified ? <><td>{course.grade}</td><td>{course.units}</td></> : <><td>{course.units}</td><td>{course.grade}</td><td>{course.remarks}</td></>}</tr>)}</tbody></table></div>;
}

function TermLine() {
  return <div className="preview-term"><span>Sample Academic Term</span><strong>First Semester, AY 2026–2027</strong></div>;
}

function TranscriptPreview({ student }: { student: StudentPreviewProfile }) {
  return <>
    <UniversityMasthead />
    <div className="preview-title-block"><p>OFFICE OF THE REGISTRAR</p><h2 id="document-preview-title">TRANSCRIPT OF RECORDS</h2></div>
    <SampleNotice />
    <StudentDetails student={student} />
    <TermLine />
    <p className="preview-section-label">SAMPLE ACADEMIC RECORD</p>
    <AcademicTable />
    <div className="preview-summary-grid"><div><span>Total Units</span><strong>9</strong></div><div><span>Academic Standing</span><strong>Sample Record</strong></div><div><span>Record Status</span><strong>Preview Only</strong></div></div>
    <p className="preview-disclaimer">The courses, units, grades, and remarks shown above are fictional sample content and are not associated with the student named in this preview.</p>
    <PreviewFooter />
  </>;
}

function RegistrationPreview({ student }: { student: StudentPreviewProfile }) {
  return <>
    <UniversityMasthead />
    <div className="preview-title-block"><p>OFFICE OF THE REGISTRAR</p><h2 id="document-preview-title">CERTIFICATE OF REGISTRATION</h2></div>
    <SampleNotice />
    <StudentDetails student={student} includeEmail />
    <TermLine />
    <div className="preview-registration-status"><span>Registration Status</span><strong>ENROLLED · SAMPLE</strong><span>Sample registration date: August 18, 2026</span></div>
    <p className="preview-section-label">SAMPLE ENROLLED SUBJECTS</p>
    <div className="preview-table-wrap"><table className="preview-table"><thead><tr><th>Course Code</th><th>Course Description</th><th>Units</th><th>Schedule</th></tr></thead><tbody>{sampleCourses.map((course, index) => <tr key={course.code}><td>{course.code}</td><td>{course.description}</td><td>{course.units}</td><td>{index === 0 ? "MWF · 9:00 AM" : index === 1 ? "TTh · 10:30 AM" : "MWF · 1:00 PM"}</td></tr>)}</tbody><tfoot><tr><th colSpan={2}>Sample Total Units</th><th>9</th><th /></tr></tfoot></table></div>
    <p className="preview-disclaimer">Enrollment details and subject schedules are fictional sample content for interface preview only.</p>
    <PreviewFooter />
  </>;
}

function EnrollmentPreview({ student }: { student: StudentPreviewProfile }) {
  return <>
    <UniversityMasthead />
    <div className="preview-title-block"><p>OFFICE OF THE REGISTRAR</p><h2 id="document-preview-title">CERTIFICATE OF ENROLLMENT</h2></div>
    <SampleNotice />
    <StudentDetails student={student} />
    <TermLine />
    <div className="preview-certificate-copy"><p>TO WHOM IT MAY CONCERN:</p><p>This is to present that <strong>{student.fullName}</strong>, bearing Student Number <strong>{student.studentNumber}</strong>, is listed as enrolled in the program <strong>{student.course}</strong> for the academic term stated above.</p><p>This sample statement is provided solely to demonstrate the appearance of a Certificate of Enrollment preview in NU-Docs.</p></div>
    <div className="preview-issued-date"><span>Sample date</span><strong>September 1, 2026</strong></div>
    <SignatureBlock title="Registrar" />
    <p className="preview-disclaimer">This is not proof of actual enrollment. The statement and date are fictional sample content.</p>
    <PreviewFooter />
  </>;
}

function CertifiedGradesPreview({ student }: { student: StudentPreviewProfile }) {
  return <>
    <UniversityMasthead />
    <div className="preview-title-block"><p>OFFICE OF THE REGISTRAR</p><h2 id="document-preview-title">CERTIFIED TRUE COPY OF GRADES</h2></div>
    <SampleNotice />
    <StudentDetails student={student} />
    <TermLine />
    <p className="preview-section-label">SAMPLE COURSE AND GRADE RECORD</p>
    <AcademicTable certified />
    <div className="preview-certification"><strong>Sample Certification</strong><p>Presented as a visual sample only. The grades above are fictional and have not been verified or issued by National University.</p></div>
    <SignatureBlock title="Authorized Registrar" />
    <PreviewFooter />
  </>;
}

function SignatureBlock({ title }: { title: string }) {
  return <div className="preview-signature"><div className="preview-signature-line"><strong>[Sample signature placeholder]</strong><span>{title}</span></div><span>National University · Baliwag Campus</span></div>;
}

function PreviewFooter() {
  return <footer className="preview-paper-footer"><span>NU-DOCS · STUDENT DOCUMENT PREVIEW</span><span>SAMPLE ONLY · NOT VALID FOR OFFICIAL USE</span></footer>;
}

function PreviewDocument({ documentType, student }: { documentType: DocumentType; student: StudentPreviewProfile }) {
  switch (documentType) {
    case "TOR": return <TranscriptPreview student={student} />;
    case "COR": return <RegistrationPreview student={student} />;
    case "CERTIFICATE_OF_ENROLLMENT": return <EnrollmentPreview student={student} />;
    case "CERTIFIED_TRUE_COPY_OF_GRADES": return <CertifiedGradesPreview student={student} />;
  }
}

export function DocumentPreviewModal({ documentType, student, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (documentType && !dialog.open) dialog.showModal();
    if (!documentType && dialog.open) dialog.close();
  }, [documentType]);

  useEffect(() => {
    if (!documentType) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      dialogRef.current?.close();
      onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [documentType, onClose]);

  return <dialog ref={dialogRef} className="document-preview-dialog" aria-labelledby="document-preview-title" onCancel={() => onClose()} onClose={onClose}>
    {documentType && <div className="document-preview-panel">
      <div className="document-preview-toolbar"><div><span className="preview-toolbar-label">Document sample</span><strong>{documentLabels[documentType]}</strong></div><button type="button" className="preview-close-button" onClick={() => { dialogRef.current?.close(); onClose(); }} aria-label={`Close ${documentLabels[documentType]} preview`}>×</button></div>
      <article className="preview-paper"><div className="preview-watermark" aria-hidden="true">SAMPLE — FOR PREVIEW ONLY</div><div className="preview-paper-content"><PreviewDocument documentType={documentType} student={student} /></div></article>
    </div>}
  </dialog>;
}

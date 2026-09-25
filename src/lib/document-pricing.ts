import type { DocumentType } from "@prisma/client";

export const documentPricing: Record<DocumentType, number> = {
  TOR: 150,
  COR: 50,
  CERTIFICATE_OF_ENROLLMENT: 50,
  CERTIFIED_TRUE_COPY_OF_GRADES: 50,
};

export const documentLabels: Record<DocumentType, string> = {
  TOR: "Transcript of Records",
  COR: "Certificate of Registration",
  CERTIFICATE_OF_ENROLLMENT: "Certificate of Enrollment",
  CERTIFIED_TRUE_COPY_OF_GRADES: "Certified True Copy of Grades",
};
export const APPROVED_COURSES = [
  "BS Computer Engineering SET",
  "BS Civil Engineering SET",
  "BS Information Technology SET",
  "BS Architecture SOA",
  "BS Tourism Management STHM",
  "BS Hospitality Management STHM",
  "BS Accountancy SBA",
  "BSBA Major in Marketing Management SBA",
  "BSBA Major in Financial Management SBA",
  "BS Psychology SEAS",
  "AB English Language Studies SEAS",
  "Bachelor of Physical Education SEAS",
] as const;

export type ApprovedCourse = (typeof APPROVED_COURSES)[number];

export const COURSE_OPTIONS = [
  {
    label: "School of Engineering and Technology",
    options: [
      "BS Computer Engineering SET",
      "BS Civil Engineering SET",
      "BS Information Technology SET",
    ],
  },
  {
    label: "School of Architecture",
    options: ["BS Architecture SOA"],
  },
  {
    label: "School of Tourism and Hospitality Management",
    options: ["BS Tourism Management STHM", "BS Hospitality Management STHM"],
  },
  {
    label: "School of Business and Accountancy",
    options: [
      "BS Accountancy SBA",
      "BSBA Major in Marketing Management SBA",
      "BSBA Major in Financial Management SBA",
    ],
  },
  {
    label: "School of Education, Arts and Sciences",
    options: ["BS Psychology SEAS", "AB English Language Studies SEAS", "Bachelor of Physical Education SEAS"],
  },
] as const;

export function normalizeOptionalNameExtension(value: string | null | undefined): string | null {
  const normalizedValue = value?.trim();

  if (!normalizedValue || normalizedValue.toLowerCase() === "none") {
    return null;
  }

  return normalizedValue;
}

export function isValidCourse(value: string | null | undefined): value is ApprovedCourse {
  return !!value && APPROVED_COURSES.includes(value as ApprovedCourse);
}

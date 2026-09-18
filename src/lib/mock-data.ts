export type RequestStatus = "Submitted" | "Under Review" | "Processing" | "Ready for Release" | "Completed" | "Rejected" | "Cancelled";
export type DocumentRequest = { id: string; student: string; document: string; date: string; status: RequestStatus; lastUpdated: string; fee: string; purpose: string };
export const requests: DocumentRequest[] = [
  { id: "NUDOC-2026-0001", student: "Saein Marc Castro", document: "Transcript of Records", date: "September 4, 2026", status: "Processing", lastUpdated: "September 4, 2026", fee: "₱150.00", purpose: "For scholarship application" },
  { id: "NUDOC-2026-0002", student: "Saein Marc Castro", document: "Certificate of Enrollment", date: "August 20, 2026", status: "Completed", lastUpdated: "August 22, 2026", fee: "₱50.00", purpose: "For internship requirements" },
  { id: "NUDOC-2026-0003", student: "Saein Marc Castro", document: "Certificate of Registration", date: "July 15, 2026", status: "Ready for Release", lastUpdated: "July 17, 2026", fee: "₱50.00", purpose: "For personal records" },
];
export const pendingRequests = [
  { id: "NUDOC-2026-0011", student: "Samantha Reyes", document: "Transcript of Records", submitted: "Today, 9:42 AM", status: "Under Review" },
  { id: "NUDOC-2026-0010", student: "Marcus Dela Cruz", document: "Certificate of Enrollment", submitted: "Yesterday", status: "Submitted" },
  { id: "NUDOC-2026-0009", student: "Alyssa Tan", document: "Certificate of Registration", submitted: "September 1, 2026", status: "Under Review" },
];
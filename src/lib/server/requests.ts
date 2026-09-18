"use server";

import { randomUUID } from "node:crypto";
import { DocumentType, NotificationType, RequestStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const studentSelect = {
  id: true,
  studentNumber: true,
  name: true,
  email: true,
  role: true,
  createdAt: true,
  updatedAt: true,
} as const;

export async function getDocumentRequests() {
  return prisma.documentRequest.findMany({
    include: {
      student: { select: studentSelect },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getDocumentRequestByRequestNumber(requestNumber: string) {
  return prisma.documentRequest.findUnique({
    where: { requestNumber },
    include: {
      student: { select: studentSelect },
      uploadedDocuments: true,
      payment: true,
      statusHistory: true,
    },
  });
}

export async function getRequestHistoryForStudent(studentId: string) {
  return prisma.documentRequest.findMany({
    where: { studentId },
    include: {
      student: { select: studentSelect },
      statusHistory: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function createDocumentRequest({
  documentType,
  purpose,
  studentId,
}: {
  documentType: DocumentType;
  purpose: string;
  studentId: string;
}) {
  const requestNumber = `NUDOC-${new Date().getFullYear()}-${randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase()}`;

  return prisma.$transaction(async (transaction) => {
    const request = await transaction.documentRequest.create({
      data: {
        requestNumber,
        documentType,
        purpose,
        studentId,
        status: RequestStatus.SUBMITTED,
      },
    });

    await transaction.notification.create({
      data: {
        type: NotificationType.REQUEST_SUBMITTED,
        title: "Request submitted",
        message: `Your request ${request.requestNumber} has been submitted for review.`,
        userId: studentId,
      },
    });

    return request;
  });
}

export async function updateDocumentRequestStatus({
  requestNumber,
  status,
  remarks,
}: {
  requestNumber: string;
  status: RequestStatus;
  remarks?: string;
}) {
  return prisma.$transaction(async (transaction) => {
    const request = await transaction.documentRequest.update({
      where: { requestNumber },
      data: {
        status,
        ...(remarks === undefined ? {} : { remarks }),
      },
    });

    await transaction.notification.create({
      data: {
        type: NotificationType.STATUS_UPDATED,
        title: "Request status updated",
        message: `Your request ${request.requestNumber} is now ${status.replaceAll("_", " ").toLowerCase()}.`,
        userId: request.studentId,
      },
    });

    return request;
  });
}

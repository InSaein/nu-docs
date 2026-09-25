"use server";

import { randomUUID } from "node:crypto";
import { DocumentType, NotificationType, Prisma, RequestStatus } from "@prisma/client";
import { redirect } from "next/navigation";
import { documentPricing } from "@/lib/document-pricing";
import { getCurrentSession } from "@/lib/auth";
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

type RequestWithRelations = Prisma.DocumentRequestGetPayload<{
  include: {
    student: { select: typeof studentSelect };
    requestItems: true;
    uploadedDocuments: true;
    payment: true;
    statusHistory: true;
  };
}>;

function serializeDocumentRequest(request: RequestWithRelations) {
  return {
    ...request,
    createdAt: request.createdAt.toISOString(),
    updatedAt: request.updatedAt.toISOString(),
    completedAt: request.completedAt?.toISOString() ?? null,
    student: {
      ...request.student,
      createdAt: request.student.createdAt.toISOString(),
      updatedAt: request.student.updatedAt.toISOString(),
    },
    requestItems: request.requestItems.map((item) => ({
      ...item,
      unitPrice: item.unitPrice.toString(),
      subtotal: item.subtotal.toString(),
      createdAt: item.createdAt.toISOString(),
    })),
    uploadedDocuments: request.uploadedDocuments.map((document) => ({
      ...document,
      uploadedAt: document.uploadedAt.toISOString(),
    })),
    payment: request.payment
      ? {
          ...request.payment,
          amount: request.payment.amount?.toString() ?? null,
          createdAt: request.payment.createdAt.toISOString(),
          updatedAt: request.payment.updatedAt.toISOString(),
        }
      : null,
    statusHistory: request.statusHistory.map((history) => ({
      ...history,
      createdAt: history.createdAt.toISOString(),
    })),
  };
}

export async function getDocumentRequests() {
  return prisma.documentRequest.findMany({
    include: {
      student: { select: studentSelect },
      requestItems: true,
      uploadedDocuments: true,
      payment: true,
      statusHistory: true,
    },
    orderBy: { createdAt: "desc" },
  }).then((requests) => requests.map(serializeDocumentRequest));
}

export async function getDocumentRequestByRequestNumber(requestNumber: string) {
  return prisma.documentRequest.findUnique({
    where: { requestNumber },
    include: {
      student: { select: studentSelect },
      requestItems: true,
      uploadedDocuments: true,
      payment: true,
      statusHistory: true,
    },
  }).then((request) => request ? serializeDocumentRequest(request) : null);
}

export async function getRequestHistoryForStudent(studentId: string) {
  return prisma.documentRequest.findMany({
    where: { studentId },
    include: {
      student: { select: studentSelect },
      requestItems: true,
      uploadedDocuments: true,
      payment: true,
      statusHistory: true,
    },
    orderBy: { createdAt: "desc" },
  }).then((requests) => requests.map(serializeDocumentRequest));
}

export async function getAuthenticatedDocumentRequestByRequestNumber(requestNumber: string) {
  const session = await getCurrentSession();
  if (!session || session.role !== "STUDENT") {
    redirect("/login");
  }

  const request = await getDocumentRequestByRequestNumber(requestNumber);
  return request?.studentId === session.userId ? request : null;
}

export async function createDocumentRequest({
  items,
  purpose,
}: {
  items: Array<{ documentType: DocumentType; quantity: number }>;
  purpose: string;
}) {
  const session = await getCurrentSession();
  if (!session || session.role !== "STUDENT") {
    redirect("/login");
  }

  if (!items.length || items.some((item) => !Number.isInteger(item.quantity) || item.quantity <= 0 || !(item.documentType in documentPricing))) {
    throw new Error("At least one valid document item is required.");
  }

  const requestNumber = `NUDOC-${new Date().getFullYear()}-${randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase()}`;
  const requestItems = items.map((item) => {
    const unitPrice = new Prisma.Decimal(documentPricing[item.documentType]);
    return {
      documentType: item.documentType,
      quantity: item.quantity,
      unitPrice,
      subtotal: unitPrice.mul(item.quantity),
    };
  });

  try {
    return await prisma.$transaction(async (transaction) => {
      const request = await transaction.documentRequest.create({
        data: {
          requestNumber,
          documentType: requestItems[0].documentType,
          purpose,
          studentId: session.userId,
          status: RequestStatus.SUBMITTED,
          requestItems: { create: requestItems },
        },
      });

      await transaction.notification.create({
        data: {
          type: NotificationType.REQUEST_SUBMITTED,
          title: "Request submitted",
          message: `Your request ${request.requestNumber} has been submitted for review.`,
          requestNumber: request.requestNumber,
          userId: session.userId,
        },
      });

      return {
        ...request,
        createdAt: request.createdAt.toISOString(),
        updatedAt: request.updatedAt.toISOString(),
        completedAt: request.completedAt?.toISOString() ?? null,
      };
    });
  } catch (error) {
    console.error("[NU-Docs] createDocumentRequest failed", error);
    throw error;
  }
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
    const existingRequest = await transaction.documentRequest.findUnique({
      where: { requestNumber },
      select: { status: true, remarks: true, studentId: true },
    });

    if (!existingRequest) {
      throw new Error("Request not found");
    }

    if (existingRequest.status === status) {
      return transaction.documentRequest.update({
        where: { requestNumber },
        data: {
          ...(remarks === undefined ? {} : { remarks }),
        },
      });
    }

    const request = await transaction.documentRequest.update({
      where: { requestNumber },
      data: {
        status,
        ...(remarks === undefined ? {} : { remarks }),
      },
    });

    const title = status === "SUBMITTED" ? "Request submitted" : status === "UNDER_REVIEW" ? "Request under review" : status === "PROCESSING" ? "Request being processed" : status === "READY_FOR_RELEASE" ? "Request ready for release" : status === "COMPLETED" ? "Request completed" : "Request rejected";
    const detail = status === "REJECTED"
      ? remarks && remarks.trim()
        ? `Your document request ${request.requestNumber} has been rejected. Registrar remarks: ${remarks}`
        : `Your document request ${request.requestNumber} has been rejected.`
      : status === "SUBMITTED"
        ? `Your document request ${request.requestNumber} has been submitted.`
        : status === "UNDER_REVIEW"
          ? `Your document request ${request.requestNumber} is now under review.`
          : status === "PROCESSING"
            ? `Your document request ${request.requestNumber} is now being processed.`
            : status === "READY_FOR_RELEASE"
              ? `Your document request ${request.requestNumber} is ready for release.`
              : `Your document request ${request.requestNumber} has been completed.`;

    await transaction.notification.create({
      data: {
        type: NotificationType.STATUS_UPDATED,
        title,
        message: detail,
        requestNumber: request.requestNumber,
        userId: request.studentId,
      },
    });

    return request;
  });
}

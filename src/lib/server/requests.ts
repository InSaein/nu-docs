"use server";

import { randomBytes, randomUUID } from "node:crypto";
import { DocumentType, NotificationType, PaymentStatus, PickupAppointmentAction, PickupAppointmentStatus, Prisma, RequestStatus } from "@prisma/client";
import { documentPricing } from "@/lib/document-pricing";
import { requirePortalRole } from "@/lib/server/authorization";
import { isPaymentMethod } from "@/lib/payment-options";
import { prisma } from "@/lib/prisma";

const studentSelect = {
  id: true,
  studentNumber: true,
  name: true,
  firstName: true,
  middleName: true,
  lastName: true,
  course: true,
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
          id: request.payment.id,
          status: request.payment.status,
          method: request.payment.method,
          amount: request.payment.amount?.toString() ?? null,
          transactionReference: request.payment.transactionReference,
          paidAt: request.payment.paidAt?.toISOString() ?? null,
          rejectionReason: request.payment.rejectionReason,
          reviewedAt: request.payment.reviewedAt?.toISOString() ?? null,
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
  await requirePortalRole("REGISTRAR");

  return prisma.documentRequest.findMany({
    select: {
      requestNumber: true,
      documentType: true,
      createdAt: true,
      status: true,
      student: { select: { name: true } },
      requestItems: { select: { documentType: true, quantity: true } },
      payment: { select: { status: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

async function findDocumentRequestByRequestNumber(requestNumber: string, studentId?: string) {
  return prisma.documentRequest.findUnique({
    where: { requestNumber, ...(studentId ? { studentId } : {}) },
    include: {
      student: { select: studentSelect },
      requestItems: true,
      uploadedDocuments: true,
      payment: true,
      statusHistory: true,
    },
  }).then((request) => request ? serializeDocumentRequest(request) : null);
}

export async function getDocumentRequestByRequestNumber(requestNumber: string) {
  await requirePortalRole("REGISTRAR");
  return findDocumentRequestByRequestNumber(requestNumber);
}

export async function getRequestHistoryForStudent() {
  const session = await requirePortalRole("STUDENT");

  return prisma.documentRequest.findMany({
    where: { studentId: session.userId },
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
  const session = await requirePortalRole("STUDENT");

  return findDocumentRequestByRequestNumber(requestNumber, session.userId);
}

export async function submitMockPayment(requestNumber: string, selectedMethod: unknown) {
  const session = await requirePortalRole("STUDENT");

  if (typeof requestNumber !== "string" || !requestNumber.trim()) {
    return { success: false as const, error: "Request not found." };
  }

  if (!isPaymentMethod(selectedMethod)) {
    return { success: false as const, error: "Select a valid simulated payment method." };
  }

  try {
    return await prisma.$transaction(async (transaction) => {
      const request = await transaction.documentRequest.findUnique({
        where: { requestNumber },
        select: { id: true, studentId: true },
      });

      if (!request || request.studentId !== session.userId) {
        return { success: false as const, error: "Request not found." };
      }

      await transaction.$queryRaw<Array<{ id: string }>>`
        SELECT "id" FROM "DocumentRequest" WHERE "id" = ${request.id} FOR UPDATE
      `;

      const currentRequest = await transaction.documentRequest.findUnique({
        where: { id: request.id },
        select: { status: true },
      });

      if (currentRequest?.status !== RequestStatus.PROCESSING) {
        return { success: false as const, error: "Payment is available only while the request is processing." };
      }

      const existingPayment = await transaction.payment.findUnique({
        where: { requestId: request.id },
      });

      if (existingPayment) {
        return { success: false as const, error: "A payment has already been submitted for Treasury review." };
      }

      const requestTotal = await transaction.requestItem.aggregate({
        where: { requestId: request.id },
        _sum: { subtotal: true },
      });
      const amount = requestTotal._sum.subtotal;

      if (!amount || amount.lessThanOrEqualTo(0)) {
        return { success: false as const, error: "This request has no payable document total." };
      }

      const transactionReference = `NUDOC-MOCK-PAY-${randomBytes(4).toString("hex").toUpperCase()}`;
      const payment = await transaction.payment.create({
        data: {
          requestId: request.id,
          status: PaymentStatus.PENDING,
          method: selectedMethod,
          amount,
          transactionReference,
        },
      });

      return {
        success: true as const,
        payment: {
          id: payment.id,
          status: payment.status,
          method: payment.method,
          amount: payment.amount?.toString() ?? null,
          transactionReference: payment.transactionReference,
          paidAt: null,
          rejectionReason: null,
          reviewedAt: null,
          createdAt: payment.createdAt.toISOString(),
          updatedAt: payment.updatedAt.toISOString(),
        },
      };
    });
  } catch {
    console.error("[NU-Docs] Mock payment submission failed.");
    return { success: false as const, error: "We could not submit this simulated payment. Please try again." };
  }
}

export async function createDocumentRequest({
  items,
  purpose,
}: {
  items: Array<{ documentType: DocumentType; quantity: number }>;
  purpose: string;
}) {
  const session = await requirePortalRole("STUDENT");

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

export async function saveDocumentRequestInternalNotes(requestNumber: string, notes: string) {
  await requirePortalRole("REGISTRAR");

  if (!requestNumber.trim() || typeof notes !== "string") {
    throw new Error("Invalid internal note request.");
  }

  try {
    await prisma.documentRequest.update({
      where: { requestNumber },
      data: { remarks: notes },
      select: { requestNumber: true },
    });
    return { saved: true };
  } catch (error) {
    console.error("[NU-Docs] saveDocumentRequestInternalNotes failed", { requestNumber, error });
    throw new Error("Unable to save internal notes.");
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
  const session = await requirePortalRole("REGISTRAR");
  if (!Object.values(RequestStatus).includes(status)) {
    throw new Error("Invalid request status.");
  }

  return prisma.$transaction(async (transaction) => {
    await transaction.$queryRaw`SELECT pg_advisory_xact_lock(741023) IS NULL AS "locked"`;
    await transaction.$queryRaw`SELECT "id" FROM "PickupSchedule" WHERE "id" = 'default' FOR UPDATE`;
    await transaction.$queryRaw`SELECT "id" FROM "DocumentRequest" WHERE "requestNumber" = ${requestNumber} FOR UPDATE`;
    const existingRequest = await transaction.documentRequest.findUnique({
      where: { requestNumber },
      select: { id: true, status: true, remarks: true, studentId: true },
    });

    if (!existingRequest) {
      throw new Error("Request not found");
    }

    const activeAppointment = await transaction.pickupAppointment.findFirst({
      where: { requestId: existingRequest.id, status: PickupAppointmentStatus.SCHEDULED },
    });
    if (activeAppointment && status === RequestStatus.COMPLETED) {
      throw new Error("Confirm pickup handover from the appointment before completing this request.");
    }
    if (activeAppointment && status !== RequestStatus.READY_FOR_RELEASE) {
      const cancelledAt = new Date();
      await transaction.pickupAppointment.update({
        where: { id: activeAppointment.id },
        data: { status: PickupAppointmentStatus.CANCELLED, cancelledAt },
      });
      await transaction.pickupAppointmentHistory.create({
        data: {
          appointmentId: activeAppointment.id,
          actorId: session.userId,
          action: PickupAppointmentAction.AUTO_CANCELLED,
          previousStartsAt: activeAppointment.startsAt,
          reason: "The document request is no longer ready for pickup.",
        },
      });
      await transaction.notification.create({
        data: {
          type: NotificationType.PICKUP_CANCELLED,
          title: "Pickup cancelled",
          message: `Your pickup for request ${requestNumber} was cancelled because the request is no longer ready for release.`,
          requestNumber,
          userId: existingRequest.studentId,
        },
      });
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

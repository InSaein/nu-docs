"use server";

import { randomBytes, randomUUID } from "node:crypto";
import { DocumentType, NotificationType, PaymentStatus, Prisma, RequestStatus } from "@prisma/client";
import { redirect } from "next/navigation";
import { documentPricing } from "@/lib/document-pricing";
import { getCurrentSession } from "@/lib/auth";
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

export async function confirmMockPayment(requestNumber: string, selectedMethod: unknown) {
  const session = await getCurrentSession();
  if (!session || session.role !== "STUDENT") {
    redirect("/login");
  }

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

      if (existingPayment?.status === PaymentStatus.PAID) {
        return {
          success: true as const,
          payment: {
            id: existingPayment.id,
            status: existingPayment.status,
            method: existingPayment.method,
            amount: existingPayment.amount?.toString() ?? null,
            transactionReference: existingPayment.transactionReference,
            paidAt: existingPayment.paidAt?.toISOString() ?? null,
            createdAt: existingPayment.createdAt.toISOString(),
            updatedAt: existingPayment.updatedAt.toISOString(),
          },
        };
      }

      const requestTotal = await transaction.requestItem.aggregate({
        where: { requestId: request.id },
        _sum: { subtotal: true },
      });
      const amount = requestTotal._sum.subtotal;

      if (!amount || amount.lessThanOrEqualTo(0)) {
        return { success: false as const, error: "This request has no payable document total." };
      }

      const paidAt = new Date();
      const transactionReference = `NUDOC-PAY-${randomBytes(4).toString("hex").toUpperCase()}`;
      const payment = existingPayment
        ? await transaction.payment.update({
            where: { id: existingPayment.id },
            data: {
              status: PaymentStatus.PAID,
              method: selectedMethod,
              amount,
              paidAt,
              transactionReference,
            },
          })
        : await transaction.payment.create({
            data: {
              requestId: request.id,
              status: PaymentStatus.PAID,
              method: selectedMethod,
              amount,
              paidAt,
              transactionReference,
            },
          });

      const requestDetails = await transaction.documentRequest.findUniqueOrThrow({
        where: { id: request.id },
        select: { requestNumber: true },
      });

      await transaction.notification.create({
        data: {
          type: NotificationType.PAYMENT_CONFIRMED,
          title: "Payment confirmed",
          message: `Payment confirmed for request ${requestDetails.requestNumber}. Amount: ₱${amount.toFixed(2)}. Reference: ${transactionReference}`,
          requestNumber: requestDetails.requestNumber,
          userId: session.userId,
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
          paidAt: payment.paidAt?.toISOString() ?? null,
          createdAt: payment.createdAt.toISOString(),
          updatedAt: payment.updatedAt.toISOString(),
        },
      };
    });
  } catch {
    console.error("[NU-Docs] Mock payment confirmation failed.");
    return { success: false as const, error: "We could not confirm this simulated payment. Please try again." };
  }
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

export async function saveDocumentRequestInternalNotes(requestNumber: string, notes: string) {
  const session = await getCurrentSession();
  if (!session || session.role !== "ADMIN") {
    throw new Error("Administrator access required.");
  }

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

"use server";

import { NotificationType, PaymentAuditAction, PaymentStatus, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { documentPricing } from "@/lib/document-pricing";
import { requirePortalRole } from "@/lib/server/authorization";
import { prisma } from "@/lib/prisma";

export type PaymentVerificationState = {
  error?: string;
  success?: string;
};

const paymentVerificationInclude = {
  request: {
    select: {
      requestNumber: true,
      studentId: true,
      student: { select: { id: true, role: true } },
      requestItems: { select: { documentType: true, quantity: true, unitPrice: true, subtotal: true } },
    },
  },
} satisfies Prisma.PaymentInclude;

function revalidatePaymentViews() {
  revalidatePath("/treasury/dashboard");
  revalidatePath("/treasury/payments");
  revalidatePath("/student/notifications");
  revalidatePath("/student/history");
  revalidatePath("/student/track");
}

function isConsistentPayment(
  payment: Prisma.PaymentGetPayload<{ include: typeof paymentVerificationInclude }>,
) {
  if (payment.request.student.role !== "STUDENT" || !payment.request.requestItems.length) return false;
  if (
    payment.verified
    || payment.paidAt !== null
    || payment.reviewedAt !== null
    || payment.reviewedById !== null
    || payment.rejectionReason !== null
  ) return false;
  if (!payment.method || !payment.transactionReference?.trim() || !payment.amount) return false;

  let expectedAmount = new Prisma.Decimal(0);
  for (const item of payment.request.requestItems) {
    if (!Number.isInteger(item.quantity) || item.quantity <= 0 || item.unitPrice.lessThanOrEqualTo(0)) return false;
    if (!item.unitPrice.equals(new Prisma.Decimal(documentPricing[item.documentType]))) return false;
    const expectedSubtotal = item.unitPrice.mul(item.quantity);
    if (!item.subtotal.equals(expectedSubtotal)) return false;
    expectedAmount = expectedAmount.add(item.subtotal);
  }

  return expectedAmount.greaterThan(0) && payment.amount.equals(expectedAmount);
}

export async function confirmTreasuryPayment(
  _previousState: PaymentVerificationState,
  formData: FormData,
): Promise<PaymentVerificationState> {
  const session = await requirePortalRole("TREASURY");
  const rawPaymentId = formData.get("paymentId");
  const paymentId = typeof rawPaymentId === "string" ? rawPaymentId.trim() : "";
  if (!paymentId || paymentId.length > 100) return { error: "Payment record not found." };

  try {
    const result = await prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw<Array<{ id: string }>>`
        SELECT "id" FROM "Payment" WHERE "id" = ${paymentId} FOR UPDATE
      `;
      const payment = await transaction.payment.findUnique({
        where: { id: paymentId },
        include: paymentVerificationInclude,
      });

      if (!payment) return { error: "Payment record not found." };
      if (payment.status !== PaymentStatus.PENDING) return { error: "This payment has already been reviewed." };
      if (payment.request.studentId !== payment.request.student.id || !isConsistentPayment(payment)) {
        return { error: "This payment or its associated request is inconsistent and cannot be confirmed." };
      }

      const reviewedAt = new Date();
      const update = await transaction.payment.updateMany({
        where: { id: payment.id, status: PaymentStatus.PENDING },
        data: {
          status: PaymentStatus.PAID,
          verified: true,
          paidAt: reviewedAt,
          reviewedAt,
          reviewedById: session.userId,
          rejectionReason: null,
        },
      });
      if (update.count !== 1) return { error: "This payment has already been reviewed." };

      await transaction.paymentAudit.create({
        data: {
          paymentId: payment.id,
          requestId: payment.requestId,
          previousStatus: PaymentStatus.PENDING,
          newStatus: PaymentStatus.PAID,
          action: PaymentAuditAction.CONFIRMED,
          actorId: session.userId,
          createdAt: reviewedAt,
        },
      });

      await transaction.notification.create({
        data: {
          type: NotificationType.PAYMENT_CONFIRMED,
          title: "Payment confirmed",
          message: `Treasury confirmed the simulated payment for request ${payment.request.requestNumber}.`,
          requestNumber: payment.request.requestNumber,
          userId: payment.request.studentId,
        },
      });
      return { updated: true };
    });

    if ("error" in result) return result;
    revalidatePaymentViews();
    return { success: "Payment confirmed. The request status was not changed." };
  } catch (error) {
    console.error("[NU-Docs] Treasury payment confirmation failed.", error);
    return { error: "Unable to confirm this payment. Please try again." };
  }
}

export async function rejectTreasuryPayment(
  _previousState: PaymentVerificationState,
  formData: FormData,
): Promise<PaymentVerificationState> {
  const session = await requirePortalRole("TREASURY");
  const rawPaymentId = formData.get("paymentId");
  const rawReason = formData.get("reason");
  const paymentId = typeof rawPaymentId === "string" ? rawPaymentId.trim() : "";
  const reason = typeof rawReason === "string" ? rawReason.trim() : "";
  if (!paymentId || paymentId.length > 100) return { error: "Payment record not found." };
  if (reason.length < 10 || reason.length > 1000) {
    return { error: "Enter a rejection reason between 10 and 1000 characters." };
  }

  try {
    const result = await prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw<Array<{ id: string }>>`
        SELECT "id" FROM "Payment" WHERE "id" = ${paymentId} FOR UPDATE
      `;
      const payment = await transaction.payment.findUnique({
        where: { id: paymentId },
        include: paymentVerificationInclude,
      });

      if (!payment) return { error: "Payment record not found." };
      if (payment.status !== PaymentStatus.PENDING) return { error: "This payment has already been reviewed." };
      if (payment.request.studentId !== payment.request.student.id || payment.request.student.role !== "STUDENT") {
        return { error: "The associated student account is invalid; this payment cannot be rejected." };
      }

      const reviewedAt = new Date();
      const update = await transaction.payment.updateMany({
        where: { id: payment.id, status: PaymentStatus.PENDING },
        data: {
          status: PaymentStatus.REJECTED,
          verified: false,
          paidAt: null,
          reviewedAt,
          reviewedById: session.userId,
          rejectionReason: reason,
        },
      });
      if (update.count !== 1) return { error: "This payment has already been reviewed." };

      await transaction.paymentAudit.create({
        data: {
          paymentId: payment.id,
          requestId: payment.requestId,
          previousStatus: PaymentStatus.PENDING,
          newStatus: PaymentStatus.REJECTED,
          action: PaymentAuditAction.REJECTED,
          actorId: session.userId,
          rejectionReason: reason,
          createdAt: reviewedAt,
        },
      });

      await transaction.notification.create({
        data: {
          type: NotificationType.PAYMENT_REJECTED,
          title: "Payment rejected",
          message: `Treasury rejected the simulated payment for request ${payment.request.requestNumber}. Reason: ${reason}`,
          requestNumber: payment.request.requestNumber,
          userId: payment.request.studentId,
        },
      });
      return { updated: true };
    });

    if ("error" in result) return result;
    revalidatePaymentViews();
    return { success: "Payment rejected and the student was notified. The request status was not changed." };
  } catch (error) {
    console.error("[NU-Docs] Treasury payment rejection failed.", error);
    return { error: "Unable to reject this payment. Please try again." };
  }
}

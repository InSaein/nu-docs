"use server";

import { PaymentMethod, PaymentStatus, Prisma } from "@prisma/client";
import { requirePortalRole } from "@/lib/server/authorization";
import { prisma } from "@/lib/prisma";

const paymentListInclude = {
  request: {
    select: {
      requestNumber: true,
      student: { select: { name: true, studentNumber: true } },
      requestItems: { select: { documentType: true, quantity: true, subtotal: true } },
    },
  },
} satisfies Prisma.PaymentInclude;

type PaymentFilters = {
  query?: string;
  status?: string;
  method?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
};

function parseDate(value: string | undefined): Date | undefined | null {
  if (!value) return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;

  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value ? date : null;
}

function safePage(value: number | undefined) {
  return Number.isSafeInteger(value) && value && value > 0 ? value : 1;
}

function safePageSize(value: number | undefined) {
  return value === 25 || value === 50 ? value : 10;
}

export async function getTreasuryDashboardData() {
  await requirePortalRole("TREASURY");

  const [pendingPayments, paidPayments, rejectedPayments, paidAmount, recentPayments] = await prisma.$transaction([
    prisma.payment.count({ where: { status: PaymentStatus.PENDING } }),
    prisma.payment.count({ where: { status: PaymentStatus.PAID } }),
    prisma.payment.count({ where: { status: PaymentStatus.REJECTED } }),
    prisma.payment.aggregate({
      where: { status: PaymentStatus.PAID },
      _sum: { amount: true },
    }),
    prisma.payment.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: paymentListInclude,
    }),
  ]);

  return {
    pendingPayments,
    paidPayments,
    rejectedPayments,
    totalCollected: paidAmount._sum.amount?.toString() ?? "0",
    recentPayments: recentPayments.map((payment) => ({
      id: payment.id,
      requestNumber: payment.request.requestNumber,
      studentName: payment.request.student.name,
      amount: payment.amount?.toString() ?? null,
      status: payment.status,
      createdAt: payment.createdAt.toISOString(),
    })),
  };
}

export async function getTreasuryPayments(filters: PaymentFilters) {
  await requirePortalRole("TREASURY");

  const query = filters.query?.trim().slice(0, 100) ?? "";
  const status = Object.values(PaymentStatus).find((value) => value === filters.status);
  const method = Object.values(PaymentMethod).find((value) => value === filters.method);
  const from = parseDate(filters.from);
  const to = parseDate(filters.to);
  const page = safePage(filters.page);
  const pageSize = safePageSize(filters.pageSize);

  if ((filters.status && !status) || (filters.method && !method)) {
    return { error: "Select a valid payment status or method.", payments: [], total: 0, totalPayments: 0, page, pageSize };
  }

  if (from === null || to === null) {
    return { error: "Enter valid start and end dates.", payments: [], total: 0, totalPayments: 0, page, pageSize };
  }

  if (from && to && from > to) {
    return { error: "The start date must be on or before the end date.", payments: [], total: 0, totalPayments: 0, page, pageSize };
  }

  const where: Prisma.PaymentWhereInput = {};
  if (status) where.status = status;
  if (method) where.method = method;

  if (from || to) {
    where.createdAt = {
      ...(from ? { gte: from } : {}),
      ...(to ? { lt: new Date(to.getTime() + 24 * 60 * 60 * 1000) } : {}),
    };
  }

  if (query) {
    where.OR = [
      { transactionReference: { contains: query, mode: "insensitive" } },
      {
        request: {
          is: {
            OR: [
              { requestNumber: { contains: query, mode: "insensitive" } },
              {
                student: {
                  is: {
                    OR: [
                      { name: { contains: query, mode: "insensitive" } },
                      { studentNumber: { contains: query, mode: "insensitive" } },
                    ],
                  },
                },
              },
            ],
          },
        },
      },
    ];
  }

  return prisma.$transaction(async (transaction) => {
    const [total, totalPayments] = await Promise.all([
      transaction.payment.count({ where }),
      transaction.payment.count(),
    ]);
    const visiblePage = Math.min(page, Math.max(1, Math.ceil(total / pageSize)));
    const payments = await transaction.payment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (visiblePage - 1) * pageSize,
      take: pageSize,
      include: paymentListInclude,
    });

    return {
      error: null,
      total,
      totalPayments,
      page: visiblePage,
      pageSize,
      payments: payments.map((payment) => ({
        id: payment.id,
        requestNumber: payment.request.requestNumber,
        studentName: payment.request.student.name,
        studentNumber: payment.request.student.studentNumber,
        documentItems: payment.request.requestItems.map((item) => ({
          documentType: item.documentType,
          quantity: item.quantity,
          subtotal: item.subtotal.toString(),
        })),
        amountDue: payment.request.requestItems.length
          ? payment.request.requestItems.reduce((totalAmount, item) => totalAmount.add(item.subtotal), new Prisma.Decimal(0)).toString()
          : null,
        method: payment.method,
        transactionReference: payment.transactionReference,
        status: payment.status,
        createdAt: payment.createdAt.toISOString(),
      })),
    };
  });
}

export async function getTreasuryPaymentById(paymentId: string) {
  await requirePortalRole("TREASURY");
  const id = paymentId.trim();
  if (!id || id.length > 100) return null;

  const payment = await prisma.payment.findUnique({
    where: { id },
    include: {
      request: {
        select: {
          requestNumber: true,
          createdAt: true,
          student: { select: { name: true, studentNumber: true } },
          requestItems: { select: { documentType: true, quantity: true, unitPrice: true, subtotal: true } },
        },
      },
      reviewedBy: { select: { name: true } },
    },
  });

  if (!payment) return null;

  return {
    id: payment.id,
    requestNumber: payment.request.requestNumber,
    requestCreatedAt: payment.request.createdAt.toISOString(),
    studentName: payment.request.student.name,
    studentNumber: payment.request.student.studentNumber,
    documentItems: payment.request.requestItems.map((item) => ({
      documentType: item.documentType,
      quantity: item.quantity,
      unitPrice: item.unitPrice.toString(),
      subtotal: item.subtotal.toString(),
    })),
    amountDue: payment.request.requestItems.length
      ? payment.request.requestItems.reduce((totalAmount, item) => totalAmount.add(item.subtotal), new Prisma.Decimal(0)).toString()
      : null,
    amountPaid: payment.amount?.toString() ?? null,
    method: payment.method,
    transactionReference: payment.transactionReference,
    status: payment.status,
    createdAt: payment.createdAt.toISOString(),
    updatedAt: payment.updatedAt.toISOString(),
    paidAt: payment.paidAt?.toISOString() ?? null,
    reviewedAt: payment.reviewedAt?.toISOString() ?? null,
    rejectionReason: payment.rejectionReason,
    reviewedByName: payment.reviewedBy?.name ?? null,
  };
}

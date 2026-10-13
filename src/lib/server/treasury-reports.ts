"use server";

import { PaymentAuditAction, PaymentMethod, PaymentStatus, Prisma } from "@prisma/client";
import { maximumCsvRows, resolveDateRange } from "@/lib/treasury-report-utils";
import { requirePortalRole } from "@/lib/server/authorization";
import { prisma } from "@/lib/prisma";

export type AuditFilters = {
  from?: string;
  to?: string;
  action?: string;
  status?: string;
  query?: string;
  page?: number;
  pageSize?: number;
};

function safePage(value: number | undefined) {
  return Number.isSafeInteger(value) && value && value > 0 ? value : 1;
}

function safePageSize(value: number | undefined) {
  return value === 25 || value === 50 ? value : 10;
}

export async function getTreasuryCollectionReport(from?: string, to?: string) {
  await requirePortalRole("TREASURY");
  const resolved = resolveDateRange(from, to);
  if (!resolved.range) {
    return {
      error: resolved.error,
      from: from ?? "",
      to: to ?? "",
      totalCollected: "0",
      confirmedPayments: 0,
      pendingPayments: 0,
      rejectedPayments: 0,
      byMethod: [],
      byDay: [],
    };
  }

  const { range } = resolved;
  const confirmedWhere: Prisma.PaymentWhereInput = {
    status: PaymentStatus.PAID,
    paidAt: { gte: range.start, lt: range.endExclusive },
  };
  const submittedWhere: Prisma.PaymentWhereInput = {
    createdAt: { gte: range.start, lt: range.endExclusive },
  };

  const [confirmed, pendingPayments, rejectedPayments, methodRows, dayRows] = await prisma.$transaction([
    prisma.payment.aggregate({
      where: confirmedWhere,
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.payment.count({ where: { ...submittedWhere, status: PaymentStatus.PENDING } }),
    prisma.payment.count({ where: { ...submittedWhere, status: PaymentStatus.REJECTED } }),
    prisma.$queryRaw<Array<{ method: string | null; total: string; count: number }>>`
      SELECT "method"::text AS "method",
             COALESCE(SUM("amount"), 0)::text AS "total",
             COUNT(*)::int AS "count"
      FROM "Payment"
      WHERE "status" = ${PaymentStatus.PAID}::"PaymentStatus"
        AND "paidAt" >= ${range.start}
        AND "paidAt" < ${range.endExclusive}
      GROUP BY "method"
      ORDER BY "method"::text
    `,
    prisma.$queryRaw<Array<{ day: string; total: string; count: number }>>`
      SELECT TO_CHAR("paidAt"::date, 'YYYY-MM-DD') AS "day",
             COALESCE(SUM("amount"), 0)::text AS "total",
             COUNT(*)::int AS "count"
      FROM "Payment"
      WHERE "status" = ${PaymentStatus.PAID}::"PaymentStatus"
        AND "paidAt" >= ${range.start}
        AND "paidAt" < ${range.endExclusive}
      GROUP BY "paidAt"::date
      ORDER BY "paidAt"::date
    `,
  ]);

  return {
    error: null,
    from: range.from,
    to: range.to,
    totalCollected: confirmed._sum.amount?.toString() ?? "0",
    confirmedPayments: confirmed._count._all,
    pendingPayments,
    rejectedPayments,
    byMethod: methodRows.map((row) => ({
      method: Object.values(PaymentMethod).find((method) => method === row.method) ?? null,
      total: row.total,
      count: Number(row.count),
    })),
    byDay: dayRows.map((row) => ({
      day: row.day,
      total: row.total,
      count: Number(row.count),
    })),
  };
}

function getAuditWhere(filters: AuditFilters): Prisma.PaymentAuditWhereInput | string {
  const resolved = resolveDateRange(filters.from, filters.to);
  if (!resolved.range) return resolved.error;

  const action = Object.values(PaymentAuditAction).find((value) => value === filters.action);
  const status = Object.values(PaymentStatus).find((value) => value === filters.status);
  if (filters.action && !action) return "Select a valid audit action.";
  if (filters.status && !status) return "Select a valid resulting payment status.";

  const where: Prisma.PaymentAuditWhereInput = {
    createdAt: { gte: resolved.range.start, lt: resolved.range.endExclusive },
  };
  if (action) where.action = action;
  if (status) where.newStatus = status;

  const query = filters.query?.trim().slice(0, 100);
  if (query) {
    where.OR = [
      { request: { is: { requestNumber: { contains: query, mode: "insensitive" } } } },
      { paymentId: { contains: query, mode: "insensitive" } },
    ];
  }

  return where;
}

const auditSelect = {
  id: true,
  paymentId: true,
  previousStatus: true,
  newStatus: true,
  action: true,
  rejectionReason: true,
  isBackfilled: true,
  createdAt: true,
  request: {
    select: {
      requestNumber: true,
      student: { select: { studentNumber: true } },
    },
  },
  actor: { select: { name: true } },
} satisfies Prisma.PaymentAuditSelect;

type TreasuryAuditRow = Prisma.PaymentAuditGetPayload<{ select: typeof auditSelect }>;

function serializeAuditRow(row: TreasuryAuditRow) {
  return {
    id: row.id,
    paymentId: row.paymentId,
    requestNumber: row.request.requestNumber,
    studentNumber: row.request.student.studentNumber,
    previousStatus: row.previousStatus,
    newStatus: row.newStatus,
    action: row.action,
    rejectionReason: row.rejectionReason,
    isBackfilled: row.isBackfilled,
    actorName: row.actor.name,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function getTreasuryAuditHistory(filters: AuditFilters) {
  await requirePortalRole("TREASURY");
  const where = getAuditWhere(filters);
  const page = safePage(filters.page);
  const pageSize = safePageSize(filters.pageSize);

  if (typeof where === "string") {
    return { error: where, entries: [], total: 0, page, pageSize };
  }

  const result = await prisma.$transaction(async (transaction) => {
    const total = await transaction.paymentAudit.count({ where });
    const visiblePage = Math.min(page, Math.max(1, Math.ceil(total / pageSize)));
    const rows = await transaction.paymentAudit.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (visiblePage - 1) * pageSize,
      take: pageSize,
      select: auditSelect,
    });
    return { total, page: visiblePage, rows };
  });

  return { error: null, entries: result.rows.map(serializeAuditRow), total: result.total, page: result.page, pageSize };
}

export async function getTreasuryAuditExport(filters: AuditFilters) {
  await requirePortalRole("TREASURY");
  const where = getAuditWhere(filters);
  if (typeof where === "string") return { error: where, entries: [], truncated: false };

  const rows = await prisma.paymentAudit.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: maximumCsvRows + 1,
    select: auditSelect,
  });

  return {
    error: null,
    entries: rows.slice(0, maximumCsvRows).map(serializeAuditRow),
    truncated: rows.length > maximumCsvRows,
  };
}

export async function getTreasuryCollectionExport(from?: string, to?: string) {
  await requirePortalRole("TREASURY");
  const resolved = resolveDateRange(from, to);
  if (!resolved.range) return { error: resolved.error, rows: [], truncated: false };

  const rows = await prisma.payment.findMany({
    where: {
      status: PaymentStatus.PAID,
      paidAt: { gte: resolved.range.start, lt: resolved.range.endExclusive },
    },
    orderBy: [{ paidAt: "asc" }, { id: "asc" }],
    take: maximumCsvRows + 1,
    select: {
      id: true,
      paidAt: true,
      amount: true,
      method: true,
      transactionReference: true,
      request: { select: { requestNumber: true } },
    },
  });

  return {
    error: null,
    rows: rows.slice(0, maximumCsvRows).map((row) => ({
      paymentId: row.id,
      confirmedAt: row.paidAt?.toISOString() ?? "",
      requestNumber: row.request.requestNumber,
      method: row.method ?? "",
      amount: row.amount?.toString() ?? "",
      applicationReference: row.transactionReference ?? "",
    })),
    truncated: rows.length > maximumCsvRows,
  };
}

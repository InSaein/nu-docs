BEGIN;

CREATE TYPE "PaymentAuditAction" AS ENUM ('CONFIRMED', 'REJECTED');

CREATE TABLE "PaymentAudit" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "previousStatus" "PaymentStatus" NOT NULL,
    "newStatus" "PaymentStatus" NOT NULL,
    "action" "PaymentAuditAction" NOT NULL,
    "actorId" TEXT NOT NULL,
    "rejectionReason" TEXT,
    "isBackfilled" BOOLEAN NOT NULL DEFAULT FALSE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentAudit_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PaymentAudit_paymentId_createdAt_idx" ON "PaymentAudit"("paymentId", "createdAt");
CREATE INDEX "PaymentAudit_requestId_createdAt_idx" ON "PaymentAudit"("requestId", "createdAt");
CREATE INDEX "PaymentAudit_actorId_createdAt_idx" ON "PaymentAudit"("actorId", "createdAt");
CREATE INDEX "PaymentAudit_createdAt_idx" ON "PaymentAudit"("createdAt");
CREATE INDEX "PaymentAudit_action_newStatus_createdAt_idx" ON "PaymentAudit"("action", "newStatus", "createdAt");

ALTER TABLE "PaymentAudit"
    ADD CONSTRAINT "PaymentAudit_paymentId_fkey"
    FOREIGN KEY ("paymentId") REFERENCES "Payment"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PaymentAudit"
    ADD CONSTRAINT "PaymentAudit_requestId_fkey"
    FOREIGN KEY ("requestId") REFERENCES "DocumentRequest"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PaymentAudit"
    ADD CONSTRAINT "PaymentAudit_actorId_fkey"
    FOREIGN KEY ("actorId") REFERENCES "User"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "PaymentAudit" (
    "id",
    "paymentId",
    "requestId",
    "previousStatus",
    "newStatus",
    "action",
    "actorId",
    "rejectionReason",
    "isBackfilled",
    "createdAt"
)
SELECT
    'backfill_' || payment."id" || '_' || payment."reviewedAt"::text,
    payment."id",
    payment."requestId",
    'PENDING'::"PaymentStatus",
    payment."status",
    CASE
        WHEN payment."status" = 'PAID' THEN 'CONFIRMED'::"PaymentAuditAction"
        ELSE 'REJECTED'::"PaymentAuditAction"
    END,
    payment."reviewedById",
    payment."rejectionReason",
    TRUE,
    payment."reviewedAt"
FROM "Payment" AS payment
WHERE payment."status" IN ('PAID', 'REJECTED')
  AND payment."reviewedAt" IS NOT NULL
  AND payment."reviewedById" IS NOT NULL;

COMMIT;

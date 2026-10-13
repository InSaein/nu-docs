BEGIN;

ALTER TYPE "PaymentStatus" ADD VALUE 'REJECTED';
ALTER TYPE "NotificationType" ADD VALUE 'PAYMENT_SUBMITTED';
ALTER TYPE "NotificationType" ADD VALUE 'PAYMENT_REJECTED';

ALTER TABLE "Payment"
  ADD COLUMN "rejectionReason" TEXT,
  ADD COLUMN "reviewedAt" TIMESTAMP(3),
  ADD COLUMN "reviewedById" TEXT;

ALTER TABLE "Payment"
  ADD CONSTRAINT "Payment_reviewedById_fkey"
  FOREIGN KEY ("reviewedById") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

COMMIT;

BEGIN;

WITH "reclassifiedPayments" AS (
  UPDATE "Payment"
  SET "status" = 'PENDING',
      "paidAt" = NULL
  WHERE "status" = 'PAID'
    AND "verified" = FALSE
  RETURNING "requestId"
)

UPDATE "Notification" AS notification
SET "type" = 'PAYMENT_SUBMITTED',
    "title" = 'Payment submitted',
    "message" = 'Your simulated payment for request ' || notification."requestNumber" || ' is awaiting Treasury review.'
WHERE notification."type" = 'PAYMENT_CONFIRMED'
  AND EXISTS (
    SELECT 1
    FROM "reclassifiedPayments" AS payment
    JOIN "DocumentRequest" AS request ON request."id" = payment."requestId"
    WHERE request."requestNumber" = notification."requestNumber"
  );

COMMIT;

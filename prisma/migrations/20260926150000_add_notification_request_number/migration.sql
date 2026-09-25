-- Add the already-existing nullable notification request reference.
ALTER TABLE "Notification" ADD COLUMN "requestNumber" TEXT;

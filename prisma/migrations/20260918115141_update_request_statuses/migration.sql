/*
  Warnings:

  - The values [PENDING,APPROVED] on the enum `RequestStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "RequestStatus_new" AS ENUM ('SUBMITTED', 'UNDER_REVIEW', 'PROCESSING', 'READY_FOR_RELEASE', 'COMPLETED', 'REJECTED');
ALTER TABLE "public"."DocumentRequest" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "DocumentRequest" ALTER COLUMN "status" TYPE "RequestStatus_new" USING ("status"::text::"RequestStatus_new");
ALTER TABLE "RequestStatusHistory" ALTER COLUMN "status" TYPE "RequestStatus_new" USING ("status"::text::"RequestStatus_new");
ALTER TYPE "RequestStatus" RENAME TO "RequestStatus_old";
ALTER TYPE "RequestStatus_new" RENAME TO "RequestStatus";
DROP TYPE "public"."RequestStatus_old";
ALTER TABLE "DocumentRequest" ALTER COLUMN "status" SET DEFAULT 'SUBMITTED';
COMMIT;

-- AlterTable
ALTER TABLE "DocumentRequest" ALTER COLUMN "status" SET DEFAULT 'SUBMITTED';

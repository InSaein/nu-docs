BEGIN;

CREATE TYPE "PickupAppointmentStatus" AS ENUM ('SCHEDULED', 'CANCELLED', 'COMPLETED');
CREATE TYPE "PickupAppointmentAction" AS ENUM ('SCHEDULED', 'RESCHEDULED', 'CANCELLED', 'COMPLETED', 'AUTO_CANCELLED');
ALTER TYPE "NotificationType" ADD VALUE 'PICKUP_SCHEDULED';
ALTER TYPE "NotificationType" ADD VALUE 'PICKUP_CHANGED';
ALTER TYPE "NotificationType" ADD VALUE 'PICKUP_CANCELLED';

CREATE TABLE "PickupSchedule" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "effectiveFrom" DATE NOT NULL,
    "effectiveUntil" DATE,
    "enabled" BOOLEAN NOT NULL DEFAULT TRUE,
    "timeZone" TEXT NOT NULL DEFAULT 'Asia/Manila',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PickupSchedule_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PickupSchedule_singleton_id_check" CHECK ("id" = 'default'),
    CONSTRAINT "PickupSchedule_effective_dates_check" CHECK ("effectiveUntil" IS NULL OR "effectiveUntil" >= "effectiveFrom"),
    CONSTRAINT "PickupSchedule_time_zone_check" CHECK ("timeZone" = 'Asia/Manila')
);

CREATE TABLE "PickupWeeklyRule" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "opensAt" TEXT NOT NULL,
    "closesAt" TEXT NOT NULL,
    "slotDurationMinutes" INTEGER NOT NULL,
    "capacity" INTEGER NOT NULL,
    CONSTRAINT "PickupWeeklyRule_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PickupWeeklyRule_weekday_check" CHECK ("weekday" BETWEEN 0 AND 6),
    CONSTRAINT "PickupWeeklyRule_times_check" CHECK ("opensAt" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' AND "closesAt" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' AND "opensAt" < "closesAt"),
    CONSTRAINT "PickupWeeklyRule_duration_check" CHECK ("slotDurationMinutes" BETWEEN 5 AND 480),
    CONSTRAINT "PickupWeeklyRule_capacity_check" CHECK ("capacity" > 0)
);

CREATE TABLE "PickupDateOverride" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "isClosed" BOOLEAN NOT NULL DEFAULT FALSE,
    "opensAt" TEXT,
    "closesAt" TEXT,
    "slotDurationMinutes" INTEGER,
    "capacity" INTEGER,
    "reason" TEXT,
    CONSTRAINT "PickupDateOverride_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PickupDateOverride_override_check" CHECK (
      ("isClosed" AND "opensAt" IS NULL AND "closesAt" IS NULL AND "slotDurationMinutes" IS NULL AND "capacity" IS NULL)
      OR
      (NOT "isClosed" AND "opensAt" IS NOT NULL AND "closesAt" IS NOT NULL AND "slotDurationMinutes" IS NOT NULL AND "capacity" IS NOT NULL AND "opensAt" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' AND "closesAt" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' AND "opensAt" < "closesAt" AND "slotDurationMinutes" BETWEEN 5 AND 480 AND "capacity" > 0)
    )
);

CREATE TABLE "PickupBlockedSlot" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "startsAt" TIMESTAMPTZ(3) NOT NULL,
    "endsAt" TIMESTAMPTZ(3) NOT NULL,
    "reason" TEXT,
    CONSTRAINT "PickupBlockedSlot_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PickupBlockedSlot_time_range_check" CHECK ("endsAt" > "startsAt")
);

CREATE TABLE "PickupAppointment" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "startsAt" TIMESTAMPTZ(3) NOT NULL,
    "endsAt" TIMESTAMPTZ(3) NOT NULL,
    "status" "PickupAppointmentStatus" NOT NULL DEFAULT 'SCHEDULED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "cancelledAt" TIMESTAMP(3),
    CONSTRAINT "PickupAppointment_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PickupAppointment_time_range_check" CHECK ("endsAt" > "startsAt")
);

CREATE TABLE "PickupAppointmentHistory" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" "PickupAppointmentAction" NOT NULL,
    "previousStartsAt" TIMESTAMPTZ(3),
    "newStartsAt" TIMESTAMPTZ(3),
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PickupAppointmentHistory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PickupWeeklyRule_scheduleId_weekday_key" ON "PickupWeeklyRule"("scheduleId", "weekday");
CREATE UNIQUE INDEX "PickupDateOverride_scheduleId_date_key" ON "PickupDateOverride"("scheduleId", "date");
CREATE INDEX "PickupDateOverride_date_idx" ON "PickupDateOverride"("date");
CREATE INDEX "PickupBlockedSlot_startsAt_endsAt_idx" ON "PickupBlockedSlot"("startsAt", "endsAt");
CREATE INDEX "PickupAppointment_startsAt_status_idx" ON "PickupAppointment"("startsAt", "status");
CREATE INDEX "PickupAppointment_requestId_createdAt_idx" ON "PickupAppointment"("requestId", "createdAt");
CREATE UNIQUE INDEX "PickupAppointment_one_scheduled_per_request_key"
  ON "PickupAppointment"("requestId") WHERE "status" = 'SCHEDULED';
CREATE INDEX "PickupAppointmentHistory_appointmentId_createdAt_idx" ON "PickupAppointmentHistory"("appointmentId", "createdAt");
CREATE INDEX "PickupAppointmentHistory_actorId_createdAt_idx" ON "PickupAppointmentHistory"("actorId", "createdAt");

ALTER TABLE "PickupWeeklyRule" ADD CONSTRAINT "PickupWeeklyRule_scheduleId_fkey"
  FOREIGN KEY ("scheduleId") REFERENCES "PickupSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PickupDateOverride" ADD CONSTRAINT "PickupDateOverride_scheduleId_fkey"
  FOREIGN KEY ("scheduleId") REFERENCES "PickupSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PickupBlockedSlot" ADD CONSTRAINT "PickupBlockedSlot_scheduleId_fkey"
  FOREIGN KEY ("scheduleId") REFERENCES "PickupSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PickupAppointment" ADD CONSTRAINT "PickupAppointment_requestId_fkey"
  FOREIGN KEY ("requestId") REFERENCES "DocumentRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PickupAppointmentHistory" ADD CONSTRAINT "PickupAppointmentHistory_appointmentId_fkey"
  FOREIGN KEY ("appointmentId") REFERENCES "PickupAppointment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PickupAppointmentHistory" ADD CONSTRAINT "PickupAppointmentHistory_actorId_fkey"
  FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

COMMIT;

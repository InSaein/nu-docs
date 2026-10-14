"use server";

import {
  NotificationType,
  PickupAppointmentAction,
  PickupAppointmentStatus,
  Prisma,
  RequestStatus,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requirePortalRole } from "@/lib/server/authorization";
import {
  formatManilaDateTime,
  getManilaDate,
  getPickupSlotsForDate,
  hasPickupCapacity,
  isPickupChangeTooLate,
  isPickupRequestEligible,
  manilaDateTimeToUtc,
  PICKUP_TIME_ZONE,
  validatePickupSchedule,
  type PickupDateOverrideInput,
  type PickupRuleInput,
  type PickupScheduleInput,
} from "@/lib/pickup-scheduling";
import { prisma } from "@/lib/prisma";

const SCHEDULE_ID = "default";
const PICKUP_LOCK_KEY = 741023;
const BOOKING_WINDOW_DAYS = 60;

type Transaction = Prisma.TransactionClient;
class PickupValidationError extends Error {}

type ScheduleRecord = Prisma.PickupScheduleGetPayload<{
  include: { weeklyRules: true; dateOverrides: true; blockedSlots: true };
}>;

function revalidatePickupViews() {
  revalidatePath("/student/track");
  revalidatePath("/student/notifications");
  revalidatePath("/registrar/pickup-schedule");
  revalidatePath("/registrar/requests");
  revalidatePath("/registrar/dashboard");
}

async function acquirePickupLock(transaction: Transaction) {
  await transaction.$queryRaw`SELECT pg_advisory_xact_lock(${PICKUP_LOCK_KEY}) IS NULL AS "locked"`;
  await transaction.$queryRaw`SELECT "id" FROM "PickupSchedule" WHERE "id" = ${SCHEDULE_ID} FOR UPDATE`;
}

async function getSchedule(transaction: Transaction | typeof prisma): Promise<ScheduleRecord | null> {
  return transaction.pickupSchedule.findUnique({
    where: { id: SCHEDULE_ID },
    include: { weeklyRules: true, dateOverrides: true, blockedSlots: true },
  });
}

function toScheduleInput(schedule: ScheduleRecord | null, fallbackDate = getManilaDate(new Date())): PickupScheduleInput {
  return {
    enabled: schedule?.enabled ?? false,
    effectiveFrom: schedule ? getManilaDate(schedule.effectiveFrom) : fallbackDate,
    effectiveUntil: schedule?.effectiveUntil ? getManilaDate(schedule.effectiveUntil) : null,
    rules: schedule?.weeklyRules.map((rule) => ({
      weekday: rule.weekday,
      opensAt: rule.opensAt,
      closesAt: rule.closesAt,
      slotDurationMinutes: rule.slotDurationMinutes,
      capacity: rule.capacity,
    })) ?? [],
    overrides: schedule?.dateOverrides.map((override) => ({
      date: getManilaDate(override.date),
      isClosed: override.isClosed,
      opensAt: override.opensAt,
      closesAt: override.closesAt,
      slotDurationMinutes: override.slotDurationMinutes,
      capacity: override.capacity,
      reason: override.reason,
    })) ?? [],
    blockedSlots: schedule?.blockedSlots.map((slot) => ({ startsAt: slot.startsAt, endsAt: slot.endsAt })) ?? [],
  };
}

function displaySchedule(schedule: ScheduleRecord | null) {
  if (!schedule) {
    return {
      enabled: false,
      effectiveFrom: getManilaDate(new Date()),
      effectiveUntil: null,
      timeZone: PICKUP_TIME_ZONE,
      weeklyRules: [],
      dateOverrides: [],
      blockedSlots: [],
    };
  }

  return {
    enabled: schedule.enabled,
    effectiveFrom: getManilaDate(schedule.effectiveFrom),
    effectiveUntil: schedule.effectiveUntil ? getManilaDate(schedule.effectiveUntil) : null,
    timeZone: schedule.timeZone,
    weeklyRules: schedule.weeklyRules,
    dateOverrides: schedule.dateOverrides.map((override) => ({
      ...override,
      date: getManilaDate(override.date),
    })),
    blockedSlots: schedule.blockedSlots.map((slot) => ({
      ...slot,
      startsAt: slot.startsAt.toISOString(),
      endsAt: slot.endsAt.toISOString(),
    })),
  };
}

export async function getRegistrarPickupConfiguration() {
  await requirePortalRole("REGISTRAR");
  return { schedule: displaySchedule(await getSchedule(prisma)) };
}

async function assertScheduledAppointmentsRemainValid(
  transaction: Transaction,
  schedule: PickupScheduleInput,
) {
  const now = new Date();
  const appointments = await transaction.pickupAppointment.findMany({
    where: { status: PickupAppointmentStatus.SCHEDULED, startsAt: { gt: now } },
    select: { id: true, startsAt: true, endsAt: true },
  });
  const counts = new Map<string, number>();
  for (const appointment of appointments) {
    const key = appointment.startsAt.toISOString();
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  for (const appointment of appointments) {
    const date = getManilaDate(appointment.startsAt);
    const slot = getPickupSlotsForDate(schedule, date, new Date(0))
      .find((candidate) => candidate.startsAt === appointment.startsAt.toISOString()
        && candidate.endsAt === appointment.endsAt.toISOString());
    if (!slot || (counts.get(slot.startsAt) ?? 0) > slot.capacity) {
      throw new Error("This availability change conflicts with one or more existing appointments.");
    }
  }
}

async function assertScheduleSafe(
  transaction: Transaction,
  schedule: ScheduleRecord | null,
) {
  const input = toScheduleInput(schedule);
  const validationError = validatePickupSchedule(input);
  if (validationError) throw new PickupValidationError(validationError);
  try {
    await assertScheduledAppointmentsRemainValid(transaction, input);
  } catch (error) {
    if (error instanceof Error && error.message.includes("conflicts with one or more existing appointments")) {
      throw new PickupValidationError(error.message);
    }
    throw error;
  }
}

function safeReason(value: unknown, max = 240): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") throw new Error("Enter a valid reason.");
  const reason = value.trim();
  if (reason.length > max) throw new Error(`Reason must be ${max} characters or fewer.`);
  return reason || null;
}

function validTime(value: unknown): value is string {
  return typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function validDate(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
    && Number.isFinite(date.getTime())
    && date.toISOString().slice(0, 10) === value;
}

function parseIsoDateTime(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime()) || date.toISOString() !== value) return null;
  return date;
}

function parseRuleInputs(value: unknown): PickupRuleInput[] {
  if (!Array.isArray(value) || value.length > 7) throw new Error("Submit a valid weekly schedule.");
  return value.map((item) => {
    if (!item || typeof item !== "object") throw new Error("Submit a valid weekly schedule.");
    const rule = item as Record<string, unknown>;
    if (!Number.isInteger(rule.weekday) || !validTime(rule.opensAt) || !validTime(rule.closesAt)
      || !Number.isInteger(rule.slotDurationMinutes) || !Number.isInteger(rule.capacity)) {
      throw new Error("Each working day needs valid hours, slot duration, and capacity.");
    }
    return {
      weekday: rule.weekday as number,
      opensAt: rule.opensAt,
      closesAt: rule.closesAt,
      slotDurationMinutes: rule.slotDurationMinutes as number,
      capacity: rule.capacity as number,
    };
  });
}

function parseOverrideInput(input: unknown): PickupDateOverrideInput {
  if (!input || typeof input !== "object") throw new Error("Submit a valid date exception.");
  const value = input as Record<string, unknown>;
  if (!validDate(value.date) || typeof value.isClosed !== "boolean") throw new Error("Choose a valid exception date.");
  if (value.isClosed) {
    return {
      date: value.date,
      isClosed: true,
      opensAt: null,
      closesAt: null,
      slotDurationMinutes: null,
      capacity: null,
      reason: safeReason(value.reason),
    };
  }
  if (!validTime(value.opensAt) || !validTime(value.closesAt)
    || !Number.isInteger(value.slotDurationMinutes) || !Number.isInteger(value.capacity)) {
    throw new Error("Open date exceptions need valid hours, slot duration, and capacity.");
  }
  return {
    date: value.date,
    isClosed: false,
    opensAt: value.opensAt,
    closesAt: value.closesAt,
    slotDurationMinutes: value.slotDurationMinutes as number,
    capacity: value.capacity as number,
    reason: safeReason(value.reason),
  };
}

async function upsertSchedule(
  transaction: Transaction,
  effectiveFrom: string,
  effectiveUntil: string | null,
  enabled: boolean,
) {
  const from = new Date(`${effectiveFrom}T00:00:00.000Z`);
  const until = effectiveUntil ? new Date(`${effectiveUntil}T00:00:00.000Z`) : null;
  return transaction.pickupSchedule.upsert({
    where: { id: SCHEDULE_ID },
    create: {
      id: SCHEDULE_ID,
      effectiveFrom: from,
      effectiveUntil: until,
      enabled,
      timeZone: PICKUP_TIME_ZONE,
    },
    update: { effectiveFrom: from, effectiveUntil: until, enabled, timeZone: PICKUP_TIME_ZONE },
  });
}

async function activeAppointmentForRequest(transaction: Transaction, requestId: string) {
  return transaction.pickupAppointment.findFirst({
    where: { requestId, status: PickupAppointmentStatus.SCHEDULED },
    orderBy: { createdAt: "desc" },
  });
}

async function notifyStudent(
  transaction: Transaction,
  userId: string,
  requestNumber: string,
  type: NotificationType,
  title: string,
  message: string,
) {
  await transaction.notification.create({
    data: { userId, requestNumber, type, title, message },
  });
}

async function addHistory(
  transaction: Transaction,
  appointmentId: string,
  actorId: string,
  action: PickupAppointmentAction,
  previousStartsAt?: Date | null,
  newStartsAt?: Date | null,
  reason?: string | null,
) {
  await transaction.pickupAppointmentHistory.create({
    data: {
      appointmentId,
      actorId,
      action,
      previousStartsAt: previousStartsAt ?? null,
      newStartsAt: newStartsAt ?? null,
      reason: reason ?? null,
    },
  });
}

async function findAvailableSlot(
  transaction: Transaction,
  startsAt: Date,
  excludeAppointmentId?: string,
) {
  if (startsAt <= new Date()) return null;
  const scheduleRecord = await getSchedule(transaction);
  if (!scheduleRecord) return null;
  const schedule = toScheduleInput(scheduleRecord);
  const slot = getPickupSlotsForDate(schedule, getManilaDate(startsAt), new Date(0))
    .find((candidate) => candidate.startsAt === startsAt.toISOString());
  if (!slot) return null;
  const booked = await transaction.pickupAppointment.count({
    where: {
      startsAt,
      status: PickupAppointmentStatus.SCHEDULED,
      ...(excludeAppointmentId ? { id: { not: excludeAppointmentId } } : {}),
    },
  });
  return hasPickupCapacity(slot.capacity, booked) ? slot : null;
}

export async function getStudentPickupInfo(requestNumber: string) {
  const session = await requirePortalRole("STUDENT");
  const request = await prisma.documentRequest.findUnique({
    where: { requestNumber, studentId: session.userId },
    select: {
      id: true,
      requestNumber: true,
      status: true,
      pickupAppointments: {
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { history: { orderBy: { createdAt: "desc" }, take: 10 } },
      },
    },
  });
  if (!request) return null;

  const now = new Date();
  const scheduledAppointment = request.pickupAppointments.find((item) => item.status === PickupAppointmentStatus.SCHEDULED);
  const schedule = await getSchedule(prisma);
  const scheduleInput = toScheduleInput(schedule);
  const endOfWindow = new Date(now.getTime() + BOOKING_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const bookedAppointments = await prisma.pickupAppointment.findMany({
    where: {
      status: PickupAppointmentStatus.SCHEDULED,
      startsAt: { gt: now, lte: endOfWindow },
    },
    select: { startsAt: true, endsAt: true },
  });
  const counts = new Map<string, number>();
  for (const appointment of bookedAppointments) {
    const key = appointment.startsAt.toISOString();
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const availableSlots = [];
  const availabilityDates: string[] = [];
  for (let offset = 0; offset <= BOOKING_WINDOW_DAYS; offset += 1) {
    const date = getManilaDate(new Date(now.getTime() + offset * 24 * 60 * 60 * 1000));
    availabilityDates.push(date);
    for (const slot of getPickupSlotsForDate(scheduleInput, date, now)) {
      const remaining = slot.capacity - (counts.get(slot.startsAt) ?? 0);
      if (remaining > 0) availableSlots.push({ ...slot, remaining });
    }
  }

  return {
    eligible: request.status === RequestStatus.READY_FOR_RELEASE,
    status: request.status,
    availabilityDates,
    appointment: scheduledAppointment ? {
      id: scheduledAppointment.id,
      startsAt: scheduledAppointment.startsAt.toISOString(),
      endsAt: scheduledAppointment.endsAt.toISOString(),
      status: scheduledAppointment.status,
    } : null,
    appointmentHistory: request.pickupAppointments
      .filter((item) => item.status !== PickupAppointmentStatus.SCHEDULED)
      .map((item) => ({
        id: item.id,
        startsAt: item.startsAt.toISOString(),
        endsAt: item.endsAt.toISOString(),
        status: item.status,
      })),
    availableSlots,
  };
}

export async function bookPickupAppointment(requestNumber: string, startsAtValue: string) {
  const session = await requirePortalRole("STUDENT");
  const startsAt = parseIsoDateTime(startsAtValue);
  if (!requestNumber.trim() || !startsAt) return { success: false as const, error: "Choose a valid pickup time." };

  try {
    await prisma.$transaction(async (transaction) => {
      await acquirePickupLock(transaction);
      const request = await transaction.documentRequest.findUnique({
        where: { requestNumber, studentId: session.userId },
        select: { id: true, requestNumber: true, status: true, studentId: true },
      });
      if (!request) throw new Error("Request not found.");
      if (!isPickupRequestEligible(session.userId, request.studentId, request.status)) {
        throw new Error("This request is not ready for pickup.");
      }
      if (await activeAppointmentForRequest(transaction, request.id)) throw new Error("This request already has a scheduled pickup.");
      const slot = await findAvailableSlot(transaction, startsAt);
      if (!slot) throw new Error("That pickup time is no longer available. Choose another time.");
      const appointment = await transaction.pickupAppointment.create({
        data: {
          requestId: request.id,
          startsAt,
          endsAt: new Date(slot.endsAt),
        },
      });
      await addHistory(transaction, appointment.id, session.userId, PickupAppointmentAction.SCHEDULED, null, startsAt);
      await notifyStudent(
        transaction,
        session.userId,
        request.requestNumber,
        NotificationType.PICKUP_SCHEDULED,
        "Pickup scheduled",
        `Your pickup for request ${request.requestNumber} is scheduled for ${formatManilaDateTime(startsAt)}.`,
      );
    });
    revalidatePickupViews();
    return { success: true as const };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "Request not found." || message === "This request is not ready for pickup."
      || message === "This request already has a scheduled pickup."
      || message === "That pickup time is no longer available. Choose another time.") {
      return { success: false as const, error: message };
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { success: false as const, error: "This request already has a scheduled pickup." };
    }
    console.error("[NU-Docs] Pickup booking failed.", error);
    return { success: false as const, error: "Unable to schedule pickup. Please try again." };
  }
}

export async function cancelPickupAppointment(appointmentId: string, reasonValue?: string) {
  const session = await requirePortalRole("STUDENT");
  const reason = safeReason(reasonValue);

  try {
    await prisma.$transaction(async (transaction) => {
      await acquirePickupLock(transaction);
      const appointment = await transaction.pickupAppointment.findFirst({
        where: { id: appointmentId, status: PickupAppointmentStatus.SCHEDULED },
        include: { request: { select: { studentId: true, requestNumber: true } } },
      });
      if (!appointment || appointment.request.studentId !== session.userId) throw new Error("Scheduled pickup not found.");
      if (isPickupChangeTooLate(appointment.startsAt)) {
        throw new Error("Pickup changes must be made at least 24 hours before the appointment.");
      }
      await transaction.pickupAppointment.update({
        where: { id: appointment.id },
        data: { status: PickupAppointmentStatus.CANCELLED, cancelledAt: new Date() },
      });
      await addHistory(transaction, appointment.id, session.userId, PickupAppointmentAction.CANCELLED, appointment.startsAt, null, reason);
      await notifyStudent(
        transaction,
        session.userId,
        appointment.request.requestNumber,
        NotificationType.PICKUP_CANCELLED,
        "Pickup cancelled",
        `Your pickup for request ${appointment.request.requestNumber} has been cancelled.`,
      );
    });
    revalidatePickupViews();
    return { success: true as const };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "Scheduled pickup not found."
      || message === "Pickup changes must be made at least 24 hours before the appointment.") {
      return { success: false as const, error: message };
    }
    console.error("[NU-Docs] Pickup cancellation failed.", error);
    return { success: false as const, error: "Unable to cancel pickup. Please try again." };
  }
}

export async function reschedulePickupAppointment(appointmentId: string, startsAtValue: string) {
  const session = await requirePortalRole("STUDENT");
  const startsAt = parseIsoDateTime(startsAtValue);
  if (!startsAt) return { success: false as const, error: "Choose a valid pickup time." };

  try {
    await prisma.$transaction(async (transaction) => {
      await acquirePickupLock(transaction);
      const appointment = await transaction.pickupAppointment.findFirst({
        where: { id: appointmentId, status: PickupAppointmentStatus.SCHEDULED },
        include: { request: { select: { id: true, requestNumber: true, studentId: true, status: true } } },
      });
      if (!appointment || appointment.request.studentId !== session.userId) throw new Error("Scheduled pickup not found.");
      if (appointment.request.status !== RequestStatus.READY_FOR_RELEASE) throw new Error("This request is not eligible for pickup.");
      if (isPickupChangeTooLate(appointment.startsAt)) {
        throw new Error("Pickup changes must be made at least 24 hours before the appointment.");
      }
      if (isPickupChangeTooLate(startsAt)) {
        throw new Error("Choose a pickup time at least 24 hours from now.");
      }
      if (startsAt.getTime() === appointment.startsAt.getTime()) throw new Error("Choose a different pickup time.");
      const slot = await findAvailableSlot(transaction, startsAt, appointment.id);
      if (!slot) throw new Error("That pickup time is no longer available. Choose another time.");
      await transaction.pickupAppointment.update({
        where: { id: appointment.id },
        data: { status: PickupAppointmentStatus.CANCELLED, cancelledAt: new Date() },
      });
      await addHistory(transaction, appointment.id, session.userId, PickupAppointmentAction.RESCHEDULED, appointment.startsAt, startsAt);
      const nextAppointment = await transaction.pickupAppointment.create({
        data: { requestId: appointment.request.id, startsAt, endsAt: new Date(slot.endsAt) },
      });
      await addHistory(transaction, nextAppointment.id, session.userId, PickupAppointmentAction.SCHEDULED, null, startsAt);
      await notifyStudent(
        transaction,
        session.userId,
        appointment.request.requestNumber,
        NotificationType.PICKUP_CHANGED,
        "Pickup rescheduled",
        `Your pickup for request ${appointment.request.requestNumber} is now scheduled for ${formatManilaDateTime(startsAt)}.`,
      );
    });
    revalidatePickupViews();
    return { success: true as const };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if ([
      "Scheduled pickup not found.",
      "This request is not eligible for pickup.",
      "Pickup changes must be made at least 24 hours before the appointment.",
      "Choose a pickup time at least 24 hours from now.",
      "Choose a different pickup time.",
      "That pickup time is no longer available. Choose another time.",
    ].includes(message)) {
      return { success: false as const, error: message };
    }
    console.error("[NU-Docs] Pickup rescheduling failed.", error);
    return { success: false as const, error: "Unable to reschedule pickup. Please try again." };
  }
}

export async function savePickupWeeklySchedule(input: {
  enabled: boolean;
  effectiveFrom: string;
  effectiveUntil: string | null;
  rules: unknown;
}) {
  await requirePortalRole("REGISTRAR");
  if (typeof input?.enabled !== "boolean" || !validDate(input.effectiveFrom)
    || (input.effectiveUntil !== null && !validDate(input.effectiveUntil))) {
    return { success: false as const, error: "Enter valid schedule dates and status." };
  }
  let rules: PickupRuleInput[];
  try {
    rules = parseRuleInputs(input.rules);
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : "Invalid weekly schedule." };
  }
  const current = await getSchedule(prisma);
  const proposed: PickupScheduleInput = {
    ...toScheduleInput(current, input.effectiveFrom),
    enabled: input.enabled,
    effectiveFrom: input.effectiveFrom,
    effectiveUntil: input.effectiveUntil,
    rules,
  };
  const validationError = validatePickupSchedule(proposed);
  if (validationError) return { success: false as const, error: validationError };

  try {
    await prisma.$transaction(async (transaction) => {
      await acquirePickupLock(transaction);
      const schedule = await upsertSchedule(transaction, input.effectiveFrom, input.effectiveUntil, input.enabled);
      await transaction.pickupWeeklyRule.deleteMany({ where: { scheduleId: schedule.id } });
      if (rules.length) {
        await transaction.pickupWeeklyRule.createMany({
          data: rules.map((rule) => ({ ...rule, scheduleId: schedule.id })),
        });
      }
      await assertScheduleSafe(transaction, await getSchedule(transaction));
    });
    revalidatePickupViews();
    return { success: true as const };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (error instanceof PickupValidationError) {
      return { success: false as const, error: message };
    }
    console.error("[NU-Docs] Pickup schedule update failed.", error);
    return { success: false as const, error: "Unable to save pickup schedule. Please try again." };
  }
}

export async function savePickupDateOverride(input: unknown) {
  await requirePortalRole("REGISTRAR");
  let override: PickupDateOverrideInput;
  try {
    override = parseOverrideInput(input);
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : "Invalid date exception." };
  }

  const current = await getSchedule(prisma);
  const proposed = toScheduleInput(current);
  proposed.overrides = [
    ...proposed.overrides.filter((item) => item.date !== override.date),
    override,
  ];
  const validationError = validatePickupSchedule(proposed);
  if (validationError) return { success: false as const, error: validationError };

  try {
    await prisma.$transaction(async (transaction) => {
      await acquirePickupLock(transaction);
      const schedule = await transaction.pickupSchedule.findUnique({ where: { id: SCHEDULE_ID } });
      if (!schedule) throw new Error("Configure the recurring schedule before adding date exceptions.");
      await transaction.pickupDateOverride.upsert({
        where: { scheduleId_date: { scheduleId: schedule.id, date: new Date(`${override.date}T00:00:00.000Z`) } },
        create: {
          scheduleId: schedule.id,
          date: new Date(`${override.date}T00:00:00.000Z`),
          isClosed: override.isClosed,
          opensAt: override.opensAt,
          closesAt: override.closesAt,
          slotDurationMinutes: override.slotDurationMinutes,
          capacity: override.capacity,
          reason: override.reason,
        },
        update: {
          isClosed: override.isClosed,
          opensAt: override.opensAt,
          closesAt: override.closesAt,
          slotDurationMinutes: override.slotDurationMinutes,
          capacity: override.capacity,
          reason: override.reason,
        },
      });
      await assertScheduleSafe(transaction, await getSchedule(transaction));
    });
    revalidatePickupViews();
    return { success: true as const };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (error instanceof PickupValidationError) {
      return { success: false as const, error: message };
    }
    console.error("[NU-Docs] Pickup date exception update failed.", error);
    return { success: false as const, error: message || "Unable to save date exception." };
  }
}

export async function removePickupDateOverride(overrideId: string) {
  await requirePortalRole("REGISTRAR");
  if (!overrideId.trim()) return { success: false as const, error: "Date exception not found." };
  try {
    await prisma.$transaction(async (transaction) => {
      await acquirePickupLock(transaction);
      const currentSchedule = await getSchedule(transaction);
      if (!currentSchedule) throw new Error("Date exception not found.");
      const deleted = await transaction.pickupDateOverride.deleteMany({ where: { id: overrideId, scheduleId: SCHEDULE_ID } });
      if (deleted.count !== 1) throw new Error("Date exception not found.");
      await assertScheduleSafe(transaction, await getSchedule(transaction));
    });
    revalidatePickupViews();
    return { success: true as const };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (error instanceof PickupValidationError || message === "Date exception not found.") {
      return { success: false as const, error: message };
    }
    console.error("[NU-Docs] Pickup date exception removal failed.", error);
    return { success: false as const, error: "Unable to remove date exception." };
  }
}

export async function addPickupBlockedSlot(input: { date: string; startsAt: string; endsAt: string; reason?: string }) {
  await requirePortalRole("REGISTRAR");
  const startsAt = validDate(input?.date) && validTime(input?.startsAt)
    ? manilaDateTimeToUtc(input.date, input.startsAt)
    : null;
  const endsAt = validDate(input?.date) && validTime(input?.endsAt)
    ? manilaDateTimeToUtc(input.date, input.endsAt)
    : null;
  if (!startsAt || !endsAt || endsAt <= startsAt) {
    return { success: false as const, error: "Choose a valid blocked time interval." };
  }

  try {
    await prisma.$transaction(async (transaction) => {
      await acquirePickupLock(transaction);
      const schedule = await transaction.pickupSchedule.findUnique({ where: { id: SCHEDULE_ID } });
      if (!schedule) throw new Error("Configure the recurring schedule before blocking times.");
      await transaction.pickupBlockedSlot.create({
        data: { scheduleId: schedule.id, startsAt, endsAt, reason: safeReason(input.reason) },
      });
      await assertScheduleSafe(transaction, await getSchedule(transaction));
    });
    revalidatePickupViews();
    return { success: true as const };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (error instanceof PickupValidationError) {
      return { success: false as const, error: message };
    }
    console.error("[NU-Docs] Pickup blocked time creation failed.", error);
    return { success: false as const, error: message || "Unable to block this time." };
  }
}

export async function removePickupBlockedSlot(blockedSlotId: string) {
  await requirePortalRole("REGISTRAR");
  if (!blockedSlotId.trim()) return { success: false as const, error: "Blocked time not found." };
  try {
    await prisma.$transaction(async (transaction) => {
      await acquirePickupLock(transaction);
      const deleted = await transaction.pickupBlockedSlot.deleteMany({ where: { id: blockedSlotId, scheduleId: SCHEDULE_ID } });
      if (deleted.count !== 1) throw new Error("Blocked time not found.");
    });
    revalidatePickupViews();
    return { success: true as const };
  } catch (error) {
    if (error instanceof Error && error.message === "Blocked time not found.") {
      return { success: false as const, error: error.message };
    }
    console.error("[NU-Docs] Pickup blocked time removal failed.", error);
    return { success: false as const, error: "Unable to remove blocked time." };
  }
}

export async function getRegistrarPickupSchedule(filters: {
  date?: string;
  status?: string;
  search?: string;
} = {}) {
  await requirePortalRole("REGISTRAR");
  const schedule = await getSchedule(prisma);
  const today = getManilaDate(new Date());
  const start = filters.date && validDate(filters.date)
    ? manilaDateTimeToUtc(filters.date, "00:00")
    : manilaDateTimeToUtc(today, "00:00");
  const end = start ? new Date(start.getTime() + (filters.date ? 24 : 90 * 24) * 60 * 60 * 1000) : new Date();
  const query = typeof filters.search === "string" ? filters.search.trim().slice(0, 100) : "";
  const status = Object.values(PickupAppointmentStatus).includes(filters.status as PickupAppointmentStatus)
    ? filters.status as PickupAppointmentStatus
    : undefined;
  const appointments = await prisma.pickupAppointment.findMany({
    where: {
      startsAt: { gte: start ?? new Date(), lt: end },
      ...(status ? { status } : {}),
      ...(query ? {
        request: {
          OR: [
            { requestNumber: { contains: query, mode: "insensitive" } },
            { student: { name: { contains: query, mode: "insensitive" } } },
            { student: { studentNumber: { contains: query, mode: "insensitive" } } },
          ],
        },
      } : {}),
    },
    include: {
      request: {
        select: {
          requestNumber: true,
          documentType: true,
          status: true,
          student: { select: { name: true, studentNumber: true } },
        },
      },
    },
    orderBy: { startsAt: "asc" },
    take: 300,
  });
  return {
    schedule: displaySchedule(schedule),
    appointments: appointments.map((appointment) => ({
      id: appointment.id,
      startsAt: appointment.startsAt.toISOString(),
      endsAt: appointment.endsAt.toISOString(),
      status: appointment.status,
      requestNumber: appointment.request.requestNumber,
      documentType: appointment.request.documentType,
      requestStatus: appointment.request.status,
      studentName: appointment.request.student.name,
      studentNumber: appointment.request.student.studentNumber,
    })),
  };
}

export async function getRegistrarPickupAppointmentsForRequest(requestNumber: string) {
  await requirePortalRole("REGISTRAR");
  const normalizedRequestNumber = requestNumber.trim().slice(0, 100);
  if (!normalizedRequestNumber) return [];
  const appointments = await prisma.pickupAppointment.findMany({
    where: { request: { requestNumber: normalizedRequestNumber } },
    include: { history: { orderBy: { createdAt: "desc" }, take: 20 } },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  return appointments.map((appointment) => ({
    id: appointment.id,
    startsAt: appointment.startsAt.toISOString(),
    endsAt: appointment.endsAt.toISOString(),
    status: appointment.status,
    history: appointment.history.map((entry) => ({
      action: entry.action,
      previousStartsAt: entry.previousStartsAt?.toISOString() ?? null,
      newStartsAt: entry.newStartsAt?.toISOString() ?? null,
      reason: entry.reason,
      createdAt: entry.createdAt.toISOString(),
    })),
  }));
}

export async function cancelPickupAppointmentAsRegistrar(appointmentId: string, reasonValue?: string) {
  const session = await requirePortalRole("REGISTRAR");
  const reason = safeReason(reasonValue);
  try {
    await prisma.$transaction(async (transaction) => {
      await acquirePickupLock(transaction);
      const appointment = await transaction.pickupAppointment.findFirst({
        where: { id: appointmentId, status: PickupAppointmentStatus.SCHEDULED },
        include: { request: { select: { requestNumber: true, studentId: true } } },
      });
      if (!appointment) throw new Error("Scheduled pickup not found.");
      await transaction.pickupAppointment.update({
        where: { id: appointment.id },
        data: { status: PickupAppointmentStatus.CANCELLED, cancelledAt: new Date() },
      });
      await addHistory(transaction, appointment.id, session.userId, PickupAppointmentAction.CANCELLED, appointment.startsAt, null, reason);
      await notifyStudent(
        transaction,
        appointment.request.studentId,
        appointment.request.requestNumber,
        NotificationType.PICKUP_CANCELLED,
        "Pickup cancelled",
        `The Registrar cancelled your pickup for request ${appointment.request.requestNumber}${reason ? `: ${reason}` : "."}`,
      );
    });
    revalidatePickupViews();
    return { success: true as const };
  } catch (error) {
    if (error instanceof Error && error.message === "Scheduled pickup not found.") {
      return { success: false as const, error: error.message };
    }
    console.error("[NU-Docs] Registrar pickup cancellation failed.", error);
    return { success: false as const, error: "Unable to cancel this pickup." };
  }
}

export async function confirmPickupHandover(appointmentId: string) {
  const session = await requirePortalRole("REGISTRAR");
  try {
    await prisma.$transaction(async (transaction) => {
      await acquirePickupLock(transaction);
      const appointment = await transaction.pickupAppointment.findFirst({
        where: { id: appointmentId, status: PickupAppointmentStatus.SCHEDULED },
        include: { request: { select: { id: true, requestNumber: true, studentId: true, status: true } } },
      });
      if (!appointment) throw new Error("Scheduled pickup not found.");
      if (appointment.request.status !== RequestStatus.READY_FOR_RELEASE) {
        throw new Error("This request is no longer eligible for pickup.");
      }
      const now = new Date();
      await transaction.pickupAppointment.update({
        where: { id: appointment.id },
        data: { status: PickupAppointmentStatus.COMPLETED },
      });
      await addHistory(transaction, appointment.id, session.userId, PickupAppointmentAction.COMPLETED, appointment.startsAt, null);
      await transaction.documentRequest.update({
        where: { id: appointment.request.id },
        data: { status: RequestStatus.COMPLETED, completedAt: now },
      });
      await transaction.requestStatusHistory.create({
        data: {
          requestId: appointment.request.id,
          status: RequestStatus.COMPLETED,
          remarks: "Document handover confirmed at the scheduled pickup.",
          createdAt: now,
        },
      });
      await transaction.notification.create({
        data: {
          userId: appointment.request.studentId,
          requestNumber: appointment.request.requestNumber,
          type: NotificationType.STATUS_UPDATED,
          title: "Request completed",
          message: `Your document request ${appointment.request.requestNumber} was handed over and completed.`,
        },
      });
      await notifyStudent(
        transaction,
        appointment.request.studentId,
        appointment.request.requestNumber,
        NotificationType.PICKUP_CHANGED,
        "Pickup completed",
        `The Registrar confirmed handover for request ${appointment.request.requestNumber}.`,
      );
    });
    revalidatePickupViews();
    return { success: true as const };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "Scheduled pickup not found." || message === "This request is no longer eligible for pickup.") {
      return { success: false as const, error: message };
    }
    console.error("[NU-Docs] Pickup handover confirmation failed.", error);
    return { success: false as const, error: "Unable to confirm pickup handover." };
  }
}

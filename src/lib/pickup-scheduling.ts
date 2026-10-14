export const PICKUP_TIME_ZONE = "Asia/Manila";
const MANILA_UTC_OFFSET_MINUTES = 8 * 60;

export type PickupRuleInput = {
  weekday: number;
  opensAt: string;
  closesAt: string;
  slotDurationMinutes: number;
  capacity: number;
};

export type PickupDateOverrideInput = {
  date: string;
  isClosed: boolean;
  opensAt: string | null;
  closesAt: string | null;
  slotDurationMinutes: number | null;
  capacity: number | null;
  reason: string | null;
};

export type PickupBlockedInterval = {
  startsAt: Date;
  endsAt: Date;
};

export type PickupScheduleInput = {
  enabled: boolean;
  effectiveFrom: string;
  effectiveUntil: string | null;
  rules: PickupRuleInput[];
  overrides: PickupDateOverrideInput[];
  blockedSlots: PickupBlockedInterval[];
};

export type PickupSlot = {
  startsAt: string;
  endsAt: string;
  capacity: number;
};

function parseDateParts(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return { year, month, day, date };
}

function minutesFromTime(value: string) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

export function isValidPickupDate(value: string): boolean {
  return parseDateParts(value) !== null;
}

export function isPickupRequestEligible(userId: string, requestOwnerId: string, status: string): boolean {
  return userId === requestOwnerId && status === "READY_FOR_RELEASE";
}

export function hasPickupCapacity(capacity: number, activeBookings: number): boolean {
  return Number.isInteger(capacity) && capacity > 0
    && Number.isInteger(activeBookings) && activeBookings >= 0
    && activeBookings < capacity;
}

export function isPickupChangeTooLate(startsAt: Date, now = new Date()): boolean {
  return startsAt.getTime() - now.getTime() < 24 * 60 * 60 * 1000;
}

export function getManilaDate(value: Date): string {
  const local = new Date(value.getTime() + MANILA_UTC_OFFSET_MINUTES * 60_000);
  return `${local.getUTCFullYear()}-${String(local.getUTCMonth() + 1).padStart(2, "0")}-${String(local.getUTCDate()).padStart(2, "0")}`;
}

export function getManilaWeekday(value: string): number | null {
  const parsed = parseDateParts(value);
  return parsed?.date.getUTCDay() ?? null;
}

export function manilaDateTimeToUtc(dateValue: string, timeValue: string): Date | null {
  const parsed = parseDateParts(dateValue);
  const minutes = minutesFromTime(timeValue);
  if (!parsed || minutes === null) return null;
  return new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day, 0, minutes - MANILA_UTC_OFFSET_MINUTES));
}

export function formatManilaDateTime(value: Date): string {
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: PICKUP_TIME_ZONE,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

export function validatePickupSchedule(input: PickupScheduleInput): string | null {
  if (!isValidPickupDate(input.effectiveFrom)) return "Choose a valid schedule start date.";
  if (input.effectiveUntil && !isValidPickupDate(input.effectiveUntil)) return "Choose a valid schedule end date.";
  if (input.effectiveUntil && input.effectiveUntil < input.effectiveFrom) return "The end date must be on or after the start date.";

  const weekdays = new Set<number>();
  for (const rule of input.rules) {
    const opensAt = minutesFromTime(rule.opensAt);
    const closesAt = minutesFromTime(rule.closesAt);
    if (!Number.isInteger(rule.weekday) || rule.weekday < 0 || rule.weekday > 6 || weekdays.has(rule.weekday)) {
      return "Each weekday can have only one recurring rule.";
    }
    if (opensAt === null || closesAt === null || closesAt <= opensAt) return "Enter valid opening and closing times.";
    if (!Number.isInteger(rule.slotDurationMinutes) || rule.slotDurationMinutes < 5 || rule.slotDurationMinutes > 480) {
      return "Slot duration must be between 5 and 480 minutes.";
    }
    if (!Number.isInteger(rule.capacity) || rule.capacity <= 0) return "Capacity must be a positive whole number.";
    weekdays.add(rule.weekday);
  }

  const exceptionDates = new Set<string>();
  for (const override of input.overrides) {
    if (!isValidPickupDate(override.date)) return "A date exception contains an invalid date.";
    if (exceptionDates.has(override.date)) return "A date can have only one exception.";
    exceptionDates.add(override.date);
    if (override.isClosed) {
      if (override.opensAt || override.closesAt || override.slotDurationMinutes || override.capacity) {
        return "A closed date cannot also define open hours or capacity.";
      }
      continue;
    }
    const opensAt = override.opensAt ? minutesFromTime(override.opensAt) : null;
    const closesAt = override.closesAt ? minutesFromTime(override.closesAt) : null;
    if (opensAt === null || closesAt === null || closesAt <= opensAt) return "Open date exceptions need valid opening and closing times.";
    if (!Number.isInteger(override.slotDurationMinutes) || override.slotDurationMinutes! < 5 || override.slotDurationMinutes! > 480) {
      return "Exception slot duration must be between 5 and 480 minutes.";
    }
    if (!Number.isInteger(override.capacity) || override.capacity! <= 0) return "Exception capacity must be a positive whole number.";
  }

  if (input.blockedSlots.some((slot) => !Number.isFinite(slot.startsAt.getTime()) || slot.endsAt <= slot.startsAt)) {
    return "Blocked times must have a valid end time after the start time.";
  }
  for (let index = 0; index < input.blockedSlots.length; index += 1) {
    for (let nextIndex = index + 1; nextIndex < input.blockedSlots.length; nextIndex += 1) {
      const first = input.blockedSlots[index];
      const second = input.blockedSlots[nextIndex];
      if (first.startsAt < second.endsAt && first.endsAt > second.startsAt) {
        return "Blocked time intervals cannot overlap.";
      }
    }
  }
  return null;
}

export function getPickupSlotsForDate(
  input: PickupScheduleInput,
  dateValue: string,
  now = new Date(),
): PickupSlot[] {
  if (!input.enabled || !isValidPickupDate(dateValue)
    || dateValue < input.effectiveFrom
    || (input.effectiveUntil !== null && dateValue > input.effectiveUntil)) {
    return [];
  }

  const override = input.overrides.find((item) => item.date === dateValue);
  if (override?.isClosed) return [];
  const rule = input.rules.find((item) => item.weekday === getManilaWeekday(dateValue));
  if (!override && !rule) return [];

  const opensAt = override?.opensAt ?? rule?.opensAt;
  const closesAt = override?.closesAt ?? rule?.closesAt;
  const duration = override?.slotDurationMinutes ?? rule?.slotDurationMinutes;
  const capacity = override?.capacity ?? rule?.capacity;
  if (!opensAt || !closesAt || !duration || !capacity) return [];

  const openingMinutes = minutesFromTime(opensAt);
  const closingMinutes = minutesFromTime(closesAt);
  if (openingMinutes === null || closingMinutes === null) return [];
  const slots: PickupSlot[] = [];

  for (let minute = openingMinutes; minute + duration <= closingMinutes; minute += duration) {
    const startTime = `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
    const endMinute = minute + duration;
    const endTime = `${String(Math.floor(endMinute / 60)).padStart(2, "0")}:${String(endMinute % 60).padStart(2, "0")}`;
    const startsAt = manilaDateTimeToUtc(dateValue, startTime);
    const endsAt = manilaDateTimeToUtc(dateValue, endTime);
    if (!startsAt || !endsAt || startsAt <= now) continue;
    if (input.blockedSlots.some((blocked) => startsAt < blocked.endsAt && endsAt > blocked.startsAt)) continue;
    slots.push({ startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString(), capacity });
  }
  return slots;
}

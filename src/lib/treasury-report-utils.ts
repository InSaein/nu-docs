const maximumDateRangeDays = 366;

export const maximumCsvRows = 10_000;

export type DateRange = {
  from: string;
  to: string;
  start: Date;
  endExclusive: Date;
};

export type DateRangeResult =
  | { range: DateRange; error: null }
  | { range: null; error: string };

function parseDate(value: string | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value ? date : null;
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function defaultDateRange(days = 30) {
  const end = new Date();
  end.setUTCHours(0, 0, 0, 0);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - days + 1);
  return { from: formatDate(start), to: formatDate(end) };
}

export function resolveDateRange(from?: string, to?: string): DateRangeResult {
  const defaults = defaultDateRange();
  const fromValue = from || defaults.from;
  const toValue = to || defaults.to;
  const start = parseDate(fromValue);
  const end = parseDate(toValue);

  if (!start || !end) return { range: null, error: "Enter valid start and end dates." };
  if (start > end) return { range: null, error: "The start date must be on or before the end date." };
  const dayCount = (end.getTime() - start.getTime()) / 86_400_000 + 1;
  if (dayCount > maximumDateRangeDays) {
    return { range: null, error: `Select a date range of ${maximumDateRangeDays} days or fewer.` };
  }

  return {
    range: {
      from: fromValue,
      to: toValue,
      start,
      endExclusive: new Date(end.getTime() + 86_400_000),
    },
    error: null,
  };
}

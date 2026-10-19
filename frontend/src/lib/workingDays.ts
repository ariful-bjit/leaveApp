import type { Duration } from "../api/types";

/** Parse "YYYY-MM-DD" as a local calendar date (no time-zone shift). */
function parseDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function isWeekday(date: Date): boolean {
  const day = date.getDay();
  return day !== 0 && day !== 6;
}

/** Number of Monday–Friday dates in [start, end]; 0 if invalid or end is before start. */
export function countWorkingDays(start: string, end: string): number {
  const from = parseDate(start);
  const to = parseDate(end);
  if (!from || !to || to < from) return 0;
  let days = 0;
  for (const d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
    if (isWeekday(d)) days += 1;
  }
  return days;
}

/** Days a request will use, mirroring the server rule (server stays authoritative). */
export function requestDays(duration: Duration, start: string, end: string): number {
  if (duration === "HALF_DAY") {
    const date = parseDate(start);
    return date && isWeekday(date) ? 0.5 : 0;
  }
  return countWorkingDays(start, end);
}

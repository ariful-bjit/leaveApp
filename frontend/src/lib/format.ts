import dayjs from "dayjs";
import type { Half, LeaveRequest } from "../api/types";

/** "5.0" → "5", "4.5" → "4.5". */
export function formatDays(value: string | number): string {
  const n = Number(value);
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

export function formatDate(value: string): string {
  return dayjs(value).format("D MMM YYYY");
}

export function formatDateRange(start: string, end: string): string {
  return start === end ? formatDate(start) : `${formatDate(start)} – ${formatDate(end)}`;
}

const HALF_LABEL: Record<Half, string> = { MORNING: "Morning", AFTERNOON: "Afternoon" };

export function formatDuration(request: Pick<LeaveRequest, "duration" | "half">): string {
  if (request.duration === "HALF_DAY" && request.half) {
    return `Half day · ${HALF_LABEL[request.half]}`;
  }
  return "Full day";
}

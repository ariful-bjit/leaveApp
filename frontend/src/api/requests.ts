import { apiFetch } from "./client";
import type { Balance, LeaveRequest, NewLeaveRequest } from "./types";

export function listMyRequests() {
  return apiFetch<LeaveRequest[]>("/requests");
}

export function createRequest(body: NewLeaveRequest) {
  return apiFetch<LeaveRequest>("/requests", { method: "POST", body });
}

export function cancelRequest(id: number) {
  return apiFetch<LeaveRequest>(`/requests/${id}/cancel`, { method: "POST" });
}

export function getBalance(year?: number) {
  return apiFetch<Balance>(year ? `/balance?year=${year}` : "/balance");
}

import { apiFetch } from "./client";
import type { LeaveRequest, Status, TeamRequest } from "./types";

export function listTeamRequests(status: Status = "PENDING") {
  return apiFetch<TeamRequest[]>(`/team/requests?status=${status}`);
}

export function approveRequest(id: number, comment?: string) {
  return apiFetch<LeaveRequest>(`/team/requests/${id}/approve`, {
    method: "POST",
    body: comment ? { comment } : {},
  });
}

export function rejectRequest(id: number, comment: string) {
  return apiFetch<LeaveRequest>(`/team/requests/${id}/reject`, {
    method: "POST",
    body: { comment },
  });
}

export type Me = {
  id: number;
  name: string;
  username: string;
  has_manager: boolean;
  is_manager: boolean;
};

export type Balance = {
  year: number;
  allowance: string;
  used: string;
  pending: string;
  remaining: string;
  available: string;
};

export type Duration = "FULL_DAY" | "HALF_DAY";
export type Half = "MORNING" | "AFTERNOON";
export type Status = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";

export type PersonRef = { id: number; name: string };

export type LeaveRequest = {
  id: number;
  employee: PersonRef;
  start_date: string;
  end_date: string;
  duration: Duration;
  half: Half | null;
  working_days: string;
  reason: string;
  status: Status;
  decision_comment: string;
  decided_by: PersonRef | null;
  decided_at: string | null;
  created_at: string;
};

export type TeamRequest = LeaveRequest & { employee_balance: Balance };

export type NewLeaveRequest = {
  start_date: string;
  end_date: string;
  duration: Duration;
  half?: Half | null;
  reason?: string;
};

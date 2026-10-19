# Feature Specification: LeaveDesk Leave Requests

**Feature Branch**: `001-leave-requests`

**Created**: 2026-10-19

**Status**: Draft

**Input**: User description: "Build LeaveDesk: employees request leave, their manager approves or rejects it, and employees see their remaining balance."

## Clarifications

### Session 2026-10-19

- Q: Should LeaveDesk support sick leave? → A: No. Sick leave is removed; LeaveDesk handles a
  single kind of leave (annual leave), so there is no leave-type choice.
- Q: Where can a half day appear in a leave request? → A: Only as a single-day request: one
  date plus Morning or Afternoon, counted as 0.5 days. Multi-day requests are whole days only.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Employee submits a leave request (Priority: P1)

An employee picks a start and end date (or, for a half day, a single date and Morning or
Afternoon), optionally adds a reason, and submits the request.
The request appears in the employee's list of requests with status "Pending" and is sent to
the employee's manager for a decision.

**Why this priority**: Requesting leave is the core action; without it nothing else in the
product has a purpose.

**Independent Test**: Sign in as an employee, submit a request, and confirm it shows in
"My requests" as Pending with the correct dates and number of working days.

**Acceptance Scenarios**:

1. **Given** an employee with 20 days of leave remaining, **When** they request leave from
   Monday to Friday of the same week, **Then** a Pending request for 5 working days is
   created and shown in their request list.
2. **Given** an employee filling in the request form, **When** the end date is before the
   start date, **Then** the request is not submitted and a clear error message is shown.
3. **Given** an employee with 2 days of leave remaining, **When** they request 5 days of
   leave, **Then** the request is not submitted and the message states that the request
   exceeds the available balance.
4. **Given** an employee with a Pending request, **When** they cancel it, **Then** its
   status becomes "Cancelled" and it no longer awaits the manager's decision.
5. **Given** an employee with 20 days of leave remaining, **When** they request a half day
   on a Tuesday morning, **Then** a Pending request for 0.5 working days is created.
6. **Given** an employee with an Approved half day on a Tuesday morning, **When** they
   request a half day on the same Tuesday afternoon, **Then** the request is accepted; a
   full-day request for that Tuesday is rejected as overlapping.

---

### User Story 2 - Manager approves or rejects requests (Priority: P2)

A manager opens a list of pending requests from their direct reports, reviews each one
(employee, dates, working days, reason, and the employee's remaining balance), and approves
or rejects it. When rejecting, the manager adds a comment explaining why.

**Why this priority**: Requests have no business effect until a manager decides on them;
this completes the workflow.

**Independent Test**: With Pending requests from a direct report, sign in as the manager,
approve one request and reject another, and confirm each status updates for both the
manager and the employee.

**Acceptance Scenarios**:

1. **Given** a manager with a Pending request from a direct report, **When** they approve
   it, **Then** the status becomes "Approved" and the employee's remaining balance decreases
   by the request's working days.
2. **Given** a manager with a Pending request from a direct report, **When** they reject it
   with a comment, **Then** the status becomes "Rejected", the balance is unchanged, and the
   employee can see the comment.
3. **Given** a manager, **When** they view pending requests, **Then** they see only requests
   from their own direct reports.
4. **Given** a request that is already Approved, Rejected, or Cancelled, **When** a manager
   tries to decide on it, **Then** the action is not available.

---

### User Story 3 - Employee views remaining leave balance (Priority: P3)

An employee opens their dashboard and sees their yearly allowance, the days used (approved),
the days pending, and the days remaining.

**Why this priority**: Knowing the balance helps employees plan, but it is only meaningful
once requests and approvals exist.

**Independent Test**: For an employee with known approved and pending requests, open the
dashboard and confirm the allowance, used, pending, and remaining figures are correct.

**Acceptance Scenarios**:

1. **Given** an employee with a 20-day allowance and 5 approved days, **When** they open
   their dashboard, **Then** it shows 20 allowance, 5 used, 15 remaining.
2. **Given** the same employee also has a 3-day Pending request, **When** they open the
   dashboard, **Then** it shows 3 pending and 15 remaining.
3. **Given** a request is approved by the manager, **When** the employee next opens the
   dashboard, **Then** the used and remaining figures reflect the approval.

---

### Edge Cases

- A request covering a weekend counts only working days (Monday–Friday); a request that
  covers only weekend days is rejected at submission with a clear message.
- A request overlapping an existing Pending or Approved request of the same employee is
  rejected at submission with a clear message.
- Requests with a start date in the past are not allowed.
- A half-day request on a Saturday or Sunday is rejected at submission with a clear message.
- A half day cannot be combined with other days in one request; an employee wanting
  "Monday plus Tuesday morning" submits two requests.
- Balances can include half days (e.g., 14.5 remaining); a 0.5-day request is allowed when
  exactly 0.5 days are available.
- If the sum of pending requests would exceed the balance, a new request is not allowed
  (available-to-request = remaining − pending).
- An employee without an assigned manager cannot submit requests and sees a message to
  contact an administrator.
- A manager cannot approve or reject their own requests; their requests go to their own
  manager.
- Two decisions on the same request at the same time: only the first is applied; the second
  user sees that the request was already decided.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST require users to sign in before accessing any LeaveDesk data.
- **FR-002**: Employees MUST be able to submit either a full-day leave request (start date
  and end date) or a half-day leave request (a single date plus Morning or Afternoon), each
  with an optional reason (up to 500 characters).
- **FR-003**: System MUST calculate the number of working days (Monday–Friday) in a request
  and display it before submission; a half-day request counts as 0.5 days.
- **FR-003a**: Two requests overlap if they share a date, except that a Morning half day and
  an Afternoon half day on the same date do not overlap.
- **FR-004**: System MUST reject a request whose end date is before its start date, whose
  start date is in the past, that contains no working days, that overlaps an existing
  Pending or Approved request, or whose working days exceed the available-to-request balance.
- **FR-005**: System MUST route each submitted request to the requesting employee's manager.
- **FR-006**: Employees MUST be able to view all their own requests with status (Pending,
  Approved, Rejected, Cancelled), dates, working days, and any manager comment.
- **FR-007**: Employees MUST be able to cancel their own requests while they are Pending.
- **FR-008**: Managers MUST be able to view pending requests from their direct reports only,
  including each employee's current remaining balance.
- **FR-009**: Managers MUST be able to approve or reject a Pending request, with an optional
  comment on approval and a required comment on rejection.
- **FR-010**: System MUST deduct a request's working days from the employee's balance only
  when it is approved; rejection and cancellation MUST NOT change the used balance.
- **FR-011**: Employees MUST be able to see their yearly allowance, used days, pending days,
  and remaining days.
- **FR-012**: System MUST record who decided each request and when.
- **FR-013**: Users MUST NOT be able to view or act on requests of employees who are not
  themselves or their direct reports.
- **FR-014**: Every screen MUST show clear loading, empty, and error states, consistent with
  the project's professional UI principle.

### Key Entities

- **Employee**: A person who can request leave; has a name, email, and an optional manager
  (another Employee). An Employee with direct reports acts as a Manager.
- **Leave Balance**: For one Employee and one calendar year: the allowance; used and pending
  days are derived from the Employee's requests.
- **Leave Request**: Belongs to one Employee; has start date, end date, duration (Full day,
  or Half day with Morning/Afternoon; half-day requests have start date = end date),
  working days (in 0.5-day steps), reason, status, decision comment, decided-by, and
  decided-at.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An employee can submit a leave request in under 1 minute from opening the form.
- **SC-002**: A manager can approve or reject a request in under 30 seconds from opening the
  pending list.
- **SC-003**: Balances shown to employees match approved requests in 100% of tested cases.
- **SC-004**: 100% of invalid requests (date errors, overlaps, insufficient balance) are
  blocked at submission with a message explaining the reason.
- **SC-005**: 90% of first-time users complete a request or decision without help.

## Assumptions

- LeaveDesk handles a single kind of leave (annual leave); sick leave and other leave types
  are out of scope.
- Every employee has an allowance of 20 days per calendar year; it resets each year with no
  carry-over.
- Leave is requested in whole days or as a single half day (Morning or Afternoon); half
  days at the start or end of a multi-day request are out of scope for v1.
- Public holidays are not excluded from working-day counts in v1.
- Employees, their managers, and allowances are set up in advance (seed data or an admin);
  an admin interface for managing them is out of scope for v1.
- Each employee has at most one manager; managers are also employees with their own balance.
- Notifications (email/chat) are out of scope for v1; users see status changes in the app.
- Sign-in uses a standard username/password session; single sign-on is out of scope for v1.

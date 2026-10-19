# UI Contract: LeaveDesk

One app shell (header with app name, signed-in user, sign-out; side navigation).
Built with Mantine components and one shared theme. Every data view has loading
(skeleton), empty, and error (alert with retry) states (FR-014).

| Route | Who | Content |
|-------|-----|---------|
| `/login` | anyone | Username + password form; inline error on failure |
| `/` (Dashboard) | employee | Balance cards: Allowance, Used, Pending, Remaining; "Request leave" button; recent requests |
| `/requests` | employee | Table of own requests: dates, duration, days, status badge, manager comment; Cancel on Pending (with confirm) |
| `/requests/new` | employee with manager | Toggle Full day / Half day; date range or single date + Morning/Afternoon; reason; live working-day count and available balance; server errors shown inline |
| `/team` | manager only (`is_manager`) | Pending requests from direct reports: employee, dates, days, reason, employee's remaining balance; Approve / Reject (reject opens comment dialog, comment required) |

Behaviour:

- Employee without a manager: `/requests/new` shows "You have no manager assigned.
  Contact an administrator." instead of the form.
- Status badge colours: Pending = yellow, Approved = green, Rejected = red,
  Cancelled = gray.
- After a successful action, show a success notification and refresh the affected data.
- A `409` shows "This request has already been decided." and refreshes the list.
- Unauthenticated access to any route redirects to `/login`.
- Layout is usable from 360 px wide; all actions reachable by keyboard; visible focus.

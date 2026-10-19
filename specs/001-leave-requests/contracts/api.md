# API Contract: LeaveDesk

Base path: `/api`. JSON in and out. Session authentication; every unsafe method
(POST) requires the `X-CSRFToken` header. All endpoints except `csrf` and `login` require
a signed-in user; otherwise `403` with `{"detail": "..."}`.

Dates are `YYYY-MM-DD`; day counts are decimal strings with one place (e.g. `"4.5"`).

## Error format

- Validation error `400`: `{"field_name": ["message"], "non_field_errors": ["message"]}`
- Not allowed `403`, not found `404`: `{"detail": "message"}`
- Already decided `409`: `{"detail": "This request has already been decided."}`

Requests that belong to someone the caller may not see return `404` (no existence leak).

## Auth

| Method | Path | Body | Success |
|--------|------|------|---------|
| GET | `/auth/csrf` | – | `204`, sets `csrftoken` cookie |
| POST | `/auth/login` | `{username, password}` | `200` → `Me` |
| POST | `/auth/logout` | – | `204` |
| GET | `/auth/me` | – | `200` → `Me` |

Invalid login → `400` `{"non_field_errors": ["Invalid username or password."]}`.

`Me`:

```json
{ "id": 3, "name": "Rina Das", "username": "rina",
  "has_manager": true, "is_manager": false }
```

## Balance

`GET /balance?year=2026` (year defaults to current year) → `200`

```json
{ "year": 2026, "allowance": "20.0", "used": "5.0",
  "pending": "3.0", "remaining": "15.0", "available": "12.0" }
```

## My requests

`GET /requests` → `200`, list of `LeaveRequest`, newest start date first.

`POST /requests` → `201` `LeaveRequest`

```json
{ "start_date": "2026-11-03", "end_date": "2026-11-03",
  "duration": "HALF_DAY", "half": "MORNING", "reason": "Dentist" }
```

`duration` defaults to `FULL_DAY`; `half` required only for `HALF_DAY`. Validation
failures (rules in [data-model.md](../data-model.md)) → `400` with a human-readable message.

`POST /requests/{id}/cancel` → `200` `LeaveRequest` (own `PENDING` only; otherwise `409`
if decided, `404` if not own).

`LeaveRequest`:

```json
{ "id": 12, "employee": {"id": 3, "name": "Rina Das"},
  "start_date": "2026-11-03", "end_date": "2026-11-03",
  "duration": "HALF_DAY", "half": "MORNING", "working_days": "0.5",
  "reason": "Dentist", "status": "PENDING",
  "decision_comment": "", "decided_by": null, "decided_at": null,
  "created_at": "2026-10-19T09:15:00+06:00" }
```

## Team (manager)

`GET /team/requests?status=PENDING` → `200`, list of `TeamRequest` for direct reports
only (`status` filter optional; default `PENDING`). `TeamRequest` = `LeaveRequest` +
`"employee_balance": Balance` (for the request's year).

`POST /team/requests/{id}/approve` body `{"comment": "optional"}` → `200` `LeaveRequest`

`POST /team/requests/{id}/reject` body `{"comment": "required"}` → `200` `LeaveRequest`;
empty comment → `400`.

Not a direct report → `404`; no longer `PENDING` → `409`.

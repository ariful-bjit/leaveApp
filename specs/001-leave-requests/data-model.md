# Data Model: LeaveDesk Leave Requests

Storage: SQLite via the Django ORM. Two app tables plus Django's built-in `auth_user`.

## User (Django built-in `auth.User`)

Used for sign-in only. Relevant fields: `username`, `password`, `first_name`,
`last_name`, `email`, `is_active`.

## Employee

| Field | Type | Rules |
|-------|------|-------|
| `id` | integer PK | |
| `user` | one-to-one → User | required, unique |
| `manager` | FK → Employee | nullable; cannot be self |
| `annual_allowance` | decimal(4,1) | default 20.0; ≥ 0; 0.5 steps |

- **Relationships**: `direct_reports` = Employees whose `manager` is this Employee.
  An Employee with ≥ 1 direct report acts as a Manager.
- **Validation**: `manager != self`.

## LeaveRequest

| Field | Type | Rules |
|-------|------|-------|
| `id` | integer PK | |
| `employee` | FK → Employee | required |
| `start_date` | date | required; not before today (on create) |
| `end_date` | date | required; ≥ `start_date`; same calendar year as `start_date` |
| `duration` | enum | `FULL_DAY` \| `HALF_DAY` |
| `half` | enum, nullable | `MORNING` \| `AFTERNOON`; required iff `duration = HALF_DAY` |
| `working_days` | decimal(4,1) | computed on create; > 0 |
| `reason` | text | optional; ≤ 500 chars |
| `status` | enum | `PENDING` \| `APPROVED` \| `REJECTED` \| `CANCELLED`; default `PENDING` |
| `decision_comment` | text | optional on approve; required on reject; ≤ 500 chars |
| `decided_by` | FK → Employee, nullable | set on approve/reject |
| `decided_at` | datetime, nullable | set on approve/reject |
| `created_at` | datetime | auto |

Index: (`employee`, `status`), (`employee`, `start_date`).

### Validation rules on create (FR-004, FR-003a)

1. Employee MUST have a manager.
2. `end_date ≥ start_date`; `start_date ≥ today`.
3. `start_date.year == end_date.year`.
4. `HALF_DAY` ⇒ `start_date == end_date`, the date is Monday–Friday, and `half` is set.
5. `working_days`: `HALF_DAY` → 0.5; `FULL_DAY` → number of Monday–Friday dates in
   [`start_date`, `end_date`]; MUST be > 0.
6. No overlap with the employee's `PENDING` or `APPROVED` requests: date ranges intersect,
   except two `HALF_DAY` requests on the same date with different `half`.
7. `working_days ≤ available` (see Balance below) for the year of `start_date`.

### State transitions

```text
PENDING ──approve (manager of employee)──▶ APPROVED
PENDING ──reject  (manager, comment)────▶ REJECTED
PENDING ──cancel  (the employee)────────▶ CANCELLED
```

- APPROVED, REJECTED, CANCELLED are final.
- Transitions apply only if status is still `PENDING` at write time (conditional update);
  otherwise 409 Conflict.
- Only the requester's direct manager may approve/reject; a manager can never decide their
  own request (follows from rule 1 and the manager link).

## Balance (computed, not stored)

For an Employee and calendar year `Y`, over requests whose `start_date` is in `Y`:

- `allowance` = `Employee.annual_allowance`
- `used` = Σ `working_days` where `status = APPROVED`
- `pending` = Σ `working_days` where `status = PENDING`
- `remaining` = `allowance − used`
- `available` = `remaining − pending` (limit for new requests)

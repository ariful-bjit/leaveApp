# Quickstart: LeaveDesk

How to run LeaveDesk locally and validate the feature end to end.
Details: [data-model.md](data-model.md), [contracts/api.md](contracts/api.md),
[contracts/ui.md](contracts/ui.md).

## Prerequisites

- Python 3.12+, Node.js 20+ and npm

## Backend

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1          # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_demo          # demo users, all with password "demo1234"
python manage.py runserver          # http://localhost:8000
```

Seed data: `maya` (manager of `rina` and `tom`), `rina`, `tom`, `sam` (no manager).

## Frontend

```powershell
cd frontend
npm install
npm run dev                         # http://localhost:5173 (proxies /api to :8000)
```

## Automated tests (must all pass)

```powershell
cd backend;  pytest
cd frontend; npm test
```

## Manual validation scenarios

Use a future week (Mon–Fri) for dates.

1. **Request leave (US1)**: Sign in as `rina`. Dashboard shows 20 allowance, 0 used,
   20 remaining. Request Monday–Friday → form shows 5 days; request appears as Pending;
   dashboard shows 5 pending.
2. **Half day (US1)**: As `rina`, request a half day (Morning) on the following Tuesday →
   0.5 days, Pending. Request the same Tuesday Afternoon → accepted. Request a full day on
   that Tuesday → rejected as overlapping.
3. **Validation (US1)**: End date before start date, a past date, a Saturday-only request,
   or more days than available → each blocked with a clear message.
4. **Cancel (US1)**: Cancel one Pending request → status Cancelled; pending figure drops.
5. **Manager decision (US2)**: Sign in as `maya`. Team page lists only `rina`'s and `tom`'s
   Pending requests with their remaining balance. Approve the 5-day request; reject a
   half day with a comment (empty comment is refused).
6. **Balance (US3)**: Sign in as `rina`. Dashboard shows 5 used, 15 remaining; the rejected
   request shows Rejected with `maya`'s comment.
7. **Access rules**: As `tom`, the Team page is not available; as `sam`, the request form
   shows "You have no manager assigned".

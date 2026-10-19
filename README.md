# LeaveDesk

LeaveDesk is a small internal web app for annual leave. Employees request full-day or half-day
leave, their manager approves or rejects it, and everyone can see their remaining balance.

- **Backend**: Django 5.2 + Django REST Framework, SQLite (`backend/`)
- **Frontend**: React 18 + TypeScript, Vite, Mantine (`frontend/`)
- **Tests**: pytest (backend), Vitest + Testing Library + vitest-axe (frontend)

Specification and design docs live in [specs/001-leave-requests/](specs/001-leave-requests/);
see [quickstart.md](specs/001-leave-requests/quickstart.md) for step-by-step validation scenarios.

## Prerequisites

- Python 3.12+
- Node.js 22.12+ (or 24+) and npm

## Run it locally

Backend (http://localhost:8000):

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1          # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_demo
python manage.py runserver
```

Frontend (http://localhost:5173, proxies `/api` to the backend):

```powershell
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 and sign in with a demo user.

## Demo users

All demo users have the password `demo1234`.

| Username | Role |
|----------|------|
| `maya` | Manager of `rina` and `tom` |
| `rina` | Employee (reports to `maya`) |
| `tom`  | Employee (reports to `maya`) |
| `sam`  | Employee with no manager (cannot submit requests) |

Demo users are not staff, so they cannot sign in to the Django admin at
http://localhost:8000/admin. Create an admin account with `python manage.py createsuperuser`.

## Tests

Every change ships with automated tests (see the
[constitution](.specify/memory/constitution.md)).

```powershell
cd backend;  pytest                 # API, rules and permissions
cd frontend; npm test               # components, pages and accessibility checks
cd frontend; npm run build          # type-check and production build
```

## Key rules

- Allowance is 20 days per calendar year, no carry-over.
- Working days are Monday–Friday; public holidays are not excluded.
- A half day is a single date, Morning or Afternoon, counted as 0.5 days.
- A request cannot cross 31 December; split it into two.
- Balance is reduced only when a request is approved. A new request may not exceed
  remaining days minus pending days.
- Only an employee's direct manager can approve or reject; rejection needs a comment.

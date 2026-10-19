# Research: LeaveDesk Leave Requests

All Technical Context items are resolved below. Stack given by the user: Django + SQLite,
React frontend, pytest.

## 1. Backend API style

- **Decision**: Django 5.2 LTS + Django REST Framework (DRF) 3.16, JSON API under `/api/`.
- **Rationale**: DRF serializers give request validation and consistent error payloads,
  and its permission classes cover the "own requests / direct reports only" rule
  (FR-013) with little code. This is less custom code than hand-written JSON views,
  which fits Principle II (simplicity).
- **Alternatives considered**: Plain Django `JsonResponse` views (more manual validation
  and error formatting); Django Ninja (fine, but less familiar and no gain here);
  server-rendered Django templates (would conflict with the requested React frontend).

## 2. Authentication

- **Decision**: Django session authentication with CSRF protection. React calls
  `/api/auth/csrf`, `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`.
- **Rationale**: Matches the spec assumption (username/password session). Built-in, no
  token storage in the browser, no extra dependency.
- **Alternatives considered**: JWT (`djangorestframework-simplejwt`): extra dependency and
  token-refresh handling with no benefit for a same-origin internal app.

## 3. Same-origin setup (dev and prod)

- **Decision**: In development, the Vite dev server proxies `/api` to Django on port 8000,
  so the browser sees one origin. For production, the built frontend (`frontend/dist`)
  is served as static files by the same host as Django.
- **Rationale**: Session cookies and CSRF work without CORS configuration.
- **Alternatives considered**: `django-cors-headers` with cross-origin cookies: more
  configuration and more failure modes.

## 4. Employees and managers

- **Decision**: Use Django's built-in `User` for sign-in, plus an `Employee` profile
  (one-to-one with `User`) holding `manager` (self-reference, nullable) and
  `annual_allowance` (default 20). Users and managers are created via Django admin or a
  `seed_demo` management command.
- **Rationale**: Reuses Django auth and admin for the out-of-scope "admin" needs at zero
  cost to the product UI.
- **Alternatives considered**: Custom user model (unneeded for v1; adds migration risk).

## 5. Leave balance storage

- **Decision**: Do not store used/pending/remaining. Store only the allowance on the
  Employee; compute used (Approved) and pending (Pending) by summing `working_days` of the
  employee's requests whose start date falls in the given calendar year.
- **Rationale**: One source of truth; balances can never drift from requests
  (SC-003). Volumes are tiny, so summing is cheap.
- **Alternatives considered**: A `LeaveBalance` table updated on approval: risk of drift
  and extra code to keep in sync.
- **Consequence**: The spec's "Leave Balance" entity is a computed value, not a table.

## 6. Requests spanning two years

- **Decision**: A full-day request must start and end in the same calendar year; a
  request crossing 31 December is rejected with a message to split it.
- **Rationale**: Allowances are per calendar year with no carry-over; this keeps balance
  math simple and correct.
- **Alternatives considered**: Splitting days across years automatically: more logic
  for a rare case.

## 7. Working days and half days

- **Decision**: `working_days` is a decimal with one decimal place (0.5 steps).
  Full-day requests count Monday–Friday dates in the range; half-day requests are 0.5
  and require `start_date == end_date` on a weekday. The server is authoritative; the
  React form shows a live count using the same simple weekday rule.
- **Rationale**: Exact decimal arithmetic avoids float rounding in balances.
- **Alternatives considered**: Storing half-days as integers (units of 0.5): workable but
  less readable.

## 8. Overlap rule

- **Decision**: Two requests (Pending or Approved, same employee) overlap if their date
  ranges intersect, unless both are half days on the same date with different halves
  (Morning vs Afternoon).
- **Rationale**: Directly implements FR-003a.

## 9. Concurrent decisions

- **Decision**: Approve/reject/cancel use a conditional update
  (`UPDATE … WHERE id = ? AND status = 'PENDING'`); if zero rows change, the API returns
  409 Conflict with "This request has already been decided."
- **Rationale**: First decision wins without locks; works on SQLite.

## 10. "Today" and time zone

- **Decision**: "Past start date" is judged against the server's local date
  (`django.utils.timezone.localdate()`), with `TIME_ZONE` set in settings
  (default `Asia/Dhaka`, changeable).
- **Rationale**: A single office time zone is sufficient for an internal tool.

## 11. Frontend stack

- **Decision**: React 18 + TypeScript, built with Vite 6; React Router 7 for screens;
  Mantine 7 component library for a consistent professional look.
- **Rationale**: Mantine provides accessible, consistently styled components (forms,
  date inputs, tables, badges, notifications, loading skeletons) and a theme with design
  tokens, which directly serves Principle III with little custom CSS.
- **Alternatives considered**: Hand-written CSS components (more effort to reach a
  polished, accessible result); MUI (heavier, more opinionated styling); Tailwind (needs
  building every component by hand).

## 12. Testing

- **Decision**:
  - Backend: pytest + pytest-django, using DRF's `APIClient`. Unit tests for working-day,
    overlap, and balance rules; API tests for every endpoint and permission rule.
  - Frontend: Vitest + React Testing Library (+ `@testing-library/user-event`), with API
    calls mocked at the `fetch` layer.
  - One command per side: `pytest` in `backend/`, `npm test` in `frontend/`.
- **Rationale**: Principle I requires automated tests for every change, including UI
  changes; pytest (user-requested) cannot test React components, so Vitest is the
  smallest addition that integrates with Vite.
- **Alternatives considered**: Playwright end-to-end tests: valuable later but heavier;
  deferred. Jest: needs extra config with Vite.

## 13. Performance and scale

- **Decision**: Target a small organisation (≤ 500 employees, ≤ 50 concurrent users).
  No caching or pagination beyond a simple limit on list endpoints.
- **Rationale**: SQLite and straightforward queries comfortably meet SC-001/SC-002 at this
  scale.

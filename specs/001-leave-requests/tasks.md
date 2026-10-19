---

description: "Task list for LeaveDesk leave requests"
---

# Tasks: LeaveDesk Leave Requests

**Input**: Design documents from `/specs/001-leave-requests/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md),
[data-model.md](data-model.md), [contracts/api.md](contracts/api.md),
[contracts/ui.md](contracts/ui.md), [quickstart.md](quickstart.md)

**Tests**: REQUIRED. Constitution Principle I ("Every change that alters behavior MUST ship
with automated tests"). Within each story, write the test tasks first and confirm they fail
before implementing.

**Organization**: Tasks are grouped by user story so each story can be implemented and
tested independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: User story the task belongs to (US1, US2, US3)
- Paths are relative to the repository root: `backend/` (Django) and `frontend/` (React)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create both projects so tests can run with one command per side.

- [ ] T001 Create `backend/requirements.txt` pinning `Django>=5.2,<5.3`, `djangorestframework>=3.16,<3.17`, `pytest>=8`, `pytest-django>=4.9`
- [ ] T002 Create the Django project in `backend/manage.py`, `backend/leavedesk/__init__.py`, `backend/leavedesk/settings.py`, `backend/leavedesk/urls.py`, `backend/leavedesk/wsgi.py`, and an empty app package `backend/leave/__init__.py` + `backend/leave/apps.py`; settings: SQLite at `backend/db.sqlite3`, `INSTALLED_APPS` includes `rest_framework` and `leave`, `TIME_ZONE = "Asia/Dhaka"`, `USE_TZ = True`, `REST_FRAMEWORK = {"DEFAULT_AUTHENTICATION_CLASSES": ["rest_framework.authentication.SessionAuthentication"], "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticated"]}`, `CSRF_COOKIE_HTTPONLY = False`
- [ ] T003 [P] Create `backend/pytest.ini` with `DJANGO_SETTINGS_MODULE = leavedesk.settings`, `python_files = test_*.py`, `testpaths = leave/tests`, and empty package `backend/leave/tests/__init__.py`
- [ ] T004 [P] Scaffold the frontend: `frontend/package.json` (scripts `dev`, `build` = `tsc -b && vite build`, `test` = `vitest run`; deps `react@18`, `react-dom@18`, `react-router-dom@7`, `@mantine/core@7`, `@mantine/hooks@7`, `@mantine/dates@7`, `@mantine/notifications@7`, `dayjs`; devDeps `vite@6`, `@vitejs/plugin-react`, `typescript@5`, `@types/react@18`, `@types/react-dom@18`, `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`, `postcss`, `postcss-preset-mantine`), `frontend/tsconfig.json`, `frontend/postcss.config.cjs`, `frontend/index.html`, and `frontend/vite.config.ts` (dev proxy `/api` → `http://localhost:8000`; Vitest `environment: "jsdom"`, `setupFiles: "./src/test/setup.ts"`, `globals: true`)
- [ ] T005 [P] Create `frontend/src/test/setup.ts`: import `@testing-library/jest-dom/vitest`; polyfill `window.matchMedia` and `ResizeObserver` (needed by Mantine in jsdom); export a `renderWithProviders(ui, {route})` helper in `frontend/src/test/render.tsx` wrapping `MantineProvider` (app theme), `Notifications`, and `MemoryRouter`
- [ ] T006 [P] Create root `.gitignore` covering `backend/.venv/`, `backend/db.sqlite3`, `__pycache__/`, `.pytest_cache/`, `frontend/node_modules/`, `frontend/dist/`

**Checkpoint**: `pytest` (in `backend/`) and `npm test` (in `frontend/`) both run (no tests yet).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Data model, sign-in, app shell, and shared UI states needed by every story.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### Backend

- [ ] T007 Create models in `backend/leave/models.py`: `Employee` (`user` one-to-one → `User`, required, unique; `manager` FK → `Employee`, nullable, `related_name="direct_reports"`, `on_delete=PROTECT`; `annual_allowance` `DecimalField(max_digits=4, decimal_places=1, default=20.0)`, "≥ 0; 0.5 steps"; `clean()` enforcing `manager != self`; `name` property = user full name or username; `is_manager` property = has ≥ 1 direct report) and `LeaveRequest` (`employee` FK required; `start_date`, `end_date` dates; `duration` choices `FULL_DAY` | `HALF_DAY` default `FULL_DAY`; `half` choices `MORNING` | `AFTERNOON`, nullable, "required iff `duration = HALF_DAY`"; `working_days` `DecimalField(4,1)`; `reason` text "optional; ≤ 500 chars"; `status` choices `PENDING` | `APPROVED` | `REJECTED` | `CANCELLED` default `PENDING`; `decision_comment` text blank, "≤ 500 chars"; `decided_by` FK → Employee nullable; `decided_at` datetime nullable; `created_at` auto) with indexes (`employee`, `status`) and (`employee`, `start_date`)
- [ ] T008 Generate the initial migration `backend/leave/migrations/0001_initial.py` with `python manage.py makemigrations leave`
- [ ] T009 [P] Register `Employee` and `LeaveRequest` in `backend/leave/admin.py` (list display: employee, dates, working_days, status) so administrators can manage users and managers
- [ ] T010 Create shared pytest fixtures in `backend/conftest.py`: `make_employee(username, manager=None, allowance=20)` factory creating `User` (password `"pw"`) + `Employee`; `client_for(employee)` returning a DRF `APIClient` logged in via `force_login` with CSRF enforcement off; a `team` fixture creating `maya` (manager) with reports `rina` and `tom`, and `sam` with no manager; a `next_monday` fixture returning the next Monday after `timezone.localdate()`
- [ ] T011 [P] Write auth API tests in `backend/leave/tests/test_auth_api.py` per [contracts/api.md](contracts/api.md#auth): `GET /api/auth/csrf` → 204 and sets `csrftoken` cookie; `POST /api/auth/login` valid → 200 `Me` (`id`, `name`, `username`, `has_manager`, `is_manager`); invalid → 400 `{"non_field_errors": ["Invalid username or password."]}`; `GET /api/auth/me` signed out → 403, signed in → 200 with correct `is_manager` for `maya` and `has_manager=false` for `sam`; `POST /api/auth/logout` → 204 then `me` → 403
- [ ] T012 Implement auth views in `backend/leave/views.py` (`csrf` with `ensure_csrf_cookie`, `login`, `logout`, `me`, all as DRF views; `csrf` and `login` `AllowAny`) with a `MeSerializer` in `backend/leave/serializers.py`; route them in `backend/leave/urls.py` and include `path("api/", include("leave.urls"))` in `backend/leavedesk/urls.py`; make T011 pass
- [ ] T013 [P] Write `backend/leave/tests/test_seed_demo.py` asserting `call_command("seed_demo")` creates users `maya`, `rina`, `tom`, `sam` with password `demo1234`, `rina`/`tom` managed by `maya`, `sam` with no manager, and that running it twice does not duplicate users
- [ ] T014 Implement the idempotent management command `backend/leave/management/commands/seed_demo.py` (plus `management/__init__.py` and `management/commands/__init__.py`); make T013 pass

### Frontend

- [ ] T015 [P] Create the Mantine theme in `frontend/src/theme.ts` (primary color `indigo`, default radius `md`, Inter/system font stack, heading sizes) and `frontend/src/main.tsx` rendering `<MantineProvider theme={theme}>`, `<Notifications />`, `<BrowserRouter>`, and `<App />`; import `@mantine/core/styles.css`, `@mantine/dates/styles.css`, `@mantine/notifications/styles.css`
- [ ] T016 [P] Write `frontend/src/api/client.test.ts` then implement `frontend/src/api/client.ts`: `apiFetch<T>(path, {method, body})` prefixing `/api`, sending JSON with `credentials: "same-origin"`, adding `X-CSRFToken` from the `csrftoken` cookie on non-GET requests, returning parsed JSON (or `undefined` for 204), and throwing `ApiError {status, detail, fieldErrors}` for non-2xx (from `{"detail": ...}` or field-error bodies per [contracts/api.md](contracts/api.md#error-format)); also define shared types `Me`, `Balance`, `LeaveRequest`, `TeamRequest` in `frontend/src/api/types.ts` matching the contract
- [ ] T017 [P] Write `frontend/src/components/States.test.tsx` then implement `frontend/src/components/States.tsx`: `LoadingState` (Mantine `Skeleton` rows), `EmptyState({title, message, action?})`, `ErrorState({message, onRetry})` (Mantine `Alert` with a "Try again" button)
- [ ] T018 Write `frontend/src/auth/AuthContext.test.tsx` then implement `frontend/src/auth/AuthContext.tsx` (`AuthProvider` loading `GET /auth/csrf` then `GET /auth/me` on mount; exposes `me`, `loading`, `login(username, password)`, `logout()`) and `frontend/src/auth/RequireAuth.tsx` (shows `LoadingState` while loading, redirects to `/login` when `me` is null, optional `managerOnly` prop redirecting non-managers to `/`)
- [ ] T019 Write `frontend/src/pages/Login.test.tsx` (submits credentials, shows inline error "Invalid username or password." on 400, redirects to `/` on success) then implement `frontend/src/pages/Login.tsx` (centered Mantine `Paper` card with app name "LeaveDesk", `TextInput` username, `PasswordInput`, submit `Button` with loading state)
- [ ] T020 Write `frontend/src/components/Layout.test.tsx` (shows user name and "Sign out"; "Team" link only when `me.is_manager`) then implement `frontend/src/components/Layout.tsx` using Mantine `AppShell` (header: "LeaveDesk", user name, sign-out button; navbar links Dashboard `/`, My requests `/requests`, Request leave `/requests/new`, Team `/team` for managers; burger-collapsed navbar below `sm` breakpoint)
- [ ] T021 Create `frontend/src/App.tsx` with routes: `/login` → `Login`; protected routes inside `RequireAuth` + `Layout`. Until US1–US3 add pages, `/`, `/requests`, `/requests/new`, `/team` render a placeholder `EmptyState` titled "Coming soon"

**Checkpoint**: A seeded user can sign in and out in the browser; `pytest` and `npm test` pass.

---

## Phase 3: User Story 1 - Employee submits a leave request (Priority: P1) 🎯 MVP

**Goal**: Employees submit full-day or half-day requests, see their requests, and cancel
pending ones; invalid requests are blocked with clear messages.

**Independent Test**: Sign in as `rina`, request Mon–Fri (5 days) and a half day (0.5),
see both as Pending in My requests, cancel one; invalid dates, overlaps, and over-balance
requests are refused (quickstart scenarios 1–4).

### Tests for User Story 1 ⚠️ (write first, confirm they fail)

- [ ] T022 [P] [US1] Write unit tests in `backend/leave/tests/test_rules.py` for `count_working_days` (Mon–Fri = 5, Fri–Mon = 2, Sat–Sun = 0), `compute_working_days` (`HALF_DAY` → `Decimal("0.5")`), `overlaps` (ranges intersect → True; same-date `MORNING` vs `AFTERNOON` half days → False; same-date same half → True; full day vs half day on same date → True), and `balance(employee, year)` (allowance 20, approved 5, pending 3 → used 5, pending 3, remaining 15, available 12; counts only requests whose `start_date` is in `year`; ignores `REJECTED`/`CANCELLED`)
- [ ] T023 [P] [US1] Write API tests in `backend/leave/tests/test_requests_api.py`: `POST /api/requests` Mon–Fri → 201 with `working_days "5.0"`, `status "PENDING"`; half day `{"duration": "HALF_DAY", "half": "MORNING"}` → `"0.5"`; each rejection → 400 with a message: end before start, start in the past, weekend-only, half day on Saturday, half day with `start_date != end_date`, half day without `half`, crossing 31 December, overlap with own `PENDING`/`APPROVED` request, more days than `available`, `reason` over 500 chars, employee with no manager (`sam`) → message "You have no manager assigned. Contact an administrator."; same-date Morning then Afternoon both accepted; overlap with a `CANCELLED` request is allowed; `GET /api/requests` returns only own requests, newest start date first; `POST /api/requests/{id}/cancel` own `PENDING` → 200 `CANCELLED`, already cancelled/decided → 409 `{"detail": "This request has already been decided."}`, another employee's request → 404
- [ ] T024 [P] [US1] Write `backend/leave/tests/test_balance_api.py`: `GET /api/balance` → 200 `{year, allowance, used, pending, remaining, available}` as decimal strings with one place, defaulting to the current year; `?year=` selects another year
- [ ] T025 [P] [US1] Write `frontend/src/lib/workingDays.test.ts`: Mon–Fri → 5, weekend-only → 0, end before start → 0, half day → 0.5
- [ ] T026 [P] [US1] Write `frontend/src/components/StatusBadge.test.tsx`: renders label and color per status (Pending = yellow, Approved = green, Rejected = red, Cancelled = gray)
- [ ] T027 [P] [US1] Write `frontend/src/pages/NewRequest.test.tsx` (mock `fetch`): Full day / Half day toggle switches between date range and single date + Morning/Afternoon; live working-day count updates; shows available balance from `GET /balance`; submit posts the contract body and navigates to `/requests` with a success notification; 400 errors shown inline; when `me.has_manager` is false shows "You have no manager assigned. Contact an administrator." instead of the form
- [ ] T028 [P] [US1] Write `frontend/src/pages/MyRequests.test.tsx` (mock `fetch`): loading skeleton, empty state with "Request leave" action, error state with retry; table shows dates, duration (e.g. "Half day · Morning"), days, status badge, manager comment; "Cancel" only on Pending rows, asks for confirmation, then refreshes; 409 shows "This request has already been decided." and refreshes

### Implementation for User Story 1

- [ ] T029 [US1] Implement pure functions in `backend/leave/rules.py`: `count_working_days(start, end)`, `compute_working_days(duration, start, end)`, `overlaps(a, b)` (per [data-model.md](data-model.md) rule 6), and `balance(employee, year)` returning a dict with `allowance`, `used`, `pending`, `remaining = allowance − used`, `available = remaining − pending` (all `Decimal`); make T022 pass
- [ ] T030 [US1] Implement `LeaveRequestSerializer` in `backend/leave/serializers.py` with output shape from [contracts/api.md](contracts/api.md#my-requests) (`employee` as `{id, name}`, `decided_by` as `{id, name}` or null) and create-validation applying data-model rules 1–7 in order, computing `working_days` server-side; validation messages are user-readable sentences
- [ ] T031 [US1] Implement views in `backend/leave/views.py`: `GET/POST /api/requests` (list own newest `start_date` first; create for the caller's `Employee`), `POST /api/requests/{id}/cancel` (404 if not own; conditional update `filter(pk=id, status="PENDING").update(status="CANCELLED")`, 409 if 0 rows), and `GET /api/balance?year=`; add routes in `backend/leave/urls.py`; make T023 and T024 pass
- [ ] T032 [P] [US1] Implement `frontend/src/lib/workingDays.ts` (`countWorkingDays(start, end)`, `requestDays(duration, start, end)`); make T025 pass
- [ ] T033 [P] [US1] Implement `frontend/src/api/requests.ts` (`listMyRequests`, `createRequest`, `cancelRequest`, `getBalance(year?)`) using `apiFetch`
- [ ] T034 [P] [US1] Implement `frontend/src/components/StatusBadge.tsx` (Mantine `Badge`); make T026 pass
- [ ] T035 [US1] Implement `frontend/src/pages/NewRequest.tsx` (Mantine `SegmentedControl` Full day / Half day, `DatePickerInput` type range or single with weekends shown but past dates disabled, `SegmentedControl` Morning / Afternoon, `Textarea` reason with `maxLength={500}` and counter, summary line "N working days · M available", submit button with loading state); make T027 pass
- [ ] T036 [US1] Implement `frontend/src/pages/MyRequests.tsx` (Mantine `Table` inside `ScrollArea` for narrow screens, `StatusBadge`, cancel confirmation in a Mantine `Modal`, `LoadingState` / `EmptyState` / `ErrorState`); make T028 pass
- [ ] T037 [US1] Replace the `/requests` and `/requests/new` placeholders in `frontend/src/App.tsx` with `MyRequests` and `NewRequest`; until US3, route `/` redirects to `/requests`

**Checkpoint**: US1 works end to end (quickstart 1–4); all tests pass.

---

## Phase 4: User Story 2 - Manager approves or rejects requests (Priority: P2)

**Goal**: Managers see pending requests from direct reports (with each employee's balance)
and approve or reject them; rejection requires a comment.

**Independent Test**: With Pending requests from `rina`, sign in as `maya`, approve one and
reject another with a comment; statuses update for both users; `tom` cannot see the Team
page (quickstart scenarios 5 and 7).

### Tests for User Story 2 ⚠️ (write first, confirm they fail)

- [ ] T038 [P] [US2] Write `backend/leave/tests/test_team_api.py`: `GET /api/team/requests` as `maya` returns only `PENDING` requests of `rina`/`tom` (not `sam`'s, not her own), each with `employee_balance` for the request's year; `?status=APPROVED` filters; as a non-manager returns `[]`; `POST /api/team/requests/{id}/approve` → 200 `APPROVED`, sets `decided_by`, `decided_at`, optional `decision_comment`, and the employee's `used` balance increases by `working_days`; `POST .../reject` with comment → 200 `REJECTED`, balance unchanged; reject with empty or missing comment → 400; comment over 500 chars → 400; request of a non-direct report (including the manager's own) → 404; deciding an already decided or cancelled request (second of two decisions) → 409 `{"detail": "This request has already been decided."}`
- [ ] T039 [P] [US2] Write `frontend/src/pages/Team.test.tsx` (mock `fetch`): loading, empty ("No pending requests"), and error states; rows show employee, dates, days, reason, remaining balance; Approve posts and removes the row with a success notification; Reject opens a dialog whose Confirm stays disabled until a comment is entered, then posts and removes the row; 409 shows "This request has already been decided." and refreshes

### Implementation for User Story 2

- [ ] T040 [US2] Add `TeamRequestSerializer` (`LeaveRequestSerializer` + `employee_balance` from `rules.balance(employee, start_date.year)`) and `DecisionSerializer` (`comment`, ≤ 500 chars; `required=True, allow_blank=False` for reject) in `backend/leave/serializers.py`
- [ ] T041 [US2] Implement views in `backend/leave/views.py`: `GET /api/team/requests?status=` (default `PENDING`; requests where `employee__manager` is the caller), `POST /api/team/requests/{id}/approve` and `/reject` (404 unless `employee.manager` is the caller; conditional update `filter(pk=id, status="PENDING").update(status=..., decision_comment=..., decided_by=caller, decided_at=timezone.now())`, 409 if 0 rows); add routes in `backend/leave/urls.py`; make T038 pass
- [ ] T042 [P] [US2] Implement `frontend/src/api/team.ts` (`listTeamRequests(status?)`, `approveRequest(id, comment?)`, `rejectRequest(id, comment)`)
- [ ] T043 [US2] Implement `frontend/src/pages/Team.tsx` (Mantine `Table` in `ScrollArea`, green Approve / red outline Reject buttons with loading states, reject `Modal` with required `Textarea`, `LoadingState` / `EmptyState` / `ErrorState`); make T039 pass
- [ ] T044 [US2] Replace the `/team` placeholder in `frontend/src/App.tsx` with `Team` wrapped in `RequireAuth managerOnly`

**Checkpoint**: US1 and US2 both work (quickstart 1–5, 7); all tests pass.

---

## Phase 5: User Story 3 - Employee views remaining leave balance (Priority: P3)

**Goal**: A dashboard showing allowance, used, pending, and remaining days, plus recent
requests.

**Independent Test**: For an employee with known approved and pending requests, the
dashboard shows correct figures and reflects a new approval (quickstart scenario 6).

### Tests for User Story 3 ⚠️ (write first, confirm they fail)

- [ ] T045 [P] [US3] Write `frontend/src/components/BalanceCards.test.tsx`: given a `Balance`, renders four labelled cards "Allowance", "Used", "Pending", "Remaining" with values formatted without a trailing ".0" (e.g. `"15"`, `"14.5"`)
- [ ] T046 [P] [US3] Write `frontend/src/pages/Dashboard.test.tsx` (mock `fetch`): loading and error states; shows `BalanceCards` for the current year from `GET /balance`; "Request leave" button links to `/requests/new`; lists up to 5 most recent requests with `StatusBadge`; empty state when there are no requests

### Implementation for User Story 3

- [ ] T047 [P] [US3] Implement `frontend/src/components/BalanceCards.tsx` (Mantine `SimpleGrid` cols `{base: 2, sm: 4}` of `Paper` cards with label and large number); make T045 pass
- [ ] T048 [US3] Implement `frontend/src/pages/Dashboard.tsx` (title "Hello, {first name}", `BalanceCards`, "Request leave" button, recent requests list); make T046 pass
- [ ] T049 [US3] In `frontend/src/App.tsx`, replace the `/` redirect with `Dashboard`

**Checkpoint**: All three stories work independently; all tests pass.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T050 [P] Write root `README.md`: what LeaveDesk is, prerequisites, backend and frontend run commands, test commands (`pytest`, `npm test`), and demo users, linking to [quickstart.md](quickstart.md)
- [ ] T051 [P] Add a `frontend/src/App.test.tsx` route test: signed-out visit to `/requests` redirects to `/login`; non-manager visit to `/team` redirects to `/`; unknown route shows a "Page not found" `EmptyState` with a link home (add the catch-all route in `frontend/src/App.tsx`)
- [ ] T052 Accessibility and responsive pass across `frontend/src/pages/*.tsx` and `frontend/src/components/*.tsx`: every input has a visible label, icon-only buttons have `aria-label`, focus is visible, and pages work at 360 px wide (tables scroll horizontally); fix issues found
- [ ] T053 Run `pytest` in `backend/`, `npm test` and `npm run build` in `frontend/`; all must pass with no type errors
- [ ] T054 Run the manual scenarios in [quickstart.md](quickstart.md) against `seed_demo` data and fix any defects (each fix with a regression test)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup; blocks all user stories.
- **US1 (Phase 3)**: Depends on Foundational.
- **US2 (Phase 4)**: Depends on Foundational and on `rules.balance` + `LeaveRequestSerializer` from US1 (T029, T030). For testing it only needs requests to exist, which its tests create directly in the database.
- **US3 (Phase 5)**: Depends on Foundational and on `GET /api/balance` (T031), `getBalance`/`listMyRequests` (T033), and `StatusBadge` (T034) from US1.
- **Polish (Phase 6)**: After all stories.

### Within Each Story

- Tests first and failing → backend rules/serializers → views/routes → frontend API module →
  components → pages → routing.
- Tasks editing the same file (`serializers.py`, `views.py`, `urls.py`, `App.tsx`) run in
  order, never in parallel.

### Parallel Opportunities

- Setup: T003, T004, T005, T006 after T001/T002 as applicable.
- Foundational: T009, T011, T013 (backend) alongside T015, T016, T017 (frontend).
- US1: all test tasks T022–T028 together; then T032, T033, T034 alongside backend T029–T031.
- US2: T038 and T039 together; T042 alongside T040–T041.
- US3: T045 and T046 together; T047 alongside T048 prep.
- Backend and frontend tracks of any story can be worked by different people.

---

## Parallel Example: User Story 1

```text
# Tests together (different files):
Task: "T022 Unit tests for rules in backend/leave/tests/test_rules.py"
Task: "T023 API tests in backend/leave/tests/test_requests_api.py"
Task: "T024 Balance API tests in backend/leave/tests/test_balance_api.py"
Task: "T025 workingDays tests in frontend/src/lib/workingDays.test.ts"
Task: "T027 NewRequest tests in frontend/src/pages/NewRequest.test.tsx"

# Then frontend building blocks alongside the backend:
Task: "T032 frontend/src/lib/workingDays.ts"
Task: "T033 frontend/src/api/requests.ts"
Task: "T034 frontend/src/components/StatusBadge.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 Setup → Phase 2 Foundational.
2. Phase 3 (US1) → stop and validate with quickstart scenarios 1–4.
3. Demo: employees can request and track leave.

### Incremental Delivery

1. Setup + Foundational → sign-in works.
2. + US1 → request leave (MVP).
3. + US2 → manager decisions; balance deductions take effect.
4. + US3 → dashboard with balance.
5. Polish → README, access rules, accessibility, full validation.

---

## Notes

- Every behavior change ships with tests (Constitution I); verify tests fail before
  implementing.
- Keep it simple (Constitution II): no extra libraries beyond those in T001/T004.
- All UI uses the shared Mantine theme and the `States` components (Constitution III).
- Production hosting of the built frontend is out of scope for this task list.
- Commit after each task or logical group.

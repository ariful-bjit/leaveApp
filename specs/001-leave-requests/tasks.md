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

- [X] T001 Create `backend/requirements.txt` pinning `Django>=5.2,<5.3`, `djangorestframework>=3.16,<3.17`, `pytest>=8`, `pytest-django>=4.9`
- [X] T002 Create the Django project in `backend/manage.py`, `backend/leavedesk/__init__.py`, `backend/leavedesk/settings.py`, `backend/leavedesk/urls.py`, `backend/leavedesk/wsgi.py`, and an empty app package `backend/leave/__init__.py` + `backend/leave/apps.py`; settings: SQLite at `backend/db.sqlite3`, `INSTALLED_APPS` includes `rest_framework` and `leave`, `TIME_ZONE = "Asia/Dhaka"`, `USE_TZ = True`, `REST_FRAMEWORK = {"DEFAULT_AUTHENTICATION_CLASSES": ["rest_framework.authentication.SessionAuthentication"], "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticated"]}`, `CSRF_COOKIE_HTTPONLY = False`
- [X] T003 [P] Create `backend/pytest.ini` with `DJANGO_SETTINGS_MODULE = leavedesk.settings`, `python_files = test_*.py`, `testpaths = leave/tests`, and empty package `backend/leave/tests/__init__.py`
- [X] T004 [P] Scaffold the frontend: `frontend/package.json` (scripts `dev`, `build` = `tsc -b && vite build`, `test` = `vitest run`; deps `react@18`, `react-dom@18`, `react-router-dom@7`, `@mantine/core@7`, `@mantine/hooks@7`, `@mantine/dates@7`, `@mantine/notifications@7`, `dayjs`; devDeps `vite@6`, `@vitejs/plugin-react`, `typescript@5`, `@types/react@18`, `@types/react-dom@18`, `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`, `vitest-axe`, `postcss`, `postcss-preset-mantine`), `frontend/tsconfig.json`, `frontend/postcss.config.cjs`, `frontend/index.html`, and `frontend/vite.config.ts` (dev proxy `/api` → `http://localhost:8000`; Vitest `environment: "jsdom"`, `setupFiles: "./src/test/setup.ts"`, `globals: true`)
- [X] T005 [P] Create `frontend/src/test/setup.ts`: import `@testing-library/jest-dom/vitest` and `vitest-axe/extend-expect`; polyfill `window.matchMedia` and `ResizeObserver` (needed by Mantine in jsdom); export a `renderWithProviders(ui, {route})` helper in `frontend/src/test/render.tsx` wrapping `MantineProvider` (app theme), `Notifications`, and `MemoryRouter`
- [X] T006 [P] Create root `.gitignore` covering `backend/.venv/`, `backend/db.sqlite3`, `__pycache__/`, `.pytest_cache/`, `frontend/node_modules/`, `frontend/dist/`

**Checkpoint**: `pytest` (in `backend/`) and `npm test` (in `frontend/`) both run (no tests yet).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Data model, sign-in, app shell, and shared UI states needed by every story.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### Backend

- [X] T007 Create models in `backend/leave/models.py`: `Employee` (`user` one-to-one → `User`, required, unique; `manager` FK → `Employee`, nullable, `related_name="direct_reports"`, `on_delete=PROTECT`; `annual_allowance` `DecimalField(max_digits=4, decimal_places=1, default=20.0)`, "≥ 0; 0.5 steps"; `clean()` enforcing `manager != self`; `name` property = user full name or username; `is_manager` property = has ≥ 1 direct report) and `LeaveRequest` (`employee` FK required; `start_date`, `end_date` dates; `duration` choices `FULL_DAY` | `HALF_DAY` default `FULL_DAY`; `half` choices `MORNING` | `AFTERNOON`, nullable, "required iff `duration = HALF_DAY`"; `working_days` `DecimalField(4,1)`; `reason` text "optional; ≤ 500 chars"; `status` choices `PENDING` | `APPROVED` | `REJECTED` | `CANCELLED` default `PENDING`; `decision_comment` text blank, "≤ 500 chars"; `decided_by` FK → Employee nullable; `decided_at` datetime nullable; `created_at` auto) with indexes (`employee`, `status`) and (`employee`, `start_date`)
- [X] T008 Generate the initial migration `backend/leave/migrations/0001_initial.py` with `python manage.py makemigrations leave`
- [X] T009 [P] Register `Employee` and `LeaveRequest` in `backend/leave/admin.py` (list display: employee, dates, working_days, status) so administrators can manage users and managers
- [X] T010 Create shared pytest fixtures in `backend/conftest.py`: `make_employee(username, manager=None, allowance=20)` factory creating `User` (password `"pw"`) + `Employee`; `client_for(employee)` returning a DRF `APIClient` logged in via `force_login` with CSRF enforcement off; a `team` fixture creating `maya` (manager) with reports `rina` and `tom`, and `sam` with no manager; a `next_monday` fixture returning the next Monday after `timezone.localdate()`
- [X] T011 [P] Write auth API tests in `backend/leave/tests/test_auth_api.py` per [contracts/api.md](contracts/api.md#auth): `GET /api/auth/csrf` → 204 and sets `csrftoken` cookie; `POST /api/auth/login` valid → 200 `Me` (`id`, `name`, `username`, `has_manager`, `is_manager`); invalid → 400 `{"non_field_errors": ["Invalid username or password."]}`; `GET /api/auth/me` signed out → 403, signed in → 200 with correct `is_manager` for `maya` and `has_manager=false` for `sam`; `POST /api/auth/logout` → 204 then `me` → 403
- [X] T012 Implement auth views in `backend/leave/views.py` (`csrf` with `ensure_csrf_cookie`, `login`, `logout`, `me`, all as DRF views; `csrf` and `login` `AllowAny`) with a `MeSerializer` in `backend/leave/serializers.py`; route them in `backend/leave/urls.py` and include `path("api/", include("leave.urls"))` in `backend/leavedesk/urls.py`; make T011 pass
- [X] T013 [P] Write `backend/leave/tests/test_seed_demo.py` asserting `call_command("seed_demo")` creates users `maya`, `rina`, `tom`, `sam` with password `demo1234`, `rina`/`tom` managed by `maya`, `sam` with no manager, and that running it twice does not duplicate users
- [X] T014 Implement the idempotent management command `backend/leave/management/commands/seed_demo.py` (plus `management/__init__.py` and `management/commands/__init__.py`); make T013 pass

### Frontend

- [X] T015 [P] Create the Mantine theme in `frontend/src/theme.ts` (primary color `indigo`, default radius `md`, Inter/system font stack, heading sizes) and `frontend/src/main.tsx` rendering `<MantineProvider theme={theme}>`, `<Notifications />`, `<BrowserRouter>`, and `<App />`; import `@mantine/core/styles.css`, `@mantine/dates/styles.css`, `@mantine/notifications/styles.css`
- [X] T016 [P] Write `frontend/src/api/client.test.ts` then implement `frontend/src/api/client.ts`: `apiFetch<T>(path, {method, body})` prefixing `/api`, sending JSON with `credentials: "same-origin"`, adding `X-CSRFToken` from the `csrftoken` cookie on non-GET requests, returning parsed JSON (or `undefined` for 204), and throwing `ApiError {status, detail, fieldErrors}` for non-2xx (from `{"detail": ...}` or field-error bodies per [contracts/api.md](contracts/api.md#error-format)); also define shared types `Me`, `Balance`, `LeaveRequest`, `TeamRequest` in `frontend/src/api/types.ts` matching the contract
- [X] T017 [P] Write `frontend/src/components/States.test.tsx` then implement `frontend/src/components/States.tsx`: `LoadingState` (Mantine `Skeleton` rows), `EmptyState({title, message, action?})`, `ErrorState({message, onRetry})` (Mantine `Alert` with a "Try again" button)
- [X] T018 Write `frontend/src/auth/AuthContext.test.tsx` then implement `frontend/src/auth/AuthContext.tsx` (`AuthProvider` loading `GET /auth/csrf` then `GET /auth/me` on mount; exposes `me`, `loading`, `login(username, password)`, `logout()`) and `frontend/src/auth/RequireAuth.tsx` (shows `LoadingState` while loading, redirects to `/login` when `me` is null, optional `managerOnly` prop redirecting non-managers to `/`)
- [X] T019 Write `frontend/src/pages/Login.test.tsx` (submits credentials, shows inline error "Invalid username or password." on 400, redirects to `/` on success) then implement `frontend/src/pages/Login.tsx` (centered Mantine `Paper` card with app name "LeaveDesk", `TextInput` username, `PasswordInput`, submit `Button` with loading state)
- [X] T020 Write `frontend/src/components/Layout.test.tsx` (shows user name and "Sign out"; "Team" link only when `me.is_manager`) then implement `frontend/src/components/Layout.tsx` using Mantine `AppShell` (header: "LeaveDesk", user name, sign-out button; navbar links Dashboard `/`, My requests `/requests`, Request leave `/requests/new`, Team `/team` for managers; burger-collapsed navbar below `sm` breakpoint)
- [X] T021 Create `frontend/src/App.tsx` with routes: `/login` → `Login`; protected routes inside `RequireAuth` + `Layout`. Until US1–US3 add pages, `/`, `/requests`, `/requests/new`, `/team` render a placeholder `EmptyState` titled "Coming soon"

**Checkpoint**: A seeded user can sign in and out in the browser; `pytest` and `npm test` pass.

---

## Phase 3: User Story 1 - Employee submits a leave request (Priority: P1) 🎯 MVP

**Goal**: Employees submit full-day or half-day requests, see their requests, and cancel
pending ones; invalid requests are blocked with clear messages.

**Independent Test**: Sign in as `rina`, request Mon–Fri (5 days) and a half day (0.5),
see both as Pending in My requests, cancel one; invalid dates, overlaps, and over-balance
requests are refused (quickstart scenarios 1–4).

### Tests for User Story 1 ⚠️ (write first, confirm they fail)

- [X] T022 [P] [US1] Write unit tests in `backend/leave/tests/test_rules.py` for `count_working_days` (Mon–Fri = 5, Fri–Mon = 2, Sat–Sun = 0), `compute_working_days` (`HALF_DAY` → `Decimal("0.5")`), `overlaps` (ranges intersect → True; same-date `MORNING` vs `AFTERNOON` half days → False; same-date same half → True; full day vs half day on same date → True), and `balance(employee, year)` (allowance 20, approved 5, pending 3 → used 5, pending 3, remaining 15, available 12; counts only requests whose `start_date` is in `year`; ignores `REJECTED`/`CANCELLED`)
- [X] T023 [P] [US1] Write API tests in `backend/leave/tests/test_requests_api.py`: `POST /api/requests` Mon–Fri → 201 with `working_days "5.0"`, `status "PENDING"`; half day `{"duration": "HALF_DAY", "half": "MORNING"}` → `"0.5"`; each rejection → 400 with a message: end before start, start in the past, weekend-only, half day on Saturday, half day with `start_date != end_date`, half day without `half`, crossing 31 December, overlap with own `PENDING`/`APPROVED` request, more days than `available`, `reason` over 500 chars, employee with no manager (`sam`) → message "You have no manager assigned. Contact an administrator."; same-date Morning then Afternoon both accepted; overlap with a `CANCELLED` request is allowed; `GET /api/requests` returns only own requests, newest start date first; `POST /api/requests/{id}/cancel` own `PENDING` → 200 `CANCELLED`, already cancelled/decided → 409 `{"detail": "This request has already been decided."}`, another employee's request → 404
- [X] T024 [P] [US1] Write `backend/leave/tests/test_balance_api.py`: `GET /api/balance` → 200 `{year, allowance, used, pending, remaining, available}` as decimal strings with one place, defaulting to the current year; `?year=` selects another year
- [X] T025 [P] [US1] Write `frontend/src/lib/workingDays.test.ts`: Mon–Fri → 5, weekend-only → 0, end before start → 0, half day → 0.5
- [X] T026 [P] [US1] Write `frontend/src/components/StatusBadge.test.tsx`: renders label and color per status (Pending = yellow, Approved = green, Rejected = red, Cancelled = gray)
- [X] T027 [P] [US1] Write `frontend/src/pages/NewRequest.test.tsx` (mock `fetch`): Full day / Half day toggle switches between date range and single date + Morning/Afternoon; live working-day count updates; shows available balance from `GET /balance`; submit posts the contract body and navigates to `/requests` with a success notification; 400 errors shown inline; when `me.has_manager` is false shows "You have no manager assigned. Contact an administrator." instead of the form
- [X] T028 [P] [US1] Write `frontend/src/pages/MyRequests.test.tsx` (mock `fetch`): loading skeleton, empty state with "Request leave" action, error state with retry; table shows dates, duration (e.g. "Half day · Morning"), days, status badge, manager comment; "Cancel" only on Pending rows, asks for confirmation, then refreshes; 409 shows "This request has already been decided." and refreshes

### Implementation for User Story 1

- [X] T029 [US1] Implement pure functions in `backend/leave/rules.py`: `count_working_days(start, end)`, `compute_working_days(duration, start, end)`, `overlaps(a, b)` (per [data-model.md](data-model.md) rule 6), and `balance(employee, year)` returning a dict with `allowance`, `used`, `pending`, `remaining = allowance − used`, `available = remaining − pending` (all `Decimal`); make T022 pass
- [X] T030 [US1] Implement `LeaveRequestSerializer` in `backend/leave/serializers.py` with output shape from [contracts/api.md](contracts/api.md#my-requests) (`employee` as `{id, name}`, `decided_by` as `{id, name}` or null) and create-validation applying data-model rules 1–7 in order, computing `working_days` server-side; validation messages are user-readable sentences
- [X] T031 [US1] Implement views in `backend/leave/views.py`: `GET/POST /api/requests` (list own newest `start_date` first; create for the caller's `Employee`), `POST /api/requests/{id}/cancel` (404 if not own; conditional update `filter(pk=id, status="PENDING").update(status="CANCELLED")`, 409 if 0 rows), and `GET /api/balance?year=`; add routes in `backend/leave/urls.py`; make T023 and T024 pass
- [X] T032 [P] [US1] Implement `frontend/src/lib/workingDays.ts` (`countWorkingDays(start, end)`, `requestDays(duration, start, end)`); make T025 pass
- [X] T033 [P] [US1] Implement `frontend/src/api/requests.ts` (`listMyRequests`, `createRequest`, `cancelRequest`, `getBalance(year?)`) using `apiFetch`
- [X] T034 [P] [US1] Implement `frontend/src/components/StatusBadge.tsx` (Mantine `Badge`); make T026 pass
- [X] T035 [US1] Implement `frontend/src/pages/NewRequest.tsx` (Mantine `SegmentedControl` Full day / Half day, `DatePickerInput` type range or single with weekends shown but past dates disabled, `SegmentedControl` Morning / Afternoon, `Textarea` reason with `maxLength={500}` and counter, summary line "N working days · M available", submit button with loading state); make T027 pass
- [X] T036 [US1] Implement `frontend/src/pages/MyRequests.tsx` (Mantine `Table` inside `ScrollArea` for narrow screens, `StatusBadge`, cancel confirmation in a Mantine `Modal`, `LoadingState` / `EmptyState` / `ErrorState`); make T028 pass
- [X] T037 [US1] Replace the `/requests` and `/requests/new` placeholders in `frontend/src/App.tsx` with `MyRequests` and `NewRequest`; until US3, route `/` redirects to `/requests`

**Checkpoint**: US1 works end to end (quickstart 1–4); all tests pass.

---

## Phase 4: User Story 2 - Manager approves or rejects requests (Priority: P2)

**Goal**: Managers see pending requests from direct reports (with each employee's balance)
and approve or reject them; rejection requires a comment.

**Independent Test**: With Pending requests from `rina`, sign in as `maya`, approve one and
reject another with a comment; statuses update for both users; `tom` cannot see the Team
page (quickstart scenarios 5 and 7).

### Tests for User Story 2 ⚠️ (write first, confirm they fail)

- [X] T038 [P] [US2] Write `backend/leave/tests/test_team_api.py`: `GET /api/team/requests` as `maya` returns only `PENDING` requests of `rina`/`tom` (not `sam`'s, not her own), each with `employee_balance` for the request's year; `?status=APPROVED` filters; as a non-manager returns `[]`; `POST /api/team/requests/{id}/approve` → 200 `APPROVED`, sets `decided_by`, `decided_at`, optional `decision_comment`, and the employee's `used` balance increases by `working_days`; `POST .../reject` with comment → 200 `REJECTED`, balance unchanged; reject with empty or missing comment → 400; comment over 500 chars → 400; request of a non-direct report (including the manager's own) → 404; deciding an already decided or cancelled request (second of two decisions) → 409 `{"detail": "This request has already been decided."}`
- [X] T039 [P] [US2] Write `frontend/src/pages/Team.test.tsx` (mock `fetch`): loading, empty ("No pending requests"), and error states; rows show employee, dates, days, reason, remaining balance; Approve posts and removes the row with a success notification; Reject opens a dialog whose Confirm stays disabled until a comment is entered, then posts and removes the row; 409 shows "This request has already been decided." and refreshes

### Implementation for User Story 2

- [X] T040 [US2] Add `TeamRequestSerializer` (`LeaveRequestSerializer` + `employee_balance` from `rules.balance(employee, start_date.year)`) and `DecisionSerializer` (`comment`, ≤ 500 chars; `required=True, allow_blank=False` for reject) in `backend/leave/serializers.py`
- [X] T041 [US2] Implement views in `backend/leave/views.py`: `GET /api/team/requests?status=` (default `PENDING`; requests where `employee__manager` is the caller), `POST /api/team/requests/{id}/approve` and `/reject` (404 unless `employee.manager` is the caller; conditional update `filter(pk=id, status="PENDING").update(status=..., decision_comment=..., decided_by=caller, decided_at=timezone.now())`, 409 if 0 rows); add routes in `backend/leave/urls.py`; make T038 pass
- [X] T042 [P] [US2] Implement `frontend/src/api/team.ts` (`listTeamRequests(status?)`, `approveRequest(id, comment?)`, `rejectRequest(id, comment)`)
- [X] T043 [US2] Implement `frontend/src/pages/Team.tsx` (Mantine `Table` in `ScrollArea`, green Approve / red outline Reject buttons with loading states, reject `Modal` with required `Textarea`, `LoadingState` / `EmptyState` / `ErrorState`); make T039 pass
- [X] T044 [US2] Replace the `/team` placeholder in `frontend/src/App.tsx` with `Team` wrapped in `RequireAuth managerOnly`

**Checkpoint**: US1 and US2 both work (quickstart 1–5, 7); all tests pass.

---

## Phase 5: User Story 3 - Employee views remaining leave balance (Priority: P3)

**Goal**: A dashboard showing allowance, used, pending, and remaining days, plus recent
requests.

**Independent Test**: For an employee with known approved and pending requests, the
dashboard shows correct figures and reflects a new approval (quickstart scenario 6).

### Tests for User Story 3 ⚠️ (write first, confirm they fail)

- [X] T045 [P] [US3] Write `frontend/src/components/BalanceCards.test.tsx`: given a `Balance`, renders four labelled cards "Allowance", "Used", "Pending", "Remaining" with values formatted without a trailing ".0" (e.g. `"15"`, `"14.5"`)
- [X] T046 [P] [US3] Write `frontend/src/pages/Dashboard.test.tsx` (mock `fetch`): loading and error states; shows `BalanceCards` for the current year from `GET /balance`; "Request leave" button links to `/requests/new`; lists up to 5 most recent requests with `StatusBadge`; empty state when there are no requests

### Implementation for User Story 3

- [X] T047 [P] [US3] Implement `frontend/src/components/BalanceCards.tsx` (Mantine `SimpleGrid` cols `{base: 2, sm: 4}` of `Paper` cards with label and large number); make T045 pass
- [X] T048 [US3] Implement `frontend/src/pages/Dashboard.tsx` (title "Hello, {first name}", `BalanceCards`, "Request leave" button, recent requests list); make T046 pass
- [X] T049 [US3] In `frontend/src/App.tsx`, replace the `/` redirect with `Dashboard`

**Checkpoint**: All three stories work independently; all tests pass.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T050 [P] Write root `README.md`: what LeaveDesk is, prerequisites, backend and frontend run commands, test commands (`pytest`, `npm test`), and demo users, linking to [quickstart.md](quickstart.md)
- [X] T051 [P] Add a `frontend/src/App.test.tsx` route test: signed-out visit to `/requests` redirects to `/login`; non-manager visit to `/team` redirects to `/`; unknown route shows a "Page not found" `EmptyState` with a link home (add the catch-all route in `frontend/src/App.tsx`)
- [X] T052 Accessibility and responsive pass, tests first (Constitution I, III): (a) write `frontend/src/test/a11y.test.tsx` that renders `Login`, `Dashboard`, `MyRequests`, `NewRequest`, and `Team` with mocked data via `renderWithProviders` and asserts `expect(await axe(container)).toHaveNoViolations()` (from `vitest-axe`); (b) in the same file, assert by role and accessible name that every form input has a label (`getByLabelText`), every button has a name (`getAllByRole("button")` each with non-empty accessible name), and every table is wrapped in a horizontally scrollable `ScrollArea`; (c) confirm these tests fail where issues exist, then fix `frontend/src/pages/*.tsx` and `frontend/src/components/*.tsx` until they pass; (d) keep Mantine's default visible focus ring (do not set `focusRing: "never"` in `frontend/src/theme.ts`) and verify keyboard-only navigation and 360 px width by hand during T054
- [X] T053 Run `pytest` in `backend/`, `npm test` and `npm run build` in `frontend/`; all must pass with no type errors
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
- Keep it simple (Constitution II): no extra libraries beyond those in T001/T004
  (`vitest-axe` is justified in [research.md](research.md) §12).
- All UI uses the shared Mantine theme and the `States` components (Constitution III).
- Production hosting of the built frontend is out of scope for this task list.
- Commit after each task or logical group.

---

## Phase 7: Convergence

- [X] T055 CRITICAL: Add `backend/leave/tests/test_admin.py` asserting a superuser (created with `User.objects.create_superuser`) gets 200 from `/admin/leave/employee/`, `/admin/leave/employee/add/`, `/admin/leave/leaverequest/`, and `/admin/leave/leaverequest/add/`, and that a demo (non-staff) user is redirected to the admin login, covering the registrations in `backend/leave/admin.py` per Constitution I (contradicts)
- [X] T056 CRITICAL: Add tests to `backend/leave/tests/test_auth_api.py` for a `User` with no `Employee` profile: `POST /api/auth/login` returns 400 `{"non_field_errors": ["Invalid username or password."]}`, and after `force_login` both `GET /api/auth/me` and `GET /api/requests` return 403 `{"detail": "Your account has no employee profile."}` per Constitution I (contradicts)
- [X] T057 CRITICAL: Add a test to `frontend/src/components/Layout.test.tsx` that clicking the "Toggle navigation" button marks it expanded/opened and that clicking a navbar link (e.g. "My requests") navigates and closes the menu again, covering the mobile navigation in `frontend/src/components/Layout.tsx` per Constitution I (contradicts)
- [X] T058 CRITICAL: Remove the unused `@mantine/dates` dependency from `frontend/package.json` (via `npm uninstall @mantine/dates`) and the `import "@mantine/dates/styles.css"` line from `frontend/src/main.tsx`; `frontend/src/pages/NewRequest.tsx` uses native date inputs instead of the `DatePickerInput` planned in T035. Run `npm test` and `npm run build` afterwards, per Constitution II and plan: primary dependencies (contradicts)
- [X] T059 CRITICAL: Remove the unrequested `postcss-simple-vars` dev dependency (`npm uninstall postcss-simple-vars`) and its block from `frontend/postcss.config.cjs`, keeping only `postcss-preset-mantine`; no CSS module uses the breakpoint variables it defines. Run `npm test` and `npm run build` afterwards, per Constitution II and T004 (unrequested)
- [X] T060 Let managers add an optional comment when approving: in `frontend/src/pages/Team.tsx`, make Approve open an `AppModal` titled "Approve leave request" with an optional `Textarea` labelled "Comment (optional)" (`maxLength={500}`) and an "Approve request" button that calls `approveRequest(id, comment.trim() || undefined)`; add tests in `frontend/src/pages/Team.test.tsx` for approving with and without a comment (request body `{"comment": "..."}` vs `{}`) and update the approve test accordingly, per FR-009 (partial)
- [X] T061 Show a non-blocking warning on the request form when the balance cannot be loaded: in `frontend/src/pages/NewRequest.tsx`, replace the silent `.catch(() => setBalance(null))` with state that renders "Could not load your available balance. You can still submit; the server will check it." in the summary area; add a test in `frontend/src/pages/NewRequest.test.tsx` mocking `GET /balance` with status 500, per FR-014 (partial)

# Implementation Plan: LeaveDesk Leave Requests

**Branch**: `001-leave-requests` | **Date**: 2026-10-19 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-leave-requests/spec.md`

## Summary

Employees submit full-day or single half-day annual leave requests, their direct manager
approves or rejects them, and employees see allowance, used, pending, and remaining days.
Built as a Django + DRF JSON API on SQLite with a React (Vite, Mantine) single-page
frontend; balances are computed from requests rather than stored. Tested with pytest
(backend) and Vitest (frontend). See [research.md](research.md).

## Technical Context

**Language/Version**: Python 3.12 (backend); TypeScript 5 / React 18 (frontend)

**Primary Dependencies**: Django 5.2 LTS, Django REST Framework 3.16; Vite 6,
React Router 7, Mantine 7 (core, dates, notifications)

**Storage**: SQLite (Django ORM, migrations)

**Testing**: pytest + pytest-django (backend); Vitest + React Testing Library + vitest-axe
(frontend)

**Target Platform**: Web browser (current Chrome, Edge, Firefox, Safari); server on any OS
running Python 3.12

**Project Type**: Web application (backend API + frontend SPA)

**Performance Goals**: Pages and actions respond in under 1 s for ≤ 50 concurrent users,
supporting SC-001 (submit < 1 min) and SC-002 (decide < 30 s)

**Constraints**: Same-origin session auth with CSRF; decimal day counts in 0.5 steps;
responsive from 360 px; WCAG 2.1 AA basics

**Scale/Scope**: ≤ 500 employees; 5 screens; ~12 API endpoints

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Pre-design | Post-design |
|-----------|------|------------|-------------|
| I. Automated tests for every change | Every behavior has automated tests; one command per side | PASS: pytest + Vitest chosen | PASS: rules in data-model and every endpoint in contracts are testable; `pytest` / `npm test` in quickstart |
| II. Simplicity first | No unjustified dependencies or layers | PASS | PASS: balance computed (no table); no CORS, no JWT; DRF, Mantine and Vitest justified in research §1, §11, §12 |
| III. Professional UI | One visual system; loading/empty/error states; responsive; accessible | PASS: Mantine theme | PASS: [contracts/ui.md](contracts/ui.md) defines states, badges, 360 px, keyboard |

No violations; Complexity Tracking is empty.

## Project Structure

### Documentation (this feature)

```text
specs/001-leave-requests/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── api.md
│   └── ui.md
├── checklists/requirements.md
└── tasks.md              # created by /speckit-tasks
```

### Source Code (repository root)

```text
backend/
├── manage.py
├── requirements.txt
├── pytest.ini
├── leavedesk/            # Django project: settings, urls
└── leave/                # Django app
    ├── models.py         # Employee, LeaveRequest
    ├── rules.py          # working days, overlap, balance (pure functions)
    ├── serializers.py
    ├── views.py          # auth, balance, requests, team
    ├── urls.py
    ├── admin.py
    ├── management/commands/seed_demo.py
    ├── migrations/
    └── tests/
        ├── test_rules.py
        ├── test_auth_api.py
        ├── test_requests_api.py
        ├── test_team_api.py
        └── test_balance_api.py

frontend/
├── package.json
├── vite.config.ts        # /api proxy to :8000, Vitest config
├── index.html
└── src/
    ├── main.tsx
    ├── theme.ts          # Mantine theme (design tokens)
    ├── api/              # fetch client with CSRF, typed endpoints
    ├── auth/             # session context, route guard
    ├── components/       # AppShell, BalanceCards, StatusBadge, states
    ├── pages/            # Login, Dashboard, MyRequests, NewRequest, Team
    ├── lib/workingDays.ts
    └── test/             # setup and helpers; *.test.tsx next to components/pages
```

**Structure Decision**: Web application with `backend/` (Django) and `frontend/` (React)
at the repository root. Business rules live in `backend/leave/rules.py` as pure functions
so they are unit-tested independently of HTTP.

## Design Notes

- **Cross-year requests**: Not covered in the spec; the design rejects a full-day request
  that crosses 31 December (research §6). Consider adding it to the spec's edge cases.
- **Working-day preview**: The form computes the count client-side for instant feedback;
  the server recalculates and is authoritative.

## Complexity Tracking

None.

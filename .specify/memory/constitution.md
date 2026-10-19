<!--
Sync Impact Report
==================
Version change: (unversioned template) → 1.0.0
Modified principles:
  - [PRINCIPLE_1_NAME] → I. Automated Tests for Every Change (NON-NEGOTIABLE)
  - [PRINCIPLE_2_NAME] → II. Simplicity First
  - [PRINCIPLE_3_NAME] → III. Professional User Interface
Removed sections:
  - Template slots PRINCIPLE_4 and PRINCIPLE_5 (project chose three principles to stay simple)
Added sections:
  - Quality Gates (SECTION_2)
  - Development Workflow (SECTION_3)
  - Governance
Templates requiring updates: none (templates read the constitution at runtime)
Follow-up TODOs: none
-->

# LeaveDesk Constitution

## Core Principles

### I. Automated Tests for Every Change (NON-NEGOTIABLE)

- Every change that alters behavior (feature, bug fix, refactor) MUST ship with automated
  tests that exercise that behavior.
- Bug fixes MUST include a regression test that fails without the fix and passes with it.
- The full automated test suite MUST pass before a change is merged; a failing or skipped
  test MUST NOT be merged without a documented, time-boxed justification.
- Tests MUST run with a single documented command and require no manual steps.

**Rationale**: Automated tests are the only reliable proof that a change works and keeps
working; manual verification does not scale and is not repeatable.

### II. Simplicity First

- The simplest solution that meets the current, stated requirements MUST be chosen (YAGNI).
- New dependencies, layers, abstractions, or services MUST be justified in the plan by a
  concrete present need; speculative extensibility is not a justification.
- Code MUST favor readability over cleverness; duplication is preferred to a premature
  abstraction until a pattern appears at least three times.

**Rationale**: Simple systems are faster to build, easier to test, and cheaper to change.

### III. Professional User Interface

- The UI MUST present a clean, consistent, professional appearance: a single coherent
  visual style (typography, spacing, color palette, components) used across all screens.
- Shared UI components and design tokens MUST be reused rather than re-styled per screen.
- Every screen MUST handle loading, empty, and error states with clear, user-facing messages.
- The UI MUST be responsive (usable on desktop and mobile widths) and meet basic
  accessibility: semantic markup, keyboard navigation, visible focus, and sufficient
  color contrast (WCAG 2.1 AA).

**Rationale**: A polished, consistent interface builds user trust and reduces support
burden for an internal business tool.

## Quality Gates

- All automated tests pass (Principle I).
- New or changed behavior has corresponding tests in the same change.
- No unjustified new dependencies or abstractions (Principle II).
- UI changes follow the shared visual style and cover loading, empty, and error states
  (Principle III).

## Development Workflow

- Work follows the Spec Kit flow: specify → plan → tasks → implement.
- Each plan MUST include a Constitution Check confirming compliance with all principles;
  any deviation MUST be recorded with its justification.
- Changes are reviewed before merge; reviewers MUST verify the Quality Gates above.

## Governance

- This constitution supersedes other project practices; where they conflict, it wins.
- Amendments MUST be made through `/speckit-constitution`, documented in the Sync Impact
  Report, and reviewed before commit.
- Versioning follows semantic versioning: MAJOR for removing or redefining principles,
  MINOR for adding principles or materially expanding guidance, PATCH for clarifications.
- Compliance is checked at plan time (Constitution Check) and at review time
  (Quality Gates).

**Version**: 1.0.0 | **Ratified**: 2026-10-19 | **Last Amended**: 2026-10-19

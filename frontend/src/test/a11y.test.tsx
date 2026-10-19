import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import App from "../App";
import type { Balance, LeaveRequest, TeamRequest } from "../api/types";
import { employeeMe, managerMe, mockApi, renderWithProviders } from "./render";

// Constitution III: every page passes automated axe checks, every input has a label, every
// button has an accessible name, and tables scroll horizontally on narrow screens.
// Limitation: jsdom cannot measure colour contrast or real layout (see research.md §12).

const balance: Balance = {
  year: 2026,
  allowance: "20.0",
  used: "5.0",
  pending: "1.0",
  remaining: "15.0",
  available: "14.0",
};

const request: LeaveRequest = {
  id: 1,
  employee: { id: 2, name: "Rina Das" },
  start_date: "2026-11-02",
  end_date: "2026-11-02",
  duration: "FULL_DAY",
  half: null,
  working_days: "1.0",
  reason: "Appointment",
  status: "PENDING",
  decision_comment: "",
  decided_by: null,
  decided_at: null,
  created_at: "2026-10-19T09:00:00+06:00",
};

const teamRequest: TeamRequest = { ...request, employee_balance: balance };

function mockBackend() {
  mockApi([
    { path: /\/api\/balance/, body: balance },
    { path: "/requests", body: [request] },
    { path: /\/api\/team\/requests/, body: [teamRequest] },
  ]);
}

const pages = [
  { name: "Login", route: "/login", me: null, ready: () => screen.findByRole("button", { name: "Sign in" }) },
  { name: "Dashboard", route: "/", me: employeeMe, ready: () => screen.findByRole("heading", { name: "Hello, Rina" }) },
  { name: "My requests", route: "/requests", me: employeeMe, ready: () => screen.findByRole("table") },
  { name: "Request leave", route: "/requests/new", me: employeeMe, ready: () => screen.findByText(/days available/) },
  { name: "Team", route: "/team", me: managerMe, ready: () => screen.findByRole("table") },
];

describe.each(pages)("$name page accessibility", ({ route, me, ready }) => {
  async function renderPage() {
    mockBackend();
    const view = renderWithProviders(<App />, { route, me });
    await ready();
    return view;
  }

  it("has no axe violations", async () => {
    const { container } = await renderPage();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("labels every form input", async () => {
    const { container } = await renderPage();
    const inputs = container.querySelectorAll("input:not([type=hidden]), textarea, select");
    for (const input of inputs) {
      const labelled =
        (input as HTMLInputElement).labels?.length ||
        input.getAttribute("aria-label") ||
        input.getAttribute("aria-labelledby");
      expect(labelled, `unlabelled ${input.outerHTML}`).toBeTruthy();
    }
  });

  it("gives every button an accessible name", async () => {
    await renderPage();
    for (const button of screen.queryAllByRole("button")) {
      expect(button).toHaveAccessibleName();
    }
  });

  it("wraps tables in a horizontal scroll area", async () => {
    const { container } = await renderPage();
    for (const table of container.querySelectorAll("table")) {
      expect(table.closest(".mantine-ScrollArea-root")).not.toBeNull();
    }
  });
});

describe("dialogs accessibility", () => {
  it("cancel dialog has no axe violations", async () => {
    mockBackend();
    renderWithProviders(<App />, { route: "/requests", me: employeeMe });
    await userEvent.click(await screen.findByRole("button", { name: /cancel request for/i }));
    const dialog = await screen.findByRole("dialog");
    expect(await axe(dialog)).toHaveNoViolations();
  });

  it("approve dialog has no axe violations and a labelled comment field", async () => {
    mockBackend();
    renderWithProviders(<App />, { route: "/team", me: managerMe });
    await userEvent.click(await screen.findByRole("button", { name: /approve request from/i }));
    const dialog = await screen.findByRole("dialog");
    expect(screen.getByLabelText(/comment \(optional\)/i)).toBeInTheDocument();
    expect(await axe(dialog)).toHaveNoViolations();
  });

  it("reject dialog has no axe violations and a labelled comment field", async () => {
    mockBackend();
    renderWithProviders(<App />, { route: "/team", me: managerMe });
    await userEvent.click(await screen.findByRole("button", { name: /reject request from/i }));
    const dialog = await screen.findByRole("dialog");
    expect(screen.getByLabelText(/reason for rejection/i)).toBeInTheDocument();
    expect(await axe(dialog)).toHaveNoViolations();
  });
});

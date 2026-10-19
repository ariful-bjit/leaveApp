import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import type { Balance, LeaveRequest } from "../api/types";
import { employeeMe, mockApi, renderWithProviders } from "../test/render";
import Dashboard from "./Dashboard";

const balance: Balance = {
  year: 2026,
  allowance: "20.0",
  used: "5.0",
  pending: "3.0",
  remaining: "15.0",
  available: "12.0",
};

function leave(id: number, start: string, status: LeaveRequest["status"]): LeaveRequest {
  return {
    id,
    employee: { id: 2, name: "Rina Das" },
    start_date: start,
    end_date: start,
    duration: "FULL_DAY",
    half: null,
    working_days: "1.0",
    reason: "",
    status,
    decision_comment: "",
    decided_by: null,
    decided_at: null,
    created_at: "2026-10-19T09:00:00+06:00",
  };
}

const sevenRequests = [
  leave(7, "2026-12-07", "PENDING"),
  leave(6, "2026-12-01", "APPROVED"),
  leave(5, "2026-11-24", "REJECTED"),
  leave(4, "2026-11-17", "CANCELLED"),
  leave(3, "2026-11-10", "APPROVED"),
  leave(2, "2026-11-03", "APPROVED"),
  leave(1, "2026-10-27", "APPROVED"),
];

function renderPage() {
  return renderWithProviders(
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/requests/new" element={<p>new request page</p>} />
      <Route path="/requests" element={<p>my requests page</p>} />
    </Routes>,
    { me: employeeMe },
  );
}

describe("Dashboard", () => {
  it("shows a loading state first", () => {
    mockApi([
      { path: "/balance", body: balance },
      { path: "/requests", body: [] },
    ]);
    renderPage();
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("greets the user and shows balance cards for the current year", async () => {
    mockApi([
      { path: "/balance", body: balance },
      { path: "/requests", body: [] },
    ]);
    renderPage();

    expect(await screen.findByRole("heading", { name: "Hello, Rina" })).toBeInTheDocument();
    expect(screen.getByText(/2026/)).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Remaining" })).toHaveTextContent("15");
    expect(screen.getByRole("group", { name: "Used" })).toHaveTextContent("5");
  });

  it("links to the request form", async () => {
    mockApi([
      { path: "/balance", body: balance },
      { path: "/requests", body: [] },
    ]);
    renderPage();
    const links = await screen.findAllByRole("link", { name: "Request leave" });
    await userEvent.click(links[0]);
    expect(await screen.findByText("new request page")).toBeInTheDocument();
  });

  it("shows an empty state when there are no requests", async () => {
    mockApi([
      { path: "/balance", body: balance },
      { path: "/requests", body: [] },
    ]);
    renderPage();
    expect(await screen.findByText("No leave requests yet")).toBeInTheDocument();
  });

  it("lists the 5 most recent requests with status", async () => {
    mockApi([
      { path: "/balance", body: balance },
      { path: "/requests", body: sevenRequests },
    ]);
    renderPage();

    const list = await screen.findByRole("list", { name: "Recent requests" });
    const items = within(list).getAllByRole("listitem");
    expect(items).toHaveLength(5);
    expect(items[0]).toHaveTextContent("7 Dec 2026");
    expect(items[0]).toHaveTextContent("Pending");
    expect(items[2]).toHaveTextContent("Rejected");
    expect(screen.getByRole("link", { name: "View all requests" })).toBeInTheDocument();
  });

  it("shows an error state and retries", async () => {
    const fetchMock = mockApi([
      { path: "/balance", status: 500, body: { detail: "Server error" } },
      { path: "/requests", body: [] },
    ]);
    renderPage();
    expect(await screen.findByRole("alert")).toHaveTextContent("Server error");

    fetchMock.mockImplementation(async (input) =>
      new Response(JSON.stringify(String(input).includes("balance") ? balance : []), { status: 200 }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("heading", { name: "Hello, Rina" })).toBeInTheDocument();
  });
});

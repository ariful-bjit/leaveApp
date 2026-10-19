import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import type { LeaveRequest } from "../api/types";
import { mockApi, renderWithProviders } from "../test/render";
import MyRequests from "./MyRequests";

const rina = { id: 2, name: "Rina Das" };
const maya = { id: 1, name: "Maya Rahman" };

function leave(overrides: Partial<LeaveRequest>): LeaveRequest {
  return {
    id: 1,
    employee: rina,
    start_date: "2026-11-02",
    end_date: "2026-11-06",
    duration: "FULL_DAY",
    half: null,
    working_days: "5.0",
    reason: "",
    status: "PENDING",
    decision_comment: "",
    decided_by: null,
    decided_at: null,
    created_at: "2026-10-19T09:00:00+06:00",
    ...overrides,
  };
}

const pending = leave({ id: 1 });
const halfDayRejected = leave({
  id: 2,
  start_date: "2026-11-10",
  end_date: "2026-11-10",
  duration: "HALF_DAY",
  half: "MORNING",
  working_days: "0.5",
  status: "REJECTED",
  decision_comment: "Team offsite that morning",
  decided_by: maya,
});

function renderPage() {
  return renderWithProviders(
    <Routes>
      <Route path="/requests" element={<MyRequests />} />
      <Route path="/requests/new" element={<p>new request page</p>} />
    </Routes>,
    { route: "/requests" },
  );
}

describe("MyRequests", () => {
  it("shows a loading state first", () => {
    mockApi([{ path: "/requests", body: [] }]);
    renderPage();
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("shows an empty state with a link to request leave", async () => {
    mockApi([{ path: "/requests", body: [] }]);
    renderPage();
    expect(await screen.findByText("No leave requests yet")).toBeInTheDocument();
    const links = screen.getAllByRole("link", { name: "Request leave" });
    await userEvent.click(links[links.length - 1]);
    expect(await screen.findByText("new request page")).toBeInTheDocument();
  });

  it("shows an error state and retries", async () => {
    const fetchMock = mockApi([{ path: "/requests", status: 500, body: { detail: "Server error" } }]);
    renderPage();
    expect(await screen.findByRole("alert")).toHaveTextContent("Server error");

    fetchMock.mockResolvedValue(new Response(JSON.stringify([pending]), { status: 200 }));
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("Pending")).toBeInTheDocument();
  });

  it("lists requests with dates, duration, days, status and comment", async () => {
    mockApi([{ path: "/requests", body: [pending, halfDayRejected] }]);
    renderPage();

    const rows = await screen.findAllByRole("row");
    const first = within(rows[1]);
    expect(first.getByText("2 Nov 2026 – 6 Nov 2026")).toBeInTheDocument();
    expect(first.getByText("Full day")).toBeInTheDocument();
    expect(first.getByText("5")).toBeInTheDocument();
    expect(first.getByText("Pending")).toBeInTheDocument();

    const second = within(rows[2]);
    expect(second.getByText("10 Nov 2026")).toBeInTheDocument();
    expect(second.getByText("Half day · Morning")).toBeInTheDocument();
    expect(second.getByText("0.5")).toBeInTheDocument();
    expect(second.getByText("Rejected")).toBeInTheDocument();
    expect(second.getByText("Team offsite that morning")).toBeInTheDocument();
  });

  it("offers Cancel only on pending requests", async () => {
    mockApi([{ path: "/requests", body: [pending, halfDayRejected] }]);
    renderPage();
    const rows = await screen.findAllByRole("row");
    expect(within(rows[1]).getByRole("button", { name: /cancel/i })).toBeInTheDocument();
    expect(within(rows[2]).queryByRole("button", { name: /cancel/i })).not.toBeInTheDocument();
  });

  it("cancels after confirmation and refreshes", async () => {
    let cancelled = false;
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);
      if (url === "/api/requests/1/cancel" && init?.method === "POST") {
        cancelled = true;
        return new Response(JSON.stringify({ ...pending, status: "CANCELLED" }), { status: 200 });
      }
      const current = cancelled ? { ...pending, status: "CANCELLED" } : pending;
      return new Response(JSON.stringify([current]), { status: 200 });
    });
    renderPage();

    const rows = await screen.findAllByRole("row");
    await userEvent.click(within(rows[1]).getByRole("button", { name: /cancel/i }));
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent("Cancel this leave request?");
    await userEvent.click(within(dialog).getByRole("button", { name: "Cancel request" }));

    expect(await screen.findByText("Request cancelled")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("Cancelled")).toBeInTheDocument());
    expect(cancelled).toBe(true);
  });

  it("keeps the request when the dialog is dismissed", async () => {
    const fetchMock = mockApi([{ path: "/requests", body: [pending] }]);
    renderPage();
    const rows = await screen.findAllByRole("row");
    await userEvent.click(within(rows[1]).getByRole("button", { name: /cancel/i }));
    await userEvent.click(await screen.findByRole("button", { name: "Keep request" }));
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === "POST")).toBe(false);
  });

  it("explains a 409 and refreshes the list", async () => {
    let listCalls = 0;
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      if (init?.method === "POST") {
        return new Response(JSON.stringify({ detail: "This request has already been decided." }), {
          status: 409,
        });
      }
      listCalls += 1;
      const current = listCalls > 1 ? { ...pending, status: "APPROVED", decided_by: maya } : pending;
      return new Response(JSON.stringify([current]), { status: 200 });
    });
    renderPage();

    const rows = await screen.findAllByRole("row");
    await userEvent.click(within(rows[1]).getByRole("button", { name: /cancel/i }));
    await userEvent.click(await screen.findByRole("button", { name: "Cancel request" }));

    expect(await screen.findByText("This request has already been decided.")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("Approved")).toBeInTheDocument());
  });
});

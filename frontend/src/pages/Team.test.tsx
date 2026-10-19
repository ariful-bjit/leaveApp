import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { TeamRequest } from "../api/types";
import { managerMe, mockApi, renderWithProviders } from "../test/render";
import Team from "./Team";

function teamRequest(overrides: Partial<TeamRequest>): TeamRequest {
  return {
    id: 1,
    employee: { id: 2, name: "Rina Das" },
    start_date: "2026-11-02",
    end_date: "2026-11-06",
    duration: "FULL_DAY",
    half: null,
    working_days: "5.0",
    reason: "Family trip",
    status: "PENDING",
    decision_comment: "",
    decided_by: null,
    decided_at: null,
    created_at: "2026-10-19T09:00:00+06:00",
    employee_balance: {
      year: 2026,
      allowance: "20.0",
      used: "2.0",
      pending: "5.0",
      remaining: "18.0",
      available: "13.0",
    },
    ...overrides,
  };
}

const rinaRequest = teamRequest({});
const tomRequest = teamRequest({
  id: 2,
  employee: { id: 3, name: "Tom Khan" },
  start_date: "2026-11-10",
  end_date: "2026-11-10",
  duration: "HALF_DAY",
  half: "AFTERNOON",
  working_days: "0.5",
  reason: "",
});

/** Serves the pending list; decided requests drop out of it. */
function mockTeam(initial: TeamRequest[], decide?: (id: number, action: string) => Response) {
  let pending = [...initial];
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = String(input);
    const match = /\/api\/team\/requests\/(\d+)\/(approve|reject)$/.exec(url);
    if (match && init?.method === "POST") {
      const id = Number(match[1]);
      const response = decide
        ? decide(id, match[2])
        : new Response(JSON.stringify({ ...pending.find((r) => r.id === id) }), { status: 200 });
      if (response.ok) pending = pending.filter((r) => r.id !== id);
      return response;
    }
    return new Response(JSON.stringify(pending), { status: 200 });
  });
}

function renderPage() {
  return renderWithProviders(<Team />, { route: "/team", me: managerMe });
}

function rowFor(name: string) {
  return screen.getByRole("row", { name: new RegExp(name) });
}

describe("Team", () => {
  it("shows a loading state first", () => {
    mockApi([{ path: /\/api\/team\/requests/, body: [] }]);
    renderPage();
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("shows an empty state", async () => {
    mockApi([{ path: /\/api\/team\/requests/, body: [] }]);
    renderPage();
    expect(await screen.findByText("No pending requests")).toBeInTheDocument();
  });

  it("shows an error state with retry", async () => {
    const fetchMock = mockApi([
      { path: /\/api\/team\/requests/, status: 500, body: { detail: "Server error" } },
    ]);
    renderPage();
    expect(await screen.findByRole("alert")).toHaveTextContent("Server error");
    fetchMock.mockResolvedValue(new Response(JSON.stringify([rinaRequest]), { status: 200 }));
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("Rina Das")).toBeInTheDocument();
  });

  it("lists employee, dates, days, reason and remaining balance", async () => {
    mockTeam([rinaRequest, tomRequest]);
    renderPage();

    await screen.findByText("Rina Das");
    const rina = within(rowFor("Rina Das"));
    expect(rina.getByText("2 Nov 2026 – 6 Nov 2026")).toBeInTheDocument();
    expect(rina.getByText("5")).toBeInTheDocument();
    expect(rina.getByText("Family trip")).toBeInTheDocument();
    expect(rina.getByText("18 days")).toBeInTheDocument();

    const tom = within(rowFor("Tom Khan"));
    expect(tom.getByText("Half day · Afternoon")).toBeInTheDocument();
    expect(tom.getByText("0.5")).toBeInTheDocument();
  });

  it("requests the pending list", async () => {
    const fetchMock = mockTeam([]);
    renderPage();
    await screen.findByText("No pending requests");
    expect(fetchMock).toHaveBeenCalledWith("/api/team/requests?status=PENDING", expect.anything());
  });

  async function approveFromRow(name: string, comment?: string) {
    await userEvent.click(within(rowFor(name)).getByRole("button", { name: /approve/i }));
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent("Approve leave request");
    if (comment) {
      await userEvent.type(within(dialog).getByLabelText(/comment \(optional\)/i), comment);
    }
    await userEvent.click(within(dialog).getByRole("button", { name: "Approve request" }));
  }

  function approveBody(fetchMock: ReturnType<typeof mockTeam>) {
    const post = fetchMock.mock.calls.find(([url]) => String(url).endsWith("/approve"))!;
    return JSON.parse(post[1]!.body as string);
  }

  it("approves a request without a comment and removes it from the list", async () => {
    const fetchMock = mockTeam([rinaRequest, tomRequest]);
    renderPage();

    await screen.findByText("Rina Das");
    await approveFromRow("Rina Das");

    expect(await screen.findByText("Request approved")).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText("Rina Das")).not.toBeInTheDocument());
    expect(screen.getByText("Tom Khan")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/team/requests/1/approve",
      expect.objectContaining({ method: "POST" }),
    );
    expect(approveBody(fetchMock)).toEqual({});
  });

  it("approves a request with an optional comment", async () => {
    const fetchMock = mockTeam([rinaRequest]);
    renderPage();

    await screen.findByText("Rina Das");
    await approveFromRow("Rina Das", "  Enjoy the trip  ");

    expect(await screen.findByText("Request approved")).toBeInTheDocument();
    expect(approveBody(fetchMock)).toEqual({ comment: "Enjoy the trip" });
  });

  it("does not approve when the approve dialog is dismissed", async () => {
    const fetchMock = mockTeam([rinaRequest]);
    renderPage();

    await screen.findByText("Rina Das");
    await userEvent.click(within(rowFor("Rina Das")).getByRole("button", { name: /approve/i }));
    await userEvent.click(await screen.findByRole("button", { name: "Keep pending" }));

    expect(fetchMock.mock.calls.some(([, init]) => init?.method === "POST")).toBe(false);
    expect(screen.getByText("Rina Das")).toBeInTheDocument();
  });

  it("rejects only after a comment is entered", async () => {
    const fetchMock = mockTeam([rinaRequest]);
    renderPage();

    await screen.findByText("Rina Das");
    await userEvent.click(within(rowFor("Rina Das")).getByRole("button", { name: /reject/i }));
    const dialog = await screen.findByRole("dialog");
    const confirm = within(dialog).getByRole("button", { name: "Reject request" });
    expect(confirm).toBeDisabled();

    await userEvent.type(within(dialog).getByLabelText(/reason for rejection/i), "Release week");
    expect(confirm).toBeEnabled();
    await userEvent.click(confirm);

    expect(await screen.findByText("Request rejected")).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText("Rina Das")).not.toBeInTheDocument());
    const post = fetchMock.mock.calls.find(([url]) => String(url).endsWith("/reject"))!;
    expect(JSON.parse(post[1]!.body as string)).toEqual({ comment: "Release week" });
  });

  it("explains a 409 and refreshes the list", async () => {
    mockTeam([rinaRequest], () =>
      new Response(JSON.stringify({ detail: "This request has already been decided." }), {
        status: 409,
      }),
    );
    renderPage();

    await screen.findByText("Rina Das");
    await approveFromRow("Rina Das");

    expect(await screen.findByText("This request has already been decided.")).toBeInTheDocument();
  });
});

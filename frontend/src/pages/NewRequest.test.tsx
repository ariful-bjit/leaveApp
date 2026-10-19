import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import type { Balance } from "../api/types";
import { employeeMe, mockApi, renderWithProviders } from "../test/render";
import NewRequest from "./NewRequest";

const balance: Balance = {
  year: 2026,
  allowance: "20.0",
  used: "5.0",
  pending: "0.0",
  remaining: "15.0",
  available: "15.0",
};

function renderPage(me = employeeMe) {
  return renderWithProviders(
    <Routes>
      <Route path="/requests/new" element={<NewRequest />} />
      <Route path="/requests" element={<p>my requests page</p>} />
    </Routes>,
    { route: "/requests/new", me },
  );
}

function setDate(label: RegExp, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

describe("NewRequest", () => {
  it("shows a message instead of the form when the employee has no manager", () => {
    mockApi([{ path: /\/api\/balance/, body: balance }]);
    renderPage({ ...employeeMe, has_manager: false });
    expect(
      screen.getByText("You have no manager assigned. Contact an administrator."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Submit request" })).not.toBeInTheDocument();
  });

  it("shows the available balance and a live working-day count", async () => {
    mockApi([{ path: /\/api\/balance/, body: balance }]);
    renderPage();

    expect(await screen.findByText(/15 days available/)).toBeInTheDocument();
    setDate(/start date/i, "2026-11-02");
    setDate(/end date/i, "2026-11-06");
    expect(screen.getByText(/5 working days/)).toBeInTheDocument();
  });

  it("switches to a single date with Morning/Afternoon for a half day", async () => {
    mockApi([{ path: /\/api\/balance/, body: balance }]);
    renderPage();

    await userEvent.click(screen.getByLabelText("Half day"));
    expect(screen.queryByLabelText(/end date/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText("Morning")).toBeInTheDocument();
    expect(screen.getByLabelText("Afternoon")).toBeInTheDocument();

    setDate(/^date/i, "2026-11-03");
    expect(screen.getByText(/0\.5 working days/)).toBeInTheDocument();
  });

  it("submits a full-day request and goes to My requests", async () => {
    const fetchMock = mockApi([
      { path: /\/api\/balance/, body: balance },
      { method: "POST", path: "/requests", status: 201, body: { id: 1 } },
    ]);
    renderPage();

    setDate(/start date/i, "2026-11-02");
    setDate(/end date/i, "2026-11-06");
    await userEvent.type(screen.getByLabelText(/reason/i), "Family trip");
    await userEvent.click(screen.getByRole("button", { name: "Submit request" }));

    expect(await screen.findByText("my requests page")).toBeInTheDocument();
    expect(await screen.findByText("Leave request submitted")).toBeInTheDocument();
    const post = fetchMock.mock.calls.find(([, init]) => init?.method === "POST")!;
    expect(JSON.parse(post[1]!.body as string)).toEqual({
      start_date: "2026-11-02",
      end_date: "2026-11-06",
      duration: "FULL_DAY",
      half: null,
      reason: "Family trip",
    });
  });

  it("submits a half-day request with the chosen half", async () => {
    const fetchMock = mockApi([
      { path: /\/api\/balance/, body: balance },
      { method: "POST", path: "/requests", status: 201, body: { id: 2 } },
    ]);
    renderPage();

    await userEvent.click(screen.getByLabelText("Half day"));
    setDate(/^date/i, "2026-11-03");
    await userEvent.click(screen.getByLabelText("Afternoon"));
    await userEvent.click(screen.getByRole("button", { name: "Submit request" }));

    await screen.findByText("my requests page");
    const post = fetchMock.mock.calls.find(([, init]) => init?.method === "POST")!;
    expect(JSON.parse(post[1]!.body as string)).toEqual({
      start_date: "2026-11-03",
      end_date: "2026-11-03",
      duration: "HALF_DAY",
      half: "AFTERNOON",
      reason: "",
    });
  });

  it("shows server validation errors inline", async () => {
    mockApi([
      { path: /\/api\/balance/, body: balance },
      {
        method: "POST",
        path: "/requests",
        status: 400,
        body: {
          non_field_errors: ["This request overlaps another pending or approved request."],
          end_date: ["End date must be on or after the start date."],
        },
      },
    ]);
    renderPage();

    setDate(/start date/i, "2026-11-02");
    setDate(/end date/i, "2026-11-03");
    await userEvent.click(screen.getByRole("button", { name: "Submit request" }));

    const message = await screen.findByText(
      "This request overlaps another pending or approved request.",
    );
    expect(message.closest('[role="alert"]')).not.toBeNull();
    expect(screen.getByText("End date must be on or after the start date.")).toBeInTheDocument();
    expect(screen.queryByText("my requests page")).not.toBeInTheDocument();
  });

  it("warns but still allows submitting when the balance cannot be loaded", async () => {
    mockApi([
      { path: /\/api\/balance/, status: 500, body: { detail: "Server error" } },
      { method: "POST", path: "/requests", status: 201, body: { id: 3 } },
    ]);
    renderPage();

    expect(
      await screen.findByText(
        "Could not load your available balance. You can still submit; the server will check it.",
      ),
    ).toBeInTheDocument();
    setDate(/start date/i, "2026-11-02");
    setDate(/end date/i, "2026-11-02");
    await userEvent.click(screen.getByRole("button", { name: "Submit request" }));
    expect(await screen.findByText("my requests page")).toBeInTheDocument();
  });

  it("keeps submit disabled until dates are chosen", async () => {
    mockApi([{ path: /\/api\/balance/, body: balance }]);
    renderPage();
    const submit = screen.getByRole("button", { name: "Submit request" });
    expect(submit).toBeDisabled();
    setDate(/start date/i, "2026-11-02");
    setDate(/end date/i, "2026-11-02");
    await waitFor(() => expect(submit).toBeEnabled());
  });
});

import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";
import { employeeMe, managerMe, mockApi, renderWithProviders } from "./test/render";

const balance = {
  year: 2026,
  allowance: "20.0",
  used: "0.0",
  pending: "0.0",
  remaining: "20.0",
  available: "20.0",
};

function mockBackend() {
  return mockApi([
    { path: /\/api\/balance/, body: balance },
    { path: "/requests", body: [] },
    { path: /\/api\/team\/requests/, body: [] },
  ]);
}

describe("App routes", () => {
  it("redirects signed-out visitors to the login page", () => {
    renderWithProviders(<App />, { route: "/requests", me: null });
    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
  });

  it("shows the dashboard at /", async () => {
    mockBackend();
    renderWithProviders(<App />, { route: "/", me: employeeMe });
    expect(await screen.findByRole("heading", { name: "Hello, Rina" })).toBeInTheDocument();
  });

  it("sends non-managers from /team to the dashboard", async () => {
    mockBackend();
    renderWithProviders(<App />, { route: "/team", me: employeeMe });
    expect(await screen.findByRole("heading", { name: "Hello, Rina" })).toBeInTheDocument();
  });

  it("shows the team page to managers", async () => {
    mockBackend();
    renderWithProviders(<App />, { route: "/team", me: managerMe });
    expect(await screen.findByRole("heading", { name: "Team requests" })).toBeInTheDocument();
  });

  it("shows a not-found page with a link home for unknown routes", async () => {
    mockBackend();
    renderWithProviders(<App />, { route: "/nope", me: employeeMe });
    expect(screen.getByText("Page not found")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("link", { name: "Go to dashboard" }));
    expect(await screen.findByRole("heading", { name: "Hello, Rina" })).toBeInTheDocument();
  });
});

import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { employeeMe, managerMe, renderWithProviders } from "../test/render";
import Layout from "./Layout";

function routes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<p>page content</p>} />
      </Route>
      <Route path="/login" element={<p>login page</p>} />
    </Routes>
  );
}

describe("Layout", () => {
  it("shows the app name, user name and page content", () => {
    renderWithProviders(routes(), { me: employeeMe });
    expect(screen.getByText("LeaveDesk")).toBeInTheDocument();
    expect(screen.getByText("Rina Das")).toBeInTheDocument();
    expect(screen.getByText("page content")).toBeInTheDocument();
  });

  it("hides the Team link from non-managers", () => {
    renderWithProviders(routes(), { me: employeeMe });
    expect(screen.getByRole("link", { name: /my requests/i })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /team/i })).not.toBeInTheDocument();
  });

  it("shows the Team link to managers", () => {
    renderWithProviders(routes(), { me: managerMe });
    expect(screen.getByRole("link", { name: /team/i })).toBeInTheDocument();
  });

  it("opens the mobile menu and closes it after choosing a link", async () => {
    renderWithProviders(
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<p>page content</p>} />
          <Route path="/requests" element={<p>requests content</p>} />
        </Route>
      </Routes>,
      { me: employeeMe },
    );
    const toggle = screen.getByRole("button", { name: "Toggle navigation" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");

    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");

    await userEvent.click(screen.getByRole("link", { name: /my requests/i }));
    expect(await screen.findByText("requests content")).toBeInTheDocument();
    expect(toggle).toHaveAttribute("aria-expanded", "false");
  });

  it("signs out and goes to the login page", async () => {
    const logout = vi.fn().mockResolvedValue(undefined);
    renderWithProviders(routes(), { me: employeeMe, auth: { logout } });
    await userEvent.click(screen.getByRole("button", { name: "Sign out" }));
    expect(logout).toHaveBeenCalledOnce();
    expect(await screen.findByText("login page")).toBeInTheDocument();
  });
});

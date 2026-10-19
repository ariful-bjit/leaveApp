import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { ApiError } from "../api/client";
import { employeeMe, renderWithProviders } from "../test/render";
import Login from "./Login";

function routes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<p>home page</p>} />
    </Routes>
  );
}

describe("Login", () => {
  it("signs in and redirects home", async () => {
    const login = vi.fn().mockResolvedValue(employeeMe);
    renderWithProviders(routes(), { route: "/login", me: null, auth: { login } });

    await userEvent.type(screen.getByLabelText(/username/i), "rina");
    await userEvent.type(screen.getByLabelText(/password/i), "demo1234");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(login).toHaveBeenCalledWith("rina", "demo1234");
    expect(await screen.findByText("home page")).toBeInTheDocument();
  });

  it("shows an inline error for invalid credentials", async () => {
    const login = vi
      .fn()
      .mockRejectedValue(new ApiError(400, "Invalid username or password."));
    renderWithProviders(routes(), { route: "/login", me: null, auth: { login } });

    await userEvent.type(screen.getByLabelText(/username/i), "rina");
    await userEvent.type(screen.getByLabelText(/password/i), "wrong");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid username or password.");
    expect(screen.queryByText("home page")).not.toBeInTheDocument();
  });

  it("redirects home when already signed in", () => {
    renderWithProviders(routes(), { route: "/login", me: employeeMe });
    expect(screen.getByText("home page")).toBeInTheDocument();
  });
});

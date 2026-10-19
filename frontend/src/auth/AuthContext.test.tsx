import { MantineProvider } from "@mantine/core";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { mockApi, employeeMe, renderWithProviders, managerMe } from "../test/render";
import { theme } from "../theme";
import { AuthProvider, useAuth } from "./AuthContext";
import { RequireAuth } from "./RequireAuth";

function Probe() {
  const { me, loading, login, logout } = useAuth();
  if (loading) return <p>loading</p>;
  return (
    <div>
      <p>user: {me ? me.username : "none"}</p>
      <button onClick={() => login("rina", "pw")}>login</button>
      <button onClick={() => logout()}>logout</button>
    </div>
  );
}

function renderProvider() {
  return render(
    <MantineProvider theme={theme}>
      <AuthProvider>
        <Probe />
      </AuthProvider>
    </MantineProvider>,
  );
}

describe("AuthProvider", () => {
  it("loads the signed-in user on mount", async () => {
    mockApi([
      { path: "/auth/csrf", status: 204 },
      { path: "/auth/me", body: employeeMe },
    ]);
    renderProvider();
    expect(await screen.findByText("user: rina")).toBeInTheDocument();
  });

  it("treats 403 from /auth/me as signed out, then logs in and out", async () => {
    let signedIn = false;
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);
      const method = init?.method ?? "GET";
      const json = (status: number, body?: unknown) =>
        new Response(body === undefined ? null : JSON.stringify(body), { status });
      if (url === "/api/auth/csrf") return json(204);
      if (url === "/api/auth/me") return signedIn ? json(200, employeeMe) : json(403, { detail: "x" });
      if (url === "/api/auth/login" && method === "POST") {
        signedIn = true;
        return json(200, employeeMe);
      }
      if (url === "/api/auth/logout" && method === "POST") {
        signedIn = false;
        return json(204);
      }
      return json(500);
    });

    renderProvider();
    expect(await screen.findByText("user: none")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "login" }));
    expect(await screen.findByText("user: rina")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "logout" }));
    expect(await screen.findByText("user: none")).toBeInTheDocument();
  });
});

describe("RequireAuth", () => {
  function routes() {
    return (
      <Routes>
        <Route path="/login" element={<p>login page</p>} />
        <Route path="/" element={<p>home page</p>} />
        <Route
          path="/private"
          element={
            <RequireAuth>
              <p>private page</p>
            </RequireAuth>
          }
        />
        <Route
          path="/team"
          element={
            <RequireAuth managerOnly>
              <p>team page</p>
            </RequireAuth>
          }
        />
      </Routes>
    );
  }

  it("redirects signed-out users to /login", () => {
    renderWithProviders(routes(), { route: "/private", me: null });
    expect(screen.getByText("login page")).toBeInTheDocument();
  });

  it("shows loading while the session is being checked", () => {
    renderWithProviders(routes(), { route: "/private", auth: { loading: true } });
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("renders protected content for signed-in users", () => {
    renderWithProviders(routes(), { route: "/private" });
    expect(screen.getByText("private page")).toBeInTheDocument();
  });

  it("redirects non-managers away from manager-only pages", async () => {
    renderWithProviders(routes(), { route: "/team", me: employeeMe });
    await waitFor(() => expect(screen.getByText("home page")).toBeInTheDocument());
  });

  it("allows managers on manager-only pages", () => {
    renderWithProviders(routes(), { route: "/team", me: managerMe });
    expect(screen.getByText("team page")).toBeInTheDocument();
  });
});

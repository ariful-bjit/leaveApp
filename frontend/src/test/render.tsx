import type { ReactElement } from "react";
import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AuthContext, type AuthValue } from "../auth/AuthContext";
import type { Me } from "../api/types";
import { theme } from "../theme";

export const employeeMe: Me = {
  id: 2,
  name: "Rina Das",
  username: "rina",
  has_manager: true,
  is_manager: false,
};

export const managerMe: Me = {
  id: 1,
  name: "Maya Rahman",
  username: "maya",
  has_manager: false,
  is_manager: true,
};

type Options = {
  route?: string;
  me?: Me | null;
  auth?: Partial<AuthValue>;
};

export function renderWithProviders(ui: ReactElement, { route = "/", me, auth }: Options = {}) {
  const authValue: AuthValue = {
    me: me === undefined ? employeeMe : me,
    loading: false,
    login: vi.fn(),
    logout: vi.fn().mockResolvedValue(undefined),
    ...auth,
  };
  return render(
    <MantineProvider theme={theme}>
      <Notifications />
      <AuthContext.Provider value={authValue}>
        <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
      </AuthContext.Provider>
    </MantineProvider>,
  );
}

type MockRoute = { method?: string; path: string | RegExp; status?: number; body?: unknown };

/** Mock fetch with a list of routes; the first matching route wins. */
export function mockApi(routes: MockRoute[]) {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = typeof input === "string" ? input : (input as Request).url;
    const method = (init?.method ?? "GET").toUpperCase();
    const route = routes.find(
      (r) =>
        (r.method ?? "GET").toUpperCase() === method &&
        (typeof r.path === "string" ? url === `/api${r.path}` : r.path.test(url)),
    );
    if (!route) {
      return new Response(JSON.stringify({ detail: `Unmocked ${method} ${url}` }), { status: 500 });
    }
    const status = route.status ?? 200;
    return new Response(status === 204 ? null : JSON.stringify(route.body ?? {}), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  });
}

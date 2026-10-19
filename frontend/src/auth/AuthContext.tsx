import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { apiFetch } from "../api/client";
import type { Me } from "../api/types";

export type AuthValue = {
  me: Me | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<Me>;
  logout: () => Promise<void>;
};

export const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        await apiFetch("/auth/csrf");
        const current = await apiFetch<Me>("/auth/me");
        if (active) setMe(current);
      } catch {
        if (active) setMe(null);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const current = await apiFetch<Me>("/auth/login", {
      method: "POST",
      body: { username, password },
    });
    setMe(current);
    return current;
  }, []);

  const logout = useCallback(async () => {
    await apiFetch("/auth/logout", { method: "POST" });
    setMe(null);
    // Django rotates the CSRF token on login and logout, so fetch a fresh one.
    await apiFetch("/auth/csrf").catch(() => undefined);
  }, []);

  return (
    <AuthContext.Provider value={{ me, loading, login, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}

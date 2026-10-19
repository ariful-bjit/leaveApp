import { devProxy } from "./devProxy";

// Regression: with changeOrigin, Vite rewrote Host to the backend address while the browser sent
// Origin http://localhost:5173, so Django's CSRF origin check rejected every sign-in.
describe("dev proxy", () => {
  it.each(["/api", "/admin"] as const)(
    "forwards %s to Django keeping the browser's Host header",
    (path) => {
      expect(devProxy[path].target).toBe("http://127.0.0.1:8000");
      expect(devProxy[path].changeOrigin).toBe(false);
    },
  );
});

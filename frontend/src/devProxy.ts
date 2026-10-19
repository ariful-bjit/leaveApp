// Dev-server proxy to Django, used by vite.config.ts.
//
// changeOrigin must stay false: Django's CSRF check compares the browser's Origin
// (http://localhost:5173) with the request Host. Rewriting Host to the backend's
// address makes every sign-in fail with "Origin checking failed".
const backend = { target: "http://127.0.0.1:8000", changeOrigin: false };

export const devProxy = {
  "/api": backend,
  "/admin": backend,
  "/static/admin": backend,
};

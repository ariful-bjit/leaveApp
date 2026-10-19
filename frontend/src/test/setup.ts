import "@testing-library/jest-dom/vitest";
import { notifications } from "@mantine/notifications";
import { cleanup } from "@testing-library/react";
import { afterEach, expect, vi } from "vitest";
import * as axeMatchers from "vitest-axe/matchers";

// vitest-axe's extend-expect entry targets an older Vitest; register its matcher directly.
expect.extend(axeMatchers);

afterEach(() => {
  cleanup();
  // Mantine keeps notifications in a module-level store; don't leak them between tests.
  notifications.clean();
  vi.restoreAllMocks();
  document.cookie = "csrftoken=; expires=Thu, 01 Jan 1970 00:00:00 GMT";
});

// Mantine relies on these browser APIs, which jsdom does not provide.
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;

window.HTMLElement.prototype.scrollIntoView = () => {};

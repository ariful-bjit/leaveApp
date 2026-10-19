import { createTheme } from "@mantine/core";

export const theme = createTheme({
  primaryColor: "indigo",
  defaultRadius: "md",
  fontFamily:
    "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  headings: {
    fontWeight: "600",
    sizes: {
      h1: { fontSize: "1.75rem" },
      h2: { fontSize: "1.375rem" },
      h3: { fontSize: "1.125rem" },
    },
  },
});

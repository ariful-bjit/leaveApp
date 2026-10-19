import { screen } from "@testing-library/react";
import type { Status } from "../api/types";
import { renderWithProviders } from "../test/render";
import { STATUS_STYLE, StatusBadge } from "./StatusBadge";

describe("StatusBadge", () => {
  it.each<[Status, string, string]>([
    ["PENDING", "Pending", "yellow"],
    ["APPROVED", "Approved", "green"],
    ["REJECTED", "Rejected", "red"],
    ["CANCELLED", "Cancelled", "gray"],
  ])("renders %s as %s in %s", (status, label, color) => {
    renderWithProviders(<StatusBadge status={status} />);
    expect(screen.getByText(label)).toBeInTheDocument();
    expect(STATUS_STYLE[status]).toEqual({ label, color });
  });
});

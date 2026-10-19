import { screen } from "@testing-library/react";
import type { Balance } from "../api/types";
import { renderWithProviders } from "../test/render";
import { BalanceCards } from "./BalanceCards";

const balance: Balance = {
  year: 2026,
  allowance: "20.0",
  used: "5.5",
  pending: "3.0",
  remaining: "14.5",
  available: "11.5",
};

describe("BalanceCards", () => {
  it.each([
    ["Allowance", "20"],
    ["Used", "5.5"],
    ["Pending", "3"],
    ["Remaining", "14.5"],
  ])("shows %s as %s", (label, value) => {
    renderWithProviders(<BalanceCards balance={balance} />);
    const card = screen.getByRole("group", { name: label });
    expect(card).toHaveTextContent(value);
  });
});

import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../test/render";
import { EmptyState, ErrorState, LoadingState } from "./States";

describe("States", () => {
  it("LoadingState announces loading", () => {
    renderWithProviders(<LoadingState />);
    expect(screen.getByRole("status")).toHaveAccessibleName(/loading/i);
  });

  it("EmptyState shows title, message and action", () => {
    renderWithProviders(
      <EmptyState title="No requests yet" message="Your requests will appear here." action={<button>Go</button>} />,
    );
    expect(screen.getByText("No requests yet")).toBeInTheDocument();
    expect(screen.getByText("Your requests will appear here.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Go" })).toBeInTheDocument();
  });

  it("ErrorState shows message and retries", async () => {
    const onRetry = vi.fn();
    renderWithProviders(<ErrorState message="Server unavailable" onRetry={onRetry} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Server unavailable");
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});

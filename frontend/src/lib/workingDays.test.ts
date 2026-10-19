import { countWorkingDays, requestDays } from "./workingDays";

describe("countWorkingDays", () => {
  it("counts Monday to Friday as 5", () => {
    expect(countWorkingDays("2026-11-02", "2026-11-06")).toBe(5);
  });

  it("skips weekends", () => {
    expect(countWorkingDays("2026-11-06", "2026-11-09")).toBe(2);
  });

  it("returns 0 for a weekend-only range", () => {
    expect(countWorkingDays("2026-11-07", "2026-11-08")).toBe(0);
  });

  it("returns 0 when end is before start", () => {
    expect(countWorkingDays("2026-11-06", "2026-11-02")).toBe(0);
  });
});

describe("requestDays", () => {
  it("is 0.5 for a half day on a weekday", () => {
    expect(requestDays("HALF_DAY", "2026-11-03", "2026-11-03")).toBe(0.5);
  });

  it("is 0 for a half day on a weekend", () => {
    expect(requestDays("HALF_DAY", "2026-11-07", "2026-11-07")).toBe(0);
  });

  it("counts working days for a full-day range", () => {
    expect(requestDays("FULL_DAY", "2026-11-02", "2026-11-04")).toBe(3);
  });

  it("is 0 when dates are missing", () => {
    expect(requestDays("FULL_DAY", "", "")).toBe(0);
  });
});

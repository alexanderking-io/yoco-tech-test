import { formatDate, formatTime } from "../../src/utils/date";

describe("formatDate", () => {
  it("formats a date as dd-mm-yyyy", () => {
    expect(formatDate("2026-04-07T14:30:00Z")).toBe("07-04-2026");
  });

  it("pads single-digit day and month", () => {
    expect(formatDate("2026-01-03T00:00:00Z")).toBe("03-01-2026");
  });

  it("formats end of year", () => {
    expect(formatDate("2025-12-15T12:00:00Z")).toBe("15-12-2025");
  });
});

describe("formatTime", () => {
  it("formats time as HH:MM", () => {
    const result = formatTime("2026-04-07T14:30:00Z");
    // Local timezone may shift the hour, so just verify HH:MM format
    expect(result).toMatch(/^\d{2}:\d{2}$/);
  });

  it("formats midnight", () => {
    const result = formatTime("2026-04-07T00:00:00Z");
    expect(result).toMatch(/^\d{2}:\d{2}$/);
  });
});

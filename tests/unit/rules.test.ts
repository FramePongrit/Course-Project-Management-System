import { describe, it, expect } from "vitest";
import { isFutureDeadline, isBeforeCutoff, isSubmissionFrozen } from "../../src/services/rules";
import { FixedClock } from "../../src/lib/clock";

describe("Domain Business Rules Unit Tests (BR-01, BR-03, BR-20)", () => {
  const clock = new FixedClock("2026-11-15T12:00:00.000Z");

  it("TEST-04-02 (Unit): BR-03 strictly future deadline validation", () => {
    // Past deadline
    expect(isFutureDeadline("2026-11-14T12:00:00.000Z", clock.now())).toBe(false);
    // Exact same time (now)
    expect(isFutureDeadline("2026-11-15T12:00:00.000Z", clock.now())).toBe(false);
    // Future deadline
    expect(isFutureDeadline("2026-11-15T12:00:01.000Z", clock.now())).toBe(true);
  });

  it("TEST-05-03 (Unit): BR-01 submission cutoff rejects when now >= deadline", () => {
    const deadline = "2026-11-15T12:00:00.000Z";
    // Before deadline
    expect(isBeforeCutoff(deadline, new Date("2026-11-15T11:59:59.000Z"))).toBe(true);
    // Exact deadline -> cutoff passed
    expect(isBeforeCutoff(deadline, new Date("2026-11-15T12:00:00.000Z"))).toBe(false);
    // After deadline -> cutoff passed
    expect(isBeforeCutoff(deadline, new Date("2026-11-15T12:00:01.000Z"))).toBe(false);
  });

  it("TEST-05-11 (Unit): BR-20 freezes submission once feedback exists", () => {
    expect(isSubmissionFrozen(false)).toBe(false);
    expect(isSubmissionFrozen(true)).toBe(true);
  });
});


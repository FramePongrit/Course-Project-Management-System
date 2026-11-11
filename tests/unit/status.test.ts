import { describe, it, expect } from "vitest";
import { deriveStatus } from "../../src/services/status";
import { FixedClock } from "../../src/lib/clock";

describe("F-07: Milestone Status Derivation (BR-16, BR-19)", () => {
  const deadline = new Date("2026-11-15T12:00:00.000Z");

  // TEST-07-01
  it("TEST-07-01: returns Open when no submission and now < deadline (AC-07-01)", () => {
    const clock = new FixedClock("2026-11-10T12:00:00.000Z");
    const status = deriveStatus(
      { hasSubmission: false, hasFeedback: false, deadline },
      clock.now()
    );
    expect(status).toBe("Open");
  });

  // TEST-07-02
  it("TEST-07-02: returns Submitted when submission exists, no feedback, now < deadline (AC-07-02)", () => {
    const clock = new FixedClock("2026-11-10T12:00:00.000Z");
    const status = deriveStatus(
      { hasSubmission: true, hasFeedback: false, deadline },
      clock.now()
    );
    expect(status).toBe("Submitted");
  });

  // TEST-07-03
  it("TEST-07-03: returns Awaiting Feedback when submission exists, no feedback, now >= deadline (AC-07-03)", () => {
    const clock = new FixedClock("2026-11-15T12:00:00.000Z"); // exact deadline
    const status1 = deriveStatus(
      { hasSubmission: true, hasFeedback: false, deadline },
      clock.now()
    );
    expect(status1).toBe("Awaiting Feedback");

    const clockPast = new FixedClock("2026-11-16T12:00:00.000Z"); // past deadline
    const status2 = deriveStatus(
      { hasSubmission: true, hasFeedback: false, deadline },
      clockPast.now()
    );
    expect(status2).toBe("Awaiting Feedback");
  });

  // TEST-07-04
  it("TEST-07-04: returns Completed whenever feedback exists, before or after deadline (AC-07-04)", () => {
    const clockBefore = new FixedClock("2026-11-10T12:00:00.000Z");
    const statusBefore = deriveStatus(
      { hasSubmission: true, hasFeedback: true, deadline },
      clockBefore.now()
    );
    expect(statusBefore).toBe("Completed");

    const clockAfter = new FixedClock("2026-11-20T12:00:00.000Z");
    const statusAfter = deriveStatus(
      { hasSubmission: true, hasFeedback: true, deadline },
      clockAfter.now()
    );
    expect(statusAfter).toBe("Completed");
  });

  // TEST-07-05
  it("TEST-07-05: returns Missed when no submission and now >= deadline (AC-07-05)", () => {
    const clock = new FixedClock("2026-11-15T12:00:00.000Z");
    const status = deriveStatus(
      { hasSubmission: false, hasFeedback: false, deadline },
      clock.now()
    );
    expect(status).toBe("Missed");
  });

  // TEST-07-07
  it("TEST-07-07: status transitions correctly when clock is advanced across deadline (AC-07-07)", () => {
    const clock = new FixedClock("2026-11-15T11:59:59.000Z");

    // Initially before deadline
    expect(
      deriveStatus(
        { hasSubmission: false, hasFeedback: false, deadline },
        clock.now()
      )
    ).toBe("Open");

    expect(
      deriveStatus(
        { hasSubmission: true, hasFeedback: false, deadline },
        clock.now()
      )
    ).toBe("Submitted");

    // Advance clock past deadline by 2 seconds
    clock.advanceBy(2000);

    expect(
      deriveStatus(
        { hasSubmission: false, hasFeedback: false, deadline },
        clock.now()
      )
    ).toBe("Missed");

    expect(
      deriveStatus(
        { hasSubmission: true, hasFeedback: false, deadline },
        clock.now()
      )
    ).toBe("Awaiting Feedback");
  });
});


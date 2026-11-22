import { describe, it, expect } from "vitest";

// Lab 5 C-02 demo (Issue #12): this test fails ON PURPOSE to show that a failing
// required check (test-and-docker) blocks the merge into main. This branch is never merged.
describe("C-02 required-check demo", () => {
  it("fails on purpose so the PR cannot be merged", () => {
    expect(1 + 1).toBe(3);
  });
});

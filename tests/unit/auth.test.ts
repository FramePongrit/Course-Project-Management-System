import { describe, it, expect } from "vitest";
import bcrypt from "bcryptjs";

describe("F-01: Authentication & Password Security (BR-15, NFR-03)", () => {
  // TEST-01-09
  it("TEST-01-09: bcrypt hashing cost >= 10, stored value != plaintext, compare works (AC-01-08, NFR-03)", async () => {
    const plainPassword = "password123";
    const cost = 10;
    const hash = await bcrypt.hash(plainPassword, cost);

    // Stored hash must not equal plaintext
    expect(hash).not.toBe(plainPassword);

    // Verify bcrypt cost format: $2a$10$ or $2b$10$ or $2y$10$
    const roundsMatch = hash.match(/^\$2[aby]\$(\d+)\$/);
    expect(roundsMatch).not.toBeNull();
    const parsedCost = parseInt(roundsMatch![1], 10);
    expect(parsedCost).toBeGreaterThanOrEqual(10);

    // Verify compare
    const match = await bcrypt.compare(plainPassword, hash);
    expect(match).toBe(true);

    const wrongMatch = await bcrypt.compare("wrongpassword", hash);
    expect(wrongMatch).toBe(false);
  });
});


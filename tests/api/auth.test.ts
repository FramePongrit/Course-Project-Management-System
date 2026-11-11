import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { PrismaClient, Role, UserStatus } from "@prisma/client";
import { createApp } from "../../src/app";

describe("F-01 Authentication & F-02 Authorization API Tests", () => {
  const prisma = new PrismaClient();
  const app = createApp({ prisma });

  // TEST-01-01
  it("TEST-01-01: seeded ACTIVE student logs in with correct credentials -> 200 + cookie (AC-01-01)", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "alice@student.university.ac.th", password: "password123" });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("id");
    expect(res.body.email).toBe("alice@student.university.ac.th");
    expect(res.body.role).toBe(Role.STUDENT);

    // Assert Set-Cookie session
    const cookies = res.headers["set-cookie"];
    expect(cookies).toBeDefined();
    const sessionCookie = (cookies as unknown as string[]).find((c) => c.startsWith("session="));
    expect(sessionCookie).toBeDefined();
    expect(sessionCookie).toContain("HttpOnly");
  });

  // TEST-01-02
  it("TEST-01-02: login with wrong password -> 401 generic, no cookie (AC-01-02)", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "alice@student.university.ac.th", password: "wrongpassword" });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
    expect(res.body.error.message).toBe("Invalid email or password");
    expect(res.headers["set-cookie"]).toBeUndefined();
  });

  // TEST-01-03
  it("TEST-01-03: login with unknown email -> 401 generic (AC-01-03)", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "nonexistent@university.ac.th", password: "password123" });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
    expect(res.body.error.message).toBe("Invalid email or password");
  });

  // TEST-01-04
  it("TEST-01-04: GET /api/me with valid session cookie returns current user (AC-01-04)", async () => {
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "alice@student.university.ac.th", password: "password123" });

    const cookie = loginRes.headers["set-cookie"];

    const meRes = await request(app)
      .get("/api/me")
      .set("Cookie", cookie);

    expect(meRes.status).toBe(200);
    expect(meRes.body.email).toBe("alice@student.university.ac.th");
    expect(meRes.body.role).toBe("STUDENT");
    expect(meRes.body).toHaveProperty("teamId");
    expect(meRes.body).toHaveProperty("projectId");
  });

  // TEST-01-05
  it("TEST-01-05: GET /api/me without cookie returns 401 (AC-01-05, NFR-01)", async () => {
    const res = await request(app).get("/api/me");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
    expect(res.body.email).toBeUndefined();
  });

  // TEST-01-06
  it("TEST-01-06: logout clears session cookie, subsequent protected call returns 401 (AC-01-06)", async () => {
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "alice@student.university.ac.th", password: "password123" });

    const cookie = loginRes.headers["set-cookie"];

    const logoutRes = await request(app)
      .post("/api/auth/logout")
      .set("Cookie", cookie);

    expect(logoutRes.status).toBe(204);

    // Cleared cookie max-age/expires
    const clearedCookie = (logoutRes.headers["set-cookie"] as unknown as string[]).find((c) =>
      c.startsWith("session=;")
    );
    expect(clearedCookie).toBeDefined();

    // Call protected endpoint using cleared cookie
    const meRes = await request(app)
      .get("/api/me")
      .set("Cookie", clearedCookie!);

    expect(meRes.status).toBe(401);
  });

  // TEST-01-07
  it("TEST-01-07: seeded INVITED account cannot log in -> 401 (AC-01-07, BR-15)", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "dave@student.university.ac.th", password: "password123" });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  // TEST-01-08
  it("TEST-01-08: creating second account with duplicate email rejected by DB constraint (AC-01-09, BR-14)", async () => {
    await expect(
      prisma.user.create({
        data: {
          email: "alice@student.university.ac.th",
          name: "Duplicate Alice",
          role: Role.STUDENT,
          status: UserStatus.ACTIVE,
        },
      })
    ).rejects.toThrow();
  });

  // TEST-02-01
  it("TEST-02-01: unauthenticated requests to protected endpoints return 401 without domain data (AC-02-01, NFR-01)", async () => {
    const p1 = await request(app).get("/api/projects");
    expect(p1.status).toBe(401);
    expect(p1.body.projects).toBeUndefined();

    const p2 = await request(app).get("/api/milestones/some-id");
    expect(p2.status).toBe(401);
    expect(p2.body.milestone).toBeUndefined();
  });
});


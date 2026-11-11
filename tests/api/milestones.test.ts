import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { PrismaClient } from "@prisma/client";
import { createApp } from "../../src/app";
import { FixedClock } from "../../src/lib/clock";

describe("F-04 Milestone Creation API Tests (BR-03, BR-04, BR-08)", () => {
  const prisma = new PrismaClient();
  const fixedClock = new FixedClock("2026-11-08T12:00:00.000Z");
  const app = createApp({ prisma, clock: fixedClock });

  let supervisorCookie: string;
  let supervisor2Cookie: string;
  let studentCookie: string;
  let project1Id: string;
  let project2Id: string;

  beforeAll(async () => {
    // Login supervisor 1 (assigned to project 1)
    const supRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "prof.somchai@university.ac.th", password: "password123" });
    supervisorCookie = supRes.headers["set-cookie"][0];

    // Login supervisor 2 (assigned to project 2)
    const sup2Res = await request(app)
      .post("/api/auth/login")
      .send({ email: "dr.ann@university.ac.th", password: "password123" });
    supervisor2Cookie = sup2Res.headers["set-cookie"][0];

    // Login student (Alice, member of Team Alpha / project 1)
    const stuRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "alice@student.university.ac.th", password: "password123" });
    studentCookie = stuRes.headers["set-cookie"][0];

    // Get project IDs
    const p1 = await prisma.project.findFirst({ where: { name: "Course Project Management System" } });
    project1Id = p1!.id;

    const p2 = await prisma.project.findFirst({ where: { name: "Smart Campus Transit" } });
    project2Id = p2!.id;
  });

  // TEST-04-01
  it("TEST-04-01: assigned supervisor posts a valid milestone with future deadline -> 201; GET returns it (AC-04-01)", async () => {
    const uniqueName = `Milestone Test ${Date.now()}`;
    const futureDeadline = "2026-11-20T12:00:00.000Z";

    const res = await request(app)
      .post(`/api/projects/${project1Id}/milestones`)
      .set("Cookie", supervisorCookie)
      .send({
        name: uniqueName,
        description: "Integration testing milestone creation",
        deadline: futureDeadline,
      });

    expect(res.status).toBe(201);
    expect(res.body.milestone).toBeDefined();
    expect(res.body.milestone.name).toBe(uniqueName);
    expect(res.body.milestone.deadline).toBe(futureDeadline);

    // Verify GET retrieves it
    const getRes = await request(app)
      .get(`/api/milestones/${res.body.milestone.id}`)
      .set("Cookie", supervisorCookie);

    expect(getRes.status).toBe(200);
    expect(getRes.body.milestone.name).toBe(uniqueName);
  });

  // TEST-04-02
  it("TEST-04-02: creating milestone with past/now deadline rejected -> 422 VALIDATION (AC-04-02, BR-03)", async () => {
    const pastDeadline = "2026-11-07T12:00:00.000Z"; // Before fixedClock 2026-11-08

    const res = await request(app)
      .post(`/api/projects/${project1Id}/milestones`)
      .set("Cookie", supervisorCookie)
      .send({
        name: `Past Milestone ${Date.now()}`,
        description: "Should fail",
        deadline: pastDeadline,
      });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("VALIDATION");
  });

  // TEST-04-03
  it("TEST-04-03: duplicate milestone name within same project rejected -> 409 CONFLICT (AC-04-03, BR-04)", async () => {
    const duplicateName = `Duplicate Name ${Date.now()}`;
    const futureDeadline = "2026-11-25T12:00:00.000Z";

    const first = await request(app)
      .post(`/api/projects/${project1Id}/milestones`)
      .set("Cookie", supervisorCookie)
      .send({
        name: duplicateName,
        description: "First creation",
        deadline: futureDeadline,
      });
    expect(first.status).toBe(201);

    const second = await request(app)
      .post(`/api/projects/${project1Id}/milestones`)
      .set("Cookie", supervisorCookie)
      .send({
        name: duplicateName,
        description: "Duplicate creation attempt",
        deadline: futureDeadline,
      });
    expect(second.status).toBe(409);
    expect(second.body.error.code).toBe("CONFLICT");
  });

  // TEST-04-04
  it("TEST-04-04: student attempts to create milestone -> 403 FORBIDDEN (AC-04-04)", async () => {
    const res = await request(app)
      .post(`/api/projects/${project1Id}/milestones`)
      .set("Cookie", studentCookie)
      .send({
        name: "Student Attempt",
        description: "Should be forbidden",
        deadline: "2026-11-25T12:00:00.000Z",
      });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  // TEST-04-05
  it("TEST-04-05: supervisor creates milestone for non-assigned project -> 404 NOT_FOUND (AC-04-05)", async () => {
    // Supervisor 2 is NOT assigned to Project 1
    const res = await request(app)
      .post(`/api/projects/${project1Id}/milestones`)
      .set("Cookie", supervisor2Cookie)
      .send({
        name: "Unauthorized Milestone",
        description: "Should return 404 to prevent leaking existence",
        deadline: "2026-11-25T12:00:00.000Z",
      });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });

  // TEST-04-06
  it("TEST-04-06: no mutation endpoint mutates/deletes a milestone in Sprint 1 -> 404 (AC-04-06, BR-08)", async () => {
    const res1 = await request(app)
      .patch(`/api/milestones/any-id`)
      .set("Cookie", supervisorCookie);
    expect([404, 405]).toContain(res1.status);

    const res2 = await request(app)
      .delete(`/api/milestones/any-id`)
      .set("Cookie", supervisorCookie);
    expect([404, 405]).toContain(res2.status);
  });
});


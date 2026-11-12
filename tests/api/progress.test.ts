import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { PrismaClient } from "@prisma/client";
import { createApp } from "../../src/app";
import { FixedClock } from "../../src/lib/clock";

describe("F-08 Project Progress API Tests (FR-21, FR-10, EX-05)", () => {
  const prisma = new PrismaClient();
  const fixedClock = new FixedClock("2026-11-08T12:00:00.000Z");
  const app = createApp({ prisma, clock: fixedClock });

  let aliceCookie: string;
  let charlieCookie: string;
  let supervisor1Cookie: string;
  let supervisor2Cookie: string;
  let project1Id: string;
  let project2Id: string;

  beforeAll(async () => {
    // Alice (Team Alpha / Project 1)
    const aRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "alice@student.university.ac.th", password: "password123" });
    aliceCookie = aRes.headers["set-cookie"][0];

    // Charlie (Team Beta / Project 2)
    const cRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "charlie@student.university.ac.th", password: "password123" });
    charlieCookie = cRes.headers["set-cookie"][0];

    // Supervisor 1 (Prof. Somchai - Team Alpha)
    const s1Res = await request(app)
      .post("/api/auth/login")
      .send({ email: "prof.somchai@university.ac.th", password: "password123" });
    supervisor1Cookie = s1Res.headers["set-cookie"][0];

    // Supervisor 2 (Dr. Ann - Team Beta)
    const s2Res = await request(app)
      .post("/api/auth/login")
      .send({ email: "dr.ann@university.ac.th", password: "password123" });
    supervisor2Cookie = s2Res.headers["set-cookie"][0];

    const p1 = await prisma.project.findFirst({
      where: { name: "Course Project Management System" },
    });
    project1Id = p1!.id;

    const p2 = await prisma.project.findFirst({
      where: { name: "Smart Campus Transit" },
    });
    project2Id = p2!.id;
  });

  // TEST-08-01
  it("TEST-08-01: student views own project progress with correct derived statuses (AC-08-01)", async () => {
    const res = await request(app)
      .get(`/api/projects/${project1Id}/progress`)
      .set("Cookie", aliceCookie);

    expect(res.status).toBe(200);
    expect(res.body.project).toBeDefined();
    expect(res.body.project.id).toBe(project1Id);
    expect(res.body.milestones).toBeInstanceOf(Array);
    expect(res.body.milestones.length).toBeGreaterThan(0);

    // Check statuses in seeded milestones
    const statuses = res.body.milestones.map((m: any) => m.status);
    expect(statuses).toContain("Missed"); // Sprint 0 Proposal
    expect(statuses).toContain("Completed"); // Sprint 1 Working Increment
  });

  // TEST-08-02
  it("TEST-08-02: assigned supervisor views same progress data (AC-08-02)", async () => {
    const res = await request(app)
      .get(`/api/projects/${project1Id}/progress`)
      .set("Cookie", supervisor1Cookie);

    expect(res.status).toBe(200);
    expect(res.body.project.id).toBe(project1Id);
    expect(res.body.milestones.length).toBeGreaterThan(0);
  });

  // TEST-08-03
  it("TEST-08-03: progress response contains NO numeric percentage, score, or weight (AC-08-03, EX-05)", async () => {
    const res = await request(app)
      .get(`/api/projects/${project1Id}/progress`)
      .set("Cookie", aliceCookie);

    expect(res.status).toBe(200);
    const bodyStr = JSON.stringify(res.body);

    expect(bodyStr).not.toContain('"percentage"');
    expect(bodyStr).not.toContain('"score"');
    expect(bodyStr).not.toContain('"weight"');
    expect(bodyStr).not.toContain('"grade"');
  });

  // TEST-08-04 & TEST-02-02 & TEST-02-04
  it("TEST-08-04: student of other team or unassigned supervisor gets 404 (AC-08-04, AC-02-02, AC-02-04)", async () => {
    // Charlie (Team Beta) requests Project 1
    const resStudent = await request(app)
      .get(`/api/projects/${project1Id}/progress`)
      .set("Cookie", charlieCookie);
    expect(resStudent.status).toBe(404);
    expect(resStudent.body.error.code).toBe("NOT_FOUND");

    // Supervisor 2 (assigned to Project 2) requests Project 1
    const resSup = await request(app)
      .get(`/api/projects/${project1Id}/progress`)
      .set("Cookie", supervisor2Cookie);
    expect(resSup.status).toBe(404);
    expect(resSup.body.error.code).toBe("NOT_FOUND");
  });

  it("TEST-FR-10: GET /api/projects returns role-scoped list", async () => {
    // Student Alice sees only Project 1
    const resAlice = await request(app)
      .get("/api/projects")
      .set("Cookie", aliceCookie);
    expect(resAlice.status).toBe(200);
    expect(resAlice.body.projects.length).toBe(1);
    expect(resAlice.body.projects[0].id).toBe(project1Id);

    // Supervisor 1 sees only Project 1
    const resSup1 = await request(app)
      .get("/api/projects")
      .set("Cookie", supervisor1Cookie);
    expect(resSup1.status).toBe(200);
    expect(resSup1.body.projects.length).toBe(1);
    expect(resSup1.body.projects[0].id).toBe(project1Id);
  });
});


import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { PrismaClient } from "@prisma/client";
import { createApp } from "../../src/app";
import { FixedClock } from "../../src/lib/clock";

describe("F-05 Submission API Tests (BR-01, BR-02, BR-07, BR-20, NFR-08, NFR-10)", () => {
  const prisma = new PrismaClient();
  const fixedClock = new FixedClock("2026-11-08T12:00:00.000Z");
  const app = createApp({ prisma, clock: fixedClock });

  let aliceCookie: string;
  let bobCookie: string;
  let charlieCookie: string;
  let supervisorCookie: string;
  let testMilestoneId: string;
  let pastMilestoneId: string;
  let completedMilestoneId: string;

  beforeAll(async () => {
    // Alice & Bob belong to Team Alpha
    const aliceRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "alice@student.university.ac.th", password: "password123" });
    aliceCookie = aliceRes.headers["set-cookie"][0];

    const bobRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "bob@student.university.ac.th", password: "password123" });
    bobCookie = bobRes.headers["set-cookie"][0];

    // Charlie belongs to Team Beta
    const charlieRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "charlie@student.university.ac.th", password: "password123" });
    charlieCookie = charlieRes.headers["set-cookie"][0];

    // Supervisor Prof. Somchai
    const supRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "prof.somchai@university.ac.th", password: "password123" });
    supervisorCookie = supRes.headers["set-cookie"][0];

    // Create fresh milestone for testing submission
    const project1 = await prisma.project.findFirst({
      where: { name: "Course Project Management System" },
    });

    const m = await prisma.milestone.create({
      data: {
        projectId: project1!.id,
        name: `Submission Test MS ${Date.now()}`,
        description: "Testing submissions",
        deadline: new Date("2026-11-20T12:00:00.000Z"),
        createdById: (await prisma.user.findFirst({ where: { email: "prof.somchai@university.ac.th" } }))!.id,
      },
    });
    testMilestoneId = m.id;

    // Past deadline milestone (Sprint 0 Proposal from seed)
    const mPast = await prisma.milestone.findFirst({
      where: { name: "Sprint 0 Proposal", projectId: project1!.id },
    });
    pastMilestoneId = mPast!.id;

    // Milestone with Feedback already recorded (Sprint 1 Working Increment from seed)
    const mCompleted = await prisma.milestone.findFirst({
      where: { name: "Sprint 1 Working Increment", projectId: project1!.id },
    });
    completedMilestoneId = mCompleted!.id;
  });

  // TEST-05-01
  it("TEST-05-01: team member submits valid data before deadline -> 200, row created, first audit set (AC-05-01, NFR-10)", async () => {
    const res = await request(app)
      .put(`/api/milestones/${testMilestoneId}/submission`)
      .set("Cookie", aliceCookie)
      .send({
        title: "Initial Submission Title",
        description: "Our team deliverable report",
        link: "https://github.com/example/repo/pull/1",
      });

    expect(res.status).toBe(200);
    expect(res.body.submission).toBeDefined();
    expect(res.body.submission.title).toBe("Initial Submission Title");
    expect(res.body.submission.firstSubmittedById).toBeDefined();
    expect(res.body.submission.firstSubmittedAt).toBeDefined();
    expect(res.body.submission.lastUpdatedById).toBe(res.body.submission.firstSubmittedById);
  });

  // TEST-05-02
  it("TEST-05-02: another team member overwrites before deadline -> 200, same row updated, first audit stable (AC-05-02)", async () => {
    // Advance clock by 1 hour
    fixedClock.advanceBy(3600 * 1000);

    const initialSub = await prisma.submission.findFirst({
      where: { milestoneId: testMilestoneId },
    });

    const res = await request(app)
      .put(`/api/milestones/${testMilestoneId}/submission`)
      .set("Cookie", bobCookie)
      .send({
        title: "Updated Submission Title by Bob",
        description: "Refined report",
        link: "https://github.com/example/repo/pull/2",
      });

    expect(res.status).toBe(200);
    expect(res.body.submission.title).toBe("Updated Submission Title by Bob");
    expect(res.body.submission.firstSubmittedById).toBe(initialSub!.firstSubmittedById);
    expect(new Date(res.body.submission.firstSubmittedAt).getTime()).toBe(
      new Date(initialSub!.firstSubmittedAt).getTime()
    );
    expect(res.body.submission.lastUpdatedById).not.toBe(initialSub!.firstSubmittedById);

    // Assert only one row exists in DB
    const count = await prisma.submission.count({
      where: { milestoneId: testMilestoneId },
    });
    expect(count).toBe(1);
  });

  // TEST-05-03
  it("TEST-05-03: submitting when clock past deadline -> 422 CUTOFF_PASSED (AC-05-03, BR-01)", async () => {
    const res = await request(app)
      .put(`/api/milestones/${pastMilestoneId}/submission`)
      .set("Cookie", aliceCookie)
      .send({
        title: "Late Submission",
        description: "Late submit attempt",
        link: "https://github.com/example/repo/pull/99",
      });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("CUTOFF_PASSED");
  });

  // TEST-05-04
  it("TEST-05-04: empty title or invalid non-http link rejected -> 422 (AC-05-04, NFR-08)", async () => {
    const res1 = await request(app)
      .put(`/api/milestones/${testMilestoneId}/submission`)
      .set("Cookie", aliceCookie)
      .send({
        title: "",
        description: "Empty title",
        link: "https://valid.com",
      });
    expect(res1.status).toBe(422);

    const res2 = await request(app)
      .put(`/api/milestones/${testMilestoneId}/submission`)
      .set("Cookie", aliceCookie)
      .send({
        title: "Valid Title",
        description: "Bad link",
        link: "not-a-valid-url",
      });
    expect(res2.status).toBe(422);
  });

  // TEST-05-05
  it("TEST-05-05: concurrent first-submits -> both succeed (200) and one row guaranteed (AC-05-05, BR-02)", async () => {
    const project1 = await prisma.project.findFirst({
      where: { name: "Course Project Management System" },
    });
    const concurrentMs = await prisma.milestone.create({
      data: {
        projectId: project1!.id,
        name: `Concurrent Test MS ${Date.now()}`,
        description: "Testing concurrent submits",
        deadline: new Date("2026-11-25T12:00:00.000Z"),
        createdById: (await prisma.user.findFirst({ where: { email: "prof.somchai@university.ac.th" } }))!.id,
      },
    });

    const p1 = request(app)
      .put(`/api/milestones/${concurrentMs.id}/submission`)
      .set("Cookie", aliceCookie)
      .send({
        title: "Alice Submission",
        description: "A description",
        link: "https://github.com/alice",
      });

    const p2 = request(app)
      .put(`/api/milestones/${concurrentMs.id}/submission`)
      .set("Cookie", bobCookie)
      .send({
        title: "Bob Submission",
        description: "B description",
        link: "https://github.com/bob",
      });

    const [res1, res2] = await Promise.all([p1, p2]);
    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);

    const count = await prisma.submission.count({
      where: { milestoneId: concurrentMs.id },
    });
    expect(count).toBe(1);
  });

  // TEST-05-06
  it("TEST-05-06: student of another team cannot submit -> 404 (AC-05-06)", async () => {
    // Charlie is in Team Beta, testMilestoneId belongs to Team Alpha
    const res = await request(app)
      .put(`/api/milestones/${testMilestoneId}/submission`)
      .set("Cookie", charlieCookie)
      .send({
        title: "Charlie Intrusion",
        description: "Intruder",
        link: "https://github.com/intruder",
      });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });

  // TEST-05-07
  it("TEST-05-07: supervisor attempts to submit -> 403 FORBIDDEN (AC-05-07)", async () => {
    const res = await request(app)
      .put(`/api/milestones/${testMilestoneId}/submission`)
      .set("Cookie", supervisorCookie)
      .send({
        title: "Supervisor Submit",
        description: "Forbidden",
        link: "https://github.com/supervisor",
      });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  // TEST-05-08
  it("TEST-05-08: any delete attempt on submission is rejected -> route absent 404/405 (AC-05-08, BR-07)", async () => {
    const res = await request(app)
      .delete(`/api/milestones/${testMilestoneId}/submission`)
      .set("Cookie", aliceCookie);

    expect([404, 405]).toContain(res.status);
  });

  // TEST-05-09
  it("TEST-05-09: GET milestone submission retrieves persisted current submission (AC-05-09)", async () => {
    const res = await request(app)
      .get(`/api/milestones/${testMilestoneId}/submission`)
      .set("Cookie", aliceCookie);

    expect(res.status).toBe(200);
    expect(res.body.submission).toBeDefined();
    expect(res.body.submission.title).toBe("Updated Submission Title by Bob");
  });

  // TEST-05-10
  it("TEST-05-10: persistence survives reconnect / new app instance (NFR-04)", async () => {
    // Re-instantiate app with fresh connection
    const newPrisma = new PrismaClient();
    const newApp = createApp({ prisma: newPrisma });

    const res = await request(newApp)
      .get(`/api/milestones/${testMilestoneId}/submission`)
      .set("Cookie", aliceCookie);

    expect(res.status).toBe(200);
    expect(res.body.submission.title).toBe("Updated Submission Title by Bob");
    await newPrisma.$disconnect();
  });

  // TEST-05-11
  it("TEST-05-11: overwrite after Feedback recorded is rejected -> 409 FEEDBACK_RECORDED (AC-05-10, BR-20)", async () => {
    const res = await request(app)
      .put(`/api/milestones/${completedMilestoneId}/submission`)
      .set("Cookie", aliceCookie)
      .send({
        title: "Attempt overwrite after feedback",
        description: "Should fail with 409",
        link: "https://github.com/example/fail",
      });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("FEEDBACK_RECORDED");
  });

  // TEST-02-06
  it("TEST-02-06: client-forged teamId in request body is ignored by server (AC-02-06, BR-17)", async () => {
    // Alice submits with a forged teamId
    const res = await request(app)
      .put(`/api/milestones/${testMilestoneId}/submission`)
      .set("Cookie", aliceCookie)
      .send({
        teamId: "forged-team-id",
        title: "Forged Team Body",
        description: "Checking backend ignores client teamId",
        link: "https://github.com/forged",
      });

    expect(res.status).toBe(200);
    // Persisted teamId must remain Team Alpha
    const sub = await prisma.submission.findFirst({
      where: { milestoneId: testMilestoneId },
      include: { team: true },
    });
    expect(sub!.team.name).toBe("Team Alpha");
  });
});


import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { PrismaClient } from "@prisma/client";
import { createApp } from "../../src/app";
import { FixedClock } from "../../src/lib/clock";

describe("F-06 Feedback Recording API Tests (BR-05, BR-06, BR-18, BR-20)", () => {
  const prisma = new PrismaClient();
  const fixedClock = new FixedClock("2026-11-08T12:00:00.000Z");
  const app = createApp({ prisma, clock: fixedClock });

  let supervisorCookie: string;
  let supervisor2Cookie: string;
  let aliceCookie: string;
  let charlieCookie: string;
  let milestoneWithSubId: string;
  let submissionId: string;
  let missedMilestoneId: string;
  let completedMilestoneId: string;

  beforeAll(async () => {
    // Supervisor 1 (Somchai - Team Alpha)
    const supRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "prof.somchai@university.ac.th", password: "password123" });
    supervisorCookie = supRes.headers["set-cookie"][0];

    // Supervisor 2 (Ann - Team Beta)
    const sup2Res = await request(app)
      .post("/api/auth/login")
      .send({ email: "dr.ann@university.ac.th", password: "password123" });
    supervisor2Cookie = sup2Res.headers["set-cookie"][0];

    // Alice (Team Alpha)
    const aliceRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "alice@student.university.ac.th", password: "password123" });
    aliceCookie = aliceRes.headers["set-cookie"][0];

    // Charlie (Team Beta)
    const charlieRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "charlie@student.university.ac.th", password: "password123" });
    charlieCookie = charlieRes.headers["set-cookie"][0];

    // Project 1
    const p1 = await prisma.project.findFirst({
      where: { name: "Course Project Management System" },
      include: { team: true },
    });

    // Create fresh milestone with submission
    const m = await prisma.milestone.create({
      data: {
        projectId: p1!.id,
        name: `Feedback Test MS ${Date.now()}`,
        description: "Milestone for testing feedback",
        deadline: new Date("2026-11-20T12:00:00.000Z"),
        createdById: (await prisma.user.findFirst({ where: { email: "prof.somchai@university.ac.th" } }))!.id,
      },
    });
    milestoneWithSubId = m.id;

    const sub = await prisma.submission.create({
      data: {
        milestoneId: m.id,
        teamId: p1!.teamId,
        title: "Ready for feedback",
        description: "Complete feature set",
        link: "https://github.com/example/pr/1",
        firstSubmittedById: (await prisma.user.findFirst({ where: { email: "alice@student.university.ac.th" } }))!.id,
        lastUpdatedById: (await prisma.user.findFirst({ where: { email: "alice@student.university.ac.th" } }))!.id,
      },
    });
    submissionId = sub.id;

    // Missed milestone (Sprint 0 Proposal, no submission)
    const missedM = await prisma.milestone.findFirst({
      where: { name: "Sprint 0 Proposal", projectId: p1!.id },
    });
    missedMilestoneId = missedM!.id;

    // Completed milestone from seed
    const completedM = await prisma.milestone.findFirst({
      where: { name: "Sprint 1 Working Increment", projectId: p1!.id },
    });
    completedMilestoneId = completedM!.id;
  });

  // TEST-06-01 & TEST-06-08
  it("TEST-06-01 & TEST-06-08: assigned supervisor records feedback -> 201; bound to current submissionId (AC-06-01, BR-18)", async () => {
    const res = await request(app)
      .post(`/api/milestones/${milestoneWithSubId}/feedback`)
      .set("Cookie", supervisorCookie)
      .send({
        text: "Well structured work. Excellent test coverage.",
      });

    expect(res.status).toBe(201);
    expect(res.body.feedback).toBeDefined();
    expect(res.body.feedback.submissionId).toBe(submissionId);
    expect(res.body.feedback.text).toBe("Well structured work. Excellent test coverage.");
  });

  // TEST-06-02
  it("TEST-06-02: feedback recorded before deadline is allowed and status becomes Completed (AC-06-02, D-03)", async () => {
    const res = await request(app)
      .get(`/api/milestones/${milestoneWithSubId}`)
      .set("Cookie", supervisorCookie);

    expect(res.status).toBe(200);
    expect(res.body.milestone.status).toBe("Completed");
  });

  // TEST-06-03
  it("TEST-06-03: feedback attempted with no submission (including Missed) -> 422 NO_SUBMISSION (AC-06-03, BR-05)", async () => {
    const res = await request(app)
      .post(`/api/milestones/${missedMilestoneId}/feedback`)
      .set("Cookie", supervisorCookie)
      .send({ text: "Feedback on missed milestone" });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("NO_SUBMISSION");
  });

  // TEST-06-04
  it("TEST-06-04: second feedback attempt rejected -> 409 CONFLICT; original unchanged (AC-06-04, BR-06)", async () => {
    const res = await request(app)
      .post(`/api/milestones/${milestoneWithSubId}/feedback`)
      .set("Cookie", supervisorCookie)
      .send({ text: "Second feedback attempt" });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("CONFLICT");

    // Verify original feedback unchanged
    const original = await prisma.feedback.findFirst({
      where: { milestoneId: milestoneWithSubId },
    });
    expect(original!.text).toBe("Well structured work. Excellent test coverage.");
  });

  // TEST-06-05
  it("TEST-06-05: student attempts to record feedback -> 403 FORBIDDEN (AC-06-05)", async () => {
    const res = await request(app)
      .post(`/api/milestones/${milestoneWithSubId}/feedback`)
      .set("Cookie", aliceCookie)
      .send({ text: "Student trying to give feedback" });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  // TEST-06-06
  it("TEST-06-06: unassigned supervisor attempts to record feedback -> 404 NOT_FOUND (AC-06-06)", async () => {
    const res = await request(app)
      .post(`/api/milestones/${milestoneWithSubId}/feedback`)
      .set("Cookie", supervisor2Cookie)
      .send({ text: "Unassigned supervisor trying to give feedback" });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });

  // TEST-06-07
  it("TEST-06-07: GET feedback as member (200), as assigned supervisor (200), as outsider (404) (AC-06-07)", async () => {
    // As team member (Alice)
    const resMember = await request(app)
      .get(`/api/milestones/${milestoneWithSubId}/feedback`)
      .set("Cookie", aliceCookie);
    expect(resMember.status).toBe(200);
    expect(resMember.body.feedback.text).toBe("Well structured work. Excellent test coverage.");

    // As assigned supervisor (Prof. Somchai)
    const resSup = await request(app)
      .get(`/api/milestones/${milestoneWithSubId}/feedback`)
      .set("Cookie", supervisorCookie);
    expect(resSup.status).toBe(200);
    expect(resSup.body.feedback.text).toBe("Well structured work. Excellent test coverage.");

    // As outsider student (Charlie)
    const resOutsider = await request(app)
      .get(`/api/milestones/${milestoneWithSubId}/feedback`)
      .set("Cookie", charlieCookie);
    expect(resOutsider.status).toBe(404);
  });
});


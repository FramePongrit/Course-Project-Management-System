import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { PrismaClient } from "@prisma/client";
import { createApp } from "../../src/app";
import { FixedClock } from "../../src/lib/clock";
import { DEMO_PASSWORD } from "../helpers/demo";

// Regression tests for Issue #34: a required text field that contains only whitespace was accepted
// and saved as an empty string, because the length check ran before the value was trimmed.
describe("Issue #34 whitespace-only required fields are rejected (AC-05-04, NFR-08)", () => {
  const prisma = new PrismaClient();
  const clock = new FixedClock("2026-11-08T12:00:00.000Z");
  const app = createApp({ prisma, clock });

  let aliceCookie: string;
  let supervisorCookie: string;
  let projectId: string;
  let supervisorId: string;

  async function login(email: string): Promise<string> {
    const res = await request(app).post("/api/auth/login").send({ email, password: DEMO_PASSWORD });
    return res.headers["set-cookie"][0];
  }

  async function newMilestone(label: string): Promise<string> {
    const m = await prisma.milestone.create({
      data: {
        projectId,
        name: `Issue34 ${label} ${Date.now()}`,
        description: "Issue #34 regression",
        deadline: new Date("2026-11-20T12:00:00.000Z"),
        createdById: supervisorId,
      },
    });
    return m.id;
  }

  beforeAll(async () => {
    aliceCookie = await login("alice@student.university.ac.th");
    supervisorCookie = await login("prof.somchai@university.ac.th");
    projectId = (await prisma.project.findFirst({ where: { name: "Course Project Management System" } }))!.id;
    supervisorId = (await prisma.user.findFirst({ where: { email: "prof.somchai@university.ac.th" } }))!.id;
  });

  it("TEST-34-01: whitespace-only submission title -> 422 and nothing persisted (AC-05-04)", async () => {
    const milestoneId = await newMilestone("title");

    const res = await request(app)
      .put(`/api/milestones/${milestoneId}/submission`)
      .set("Cookie", aliceCookie)
      .send({ title: "   ", description: "", link: "https://github.com/example/issue-34" });

    expect(res.status).toBe(422);
    expect(await prisma.submission.count({ where: { milestoneId } })).toBe(0);
  });

  it("TEST-34-02: whitespace-only milestone name -> 422 and nothing persisted (F-04)", async () => {
    const before = await prisma.milestone.count({ where: { projectId } });

    const res = await request(app)
      .post(`/api/projects/${projectId}/milestones`)
      .set("Cookie", supervisorCookie)
      .send({ name: "   ", description: "", deadline: "2026-11-25T10:00:00.000Z" });

    expect(res.status).toBe(422);
    expect(await prisma.milestone.count({ where: { projectId } })).toBe(before);
  });

  it("TEST-34-03: whitespace-only feedback text -> 422 and nothing persisted (F-06)", async () => {
    const milestoneId = await newMilestone("feedback");
    const sub = await request(app)
      .put(`/api/milestones/${milestoneId}/submission`)
      .set("Cookie", aliceCookie)
      .send({ title: "Issue 34 work", description: "", link: "https://github.com/example/issue-34" });
    expect(sub.status).toBe(200);

    const res = await request(app)
      .post(`/api/milestones/${milestoneId}/feedback`)
      .set("Cookie", supervisorCookie)
      .send({ text: "   " });

    expect(res.status).toBe(422);
    expect(await prisma.feedback.count({ where: { milestoneId } })).toBe(0);
  });

  it("TEST-34-04: surrounding spaces are still trimmed on a valid title (no regression)", async () => {
    const milestoneId = await newMilestone("trim");

    const res = await request(app)
      .put(`/api/milestones/${milestoneId}/submission`)
      .set("Cookie", aliceCookie)
      .send({ title: "  Real title  ", description: "", link: "https://github.com/example/issue-34" });

    expect(res.status).toBe(200);
    expect(res.body.submission.title).toBe("Real title");
  });
});

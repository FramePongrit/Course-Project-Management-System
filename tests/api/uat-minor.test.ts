import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { PrismaClient } from "@prisma/client";
import { createApp } from "../../src/app";
import { FixedClock } from "../../src/lib/clock";
import { DEMO_PASSWORD } from "../helpers/demo";

// Regression tests for the minor findings reported by the partner UAT team (Lab 6):
// #40 malformed JSON body -> 500, #41 upper-case "HTTPS://" link rejected.
describe("Lab 6 UAT minor findings #40, #41 (NFR-08, AC-05-04)", () => {
  const prisma = new PrismaClient();
  const app = createApp({ prisma, clock: new FixedClock("2026-11-08T12:00:00.000Z") });

  let aliceCookie: string;
  let projectId: string;
  let supervisorId: string;

  async function newMilestone(label: string): Promise<string> {
    const m = await prisma.milestone.create({
      data: {
        projectId,
        name: `UAT minor ${label} ${Date.now()}`,
        description: "Lab 6 minor findings regression",
        deadline: new Date("2026-11-20T12:00:00.000Z"),
        createdById: supervisorId,
      },
    });
    return m.id;
  }

  beforeAll(async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "alice@student.university.ac.th", password: DEMO_PASSWORD });
    aliceCookie = res.headers["set-cookie"][0];
    projectId = (await prisma.project.findFirst({ where: { name: "Course Project Management System" } }))!.id;
    supervisorId = (await prisma.user.findFirst({ where: { email: "prof.somchai@university.ac.th" } }))!.id;
  });

  it("TEST-40-01: malformed JSON on PUT submission -> 422 VALIDATION, nothing persisted (#40)", async () => {
    const milestoneId = await newMilestone("json");

    const res = await request(app)
      .put(`/api/milestones/${milestoneId}/submission`)
      .set("Cookie", aliceCookie)
      .set("Content-Type", "application/json")
      .send("{bad json");

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("VALIDATION");
    expect(await prisma.submission.count({ where: { milestoneId } })).toBe(0);
  });

  it("TEST-40-02: malformed JSON on POST /api/auth/login -> 422 VALIDATION, no cookie (#40)", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .set("Content-Type", "application/json")
      .send("{bad json");

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("VALIDATION");
    expect(res.headers["set-cookie"]).toBeUndefined();
  });

  it("TEST-41-01: upper-case scheme HTTPS:// link is accepted (#41)", async () => {
    const milestoneId = await newMilestone("scheme");

    const res = await request(app)
      .put(`/api/milestones/${milestoneId}/submission`)
      .set("Cookie", aliceCookie)
      .send({ title: "Upper-case scheme", description: "", link: "HTTPS://EXAMPLE.COM/uat-41" });

    expect(res.status).toBe(200);
  });

  it("TEST-41-02: non-http(s) schemes are still rejected (no regression, AC-05-04)", async () => {
    const milestoneId = await newMilestone("ftp");

    for (const link of ["ftp://example.com/x", "FTP://example.com/x", "javascript:alert(1)"]) {
      const res = await request(app)
        .put(`/api/milestones/${milestoneId}/submission`)
        .set("Cookie", aliceCookie)
        .send({ title: "Bad scheme", description: "", link });
      expect(res.status, link).toBe(422);
    }
    expect(await prisma.submission.count({ where: { milestoneId } })).toBe(0);
  });
});

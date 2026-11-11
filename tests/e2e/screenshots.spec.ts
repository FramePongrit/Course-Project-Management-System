/**
 * Part F program-demonstration screenshot capture (not a verification test).
 *
 * Drives the REAL running app (createApp serving the built React client) through the
 * three required Deliverable-1 scenarios and saves PNGs to docs/screenshots/:
 *   Scenario 1 — normal domain journey + persisted retrieval (01..10)
 *   Scenario 2 — business-rule / cutoff rejection (11)
 *   Scenario 3 — authorization: cross-team 404 + unauthenticated redirect (12,13)
 *
 * Run once (requires PostgreSQL up + seed applied):
 *   npm run prisma:seed   # ensure demo data exists
 *   npm run screenshots
 */
import { test, expect, Page } from "@playwright/test";
import http from "http";
import fs from "fs";
import path from "path";
import { AddressInfo } from "net";
import { PrismaClient } from "@prisma/client";
import { createApp } from "../../src/app";

const SHOT_DIR = path.join(__dirname, "../../docs/screenshots");

test.describe.configure({ mode: "serial" });

test("Capture Deliverable 1 Part F screenshots", async ({ browser }) => {
  test.setTimeout(120_000);
  fs.mkdirSync(SHOT_DIR, { recursive: true });

  const prisma = new PrismaClient();
  const app = createApp({ prisma });
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const baseUrl = `http://localhost:${(server.address() as AddressInfo).port}`;

  // --- Fixtures: a fresh future-deadline milestone for the journey + the seeded past-deadline one ---
  const project = await prisma.project.findFirst({
    where: { name: "Course Project Management System" },
  });
  const supervisor = await prisma.user.findFirst({
    where: { email: "prof.somchai@university.ac.th" },
  });
  const demoName = `Demo Milestone ${Date.now()}`;
  const demo = await prisma.milestone.create({
    data: {
      projectId: project!.id,
      name: demoName,
      description: "Walkthrough milestone created for the Part F screenshot journey.",
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdById: supervisor!.id,
    },
  });
  const sprint0 = await prisma.milestone.findFirst({
    where: { name: "Sprint 0 Proposal", projectId: project!.id },
  });

  const viewport = { width: 1280, height: 860 };
  const shot = (page: Page, name: string) =>
    page.screenshot({ path: path.join(SHOT_DIR, name), fullPage: true });

  const login = async (page: Page, email: string) => {
    await page.goto(`${baseUrl}/login`);
    await page.fill("#email", email);
    await page.fill("#password", "password123");
  };

  // ================= Scenario 1: normal journey =================
  const aliceCtx = await browser.newContext({ viewport });
  const alice = await aliceCtx.newPage();
  await login(alice, "alice@student.university.ac.th");
  await shot(alice, "01-login.png");
  await alice.click('button[type="submit"]');
  await expect(alice).toHaveURL(`${baseUrl}/dashboard`);
  await shot(alice, "02-student-dashboard.png");

  await alice.goto(`${baseUrl}/milestones/${demo.id}`);
  await expect(alice.locator("h1.title", { hasText: demoName })).toBeVisible();
  await alice.fill("#title", "Sprint 1 Vertical Slice");
  await alice.fill("#description", "Working increment: auth, milestone, submission, feedback, status.");
  await alice.fill("#link", "https://github.com/FramePongrit/Course-Project-Management-System");
  await shot(alice, "03-milestone-submit-form.png");
  await alice.click('button[type="submit"]');
  await expect(alice.locator(".alert-success")).toBeVisible();
  await shot(alice, "04-submission-saved.png");

  await alice.reload();
  await expect(alice.locator("#title")).toHaveValue("Sprint 1 Vertical Slice");
  await shot(alice, "05-submission-persisted-after-reload.png");

  // Supervisor records feedback -> Completed
  const supCtx = await browser.newContext({ viewport });
  const sup = await supCtx.newPage();
  await login(sup, "prof.somchai@university.ac.th");
  await sup.click('button[type="submit"]');
  await expect(sup).toHaveURL(`${baseUrl}/projects`);
  await shot(sup, "06-supervisor-projects.png");
  await sup.goto(`${baseUrl}/projects/${project!.id}`);
  await shot(sup, "07-supervisor-project-detail.png");
  await sup.goto(`${baseUrl}/supervisor/milestones/${demo.id}`);
  await expect(sup.getByText("Sprint 1 Vertical Slice")).toBeVisible();
  await sup.fill("#feedbackText", "Strong vertical slice — business rules and tests are solid. Approved.");
  await shot(sup, "08-supervisor-feedback-form.png");
  await sup.click('button[type="submit"]');
  await expect(sup.locator(".status-badge")).toHaveText("Completed");
  await shot(sup, "09-feedback-recorded-completed.png");

  // Student reloads and sees feedback + Completed (persisted)
  await alice.goto(`${baseUrl}/milestones/${demo.id}`);
  await expect(alice.locator(".status-badge")).toHaveText("Completed");
  await shot(alice, "10-student-sees-feedback.png");

  // ================= Scenario 2: cutoff rejection =================
  await alice.goto(`${baseUrl}/milestones/${sprint0!.id}`);
  await expect(alice.locator(".alert-danger")).toBeVisible();
  await shot(alice, "11-cutoff-rejection.png");

  // ================= Scenario 3: authorization =================
  // Cross-team access: Charlie (Team Beta) opens a Team Alpha milestone -> 404, no data leak
  const charlieCtx = await browser.newContext({ viewport });
  const charlie = await charlieCtx.newPage();
  await login(charlie, "charlie@student.university.ac.th");
  await charlie.click('button[type="submit"]');
  await charlie.goto(`${baseUrl}/milestones/${demo.id}`);
  await expect(charlie.locator(".alert-danger")).toBeVisible();
  await shot(charlie, "12-authz-cross-team-404.png");

  // Unauthenticated access: no session -> redirected to /login
  const anonCtx = await browser.newContext({ viewport });
  const anon = await anonCtx.newPage();
  await anon.goto(`${baseUrl}/dashboard`);
  await expect(anon).toHaveURL(`${baseUrl}/login`);
  await shot(anon, "13-authz-unauth-redirect-login.png");

  // --- teardown ---
  await aliceCtx.close();
  await supCtx.close();
  await charlieCtx.close();
  await anonCtx.close();
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await prisma.$disconnect();

  // eslint-disable-next-line no-console
  console.log(`\nSaved ${fs.readdirSync(SHOT_DIR).length} screenshots to docs/screenshots/`);
});

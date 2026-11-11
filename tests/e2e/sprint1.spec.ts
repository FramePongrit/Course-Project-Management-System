import { test, expect } from "@playwright/test";
import http from "http";
import { AddressInfo } from "net";
import { PrismaClient } from "@prisma/client";
import { createApp } from "../../src/app";

test.describe("Sprint 1 UI / E2E Critical Journeys", () => {
  const prisma = new PrismaClient();
  let server: http.Server;
  let baseUrl: string;
  let milestoneName: string;

  test.beforeAll(async () => {
    const app = createApp({ prisma });
    server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as AddressInfo).port;
    baseUrl = `http://localhost:${port}`;

    // Create a clean future-deadline milestone for the E2E journey
    const project = await prisma.project.findFirst({
      where: { name: "Course Project Management System" },
    });
    const supervisor = await prisma.user.findFirst({
      where: { email: "prof.somchai@university.ac.th" },
    });

    milestoneName = `E2E Milestone ${Date.now()}`;
    await prisma.milestone.create({
      data: {
        projectId: project!.id,
        name: milestoneName,
        description: "End-to-end test milestone for Sprint 1 verification",
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdById: supervisor!.id,
      },
    });
  });

  test.afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
    await prisma.$disconnect();
  });

  // TEST-E2E-01
  test("TEST-E2E-01: Student logs in -> submits a Milestone -> reloads and sees the persisted Submission (AC-05-01, AC-05-09, AC-08-01)", async ({
    page,
  }) => {
    await page.goto(`${baseUrl}/login`);

    // Log in as Student Alice
    await page.fill("#email", "alice@student.university.ac.th");
    await page.fill("#password", "password123");
    await page.click('button[type="submit"]');

    // Verify Student Dashboard loads with Project Progress (AC-08-01)
    await expect(page).toHaveURL(`${baseUrl}/dashboard`);
    await expect(
      page.locator("h1.title", { hasText: "Course Project Management System" })
    ).toBeVisible();

    const milestoneRow = page.locator("tr", { hasText: milestoneName });
    await expect(milestoneRow).toBeVisible();
    await expect(milestoneRow.locator(".status-badge")).toHaveText("Open");

    // Navigate to Milestone Detail
    await milestoneRow.locator("a", { hasText: "View / Submit" }).click();
    await expect(page.locator("h1.title", { hasText: milestoneName })).toBeVisible();

    // Submit work (AC-05-01)
    const submissionTitle = "E2E Verified Submission v1";
    const submissionDesc = "Submitted through Playwright E2E test journey.";
    const submissionLink = "https://github.com/FramePongrit/Course-Project-Management-System";

    await page.fill("#title", submissionTitle);
    await page.fill("#description", submissionDesc);
    await page.fill("#link", submissionLink);
    await page.click('button[type="submit"]');

    await expect(page.locator(".alert-success")).toContainText(
      "Submission saved successfully!"
    );
    await expect(page.locator(".status-badge")).toHaveText("Submitted");

    // Reload page and verify persisted Submission is retrieved from DB (AC-05-09)
    await page.reload();
    await expect(page.locator("#title")).toHaveValue(submissionTitle);
    await expect(page.locator("#description")).toHaveValue(submissionDesc);
    await expect(page.locator("#link")).toHaveValue(submissionLink);
    await expect(page.locator(".status-badge")).toHaveText("Submitted");
  });

  // TEST-E2E-02
  test("TEST-E2E-02: Supervisor logs in -> records Feedback on a submitted Milestone -> status shows Completed (AC-06-01, AC-07-04)", async ({
    page,
  }) => {
    await page.goto(`${baseUrl}/login`);

    // Log in as Supervisor Prof. Somchai
    await page.fill("#email", "prof.somchai@university.ac.th");
    await page.fill("#password", "password123");
    await page.click('button[type="submit"]');

    // Navigate from Supervisor Projects List to Project Detail
    await expect(page).toHaveURL(`${baseUrl}/projects`);
    await page
      .locator(".card", { hasText: "Course Project Management System" })
      .locator("a", { hasText: "View Project" })
      .click();

    // Find the submitted milestone and open Supervisor Milestone Detail
    const milestoneRow = page.locator("tr", { hasText: milestoneName });
    await expect(milestoneRow).toBeVisible();
    await expect(milestoneRow.locator(".status-badge")).toHaveText("Submitted");
    await milestoneRow.locator("a", { hasText: "Inspect / Feedback" }).click();

    // Verify Student Submission is visible read-only
    await expect(page.getByText("E2E Verified Submission v1")).toBeVisible();

    // Record Feedback (AC-06-01)
    const feedbackComment =
      "E2E Supervisor Feedback: Verified end-to-end submission workflow.";
    await page.fill("#feedbackText", feedbackComment);
    await page.click('button[type="submit"]');

    // Verify Feedback is persisted and Milestone status transitions to Completed (AC-07-04)
    await expect(page.locator(".alert-success").first()).toBeVisible();
    await expect(page.getByText(feedbackComment)).toBeVisible();
    await expect(page.locator(".status-badge")).toHaveText("Completed");

    // Reload to confirm persistence
    await page.reload();
    await expect(page.getByText(feedbackComment)).toBeVisible();
    await expect(page.locator(".status-badge")).toHaveText("Completed");
  });
});

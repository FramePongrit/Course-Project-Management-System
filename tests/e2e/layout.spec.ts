import { test, expect, Page } from "@playwright/test";
import http from "http";
import { AddressInfo } from "net";
import { PrismaClient } from "@prisma/client";
import { createApp } from "../../src/app";
import { DEMO_PASSWORD } from "../helpers/demo";

// Regression test for #42 (Lab 6 UAT finding): long values without spaces, within the allowed lengths
// (name/title <= 200, description <= 2000), must wrap instead of widening the page.
test.describe("#42 long unbroken text stays within the page width", () => {
  const prisma = new PrismaClient();
  let server: http.Server;
  let baseUrl: string;
  let milestoneName: string;
  let milestoneId: string;

  test.beforeAll(async () => {
    server = http.createServer(createApp({ prisma }));
    await new Promise<void>((resolve) => server.listen(0, resolve));
    baseUrl = `http://localhost:${(server.address() as AddressInfo).port}`;

    const project = await prisma.project.findFirst({ where: { name: "Course Project Management System" } });
    const supervisor = await prisma.user.findFirst({ where: { email: "prof.somchai@university.ac.th" } });
    const alice = await prisma.user.findFirst({ where: { email: "alice@student.university.ac.th" } });

    milestoneName = ("UAT42L" + Date.now() + "n".repeat(200)).slice(0, 200);
    const m = await prisma.milestone.create({
      data: {
        projectId: project!.id,
        name: milestoneName,
        description: "d".repeat(2000),
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdById: supervisor!.id,
      },
    });
    milestoneId = m.id;
    const now = new Date();
    await prisma.submission.create({
      data: {
        milestoneId,
        teamId: project!.teamId,
        title: "t".repeat(200),
        description: "d".repeat(2000),
        link: "https://github.com/example/" + "l".repeat(150),
        firstSubmittedById: alice!.id,
        firstSubmittedAt: now,
        lastUpdatedById: alice!.id,
        lastUpdatedAt: now,
      },
    });
  });

  test.afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await prisma.$disconnect();
  });

  async function login(page: Page, email: string) {
    await page.goto(`${baseUrl}/login`);
    await page.fill("#email", email);
    await page.fill("#password", DEMO_PASSWORD);
    await page.click('button[type="submit"]');
  }

  async function pageWidth(page: Page) {
    return page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
    }));
  }

  test.use({ viewport: { width: 867, height: 900 } });

  test("TEST-42-01: student dashboard with a 200-character unbroken milestone name has no sideways scroll", async ({ page }) => {
    await login(page, "alice@student.university.ac.th");
    await expect(page.locator("tr", { hasText: milestoneName.slice(0, 20) })).toBeVisible();

    const w = await pageWidth(page);
    expect(w.scroll).toBeLessThanOrEqual(w.client);
  });

  test("TEST-42-02: supervisor milestone page with 200/2000-character unbroken title/description has no sideways scroll", async ({ page }) => {
    await login(page, "prof.somchai@university.ac.th");
    await page.waitForURL(`${baseUrl}/projects`);
    await page.goto(`${baseUrl}/supervisor/milestones/${milestoneId}`);
    await expect(page.getByText("Submission Title:")).toBeVisible();

    const w = await pageWidth(page);
    expect(w.scroll).toBeLessThanOrEqual(w.client);
  });
});

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

  // ---- #45: the #42 correction must not split short UI words in the middle ----

  // Words (runs of non-space characters) inside the matched elements that are laid out over more than one line.
  async function splitWords(page: Page, selector: string, maxLen = Infinity) {
    return page.evaluate(([sel, max]) => {
      const split: string[] = [];
      for (const el of Array.from(document.querySelectorAll(sel))) {
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        for (let node = walker.nextNode(); node; node = walker.nextNode()) {
          const text = node.textContent || "";
          for (const m of text.matchAll(/\S+/g)) {
            if (m[0].length > (max as number)) continue; // long unbroken user text may break (#42)
            const range = document.createRange();
            range.setStart(node, m.index!);
            range.setEnd(node, m.index! + m[0].length);
            const tops = new Set(Array.from(range.getClientRects()).filter((r) => r.width > 0).map((r) => Math.round(r.top)));
            if (tops.size > 1) split.push(m[0]);
          }
        }
      }
      return split;
    }, [selector, maxLen] as const);
  }

  // Short UI text that must stay whole: header, role badge, status badges, action buttons, deadline cells.
  const UI_TEXT = ".navbar-brand, .user-menu, .status-badge, td .btn, tbody td:nth-child(2)";
  // Ordinary words (up to 15 characters) in the milestone name/description cells must also stay whole.
  const NAME_CELLS = "tbody td:first-child";

  for (const width of [375, 1280]) {
    test(`TEST-45-01 (${width}px): student dashboard with a long-name row keeps short UI words whole`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await login(page, "alice@student.university.ac.th");
      await expect(page.locator("tr", { hasText: milestoneName.slice(0, 20) })).toBeVisible();

      expect(await splitWords(page, UI_TEXT)).toEqual([]);
      expect(await splitWords(page, NAME_CELLS, 15)).toEqual([]);
      const w = await pageWidth(page);
      expect(w.scroll).toBeLessThanOrEqual(w.client); // #42 still holds
    });

    test(`TEST-45-02 (${width}px): supervisor project page with a long-name row keeps short UI words whole`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await login(page, "prof.somchai@university.ac.th");
      await page.waitForURL(`${baseUrl}/projects`);
      await page.getByRole("link", { name: /View Project/ }).first().click();
      await expect(page.locator("tr", { hasText: milestoneName.slice(0, 20) })).toBeVisible();

      expect(await splitWords(page, UI_TEXT)).toEqual([]);
      expect(await splitWords(page, NAME_CELLS, 15)).toEqual([]);
      const w = await pageWidth(page);
      expect(w.scroll).toBeLessThanOrEqual(w.client); // #42 still holds
    });
  }
});

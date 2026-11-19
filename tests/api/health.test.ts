import { describe, it, expect } from "vitest";
import request from "supertest";
import { PrismaClient } from "@prisma/client";
import { createApp, resolveJwtSecret } from "../../src/app";

describe("Operational endpoints and production configuration guards", () => {
  const prisma = new PrismaClient();
  const app = createApp({ prisma });

  it("GET /api/health -> 200 without authentication", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });

  it("GET /api/ready -> 200 when the database is reachable", async () => {
    const res = await request(app).get("/api/ready");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ready" });
  });

  it("GET /api/ready -> 503 when the database is unreachable", async () => {
    const broken = { $queryRaw: async () => { throw new Error("db down"); } } as unknown as PrismaClient;
    const res = await request(createApp({ prisma: broken })).get("/api/ready");
    expect(res.status).toBe(503);
  });

  it("resolveJwtSecret rejects a missing, default or example secret in production", () => {
    expect(() => resolveJwtSecret(undefined, { NODE_ENV: "production" })).toThrow();
    expect(() => resolveJwtSecret(undefined, { NODE_ENV: "production", JWT_SECRET: "default-secret-key-cpms" })).toThrow();
    expect(() =>
      resolveJwtSecret(undefined, {
        NODE_ENV: "production",
        JWT_SECRET: "cpms-super-secret-development-key-change-in-production",
      })
    ).toThrow();
  });

  it("resolveJwtSecret accepts a private secret in production and falls back only outside production", () => {
    expect(resolveJwtSecret(undefined, { NODE_ENV: "production", JWT_SECRET: "a-private-value" })).toBe("a-private-value");
    expect(resolveJwtSecret(undefined, { NODE_ENV: "test" })).toBeTruthy();
  });
});

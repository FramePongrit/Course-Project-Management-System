import express, { Express, Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import path from "path";
import fs from "fs";
import { PrismaClient } from "@prisma/client";
import { Clock, SystemClock } from "./lib/clock";
import { createAuthMiddleware } from "./middleware/auth";
import { errorHandler } from "./middleware/errorHandler";
import { createAuthRouter } from "./routes/auth";
import { createProjectsRouter } from "./routes/projects";
import { createMilestonesRouter } from "./routes/milestones";
import { UnauthenticatedError } from "./errors";

export interface AppOptions {
  prisma?: PrismaClient;
  clock?: Clock;
  jwtSecret?: string;
  cookieSecure?: boolean;
}

// Development-only fallback and the placeholder shipped in .env.example. Both are public, so
// they are rejected when NODE_ENV=production.
const DEV_JWT_SECRET = "default-secret-key-cpms";
const EXAMPLE_JWT_SECRET = "cpms-super-secret-development-key-change-in-production";

export function resolveJwtSecret(explicit: string | undefined, env: NodeJS.ProcessEnv = process.env): string {
  const secret = explicit || env.JWT_SECRET;
  if (env.NODE_ENV === "production") {
    if (!secret || secret === DEV_JWT_SECRET || secret === EXAMPLE_JWT_SECRET) {
      throw new Error("JWT_SECRET must be set to a private value when NODE_ENV=production");
    }
  }
  return secret || DEV_JWT_SECRET;
}

export function createApp(options: AppOptions = {}): Express {
  const prisma = options.prisma || new PrismaClient();
  const clock = options.clock || new SystemClock();
  const jwtSecret = resolveJwtSecret(options.jwtSecret);
  const cookieSecure = options.cookieSecure ?? (process.env.COOKIE_SECURE === "true");

  const app = express();

  // Cloud Run terminates TLS in front of the container.
  app.set("trust proxy", 1);

  app.use(express.json());
  app.use(cookieParser());
  app.use(
    cors({
      origin: true,
      credentials: true,
    })
  );

  // Operational endpoints: unauthenticated and read-only (used by Cloud Run and the smoke test).
  // /api/health = process is up (no database); /api/ready = database is reachable.
  app.get("/api/health", (_req: Request, res: Response) => {
    res.status(200).json({ status: "ok" });
  });
  app.get("/api/ready", async (_req: Request, res: Response) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.status(200).json({ status: "ready" });
    } catch {
      res.status(503).json({ status: "unavailable" });
    }
  });

  const { authenticate, requireAuth } = createAuthMiddleware(prisma, jwtSecret);
  app.use(authenticate);

  // Auth routes
  app.use("/api/auth", createAuthRouter(prisma, jwtSecret, cookieSecure));

  // Current user route (GET /api/me)
  app.get("/api/me", requireAuth, (req: Request, res: Response) => {
    return res.status(200).json(req.user);
  });

  // Protected domain routes
  app.use("/api/projects", requireAuth, createProjectsRouter(prisma, clock));
  app.use("/api/milestones", requireAuth, createMilestonesRouter(prisma, clock));

  // Serve static client build if present
  const publicDir = path.join(__dirname, "../dist/public");
  if (fs.existsSync(publicDir)) {
    app.use(express.static(publicDir));
    app.get("*", (req: Request, res: Response, next: NextFunction) => {
      if (req.path.startsWith("/api")) {
        return next();
      }
      res.sendFile(path.join(publicDir, "index.html"));
    });
  }

  // Error handling middleware
  app.use(errorHandler);

  return app;
}


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

export function createApp(options: AppOptions = {}): Express {
  const prisma = options.prisma || new PrismaClient();
  const clock = options.clock || new SystemClock();
  const jwtSecret = options.jwtSecret || process.env.JWT_SECRET || "default-secret-key-cpms";
  const cookieSecure = options.cookieSecure ?? (process.env.COOKIE_SECURE === "true");

  const app = express();

  app.use(express.json());
  app.use(cookieParser());
  app.use(
    cors({
      origin: true,
      credentials: true,
    })
  );

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


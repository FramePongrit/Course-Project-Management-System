import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { PrismaClient, UserStatus } from "@prisma/client";
import { UnauthenticatedError } from "../errors";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export function createAuthRouter(prisma: PrismaClient, jwtSecret: string, cookieSecure = false) {
  const router = Router();

  router.post("/login", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = loginSchema.parse(req.body);
      const normalizedEmail = email.trim().toLowerCase();

      const user = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });

      // BR-15: INVITED/null-hash accounts cannot log in; generic 401 on any failure
      if (!user || !user.passwordHash || user.status !== UserStatus.ACTIVE) {
        throw new UnauthenticatedError("Invalid email or password");
      }

      const match = await bcrypt.compare(password, user.passwordHash);
      if (!match) {
        throw new UnauthenticatedError("Invalid email or password");
      }

      const token = jwt.sign(
        { sub: user.id, role: user.role },
        jwtSecret,
        { expiresIn: "8h" }
      );

      res.cookie("session", token, {
        httpOnly: true,
        sameSite: "lax",
        secure: cookieSecure,
        path: "/",
        maxAge: 8 * 60 * 60 * 1000,
      });

      return res.status(200).json({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      });
    } catch (err) {
      next(err);
    }
  });

  router.post("/logout", (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new UnauthenticatedError("Authentication required");
      }

      res.clearCookie("session", {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        secure: cookieSecure,
      });

      return res.status(204).send();
    } catch (err) {
      next(err);
    }
  });

  return router;
}


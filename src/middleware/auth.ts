import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { PrismaClient, Role, UserStatus } from "@prisma/client";
import { UnauthenticatedError, ForbiddenError } from "../errors";

export interface RequestUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  status: UserStatus;
  studentId?: string | null;
  teamId?: string;
  projectId?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: RequestUser;
    }
  }
}

export function createAuthMiddleware(prisma: PrismaClient, jwtSecret: string) {
  const authenticate = async (req: Request, _res: Response, next: NextFunction) => {
    try {
      let token: string | undefined = req.cookies?.session;

      if (!token && req.headers.authorization?.startsWith("Bearer ")) {
        token = req.headers.authorization.substring(7);
      }

      if (!token) {
        return next();
      }

      const decoded = jwt.verify(token, jwtSecret) as { sub: string; role: string };

      const user = await prisma.user.findUnique({
        where: { id: decoded.sub },
        include: {
          membership: {
            include: {
              team: {
                include: {
                  project: true,
                },
              },
            },
          },
        },
      });

      if (!user || user.status !== UserStatus.ACTIVE) {
        return next();
      }

      req.user = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status,
        studentId: user.studentId,
        teamId: user.membership?.teamId,
        projectId: user.membership?.team?.project?.id,
      };

      next();
    } catch {
      // Invalid/expired token: leave req.user undefined
      next();
    }
  };

  const requireAuth = (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new UnauthenticatedError("Authentication required");
    }
    next();
  };

  const requireRole = (role: Role) => {
    return (req: Request, _res: Response, next: NextFunction) => {
      if (!req.user) {
        throw new UnauthenticatedError("Authentication required");
      }
      if (req.user.role !== role) {
        throw new ForbiddenError(`Operation requires role ${role}`);
      }
      next();
    };
  };

  return { authenticate, requireAuth, requireRole };
}


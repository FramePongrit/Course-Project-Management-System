import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { PrismaClient, Role } from "@prisma/client";
import { Clock } from "../lib/clock";
import { NotFoundError, ForbiddenError, ValidationError, ConflictError } from "../errors";
import { deriveStatus } from "../services/status";
import { isFutureDeadline } from "../services/rules";

const createMilestoneSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).default(""),
  deadline: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid date format for deadline",
  }),
});

export function createProjectsRouter(prisma: PrismaClient, clock: Clock) {
  const router = Router();

  // GET /api/projects — role-scoped list
  router.get("/", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;

      if (user.role === Role.STUDENT) {
        if (!user.teamId) {
          return res.status(200).json({ projects: [] });
        }
        const projects = await prisma.project.findMany({
          where: { teamId: user.teamId },
          include: { team: true },
        });

        return res.status(200).json({
          projects: projects.map((p) => ({
            id: p.id,
            name: p.name,
            description: p.description,
            teamId: p.teamId,
            teamName: p.team.name,
          })),
        });
      }

      // Supervisor
      const projects = await prisma.project.findMany({
        where: { team: { supervisorId: user.id } },
        include: { team: true },
      });

      return res.status(200).json({
        projects: projects.map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          teamId: p.teamId,
          teamName: p.team.name,
        })),
      });
    } catch (err) {
      next(err);
    }
  });

  // GET /api/projects/:id — view single project with ownership check
  router.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const project = await prisma.project.findUnique({
        where: { id: req.params.id },
        include: { team: true },
      });

      if (!project) {
        throw new NotFoundError("Project not found");
      }

      // Ownership enforcement: 404 for outsider
      if (user.role === Role.STUDENT && project.teamId !== user.teamId) {
        throw new NotFoundError("Project not found");
      }
      if (user.role === Role.SUPERVISOR && project.team.supervisorId !== user.id) {
        throw new NotFoundError("Project not found");
      }

      return res.status(200).json({
        project: {
          id: project.id,
          name: project.name,
          description: project.description,
          teamId: project.teamId,
          teamName: project.team.name,
        },
      });
    } catch (err) {
      next(err);
    }
  });

  // GET /api/projects/:id/progress — project progress with derived status (no numeric score/percentage)
  router.get("/:id/progress", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const project = await prisma.project.findUnique({
        where: { id: req.params.id },
        include: {
          team: true,
          milestones: {
            orderBy: { deadline: "asc" },
            include: {
              submissions: {
                where: { teamId: { equals: undefined } }, // placeholder to be assigned
              },
              feedbacks: {
                where: { teamId: { equals: undefined } },
              },
            },
          },
        },
      });

      if (!project) {
        throw new NotFoundError("Project not found");
      }

      if (user.role === Role.STUDENT && project.teamId !== user.teamId) {
        throw new NotFoundError("Project not found");
      }
      if (user.role === Role.SUPERVISOR && project.team.supervisorId !== user.id) {
        throw new NotFoundError("Project not found");
      }

      // Load milestones with team submissions & feedbacks
      const milestonesWithSubmissions = await prisma.milestone.findMany({
        where: { projectId: project.id },
        orderBy: { deadline: "asc" },
        include: {
          submissions: {
            where: { teamId: project.teamId },
          },
          feedbacks: {
            where: { teamId: project.teamId },
          },
        },
      });

      const now = clock.now();
      const mappedMilestones = milestonesWithSubmissions.map((m) => {
        const submission = m.submissions[0] || null;
        const feedback = m.feedbacks[0] || null;
        const status = deriveStatus(
          {
            hasSubmission: !!submission,
            hasFeedback: !!feedback,
            deadline: m.deadline,
          },
          now
        );

        return {
          id: m.id,
          name: m.name,
          description: m.description,
          deadline: m.deadline.toISOString(),
          status,
          submission: submission
            ? {
                id: submission.id,
                title: submission.title,
                description: submission.description,
                link: submission.link,
                firstSubmittedAt: submission.firstSubmittedAt.toISOString(),
                lastUpdatedAt: submission.lastUpdatedAt.toISOString(),
              }
            : null,
          feedback: feedback
            ? {
                id: feedback.id,
                text: feedback.text,
                recordedAt: feedback.recordedAt.toISOString(),
              }
            : null,
        };
      });

      return res.status(200).json({
        project: {
          id: project.id,
          name: project.name,
          description: project.description,
          teamId: project.teamId,
          teamName: project.team.name,
        },
        milestones: mappedMilestones,
      });
    } catch (err) {
      next(err);
    }
  });

  // GET /api/projects/:id/milestones — list project milestones with status
  router.get("/:id/milestones", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const project = await prisma.project.findUnique({
        where: { id: req.params.id },
        include: { team: true },
      });

      if (!project) {
        throw new NotFoundError("Project not found");
      }

      if (user.role === Role.STUDENT && project.teamId !== user.teamId) {
        throw new NotFoundError("Project not found");
      }
      if (user.role === Role.SUPERVISOR && project.team.supervisorId !== user.id) {
        throw new NotFoundError("Project not found");
      }

      const milestones = await prisma.milestone.findMany({
        where: { projectId: project.id },
        orderBy: { deadline: "asc" },
        include: {
          submissions: {
            where: { teamId: project.teamId },
          },
          feedbacks: {
            where: { teamId: project.teamId },
          },
        },
      });

      const now = clock.now();
      const result = milestones.map((m) => {
        const submission = m.submissions[0] || null;
        const feedback = m.feedbacks[0] || null;
        const status = deriveStatus(
          {
            hasSubmission: !!submission,
            hasFeedback: !!feedback,
            deadline: m.deadline,
          },
          now
        );

        return {
          id: m.id,
          projectId: m.projectId,
          name: m.name,
          description: m.description,
          deadline: m.deadline.toISOString(),
          status,
        };
      });

      return res.status(200).json({ milestones: result });
    } catch (err) {
      next(err);
    }
  });

  // POST /api/projects/:id/milestones — create milestone (SUPERVISOR only)
  router.post("/:id/milestones", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;

      // Role check: Only SUPERVISOR
      if (user.role !== Role.SUPERVISOR) {
        throw new ForbiddenError("Only supervisors can create milestones");
      }

      const project = await prisma.project.findUnique({
        where: { id: req.params.id },
        include: { team: true },
      });

      if (!project) {
        throw new NotFoundError("Project not found");
      }

      // Ownership check: must supervise this project's team
      if (project.team.supervisorId !== user.id) {
        throw new NotFoundError("Project not found");
      }

      const { name, description, deadline } = createMilestoneSchema.parse(req.body);

      // BR-03: deadline strictly in the future
      if (!isFutureDeadline(deadline, clock.now())) {
        throw new ValidationError("Milestone deadline must be in the future");
      }

      // BR-04: name unique within project
      const existing = await prisma.milestone.findUnique({
        where: {
          projectId_name: {
            projectId: project.id,
            name: name.trim(),
          },
        },
      });

      if (existing) {
        throw new ConflictError("A milestone with this name already exists in this project");
      }

      const milestone = await prisma.milestone.create({
        data: {
          projectId: project.id,
          name: name.trim(),
          description: description.trim(),
          deadline: new Date(deadline),
          createdById: user.id,
        },
      });

      return res.status(201).json({
        milestone: {
          id: milestone.id,
          projectId: milestone.projectId,
          name: milestone.name,
          description: milestone.description,
          deadline: milestone.deadline.toISOString(),
          createdById: milestone.createdById,
          createdAt: milestone.createdAt.toISOString(),
        },
      });
    } catch (err) {
      next(err);
    }
  });

  return router;
}


import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { Prisma, PrismaClient, Role } from "@prisma/client";
import { Clock } from "../lib/clock";
import {
  NotFoundError,
  ForbiddenError,
  CutoffPassedError,
  NoSubmissionError,
  ConflictError,
  FeedbackRecordedError,
} from "../errors";
import { deriveStatus } from "../services/status";
import { isBeforeCutoff } from "../services/rules";

const submissionSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).default(""),
  link: z
    .string()
    .url()
    .refine((val) => val.startsWith("http://") || val.startsWith("https://"), {
      message: "Link must be an http or https URL",
    }),
});

const feedbackSchema = z.object({
  text: z.string().min(1).max(4000),
});

export function createMilestonesRouter(prisma: PrismaClient, clock: Clock) {
  const router = Router();

  // Helper to load milestone and verify ownership
  async function loadMilestoneAndVerifyOwnership(
    req: Request,
    milestoneId: string
  ) {
    const user = req.user!;
    const milestone = await prisma.milestone.findUnique({
      where: { id: milestoneId },
      include: {
        project: {
          include: { team: true },
        },
      },
    });

    if (!milestone) {
      throw new NotFoundError("Milestone not found");
    }

    if (user.role === Role.STUDENT && milestone.project.teamId !== user.teamId) {
      throw new NotFoundError("Milestone not found");
    }

    if (
      user.role === Role.SUPERVISOR &&
      milestone.project.team.supervisorId !== user.id
    ) {
      throw new NotFoundError("Milestone not found");
    }

    return milestone;
  }

  // GET /api/milestones/:id — detail with status, submission and feedback
  router.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const milestone = await loadMilestoneAndVerifyOwnership(req, req.params.id);
      const teamId = milestone.project.teamId;

      const submission = await prisma.submission.findUnique({
        where: {
          milestoneId_teamId: {
            milestoneId: milestone.id,
            teamId,
          },
        },
      });

      const feedback = await prisma.feedback.findUnique({
        where: {
          milestoneId_teamId: {
            milestoneId: milestone.id,
            teamId,
          },
        },
      });

      const status = deriveStatus(
        {
          hasSubmission: !!submission,
          hasFeedback: !!feedback,
          deadline: milestone.deadline,
        },
        clock.now()
      );

      return res.status(200).json({
        milestone: {
          id: milestone.id,
          projectId: milestone.projectId,
          name: milestone.name,
          description: milestone.description,
          deadline: milestone.deadline.toISOString(),
          status,
          submission: submission
            ? {
                id: submission.id,
                title: submission.title,
                description: submission.description,
                link: submission.link,
                firstSubmittedById: submission.firstSubmittedById,
                firstSubmittedAt: submission.firstSubmittedAt.toISOString(),
                lastUpdatedById: submission.lastUpdatedById,
                lastUpdatedAt: submission.lastUpdatedAt.toISOString(),
              }
            : null,
          feedback: feedback
            ? {
                id: feedback.id,
                text: feedback.text,
                submissionId: feedback.submissionId,
                recordedById: feedback.recordedById,
                recordedAt: feedback.recordedAt.toISOString(),
              }
            : null,
        },
      });
    } catch (err) {
      next(err);
    }
  });

  // PUT /api/milestones/:id/submission — idempotent upsert submission (STUDENT only)
  router.put("/:id/submission", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;

      // Role check: Only STUDENT
      if (user.role !== Role.STUDENT) {
        throw new ForbiddenError("Only students can submit milestone work");
      }

      const milestone = await loadMilestoneAndVerifyOwnership(req, req.params.id);
      const teamId = user.teamId!;

      const parsed = submissionSchema.parse(req.body);
      const now = clock.now();

      // BR-01: reject if cutoff passed
      if (!isBeforeCutoff(milestone.deadline, now)) {
        throw new CutoffPassedError("Submission cutoff has passed");
      }

      // Check if feedback already recorded for this milestone (BR-20)
      const existingFeedback = await prisma.feedback.findUnique({
        where: {
          milestoneId_teamId: {
            milestoneId: milestone.id,
            teamId,
          },
        },
      });

      if (existingFeedback) {
        throw new FeedbackRecordedError(
          "Submission cannot be modified after feedback has been recorded"
        );
      }

      // BR-02: Upsert current submission (first-submit vs overwrite)
      const existingSubmission = await prisma.submission.findUnique({
        where: {
          milestoneId_teamId: {
            milestoneId: milestone.id,
            teamId,
          },
        },
      });

      const data = {
        title: parsed.title.trim(),
        description: parsed.description.trim(),
        link: parsed.link.trim(),
      };

      let submission;
      try {
        submission = existingSubmission
          ? await prisma.submission.update({
              where: { id: existingSubmission.id },
              data: {
                ...data,
                lastUpdatedById: user.id,
                lastUpdatedAt: now,
              },
            })
          : await prisma.submission.create({
              data: {
                milestoneId: milestone.id,
                teamId,
                ...data,
                firstSubmittedById: user.id,
                firstSubmittedAt: now,
                lastUpdatedById: user.id,
                lastUpdatedAt: now,
              },
            });
      } catch (e) {
        if (
          e instanceof Prisma.PrismaClientKnownRequestError &&
          e.code === "P2002"
        ) {
          // lost a concurrent first-submit race → treat as an overwrite
          submission = await prisma.submission.update({
            where: {
              milestoneId_teamId: {
                milestoneId: milestone.id,
                teamId,
              },
            },
            data: {
              ...data,
              lastUpdatedById: user.id,
              lastUpdatedAt: now,
            },
          });
        } else {
          throw e;
        }
      }

      return res.status(200).json({
        submission: {
          id: submission.id,
          milestoneId: submission.milestoneId,
          teamId: submission.teamId,
          title: submission.title,
          description: submission.description,
          link: submission.link,
          firstSubmittedById: submission.firstSubmittedById,
          firstSubmittedAt: submission.firstSubmittedAt.toISOString(),
          lastUpdatedById: submission.lastUpdatedById,
          lastUpdatedAt: submission.lastUpdatedAt.toISOString(),
        },
      });
    } catch (err) {
      next(err);
    }
  });

  // GET /api/milestones/:id/submission — view current submission
  router.get("/:id/submission", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const milestone = await loadMilestoneAndVerifyOwnership(req, req.params.id);
      const teamId = milestone.project.teamId;

      const submission = await prisma.submission.findUnique({
        where: {
          milestoneId_teamId: {
            milestoneId: milestone.id,
            teamId,
          },
        },
      });

      if (!submission) {
        return res.status(200).json({ submission: null });
      }

      return res.status(200).json({
        submission: {
          id: submission.id,
          milestoneId: submission.milestoneId,
          teamId: submission.teamId,
          title: submission.title,
          description: submission.description,
          link: submission.link,
          firstSubmittedById: submission.firstSubmittedById,
          firstSubmittedAt: submission.firstSubmittedAt.toISOString(),
          lastUpdatedById: submission.lastUpdatedById,
          lastUpdatedAt: submission.lastUpdatedAt.toISOString(),
        },
      });
    } catch (err) {
      next(err);
    }
  });

  // POST /api/milestones/:id/feedback — record feedback (SUPERVISOR only)
  router.post("/:id/feedback", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;

      // Role check: Only SUPERVISOR
      if (user.role !== Role.SUPERVISOR) {
        throw new ForbiddenError("Only supervisors can record feedback");
      }

      const milestone = await loadMilestoneAndVerifyOwnership(req, req.params.id);
      const teamId = milestone.project.teamId;

      const parsed = feedbackSchema.parse(req.body);

      // BR-05: Submission must exist (including rejecting Missed milestone)
      const submission = await prisma.submission.findUnique({
        where: {
          milestoneId_teamId: {
            milestoneId: milestone.id,
            teamId,
          },
        },
      });

      if (!submission) {
        throw new NoSubmissionError("Feedback cannot be recorded without a submission");
      }

      // BR-06: Feedback is single and immutable
      const existingFeedback = await prisma.feedback.findUnique({
        where: {
          milestoneId_teamId: {
            milestoneId: milestone.id,
            teamId,
          },
        },
      });

      if (existingFeedback) {
        throw new ConflictError("Feedback has already been recorded for this milestone");
      }

      // BR-18: associate feedback with current submissionId
      const feedback = await prisma.feedback.create({
        data: {
          milestoneId: milestone.id,
          teamId,
          submissionId: submission.id,
          text: parsed.text.trim(),
          recordedById: user.id,
          recordedAt: clock.now(),
        },
      });

      return res.status(201).json({
        feedback: {
          id: feedback.id,
          milestoneId: feedback.milestoneId,
          teamId: feedback.teamId,
          submissionId: feedback.submissionId,
          text: feedback.text,
          recordedById: feedback.recordedById,
          recordedAt: feedback.recordedAt.toISOString(),
        },
      });
    } catch (err) {
      next(err);
    }
  });

  // GET /api/milestones/:id/feedback — view feedback
  router.get("/:id/feedback", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const milestone = await loadMilestoneAndVerifyOwnership(req, req.params.id);
      const teamId = milestone.project.teamId;

      const feedback = await prisma.feedback.findUnique({
        where: {
          milestoneId_teamId: {
            milestoneId: milestone.id,
            teamId,
          },
        },
      });

      if (!feedback) {
        return res.status(200).json({ feedback: null });
      }

      return res.status(200).json({
        feedback: {
          id: feedback.id,
          milestoneId: feedback.milestoneId,
          teamId: feedback.teamId,
          submissionId: feedback.submissionId,
          text: feedback.text,
          recordedById: feedback.recordedById,
          recordedAt: feedback.recordedAt.toISOString(),
        },
      });
    } catch (err) {
      next(err);
    }
  });

  return router;
}


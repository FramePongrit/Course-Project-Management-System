import { PrismaClient, Role, UserStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Clean existing data in reverse dependency order
  await prisma.feedback.deleteMany();
  await prisma.submission.deleteMany();
  await prisma.milestone.deleteMany();
  await prisma.project.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.team.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("password123", 10);

  // 1. Supervisors
  const supervisor1 = await prisma.user.create({
    data: {
      email: "prof.somchai@university.ac.th",
      passwordHash,
      name: "Prof. Somchai",
      role: Role.SUPERVISOR,
      status: UserStatus.ACTIVE,
    },
  });

  const supervisor2 = await prisma.user.create({
    data: {
      email: "dr.ann@university.ac.th",
      passwordHash,
      name: "Dr. Ann",
      role: Role.SUPERVISOR,
      status: UserStatus.ACTIVE,
    },
  });

  // 2. Students
  const student1 = await prisma.user.create({
    data: {
      email: "alice@student.university.ac.th",
      passwordHash,
      name: "Alice Wong",
      studentId: "STU001",
      role: Role.STUDENT,
      status: UserStatus.ACTIVE,
    },
  });

  const student2 = await prisma.user.create({
    data: {
      email: "bob@student.university.ac.th",
      passwordHash,
      name: "Bob Smith",
      studentId: "STU002",
      role: Role.STUDENT,
      status: UserStatus.ACTIVE,
    },
  });

  const student3 = await prisma.user.create({
    data: {
      email: "charlie@student.university.ac.th",
      passwordHash,
      name: "Charlie Brown",
      studentId: "STU003",
      role: Role.STUDENT,
      status: UserStatus.ACTIVE,
    },
  });

  // Invited student (null passwordHash, INVITED status, for BR-15 / AC-01-07)
  await prisma.user.create({
    data: {
      email: "dave@student.university.ac.th",
      passwordHash: null,
      name: "Dave Miller",
      studentId: "STU004",
      role: Role.STUDENT,
      status: UserStatus.INVITED,
    },
  });

  // 3. Teams
  const teamAlpha = await prisma.team.create({
    data: {
      name: "Team Alpha",
      supervisorId: supervisor1.id,
    },
  });

  const teamBeta = await prisma.team.create({
    data: {
      name: "Team Beta",
      supervisorId: supervisor2.id,
    },
  });

  // 4. Memberships
  await prisma.membership.create({
    data: {
      userId: student1.id,
      teamId: teamAlpha.id,
    },
  });

  await prisma.membership.create({
    data: {
      userId: student2.id,
      teamId: teamAlpha.id,
    },
  });

  await prisma.membership.create({
    data: {
      userId: student3.id,
      teamId: teamBeta.id,
    },
  });

  // 5. Projects
  const project1 = await prisma.project.create({
    data: {
      name: "Course Project Management System",
      description: "Supervision platform for tracking milestones and feedback.",
      teamId: teamAlpha.id,
    },
  });

  await prisma.project.create({
    data: {
      name: "Smart Campus Transit",
      description: "Real-time shuttle tracking system for university campus.",
      teamId: teamBeta.id,
    },
  });

  // 6. Milestones for Project 1 (Team Alpha)
  const now = new Date();

  // M1: Past deadline, has submission -> Awaiting Feedback
  const m1Deadline = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const m1 = await prisma.milestone.create({
    data: {
      projectId: project1.id,
      name: "Sprint 1 Architecture",
      description: "Submit architecture diagrams and API specs.",
      deadline: m1Deadline,
      createdById: supervisor1.id,
    },
  });

  const sub1 = await prisma.submission.create({
    data: {
      milestoneId: m1.id,
      teamId: teamAlpha.id,
      title: "Architecture Baseline v1",
      description: "Completed modular monolith design and ER diagrams.",
      link: "https://github.com/example/repo/releases/tag/v0.1",
      firstSubmittedById: student1.id,
      firstSubmittedAt: new Date(m1Deadline.getTime() - 24 * 60 * 60 * 1000),
      lastUpdatedById: student1.id,
      lastUpdatedAt: new Date(m1Deadline.getTime() - 24 * 60 * 60 * 1000),
    },
  });

  // M2: Past deadline, NO submission -> Missed
  const m2Deadline = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  await prisma.milestone.create({
    data: {
      projectId: project1.id,
      name: "Sprint 0 Proposal",
      description: "Initial team formation and topic proposal.",
      deadline: m2Deadline,
      createdById: supervisor1.id,
    },
  });

  // M3: Future deadline, has submission + feedback -> Completed
  const m3Deadline = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const m3 = await prisma.milestone.create({
    data: {
      projectId: project1.id,
      name: "Sprint 1 Working Increment",
      description: "Deploy working domain slice with auth and persistence.",
      deadline: m3Deadline,
      createdById: supervisor1.id,
    },
  });

  const sub3 = await prisma.submission.create({
    data: {
      milestoneId: m3.id,
      teamId: teamAlpha.id,
      title: "Working Slice v1.0",
      description: "Implemented auth and domain rules with 100% test coverage.",
      link: "https://github.com/example/repo/releases/tag/v1.0",
      firstSubmittedById: student1.id,
      firstSubmittedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      lastUpdatedById: student2.id,
      lastUpdatedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.feedback.create({
    data: {
      milestoneId: m3.id,
      teamId: teamAlpha.id,
      submissionId: sub3.id,
      text: "Excellent engineering baseline and well-structured test cases. Approved.",
      recordedById: supervisor1.id,
      recordedAt: new Date(),
    },
  });

  // M4: Future deadline, has submission, no feedback -> Submitted
  const m4Deadline = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  const m4 = await prisma.milestone.create({
    data: {
      projectId: project1.id,
      name: "Sprint 2 Core Expansion",
      description: "Implement team creation, invitations, and revisions.",
      deadline: m4Deadline,
      createdById: supervisor1.id,
    },
  });

  await prisma.submission.create({
    data: {
      milestoneId: m4.id,
      teamId: teamAlpha.id,
      title: "Sprint 2 Draft Implementation",
      description: "Added invitation token mechanism and revision snapshots.",
      link: "https://github.com/example/repo/pull/15",
      firstSubmittedById: student2.id,
      firstSubmittedAt: new Date(),
      lastUpdatedById: student2.id,
      lastUpdatedAt: new Date(),
    },
  });

  // M5: Future deadline, no submission -> Open
  const m5Deadline = new Date(now.getTime() + 28 * 24 * 60 * 60 * 1000);
  await prisma.milestone.create({
    data: {
      projectId: project1.id,
      name: "Sprint 3 Final Hardening",
      description: "Complete progress board, final reports, and demonstration video.",
      deadline: m5Deadline,
      createdById: supervisor1.id,
    },
  });

  console.log("Seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("Error during seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


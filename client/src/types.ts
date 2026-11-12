export type Role = "STUDENT" | "SUPERVISOR";
export type UserStatus = "ACTIVE" | "INVITED";
export type MilestoneStatus = "Open" | "Submitted" | "Awaiting Feedback" | "Completed" | "Missed";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  studentId?: string | null;
  teamId?: string;
  projectId?: string;
}

export interface ProjectSummary {
  id: string;
  name: string;
  description: string;
  teamId: string;
  teamName: string;
}

export interface Submission {
  id: string;
  milestoneId: string;
  teamId: string;
  title: string;
  description: string;
  link: string;
  firstSubmittedById?: string;
  firstSubmittedAt: string;
  lastUpdatedById?: string;
  lastUpdatedAt: string;
}

export interface Feedback {
  id: string;
  milestoneId: string;
  teamId: string;
  submissionId: string;
  text: string;
  recordedById?: string;
  recordedAt: string;
}

export interface Milestone {
  id: string;
  projectId: string;
  name: string;
  description: string;
  deadline: string;
  status: MilestoneStatus;
  submission?: Submission | null;
  feedback?: Feedback | null;
}

export interface ProjectDetail extends ProjectSummary {
  milestones: Milestone[];
}


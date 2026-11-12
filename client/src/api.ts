import { User, ProjectSummary, Milestone, Submission, Feedback } from "./types";

export class ApiError extends Error {
  code: string;
  statusCode: number;

  constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (res.status === 204) {
    return {} as T;
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const errorObj = data.error || {};
    throw new ApiError(
      res.status,
      errorObj.code || "UNKNOWN_ERROR",
      errorObj.message || `Request failed with status ${res.status}`
    );
  }

  return data as T;
}

export const api = {
  // Auth
  login: (email: string, password: string) =>
    request<User>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  logout: () =>
    request<void>("/api/auth/logout", {
      method: "POST",
    }),

  getMe: () => request<User>("/api/me"),

  // Projects
  getProjects: () => request<{ projects: ProjectSummary[] }>("/api/projects"),

  getProject: (id: string) => request<{ project: ProjectSummary }>(`/api/projects/${id}`),

  getProjectProgress: (id: string) =>
    request<{ project: ProjectSummary; milestones: Milestone[] }>(`/api/projects/${id}/progress`),

  createMilestone: (projectId: string, data: { name: string; description: string; deadline: string }) =>
    request<{ milestone: Milestone }>(`/api/projects/${projectId}/milestones`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Milestones
  getMilestone: (id: string) => request<{ milestone: Milestone }>(`/api/milestones/${id}`),

  getSubmission: (milestoneId: string) =>
    request<{ submission: Submission | null }>(`/api/milestones/${milestoneId}/submission`),

  submitMilestone: (milestoneId: string, data: { title: string; description: string; link: string }) =>
    request<{ submission: Submission }>(`/api/milestones/${milestoneId}/submission`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  getFeedback: (milestoneId: string) =>
    request<{ feedback: Feedback | null }>(`/api/milestones/${milestoneId}/feedback`),

  recordFeedback: (milestoneId: string, text: string) =>
    request<{ feedback: Feedback }>(`/api/milestones/${milestoneId}/feedback`, {
      method: "POST",
      body: JSON.stringify({ text }),
    }),
};


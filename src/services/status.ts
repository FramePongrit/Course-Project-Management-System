export type MilestoneStatus =
  | "Open"
  | "Submitted"
  | "Awaiting Feedback"
  | "Completed"
  | "Missed";

export interface StatusDerivationInput {
  hasSubmission: boolean;
  hasFeedback: boolean;
  deadline: Date | string;
}

/**
 * Pure function to derive Milestone status based on submission, feedback, and current time.
 * Enforces BR-16 and BR-19.
 */
export function deriveStatus(
  input: StatusDerivationInput,
  now: Date
): MilestoneStatus {
  const deadlineDate = new Date(input.deadline);
  const isPast = now.getTime() >= deadlineDate.getTime();

  if (input.hasFeedback) {
    return "Completed";
  }

  if (input.hasSubmission) {
    if (isPast) {
      return "Awaiting Feedback";
    }
    return "Submitted";
  }

  if (isPast) {
    return "Missed";
  }

  return "Open";
}


/**
 * Business Rules validator functions with injectable clock
 */

/**
 * BR-03: A Milestone's deadline must be strictly in the future at creation.
 */
export function isFutureDeadline(deadline: Date | string, now: Date): boolean {
  const d = new Date(deadline);
  return d.getTime() > now.getTime();
}

/**
 * BR-01: Submission cutoff - rejected when current time >= Milestone deadline.
 */
export function isBeforeCutoff(deadline: Date | string, now: Date): boolean {
  const d = new Date(deadline);
  return now.getTime() < d.getTime();
}

/**
 * BR-20: Submission is frozen once Feedback has been recorded.
 */
export function isSubmissionFrozen(hasFeedback: boolean): boolean {
  return hasFeedback;
}


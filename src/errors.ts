export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;

  constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

export class UnauthenticatedError extends AppError {
  constructor(message = "Authentication required") {
    super(401, "UNAUTHENTICATED", message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden") {
    super(403, "FORBIDDEN", message);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Resource not found") {
    super(404, "NOT_FOUND", message);
  }
}

export class ValidationError extends AppError {
  constructor(message = "Validation failed") {
    super(422, "VALIDATION", message);
  }
}

export class ConflictError extends AppError {
  constructor(message = "Conflict") {
    super(409, "CONFLICT", message);
  }
}

export class CutoffPassedError extends AppError {
  constructor(message = "Submission cutoff has passed") {
    super(422, "CUTOFF_PASSED", message);
  }
}

export class NoSubmissionError extends AppError {
  constructor(message = "Feedback cannot be recorded without a submission") {
    super(422, "NO_SUBMISSION", message);
  }
}

export class FeedbackRecordedError extends AppError {
  constructor(message = "Submission cannot be modified after feedback has been recorded") {
    super(409, "FEEDBACK_RECORDED", message);
  }
}


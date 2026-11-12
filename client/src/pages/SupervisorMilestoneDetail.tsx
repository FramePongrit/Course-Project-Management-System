import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api, ApiError } from "../api";
import { Milestone } from "../types";
import { StatusBadge } from "../components/StatusBadge";

export const SupervisorMilestoneDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [milestone, setMilestone] = useState<Milestone | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadMilestone = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const res = await api.getMilestone(id);
      setMilestone(res.milestone);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Failed to load milestone.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMilestone();
  }, [id]);

  const handleRecordFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    setError(null);
    setSuccess(null);
    setSubmitting(true);

    try {
      await api.recordFeedback(id, feedbackText);
      setSuccess("Feedback recorded successfully! The milestone is now marked as Completed.");
      setFeedbackText("");
      await loadMilestone();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Failed to record feedback.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="container"><p>Loading milestone details...</p></div>;
  }

  if (error && !milestone) {
    return (
      <div className="container">
        <div className="alert alert-danger">{error}</div>
        <Link to="/projects" className="btn btn-secondary">
          &larr; Back to Projects
        </Link>
      </div>
    );
  }

  if (!milestone) return null;

  const formatICT = (dateStr: string) => {
    const d = new Date(dateStr);
    return (
      d.toLocaleString("en-GB", {
        timeZone: "Asia/Bangkok",
        dateStyle: "medium",
        timeStyle: "short",
      }) + " (ICT)"
    );
  };

  return (
    <div className="container">
      <div style={{ marginBottom: "1rem" }}>
        <Link to={`/projects/${milestone.projectId}`} className="btn btn-outline" style={{ fontSize: "0.85rem" }}>
          &larr; Back to Project
        </Link>
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <h1 className="title">{milestone.name}</h1>
            <p className="subtitle">Deadline: {formatICT(milestone.deadline)}</p>
          </div>
          <div>
            <StatusBadge status={milestone.status} />
          </div>
        </div>
        <p>{milestone.description}</p>
      </div>

      {/* Student Submission (Read-only for Supervisor) */}
      <div className="card">
        <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "1rem" }}>
          Student Submission (Read-Only)
        </h2>

        {!milestone.submission ? (
          <div className="alert alert-info">
            {milestone.status === "Missed"
              ? "This milestone has passed its deadline with no submission (Missed)."
              : "No submission has been uploaded by the student team yet."}
          </div>
        ) : (
          <div>
            <div style={{ marginBottom: "0.75rem" }}>
              <span className="form-label">Submission Title:</span>
              <p style={{ fontSize: "1.05rem", fontWeight: 600 }}>{milestone.submission.title}</p>
            </div>

            <div style={{ marginBottom: "0.75rem" }}>
              <span className="form-label">Description:</span>
              <p style={{ whiteSpace: "pre-wrap" }}>{milestone.submission.description || "(No description provided)"}</p>
            </div>

            <div style={{ marginBottom: "0.75rem" }}>
              <span className="form-label">Artifact Link:</span>
              <p>
                <a
                  href={milestone.submission.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ wordBreak: "break-all" }}
                >
                  {milestone.submission.link} &nearr;
                </a>
              </p>
            </div>

            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "1rem" }}>
              Last saved: {formatICT(milestone.submission.lastUpdatedAt)}
            </div>
          </div>
        )}
      </div>

      {/* Supervisor Feedback Section */}
      <div className="card">
        <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "1rem" }}>
          Supervisor Feedback (F-06)
        </h2>

        {error && <div className="alert alert-danger">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        {milestone.feedback ? (
          <div style={{ borderLeft: "4px solid var(--success)", paddingLeft: "1rem" }}>
            <div className="alert alert-success" style={{ marginBottom: "0.75rem" }}>
              Feedback is immutable and has been recorded. The submission is now frozen (BR-20).
            </div>
            <p style={{ whiteSpace: "pre-wrap", fontSize: "1rem" }}>{milestone.feedback.text}</p>
            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.75rem" }}>
              Recorded at: {formatICT(milestone.feedback.recordedAt)}
            </div>
          </div>
        ) : !milestone.submission ? (
          <div className="alert alert-info">
            Feedback cannot be recorded until a submission exists (BR-05).
          </div>
        ) : (
          <form onSubmit={handleRecordFeedback}>
            <div className="form-group">
              <label className="form-label" htmlFor="feedbackText">
                Feedback Comments (Immutable once recorded - BR-06)
              </label>
              <textarea
                id="feedbackText"
                rows={5}
                className="form-textarea"
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="Enter detailed feedback and evaluation for the student team..."
                maxLength={4000}
                required
                disabled={submitting}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting || !feedbackText.trim()}
            >
              {submitting ? "Recording Feedback..." : "Record Feedback (Final)"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};


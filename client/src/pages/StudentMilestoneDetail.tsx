import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api, ApiError } from "../api";
import { Milestone } from "../types";
import { StatusBadge } from "../components/StatusBadge";

export const StudentMilestoneDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [milestone, setMilestone] = useState<Milestone | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [link, setLink] = useState("");
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
      if (res.milestone.submission) {
        setTitle(res.milestone.submission.title);
        setDescription(res.milestone.submission.description);
        setLink(res.milestone.submission.link);
      }
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    setError(null);
    setSuccess(null);
    setSubmitting(true);

    try {
      await api.submitMilestone(id, { title, description, link });
      setSuccess("Submission saved successfully!");
      await loadMilestone();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Failed to save submission.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="container"><p>Loading milestone...</p></div>;
  }

  if (error && !milestone) {
    return (
      <div className="container">
        <div className="alert alert-danger">{error}</div>
        <Link to="/dashboard" className="btn btn-secondary">
          &larr; Back to Dashboard
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

  const isCutoffPassed = new Date().getTime() >= new Date(milestone.deadline).getTime();
  const isFrozen = !!milestone.feedback;
  const isFormDisabled = isCutoffPassed || isFrozen;

  return (
    <div className="container">
      <div style={{ marginBottom: "1rem" }}>
        <Link to="/dashboard" className="btn btn-outline" style={{ fontSize: "0.85rem" }}>
          &larr; Back to Dashboard
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

      {milestone.feedback && (
        <div className="card" style={{ borderLeft: "4px solid var(--success)" }}>
          <h2 style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--success)", marginBottom: "0.5rem" }}>
            Supervisor Feedback
          </h2>
          <p style={{ whiteSpace: "pre-wrap", marginBottom: "0.75rem" }}>{milestone.feedback.text}</p>
          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
            Recorded at: {formatICT(milestone.feedback.recordedAt)}
          </div>
        </div>
      )}

      <div className="card">
        <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.5rem" }}>
          {milestone.submission ? "Current Submission" : "Submit Milestone Work"}
        </h2>

        {error && <div className="alert alert-danger">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        {isFrozen && (
          <div className="alert alert-info">
            Submission is frozen because supervisor feedback has already been recorded.
          </div>
        )}

        {!isFrozen && isCutoffPassed && (
          <div className="alert alert-danger">
            The deadline for this milestone has passed. Submissions are no longer accepted (Cutoff passed).
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="title">
              Submission Title
            </label>
            <input
              id="title"
              type="text"
              className="form-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Sprint 1 Deliverable vertical slice"
              disabled={isFormDisabled || submitting}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="description">
              Description / Notes
            </label>
            <textarea
              id="description"
              rows={4}
              className="form-textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your submission..."
              disabled={isFormDisabled || submitting}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="link">
              Artifact Link (HTTP/HTTPS)
            </label>
            <input
              id="link"
              type="url"
              className="form-input"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://github.com/your-team/repo"
              disabled={isFormDisabled || submitting}
              required
            />
          </div>

          {milestone.submission && (
            <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "1rem" }}>
              Last saved: {formatICT(milestone.submission.lastUpdatedAt)}
            </div>
          )}

          {!isFormDisabled && (
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
            >
              {submitting
                ? "Saving..."
                : milestone.submission
                ? "Update Submission (Overwrite)"
                : "Submit Work"}
            </button>
          )}
        </form>
      </div>
    </div>
  );
};


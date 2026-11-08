import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api, ApiError } from "../api";
import { ProjectSummary, Milestone } from "../types";
import { StatusBadge } from "../components/StatusBadge";

export const SupervisorProjectDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<ProjectSummary | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create Milestone form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);

  const loadData = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const res = await api.getProjectProgress(id);
      setProject(res.project);
      setMilestones(res.milestones);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Failed to load project details.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleCreateMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    setCreateError(null);
    setCreateSuccess(null);
    setCreateLoading(true);

    try {
      // Format deadline to ISO string
      const isoDeadline = new Date(deadline).toISOString();

      await api.createMilestone(id, {
        name,
        description,
        deadline: isoDeadline,
      });

      setCreateSuccess(`Milestone "${name}" created successfully!`);
      setName("");
      setDescription("");
      setDeadline("");
      await loadData();
    } catch (err) {
      if (err instanceof ApiError) {
        setCreateError(err.message);
      } else {
        setCreateError("Failed to create milestone.");
      }
    } finally {
      setCreateLoading(false);
    }
  };

  if (loading) {
    return <div className="container"><p>Loading project...</p></div>;
  }

  if (error && !project) {
    return (
      <div className="container">
        <div className="alert alert-danger">{error}</div>
        <Link to="/projects" className="btn btn-secondary">
          &larr; Back to Projects
        </Link>
      </div>
    );
  }

  if (!project) return null;

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
        <Link to="/projects" className="btn btn-outline" style={{ fontSize: "0.85rem" }}>
          &larr; Back to Projects List
        </Link>
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <h1 className="title">{project.name}</h1>
            <p className="subtitle">Supervising Team: {project.teamName}</p>
          </div>
        </div>
        <p>{project.description}</p>
      </div>

      {/* Create Milestone Card */}
      <div className="card">
        <h2 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "1rem" }}>
          Create New Milestone (F-04)
        </h2>

        {createError && <div className="alert alert-danger">{createError}</div>}
        {createSuccess && <div className="alert alert-success">{createSuccess}</div>}

        <form onSubmit={handleCreateMilestone}>
          <div className="form-group">
            <label className="form-label" htmlFor="mName">
              Milestone Name
            </label>
            <input
              id="mName"
              type="text"
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sprint 2 Architecture Review"
              maxLength={200}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="mDesc">
              Description
            </label>
            <textarea
              id="mDesc"
              rows={3}
              className="form-textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe deliverables and expectations..."
              maxLength={2000}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="mDeadline">
              Deadline (Must be in the future, evaluated in ICT)
            </label>
            <input
              id="mDeadline"
              type="datetime-local"
              className="form-input"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={createLoading}
          >
            {createLoading ? "Creating..." : "Create Milestone"}
          </button>
        </form>
      </div>

      {/* Milestones List */}
      <div className="card">
        <h2 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "1rem" }}>
          Project Milestones & Progress
        </h2>

        {milestones.length === 0 ? (
          <p className="subtitle">No milestones yet. Create one using the form above.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Milestone</th>
                <th>Deadline</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {milestones.map((m) => (
                <tr key={m.id}>
                  <td>
                    <strong>{m.name}</strong>
                    <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                      {m.description}
                    </div>
                  </td>
                  <td>{formatICT(m.deadline)}</td>
                  <td>
                    <StatusBadge status={m.status} />
                  </td>
                  <td>
                    <Link
                      to={`/supervisor/milestones/${m.id}`}
                      className="btn btn-secondary"
                      style={{ padding: "0.3rem 0.75rem", fontSize: "0.85rem" }}
                    >
                      Inspect / Feedback
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};


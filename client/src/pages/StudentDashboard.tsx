import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "../api";
import { User, Milestone, ProjectSummary } from "../types";
import { StatusBadge } from "../components/StatusBadge";

export const StudentDashboard: React.FC<{ user: User }> = ({ user }) => {
  const [project, setProject] = useState<ProjectSummary | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        if (!user.projectId) {
          const projectsRes = await api.getProjects();
          if (projectsRes.projects.length > 0) {
            const p = projectsRes.projects[0];
            const progressRes = await api.getProjectProgress(p.id);
            setProject(progressRes.project);
            setMilestones(progressRes.milestones);
          }
        } else {
          const res = await api.getProjectProgress(user.projectId);
          setProject(res.project);
          setMilestones(res.milestones);
        }
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError("Failed to load project progress.");
        }
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [user]);

  if (loading) {
    return <div className="container"><p>Loading project dashboard...</p></div>;
  }

  if (error) {
    return (
      <div className="container">
        <div className="alert alert-danger">{error}</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="container">
        <div className="card">
          <h2>No Project Assigned</h2>
          <p className="subtitle">You have not been assigned to a project team yet.</p>
        </div>
      </div>
    );
  }

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
      <div className="card">
        <div className="card-header">
          <div>
            <h1 className="title">{project.name}</h1>
            <p className="subtitle">Team: {project.teamName}</p>
          </div>
        </div>
        <p>{project.description}</p>
      </div>

      <div className="card">
        <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "1rem" }}>
          Project Milestones
        </h2>

        {milestones.length === 0 ? (
          <p className="subtitle">No milestones created for this project yet.</p>
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
                      to={`/milestones/${m.id}`}
                      className="btn btn-secondary"
                      style={{ padding: "0.3rem 0.75rem", fontSize: "0.85rem" }}
                    >
                      View / Submit
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


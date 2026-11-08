import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "../api";
import { ProjectSummary } from "../types";

export const SupervisorProjects: React.FC = () => {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProjects() {
      try {
        setLoading(true);
        const res = await api.getProjects();
        setProjects(res.projects);
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError("Failed to load assigned projects.");
        }
      } finally {
        setLoading(false);
      }
    }

    loadProjects();
  }, []);

  if (loading) {
    return <div className="container"><p>Loading assigned projects...</p></div>;
  }

  if (error) {
    return (
      <div className="container">
        <div className="alert alert-danger">{error}</div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="card">
        <h1 className="title">Assigned Projects</h1>
        <p className="subtitle">Supervised student teams and milestone tracking.</p>
      </div>

      {projects.length === 0 ? (
        <div className="card">
          <p className="subtitle">No projects currently assigned to you.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: "1rem" }}>
          {projects.map((p) => (
            <div key={p.id} className="card" style={{ marginBottom: 0 }}>
              <div className="card-header">
                <div>
                  <h2 style={{ fontSize: "1.25rem", fontWeight: 700 }}>{p.name}</h2>
                  <p className="subtitle">Team: {p.teamName}</p>
                </div>
                <Link to={`/projects/${p.id}`} className="btn btn-primary" style={{ fontSize: "0.85rem" }}>
                  View Project &rarr;
                </Link>
              </div>
              <p style={{ color: "var(--text-muted)", fontSize: "0.95rem" }}>{p.description}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};


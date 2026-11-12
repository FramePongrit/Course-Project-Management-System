import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, ApiError } from "../api";
import { User } from "../types";

interface LoginPageProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const user = await api.login(email, password);
      onLoginSuccess(user);
      if (user.role === "STUDENT") {
        navigate("/dashboard");
      } else {
        navigate("/projects");
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred during login.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword("password123");
  };

  return (
    <div style={{ maxWidth: 420, margin: "4rem auto", padding: "1.5rem" }}>
      <div className="card">
        <h2 className="title" style={{ textAlign: "center", marginBottom: "0.5rem" }}>
          Sign In
        </h2>
        <p className="subtitle" style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          Course Project Management System
        </p>

        {error && <div className="alert alert-danger">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="email">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. alice@student.university.ac.th"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: "100%", marginTop: "0.5rem" }}
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div style={{ marginTop: "1.5rem", borderTop: "1px solid var(--border)", paddingTop: "1rem" }}>
          <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.5rem" }}>
            Demo Quick Login (Seeded Accounts):
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: "0.8rem", padding: "0.3rem 0.6rem" }}
              onClick={() => handleQuickLogin("alice@student.university.ac.th")}
            >
              Student: Alice (Team Alpha)
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: "0.8rem", padding: "0.3rem 0.6rem" }}
              onClick={() => handleQuickLogin("prof.somchai@university.ac.th")}
            >
              Supervisor: Prof. Somchai (Team Alpha)
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: "0.8rem", padding: "0.3rem 0.6rem" }}
              onClick={() => handleQuickLogin("charlie@student.university.ac.th")}
            >
              Student: Charlie (Team Beta)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};


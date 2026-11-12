import React, { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { api } from "./api";
import { User } from "./types";
import { Header } from "./components/Header";
import { LoginPage } from "./pages/LoginPage";
import { StudentDashboard } from "./pages/StudentDashboard";
import { StudentMilestoneDetail } from "./pages/StudentMilestoneDetail";
import { SupervisorProjects } from "./pages/SupervisorProjects";
import { SupervisorProjectDetail } from "./pages/SupervisorProjectDetail";
import { SupervisorMilestoneDetail } from "./pages/SupervisorMilestoneDetail";

export const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = async () => {
    try {
      setLoading(true);
      const currentUser = await api.getMe();
      setUser(currentUser);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <p style={{ color: "var(--text-muted)", fontSize: "1.1rem" }}>Loading application...</p>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <Header user={user} onLogout={() => setUser(null)} />
        <main style={{ flex: 1 }}>
          <Routes>
            <Route
              path="/login"
              element={
                user ? (
                  <Navigate to={user.role === "STUDENT" ? "/dashboard" : "/projects"} replace />
                ) : (
                  <LoginPage onLoginSuccess={(u) => setUser(u)} />
                )
              }
            />

            {/* Student routes */}
            <Route
              path="/dashboard"
              element={
                !user ? (
                  <Navigate to="/login" replace />
                ) : user.role === "STUDENT" ? (
                  <StudentDashboard user={user} />
                ) : (
                  <Navigate to="/projects" replace />
                )
              }
            />

            <Route
              path="/milestones/:id"
              element={
                !user ? (
                  <Navigate to="/login" replace />
                ) : user.role === "STUDENT" ? (
                  <StudentMilestoneDetail />
                ) : (
                  <Navigate to="/projects" replace />
                )
              }
            />

            {/* Supervisor routes */}
            <Route
              path="/projects"
              element={
                !user ? (
                  <Navigate to="/login" replace />
                ) : user.role === "SUPERVISOR" ? (
                  <SupervisorProjects />
                ) : (
                  <Navigate to="/dashboard" replace />
                )
              }
            />

            <Route
              path="/projects/:id"
              element={
                !user ? (
                  <Navigate to="/login" replace />
                ) : user.role === "SUPERVISOR" ? (
                  <SupervisorProjectDetail />
                ) : (
                  <Navigate to="/dashboard" replace />
                )
              }
            />

            <Route
              path="/supervisor/milestones/:id"
              element={
                !user ? (
                  <Navigate to="/login" replace />
                ) : user.role === "SUPERVISOR" ? (
                  <SupervisorMilestoneDetail />
                ) : (
                  <Navigate to="/dashboard" replace />
                )
              }
            />

            {/* Fallback route */}
            <Route
              path="*"
              element={
                user ? (
                  <Navigate to={user.role === "STUDENT" ? "/dashboard" : "/projects"} replace />
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
};


import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { User } from "../types";
import { api } from "../api";

interface HeaderProps {
  user: User | null;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({ user, onLogout }) => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await api.logout();
      onLogout();
      navigate("/login");
    } catch (err) {
      console.error("Logout failed:", err);
      onLogout();
      navigate("/login");
    }
  };

  return (
    <header className="navbar">
      <Link to="/" className="navbar-brand">
        Course Project Management System (CPMS)
      </Link>
      {user && (
        <div className="user-menu">
          <div>
            <span style={{ fontWeight: 600, marginRight: "0.5rem" }}>{user.name}</span>
            <span className={`role-badge ${user.role.toLowerCase()}`}>{user.role}</span>
          </div>
          <button onClick={handleLogout} className="btn btn-outline" style={{ padding: "0.35rem 0.75rem", fontSize: "0.85rem" }}>
            Logout
          </button>
        </div>
      )}
    </header>
  );
};


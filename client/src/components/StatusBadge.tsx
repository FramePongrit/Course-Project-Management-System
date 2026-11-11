import React from "react";
import { MilestoneStatus } from "../types";

export const StatusBadge: React.FC<{ status: MilestoneStatus }> = ({ status }) => {
  const cleanClass = status.replace(/\s+/g, "");
  return <span className={`status-badge status-${cleanClass}`}>{status}</span>;
};


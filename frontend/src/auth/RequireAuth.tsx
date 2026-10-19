import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { LoadingState } from "../components/States";
import { useAuth } from "./AuthContext";

export function RequireAuth({
  children,
  managerOnly = false,
}: {
  children: ReactNode;
  managerOnly?: boolean;
}) {
  const { me, loading } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingState />;
  if (!me) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (managerOnly && !me.is_manager) return <Navigate to="/" replace />;
  return <>{children}</>;
}

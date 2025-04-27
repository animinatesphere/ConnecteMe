// src/components/ProtectedRoute.jsx
import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthProvider";
export default function ProtectedRoute({ children }) {
  const { user } = useAuth();

  if (!user) {
    // If not authenticated, redirect to login page
    return <Navigate to="/login" />;
  }

  // If authenticated, render the protected component
  return children;
}

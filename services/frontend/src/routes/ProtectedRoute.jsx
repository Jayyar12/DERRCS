import { Navigate, useLocation } from "react-router-dom";

function ProtectedRoute({ children, allowedRoles }) {
  const location = useLocation();
  const token = localStorage.getItem("derrsc_token");
  const role = localStorage.getItem("derrsc_role");

  // No login token
  if (!token) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  // Logged in, but wrong role
  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default ProtectedRoute;

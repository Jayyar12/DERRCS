import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

const CitizenReport = lazy(() => import("./pages/CitizenReport"));
const Login = lazy(() => import("./pages/Login"));
const DispatcherDashboard = lazy(() => import("./pages/DispatcherDashboard"));
const ResponderPortal = lazy(() => import("./pages/ResponderPortal"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));

import ProtectedRoute from "./routes/ProtectedRoute";
import AppShell from "./components/layout/AppShell";
import PageSkeleton from "./components/layout/PageSkeleton";

import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageSkeleton />}>
        <Routes>
          {/* Public Citizen Page */}
          <Route path="/" element={<CitizenReport />} />

          {/* Staff Login */}
          <Route path="/login" element={<Login />} />

          {/* Protected Staff Routes with Persistent Shell */}
          <Route element={<AppShell />}>
            <Route
              path="/dispatcher"
              element={
                <ProtectedRoute allowedRoles={["Dispatcher", "Admin"]}>
                  <DispatcherDashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/responder"
              element={
                <ProtectedRoute allowedRoles={["ResponseUnit"]}>
                  <ResponderPortal />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={["Admin"]}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;

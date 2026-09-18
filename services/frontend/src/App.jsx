import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

const CitizenReport = lazy(() => import("./pages/CitizenReport"));
const Login = lazy(() => import("./pages/Login"));
const DispatcherDashboard = lazy(() => import("./pages/DispatcherDashboard"));
const ResponderPortal = lazy(() => import("./pages/ResponderPortal"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));

import ProtectedRoute from "./routes/ProtectedRoute";

import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<main className="grid min-h-svh place-items-center bg-slate-950 text-white">Loading DERRCS…</main>}>
      <Routes>
        {/* Public Citizen Page */}
        <Route path="/" element={<CitizenReport />} />

        {/* Staff Login */}
        <Route path="/login" element={<Login />} />

        {/* Dispatcher */}
        <Route
          path="/dispatcher"
          element={
            <ProtectedRoute allowedRoles={["Dispatcher", "Admin"]}>
              <DispatcherDashboard />
            </ProtectedRoute>
          }
        />

        {/* Response Unit */}
        <Route
          path="/responder"
          element={
            <ProtectedRoute allowedRoles={["ResponseUnit"]}>
              <ResponderPortal />
            </ProtectedRoute>
          }
        />

        {/* Administrator */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={["Admin"]}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
      </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;

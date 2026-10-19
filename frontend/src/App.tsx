import { Navigate, Route, Routes } from "react-router-dom";
import { RequireAuth } from "./auth/RequireAuth";
import Layout from "./components/Layout";
import { EmptyState } from "./components/States";
import Login from "./pages/Login";
import MyRequests from "./pages/MyRequests";
import NewRequest from "./pages/NewRequest";

function ComingSoon() {
  return <EmptyState title="Coming soon" message="This page is not available yet." />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        {/* Until the dashboard (US3) exists, home shows My requests. */}
        <Route path="/" element={<Navigate to="/requests" replace />} />
        <Route path="/requests" element={<MyRequests />} />
        <Route path="/requests/new" element={<NewRequest />} />
        <Route
          path="/team"
          element={
            <RequireAuth managerOnly>
              <ComingSoon />
            </RequireAuth>
          }
        />
      </Route>
    </Routes>
  );
}

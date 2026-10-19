import { Button } from "@mantine/core";
import { Link, Route, Routes } from "react-router-dom";
import { RequireAuth } from "./auth/RequireAuth";
import Layout from "./components/Layout";
import { EmptyState } from "./components/States";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import MyRequests from "./pages/MyRequests";
import NewRequest from "./pages/NewRequest";
import Team from "./pages/Team";

function NotFound() {
  return (
    <EmptyState
      title="Page not found"
      message="The page you are looking for does not exist."
      action={
        <Button component={Link} to="/">
          Go to dashboard
        </Button>
      }
    />
  );
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
        <Route path="/" element={<Dashboard />} />
        <Route path="/requests" element={<MyRequests />} />
        <Route path="/requests/new" element={<NewRequest />} />
        <Route
          path="/team"
          element={
            <RequireAuth managerOnly>
              <Team />
            </RequireAuth>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

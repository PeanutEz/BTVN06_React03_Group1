import { Navigate, Outlet, useLocation } from "react-router-dom";
import LoadingLayout from "../../layouts/Loading.layout";
import { useAuthStore } from "../../store/auth.store";
import { ROUTER_URL } from "../router.const";

/**
 * Client-facing auth guard.
 * Redirects unauthenticated users to /login, preserving the intended path
 * in location.state.from so the login page can redirect back after success.
 */
export default function AuthGuard() {
  const { user, isInitialized } = useAuthStore();
  const location = useLocation();

  // Auth store is hydrated in App.tsx before any route renders, but guard
  // against the brief window before isInitialized is true.
  if (!isInitialized) {
    return <LoadingLayout />;
  }

  if (!user) {
    return (
      <Navigate
        to={ROUTER_URL.LOGIN}
        state={{ from: location }}
        replace
      />
    );
  }

  return <Outlet />;
}

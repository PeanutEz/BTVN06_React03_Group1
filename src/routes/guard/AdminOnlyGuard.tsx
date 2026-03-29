import { Navigate, Outlet, useLocation } from "react-router-dom";
import LoadingLayout from "../../layouts/Loading.layout";
import { useAuthStore } from "../../store";
import { ROUTER_URL } from "../router.const";

/** Chỉ cho phép role ADMIN hoặc SYSTEM vào. */
const AdminOnlyGuard = () => {
  const location = useLocation();
  const { user, isInitialized } = useAuthStore();

  if (!isInitialized) return <LoadingLayout />;

  const role = (
    (user?.active_context as { role?: string } | null)?.role ??
    user?.role ??
    ""
  ).toUpperCase();

  const hasRole = user?.roles?.some(r =>
    ["admin", "system"].includes((r.role ?? "").toString().toLowerCase())
  );

  if (!user || (role !== "ADMIN" && role !== "SYSTEM" && !hasRole)) {
    return <Navigate to={`${ROUTER_URL.ADMIN}`} replace state={{ from: location }} />;
  }

  return <Outlet />;
};

export default AdminOnlyGuard;

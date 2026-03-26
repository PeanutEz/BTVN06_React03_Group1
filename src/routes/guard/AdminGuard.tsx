import { Navigate, Outlet, useLocation } from "react-router-dom";
import LoadingLayout from "../../layouts/Loading.layout";
import { useAuthStore } from "../../store";
import { ROUTER_URL } from "../router.const";

const ALLOWED_ADMIN_ROLES = ["admin", "system", "manager", "staff", "shipper"];

const AdminGuard = () => {
  const location = useLocation();
  const { user, isInitialized } = useAuthStore();

  if (!isInitialized) {
    return <LoadingLayout />;
  }

  // Kiểm tra user có role được phép vào admin panel không
  const hasAdminRole = user?.roles?.some(r =>
    ALLOWED_ADMIN_ROLES.includes((r.role ?? "").toString().toLowerCase())
  ) || ALLOWED_ADMIN_ROLES.includes((user?.role ?? "").toString().toLowerCase());

  if (!user || !hasAdminRole) {
    return <Navigate to={ROUTER_URL.ADMIN_LOGIN} replace state={{ from: location }} />;
  }

  return <Outlet />;
};

export default AdminGuard;

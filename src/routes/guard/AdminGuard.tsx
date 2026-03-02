import { Navigate, Outlet, useLocation } from "react-router-dom";
import { isAdminRole } from "../../models";
import LoadingLayout from "../../layouts/Loading.layout";
import { useAuthStore } from "../../store";
import { ROUTER_URL } from "../router.const";

const AdminGuard = () => {
  const location = useLocation();
  const { user, isInitialized } = useAuthStore();

  if (!isInitialized) {
    return <LoadingLayout />;
  }

  // Kiểm tra user có role admin/system không
  const hasAdminRole = user?.roles?.some(r => isAdminRole(r.role)) || isAdminRole(user?.role);

  if (!user || !hasAdminRole) {
    return <Navigate to={ROUTER_URL.ADMIN_LOGIN} replace state={{ from: location }} />;
  }

  return <Outlet />;
};

export default AdminGuard;

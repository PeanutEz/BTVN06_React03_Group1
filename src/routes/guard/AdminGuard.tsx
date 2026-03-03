import { Navigate, Outlet, useLocation } from "react-router-dom";
import { ROLE_CODE } from "../../models/role.model";
import LoadingLayout from "../../layouts/Loading.layout";
import { useAuthStore } from "../../store";
import { ROUTER_URL } from "../router.const";

const STAFF_ROLES = new Set<string>([
  ROLE_CODE.ADMIN,
  ROLE_CODE.MANAGER,
  ROLE_CODE.STAFF,
  ROLE_CODE.SHIPPER,
]);

const AdminGuard = () => {
  const location = useLocation();
  const { user, isInitialized } = useAuthStore();

  if (!isInitialized) {
    return <LoadingLayout />;
  }

  // Kiểm tra user có bất kỳ role nội bộ nào không (Admin / Manager / Staff / Shipper)
  const hasStaffRole = user?.roles?.some(r => STAFF_ROLES.has(r.role?.toUpperCase() ?? ""))
    || STAFF_ROLES.has(user?.role?.toUpperCase() ?? "");

  if (!user || !hasStaffRole) {
    return <Navigate to={ROUTER_URL.ADMIN_LOGIN} replace state={{ from: location }} />;
  }

  return <Outlet />;
};

export default AdminGuard;

import { Navigate, Route } from "react-router-dom";
import AdminLayout from "../../layouts/admin/Admin.layout";
import AdminGuard from "../guard/AdminGuard";
import AdminOnlyGuard from "../guard/AdminOnlyGuard";
import { ROUTER_URL } from "../router.const";
import { ADMIN_MENU } from "./Admin.menu";
import { useAuthStore } from "../../store";

const AdminIndexRedirect = () => {
  const { user } = useAuthStore();
  const role = (
    (user?.active_context as { role?: string } | null)?.role ??
    user?.role ??
    ""
  ).toUpperCase();

  if (role === "SHIPPER") {
    return <Navigate to={ROUTER_URL.ADMIN_ROUTES.DELIVERIES} replace />;
  }
  if (role === "MANAGER" || role === "STAFF") {
    return <Navigate to={ROUTER_URL.ADMIN_ROUTES.CUSTOMERS} replace />;
  }
  // ADMIN / SYSTEM → Dashboard
  return <Navigate to={ROUTER_URL.ADMIN_ROUTES.DASHBOARD} replace />;
};

export const AdminRoutes = (
  <Route element={<AdminGuard />}>
    <Route path={ROUTER_URL.ADMIN} element={<AdminLayout />}>
      <Route index element={<AdminIndexRedirect />} />
      {ADMIN_MENU.map((item) =>
        item.path === ROUTER_URL.ADMIN_ROUTES.DASHBOARD ? (
          <Route key={item.path} element={<AdminOnlyGuard />}>
            <Route path={item.path} element={<item.component />} />
          </Route>
        ) : (
          <Route key={item.path} path={item.path} element={<item.component />} />
        )
      )}
    </Route>
  </Route>
);

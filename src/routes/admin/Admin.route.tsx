import { Route } from "react-router-dom";
import AdminLayout from "../../layouts/admin/Admin.layout";
import AdminGuard from "../guard/AdminGuard";
import { ROUTER_URL } from "../router.const";
import { ADMIN_MENU } from "./Admin.menu";

export const AdminRoutes = (
  <Route element={<AdminGuard />}>
    <Route path={ROUTER_URL.ADMIN} element={<AdminLayout />}>
      {ADMIN_MENU.map((item) => (
        <Route key={item.path} path={item.path} element={<item.component />} />
      ))}
    </Route>
  </Route>
);

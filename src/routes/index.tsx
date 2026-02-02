import React from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import LoadingLayout from "../layouts/Loading.layout";
import ClientLayout from "../layouts/client/Client.layout";
import AdminLayout from "../layouts/admin/Admin.layout";
import AdminGuard from "./guard/AdminGuard";
import { ROUTER_URL } from "./router.const";
import { CLIENT_MENU } from "./client/Client.menu";
import { ADMIN_MENU } from "./admin/Admin.menu";
import LoginPage from "../pages/client/auth/Login.page";
import RegisterPage from "../pages/client/auth/Register.page";
import ResetPasswordPage from "../pages/client/auth/ResetPassword.page";
import AdminLoginPage from "../pages/admin/auth/Login.page";

const NotFound = React.lazy(() => import("../pages/NotFoundPage.page"));

function AppRoutes() {
  return (
    <BrowserRouter>
      <React.Suspense fallback={<LoadingLayout />}>
        <Routes>
          {/* Public client pages */}
          <Route element={<ClientLayout />}>
            {CLIENT_MENU.map((item) => (
              <Route key={item.path} path={item.path} element={<item.component />} />
            ))}
          </Route>

          {/* Client auth */}
          <Route path={ROUTER_URL.LOGIN} element={<LoginPage />} />
          <Route path={ROUTER_URL.REGISTER} element={<RegisterPage />} />
          <Route path={ROUTER_URL.RESET_PASSWORD} element={<ResetPasswordPage />} />

          {/* Admin auth */}
          <Route path={ROUTER_URL.ADMIN_LOGIN} element={<AdminLoginPage />} />

          {/* Admin protected */}
          <Route element={<AdminGuard />}>
            <Route path={ROUTER_URL.ADMIN} element={<AdminLayout />}>
              {ADMIN_MENU.map((item) => (
                <Route key={item.path} path={item.path} element={<item.component />} />
              ))}
            </Route>
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </React.Suspense>
    </BrowserRouter>
  );
}

export default AppRoutes;

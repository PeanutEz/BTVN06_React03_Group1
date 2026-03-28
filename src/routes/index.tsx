import React from "react";
import type { ErrorInfo } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { RouteChangeLoading } from "../components";
import ScrollToTopOnNavigate from "../components/ui/ScrollToTopOnNavigate";
import { useGlobalOverlayScrollLock } from "../hooks/useGlobalOverlayScrollLock";
import LoadingLayout from "../layouts/Loading.layout";
import AdminLayout from "../layouts/admin/Admin.layout";
import ClientLayout from "../layouts/client/Client.layout";
import CustomerAccountLayout from "../layouts/client/CustomerAccount.layout";
import LandingLayout from "../layouts/landing/Landing.layout";
import AdminLoginPage from "../pages/admin/auth/Login.page";
import LoginPage from "../pages/client/auth/Login.page";
import RegisterPage from "../pages/client/auth/Register.page";
import ResetPasswordPage from "../pages/client/auth/ResetPassword.page";
import VerifyEmailPage from "../pages/client/auth/VerifyEmail.page";
import { ADMIN_MENU } from "./admin/Admin.menu.tsx";
import {
  CLIENT_ACCOUNT_ROUTE_ITEMS,
  CLIENT_MENU_PROTECTED_ROUTE_ITEMS,
  CLIENT_MENU_PUBLIC_ROUTE_ITEMS,
  CLIENT_STANDARD_ROUTE_ITEMS,
} from "./client/clientRoute.config";
import AdminGuard from "./guard/AdminGuard";
import AuthGuard from "./guard/AuthGuard";
import { ROUTER_URL } from "./router.const";

class AdminErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[AdminErrorBoundary] caught:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-slate-900 p-8 text-white">
          <div className="w-full max-w-lg rounded-2xl border border-red-500/30 bg-slate-800/90 p-8">
            <p className="mb-2 text-2xl font-bold text-red-400">Lá»—i trang</p>
            <p className="mb-4 text-sm text-slate-300">{this.state.error.message}</p>
            <button
              onClick={() => {
                this.setState({ error: null });
                window.location.reload();
              }}
              className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600"
            >
              Táº£i láº¡i trang
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const NotFound = React.lazy(() => import("../pages/NotFoundPage.page"));
const LandingPage = React.lazy(() => import("../pages/client/Landing.page"));
const StaffOrdersPage = React.lazy(() => import("../pages/orders/OrdersList.page"));

function AppRoutes() {
  useGlobalOverlayScrollLock();

  return (
    <BrowserRouter>
      <RouteChangeLoading minDurationMs={1500} />
      <ScrollToTopOnNavigate />
      <React.Suspense fallback={<LoadingLayout />}>
        <Routes>
          <Route element={<LandingLayout />}>
            <Route path={ROUTER_URL.HOME} element={<LandingPage />} />
          </Route>

          <Route element={<ClientLayout />}>
            <Route path={ROUTER_URL.ORDERS_STAFF} element={<StaffOrdersPage />} />
          </Route>

          <Route element={<ClientLayout />}>
            {CLIENT_MENU_PUBLIC_ROUTE_ITEMS.map((route) => (
              <Route key={route.path} path={route.path} element={route.render()} />
            ))}

            <Route element={<AuthGuard />}>
              {CLIENT_MENU_PROTECTED_ROUTE_ITEMS.map((route) => (
                <Route key={route.path} path={route.path} element={route.render()} />
              ))}
            </Route>
          </Route>

          <Route element={<ClientLayout />}>
            {CLIENT_STANDARD_ROUTE_ITEMS.map((route) => (
              <Route key={route.path} path={route.path} element={route.render()} />
            ))}

            <Route element={<AuthGuard />}>
              <Route path="customer" element={<CustomerAccountLayout />}>
                {CLIENT_ACCOUNT_ROUTE_ITEMS.map((route) => (
                  <Route key={route.path} path={route.path} element={route.render()} />
                ))}
              </Route>
            </Route>
          </Route>

          <Route path={ROUTER_URL.LOGIN} element={<LoginPage />} />
          <Route path={ROUTER_URL.REGISTER} element={<RegisterPage />} />
          <Route path={ROUTER_URL.RESET_PASSWORD} element={<ResetPasswordPage />} />
          <Route path={ROUTER_URL.VERIFY_EMAIL} element={<VerifyEmailPage />} />
          <Route path={ROUTER_URL.VERIFY_EMAIL_ALT} element={<VerifyEmailPage />} />

          <Route path={ROUTER_URL.ADMIN_LOGIN} element={<AdminLoginPage />} />

          <Route element={<AdminGuard />}>
            <Route path={ROUTER_URL.ADMIN} element={<AdminLayout />}>
              {ADMIN_MENU.map((item) => (
                <Route
                  key={item.path}
                  path={item.path}
                  element={
                    <AdminErrorBoundary>
                      <item.component />
                    </AdminErrorBoundary>
                  }
                />
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

import React from "react";
import type { ErrorInfo } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { RouteChangeLoading } from "../components";
import ScrollToTopOnNavigate from "../components/ui/ScrollToTopOnNavigate";
import LoadingLayout from "../layouts/Loading.layout";
import ClientLayout from "../layouts/client/Client.layout";
import CustomerAccountLayout from "../layouts/client/CustomerAccount.layout";
import LandingLayout from "../layouts/landing/Landing.layout";
import AdminLayout from "../layouts/admin/Admin.layout";
import AdminGuard from "./guard/AdminGuard";
import AuthGuard from "./guard/AuthGuard";
import { ROUTER_URL } from "./router.const";
import { CLIENT_MENU } from "./client/Client.menu";
import { ADMIN_MENU } from "./admin/Admin.menu";
import LoginPage from "../pages/client/auth/Login.page";
import RegisterPage from "../pages/client/auth/Register.page";
import ResetPasswordPage from "../pages/client/auth/ResetPassword.page";
import VerifyEmailPage from "../pages/client/auth/VerifyEmail.page";
import AdminLoginPage from "../pages/admin/auth/Login.page";

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
        <div className="flex min-h-screen items-center justify-center bg-slate-900 text-white p-8">
          <div className="rounded-2xl border border-red-500/30 bg-slate-800/90 p-8 max-w-lg w-full">
            <p className="text-2xl font-bold text-red-400 mb-2">Lỗi trang</p>
            <p className="text-slate-300 text-sm mb-4">{this.state.error.message}</p>
            <button
              onClick={() => { this.setState({ error: null }); window.location.reload(); }}
              className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600"
            >
              Tải lại trang
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
const CustomerProfilePage = React.lazy(() => import("../pages/client/customer/CustomerProfile.page"));
const CustomerOrdersPage = React.lazy(() => import("../pages/client/customer/CustomerOrders.page"));
const LoyaltyDashboardPage = React.lazy(() => import("../pages/client/loyalty/LoyaltyDashboard.page"));
const CartPage = React.lazy(() => import("../pages/client/Cart.page"));
const ContactPage = React.lazy(() => import("../pages/client/Contact.page"));
const CustomerChangePasswordPage = React.lazy(() => import("../pages/client/customer/CustomerChangePassword.page"));
const MenuPage = React.lazy(() => import("../pages/client/menu/Menu.page"));
const MenuCheckoutPage = React.lazy(() => import("../pages/client/menu/MenuCheckout.page"));
function MenuCheckoutPageWithKey() {
  const location = useLocation();
  return <MenuCheckoutPage key={location.key} />;
}
const OrderStatusPage = React.lazy(() => import("../pages/client/menu/OrderStatus.page"));
const PaymentProcessPage = React.lazy(() => import("../pages/client/menu/PaymentProcess.page"));
const PaymentSuccessPage = React.lazy(() => import("../pages/client/menu/PaymentSuccess.page"));
const PaymentFailedPage = React.lazy(() => import("../pages/client/menu/PaymentFailed.page"));
const ReceivingSetupPage = React.lazy(() => import("../pages/client/ReceivingSetup.page"));
const CheckoutPage = React.lazy(() => import("../pages/client/Checkout.page"));
const InboxPage = React.lazy(() => import("../pages/client/inbox/Inbox.page"));

function AppRoutes() {
  return (
    <BrowserRouter>
      <RouteChangeLoading minDurationMs={1500} />
      <ScrollToTopOnNavigate />
      <React.Suspense fallback={<LoadingLayout />}>
        <Routes>
          {/* Landing page with its own header */}
          <Route element={<LandingLayout />}>
            <Route path={ROUTER_URL.HOME} element={<LandingPage />} />
          </Route>

          {/* Staff Orders (KAN-86) */}
          <Route element={<ClientLayout />}>
            <Route path={ROUTER_URL.ORDERS_STAFF} element={<StaffOrdersPage />} />
          </Route>

          {/* Menu */}
          <Route element={<ClientLayout />}>
            {/* Receiving setup – auth required, no branch required */}
          <Route element={<AuthGuard />}>
            <Route path={ROUTER_URL.RECEIVING_SETUP} element={<ReceivingSetupPage />} />
          </Route>

          {/* Menu – public: guests can browse; auth required to add to cart (handled in-page) */}
          <Route path={ROUTER_URL.MENU} element={<MenuPage />} />

          {/* Menu checkout & order status – auth required only */}
          <Route element={<AuthGuard />}>
            <Route path={ROUTER_URL.MENU_CHECKOUT} element={<MenuCheckoutPageWithKey />} />
            <Route path={ROUTER_URL.MENU_ORDER_STATUS} element={<OrderStatusPage />} />
            <Route path={ROUTER_URL.PAYMENT_PROCESS} element={<PaymentProcessPage />} />
            <Route path={ROUTER_URL.PAYMENT_SUCCESS} element={<PaymentSuccessPage />} />
            <Route path={ROUTER_URL.PAYMENT_FAILED} element={<PaymentFailedPage />} />
          </Route>

          {/* Inbox – auth required */}
          <Route element={<AuthGuard />}>
            <Route path={ROUTER_URL.INBOX} element={<InboxPage />} />
          </Route>

          <Route path={ROUTER_URL.CHECKOUT} element={<CheckoutPage />} />
          </Route>

          {/* Public client pages with standard header */}
          <Route element={<ClientLayout />}>
            {CLIENT_MENU.filter((item) => item.path !== ROUTER_URL.HOME && item.path !== ROUTER_URL.ACCOUNT && item.path !== ROUTER_URL.MENU).map((item) => (
              <Route key={item.path} path={item.path} element={<item.component />} />
            ))}

            <Route element={<AuthGuard />}>
              <Route path="customer" element={<CustomerAccountLayout />}>
                <Route path="account" element={<CustomerProfilePage />} />
                <Route path="change-password" element={<CustomerChangePasswordPage />} />
                <Route path="loyalty" element={<LoyaltyDashboardPage />} />
                <Route path="loyoty" element={<Navigate to={ROUTER_URL.CUSTOMER_MEMBERSHIP} replace />} />
                <Route path="order" element={<CustomerOrdersPage />} />
                <Route path="cart" element={<CartPage />} />
                <Route path="support" element={<ContactPage />} />
              </Route>
            </Route>
          </Route>

          {/* Client auth */}          <Route path={ROUTER_URL.LOGIN} element={<LoginPage />} />
          <Route path={ROUTER_URL.REGISTER} element={<RegisterPage />} />
          <Route path={ROUTER_URL.RESET_PASSWORD} element={<ResetPasswordPage />} />
          <Route path={ROUTER_URL.VERIFY_EMAIL} element={<VerifyEmailPage />} />
          <Route path={ROUTER_URL.VERIFY_EMAIL_ALT} element={<VerifyEmailPage />} />

          {/* Admin auth */}
          <Route path={ROUTER_URL.ADMIN_LOGIN} element={<AdminLoginPage />} />          {/* Admin protected */}
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

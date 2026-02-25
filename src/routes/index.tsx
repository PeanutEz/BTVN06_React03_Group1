import React from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import ScrollToTopOnNavigate from "../components/ui/ScrollToTopOnNavigate";
import LoadingLayout from "../layouts/Loading.layout";
import ClientLayout from "../layouts/client/Client.layout";
import CustomerAccountLayout from "../layouts/client/CustomerAccount.layout";
import LandingLayout from "../layouts/landing/Landing.layout";
import AdminLayout from "../layouts/admin/Admin.layout";
import AdminGuard from "./guard/AdminGuard";
import AuthGuard from "./guard/AuthGuard";
import ReceivingGuard from "./guard/ReceivingGuard";
import { ROUTER_URL } from "./router.const";
import { CLIENT_MENU } from "./client/Client.menu";
import { ADMIN_MENU } from "./admin/Admin.menu";
import LoginPage from "../pages/client/auth/Login.page";
import RegisterPage from "../pages/client/auth/Register.page";
import ResetPasswordPage from "../pages/client/auth/ResetPassword.page";
import AdminLoginPage from "../pages/admin/auth/Login.page";

const NotFound = React.lazy(() => import("../pages/NotFoundPage.page"));
const LandingPage = React.lazy(() => import("../pages/client/Landing.page"));
const StaffOrdersPage = React.lazy(() => import("../pages/orders/OrdersList.page"));
const CustomerProfilePage = React.lazy(() => import("../pages/client/customer/CustomerProfile.page"));
const CustomerAddressBookPage = React.lazy(() => import("../pages/client/customer/CustomerAddressBook.page"));
const CustomerOrdersPage = React.lazy(() => import("../pages/client/customer/CustomerOrders.page"));
const CustomerFavoritesPage = React.lazy(() => import("../pages/client/customer/CustomerFavorites.page"));
const LoyaltyDashboardPage = React.lazy(() => import("../pages/client/loyalty/LoyaltyDashboard.page"));
const LoyaltyPointsPage = React.lazy(() => import("../pages/client/loyalty/LoyaltyPoints.page"));
const CartPage = React.lazy(() => import("../pages/client/Cart.page"));
const ContactPage = React.lazy(() => import("../pages/client/Contact.page"));
const MenuPage = React.lazy(() => import("../pages/client/menu/Menu.page"));
const MenuCheckoutPage = React.lazy(() => import("../pages/client/menu/MenuCheckout.page"));
const OrderStatusPage = React.lazy(() => import("../pages/client/menu/OrderStatus.page"));
const ReceivingSetupPage = React.lazy(() => import("../pages/client/ReceivingSetup.page"));
const CheckoutPage = React.lazy(() => import("../pages/client/Checkout.page"));

function AppRoutes() {
  return (
    <BrowserRouter>
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

          {/* Menu – auth + receiving method both required */}
          <Route element={<AuthGuard />}>
            <Route element={<ReceivingGuard />}>
              <Route path={ROUTER_URL.MENU} element={<MenuPage />} />
              <Route path={ROUTER_URL.MENU_CHECKOUT} element={<MenuCheckoutPage />} />
              <Route path={ROUTER_URL.MENU_ORDER_STATUS} element={<OrderStatusPage />} />
            </Route>
          </Route>
          <Route path={ROUTER_URL.CHECKOUT} element={<CheckoutPage />} />
          </Route>

          {/* Public client pages with standard header */}
          <Route element={<ClientLayout />}>
            {CLIENT_MENU.filter((item) => item.path !== ROUTER_URL.HOME && item.path !== ROUTER_URL.ACCOUNT).map((item) => (
              <Route key={item.path} path={item.path} element={<item.component />} />
            ))}

            <Route path="customer" element={<CustomerAccountLayout />}>
              <Route path="account" element={<CustomerProfilePage />} />
              <Route path="address-book" element={<CustomerAddressBookPage />} />
              <Route path="membership" element={<LoyaltyDashboardPage />} />
              <Route path="vouchers" element={<LoyaltyPointsPage />} />
              <Route path="order" element={<CustomerOrdersPage />} />
              <Route path="cart" element={<CartPage />} />
              <Route path="product-favorite" element={<CustomerFavoritesPage />} />
              <Route path="ordered" element={<CustomerOrdersPage />} />
              <Route path="support" element={<ContactPage />} />
            </Route>
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

import { Navigate, Route } from "react-router-dom";
import React from "react";
import ClientLayout from "../../layouts/client/Client.layout";
import CustomerAccountLayout from "../../layouts/client/CustomerAccount.layout";
import ClientGuard from "../guard/ClientGuard";
import { CLIENT_MENU } from "./Client.menu";
import { ROUTER_URL } from "../router.const";

const CustomerProfile = React.lazy(() => import("../../pages/client/customer/CustomerProfile.page"));
const CustomerChangePassword = React.lazy(() => import("../../pages/client/customer/CustomerChangePassword.page"));
const CustomerOrders = React.lazy(() => import("../../pages/client/customer/CustomerOrders.page"));
const LoyaltyDashboard = React.lazy(() => import("../../pages/client/loyalty/LoyaltyDashboard.page"));
const CartPage = React.lazy(() => import("../../pages/client/Cart.page"));
const ContactPage = React.lazy(() => import("../../pages/client/Contact.page"));

export const ClientRoutes = (
  <Route element={<ClientGuard />}>
    <Route element={<ClientLayout />}>
      {CLIENT_MENU.filter((item) => item.path !== ROUTER_URL.ACCOUNT).map((item) => (
        <Route key={item.path} path={item.path} element={<item.component />} />
      ))}
      <Route path={ROUTER_URL.CART.replace(/^\//, "")} element={<Navigate to={ROUTER_URL.CUSTOMER_CART} replace />} />
      <Route path="customer" element={<CustomerAccountLayout />}>
        <Route path="account" element={<CustomerProfile />} />
        <Route path="change-password" element={<CustomerChangePassword />} />
        <Route path="loyalty" element={<LoyaltyDashboard />} />
        <Route path="loyoty" element={<Navigate to={ROUTER_URL.CUSTOMER_MEMBERSHIP} replace />} />
        <Route path="order" element={<CustomerOrders />} />
        <Route path="cart" element={<CartPage />} />
        <Route path="support" element={<ContactPage />} />
      </Route>
    </Route>
  </Route>
);

import { Route } from "react-router-dom";
import React from "react";
import ClientLayout from "../../layouts/client/Client.layout";
import CustomerAccountLayout from "../../layouts/client/CustomerAccount.layout";
import ClientGuard from "../guard/ClientGuard";
import { CLIENT_MENU } from "./Client.menu";
import { ROUTER_URL } from "../router.const";

const CustomerProfile = React.lazy(() => import("../../pages/client/customer/CustomerProfile.page"));
const CustomerAddressBook = React.lazy(() => import("../../pages/client/customer/CustomerAddressBook.page"));
const CustomerOrders = React.lazy(() => import("../../pages/client/customer/CustomerOrders.page"));
const CustomerFavorites = React.lazy(() => import("../../pages/client/customer/CustomerFavorites.page"));
const LoyaltyDashboard = React.lazy(() => import("../../pages/client/loyalty/LoyaltyDashboard.page"));
const LoyaltyPoints = React.lazy(() => import("../../pages/client/loyalty/LoyaltyPoints.page"));
const CartPage = React.lazy(() => import("../../pages/client/Cart.page"));
const ContactPage = React.lazy(() => import("../../pages/client/Contact.page"));

export const ClientRoutes = (
  <Route element={<ClientGuard />}>
    <Route element={<ClientLayout />}>
      {CLIENT_MENU.filter((item) => item.path !== ROUTER_URL.ACCOUNT).map((item) => (
        <Route key={item.path} path={item.path} element={<item.component />} />
      ))}
      <Route path="customer" element={<CustomerAccountLayout />}>
        <Route path="account" element={<CustomerProfile />} />
        <Route path="address-book" element={<CustomerAddressBook />} />
        <Route path="membership" element={<LoyaltyDashboard />} />
        <Route path="vouchers" element={<LoyaltyPoints />} />
        <Route path="order" element={<CustomerOrders />} />
        <Route path="cart" element={<CartPage />} />
        <Route path="product-favorite" element={<CustomerFavorites />} />
        <Route path="ordered" element={<CustomerOrders />} />
        <Route path="support" element={<ContactPage />} />
      </Route>
    </Route>
  </Route>
);

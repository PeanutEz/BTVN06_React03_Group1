import type { JSX } from "react";
import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { ROUTER_URL } from "../router.const";
import { CLIENT_MENU } from "./Client.menu";

export type ClientRouteDefinition = {
  path: string;
  render: () => JSX.Element;
};

const CustomerProfilePage = React.lazy(
  () => import("../../pages/client/customer/CustomerProfile.page"),
);
const CustomerChangePasswordPage = React.lazy(
  () => import("../../pages/client/customer/CustomerChangePassword.page"),
);
const CustomerOrdersPage = React.lazy(
  () => import("../../pages/client/customer/CustomerOrders.page"),
);
const LoyaltyDashboardPage = React.lazy(
  () => import("../../pages/client/loyalty/LoyaltyDashboard.page"),
);
const CartPage = React.lazy(() => import("../../pages/client/Cart.page"));
const ContactPage = React.lazy(() => import("../../pages/client/Contact.page"));

const MenuPage = React.lazy(() => import("../../pages/client/menu/Menu.page"));
const MenuCheckoutPage = React.lazy(
  () => import("../../pages/client/menu/MenuCheckout.page"),
);
const OrderStatusPage = React.lazy(
  () => import("../../pages/client/menu/OrderStatus.page"),
);
const PaymentProcessPage = React.lazy(
  () => import("../../pages/client/menu/PaymentProcess.page"),
);
const PaymentSuccessPage = React.lazy(
  () => import("../../pages/client/menu/PaymentSuccess.page"),
);
const PaymentFailedPage = React.lazy(
  () => import("../../pages/client/menu/PaymentFailed.page"),
);
const ReceivingSetupPage = React.lazy(
  () => import("../../pages/client/ReceivingSetup.page"),
);
const CheckoutPage = React.lazy(() => import("../../pages/client/Checkout.page"));
const InboxPage = React.lazy(() => import("../../pages/client/inbox/Inbox.page"));

function MenuCheckoutPageWithKey() {
  const location = useLocation();
  return <MenuCheckoutPage key={location.key} />;
}

function RedirectToCustomerMembership() {
  return <Navigate to={ROUTER_URL.CUSTOMER_MEMBERSHIP} replace />;
}

const excludedStandardRoutes = new Set<string>([
  ROUTER_URL.HOME,
  ROUTER_URL.ACCOUNT,
  ROUTER_URL.MENU,
]);

export const CLIENT_STANDARD_ROUTE_ITEMS: ClientRouteDefinition[] = CLIENT_MENU
  .filter((item) => !excludedStandardRoutes.has(item.path))
  .map((item) => ({
    path: item.path,
    render: () => <item.component />,
  }));

export const CLIENT_ACCOUNT_ROUTE_ITEMS: ClientRouteDefinition[] = [
  {
    path: "account",
    render: () => <CustomerProfilePage />,
  },
  {
    path: "change-password",
    render: () => <CustomerChangePasswordPage />,
  },
  {
    path: "loyalty",
    render: () => <LoyaltyDashboardPage />,
  },
  {
    path: "loyoty",
    render: () => <RedirectToCustomerMembership />,
  },
  {
    path: "order",
    render: () => <CustomerOrdersPage />,
  },
  {
    path: "cart",
    render: () => <CartPage />,
  },
  {
    path: "support",
    render: () => <ContactPage />,
  },
];

export const CLIENT_MENU_PUBLIC_ROUTE_ITEMS: ClientRouteDefinition[] = [
  {
    path: ROUTER_URL.MENU,
    render: () => <MenuPage />,
  },
  {
    path: ROUTER_URL.CHECKOUT,
    render: () => <CheckoutPage />,
  },
];

export const CLIENT_MENU_PROTECTED_ROUTE_ITEMS: ClientRouteDefinition[] = [
  {
    path: ROUTER_URL.RECEIVING_SETUP,
    render: () => <ReceivingSetupPage />,
  },
  {
    path: ROUTER_URL.MENU_CHECKOUT,
    render: () => <MenuCheckoutPageWithKey />,
  },
  {
    path: ROUTER_URL.MENU_ORDER_STATUS,
    render: () => <OrderStatusPage />,
  },
  {
    path: ROUTER_URL.PAYMENT_PROCESS_VNPAY,
    render: () => <PaymentProcessPage />,
  },
  {
    path: ROUTER_URL.PAYMENT_PROCESS_COD,
    render: () => <PaymentProcessPage />,
  },
  {
    path: ROUTER_URL.PAYMENT_PROCESS_LEGACY,
    render: () => <PaymentProcessPage />,
  },
  {
    path: ROUTER_URL.PAYMENT_SUCCESS,
    render: () => <PaymentSuccessPage />,
  },
  {
    path: ROUTER_URL.PAYMENT_FAILED,
    render: () => <PaymentFailedPage />,
  },
  {
    path: ROUTER_URL.INBOX,
    render: () => <InboxPage />,
  },
];

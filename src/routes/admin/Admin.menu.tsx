import React from "react";
import type { JSX } from "react";
import { ROUTER_URL } from "../router.const";

export type AdminMenuItem = {
	label: string;
	path: string;
	component: React.LazyExoticComponent<() => JSX.Element>;
	isEnd?: boolean;
};

export const ADMIN_MENU: AdminMenuItem[] = [
	{
		label: "Dashboard",
		path: ROUTER_URL.ADMIN_ROUTES.DASHBOARD,
		component: React.lazy(() => import("../../pages/admin/dashboard/Dashboard.page.tsx")),
		isEnd: true,
	},
	{
		label: "Users",
		path: ROUTER_URL.ADMIN_ROUTES.USERS,
		component: React.lazy(() => import("../../pages/admin/user/User.page.tsx")),
	},
	{
		label: "Orders",
		path: ROUTER_URL.ADMIN_ROUTES.ORDERS,
		component: React.lazy(() => import("../../pages/admin/order/OrderList.page.tsx")),
		isEnd: true,
	},
	{
		label: "Order Detail",
		path: ROUTER_URL.ADMIN_ROUTES.ORDER_DETAIL,
		component: React.lazy(() => import("../../pages/admin/order/OrderDetail.page.tsx")),
	},
	{
		label: "Customers",
		path: ROUTER_URL.ADMIN_ROUTES.CUSTOMERS,
		component: React.lazy(() => import("../../pages/admin/customer/CustomerList.page.tsx")),
		isEnd: true,
	},
	{
		label: "Customer Detail",
		path: ROUTER_URL.ADMIN_ROUTES.CUSTOMER_DETAIL,
		component: React.lazy(() => import("../../pages/admin/customer/CustomerDetail.page.tsx")),
	},
	{
		label: "Payments",
		path: ROUTER_URL.ADMIN_ROUTES.PAYMENTS,
		component: React.lazy(() => import("../../pages/admin/payment/PaymentList.page.tsx")),
		isEnd: true,
	},
	{
		label: "Payment Detail",
		path: ROUTER_URL.ADMIN_ROUTES.PAYMENT_DETAIL,
		component: React.lazy(() => import("../../pages/admin/payment/PaymentDetail.page.tsx")),
	},
	{
		label: "Loyalty",
		path: ROUTER_URL.ADMIN_ROUTES.LOYALTY,
		component: React.lazy(() => import("../../pages/admin/loyalty/LoyaltyManagement.page.tsx")),
	},
	{
		label: "Franchises",
		path: ROUTER_URL.ADMIN_ROUTES.FRANCHISE_LIST,
		component: React.lazy(() => import("../../pages/admin/franchise/FranchiseList.page.tsx")),
		isEnd: true,
	},
	{
		label: "Franchise Detail",
		path: ROUTER_URL.ADMIN_ROUTES.FRANCHISE_DETAIL,
		component: React.lazy(() => import("../../pages/admin/franchise/FranchiseDetail.page.tsx")),
	},
	{
		label: "Franchise Create",
		path: ROUTER_URL.ADMIN_ROUTES.FRANCHISE_CREATE,
		component: React.lazy(() => import("../../pages/admin/franchise/FranchiseCreateEdit.page.tsx")),
	},
	{
		label: "Franchise Inventory",
		path: ROUTER_URL.ADMIN_ROUTES.INVENTORY_BY_FRANCHISE,
		component: React.lazy(() => import("../../pages/admin/inventory/InventoryByFranchise.page.tsx")),
	},
];

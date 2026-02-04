import type { JSX } from "react";
import React from "react";
import { ROUTER_URL } from "../router.const";

export type ClientMenuItem = {
	label: string;
	path: string;
	component: React.LazyExoticComponent<() => JSX.Element>;
	isEnd?: boolean;
	showInNav?: boolean;
};

export const CLIENT_MENU: ClientMenuItem[] = [
	{
		label: "Trang chủ",
		path: ROUTER_URL.HOME,
		component: React.lazy(() => import("../../pages/client/Landing.page")),
		isEnd: true,
		showInNav: true,
	},
	{
		label: "Đặt hàng",
		path: ROUTER_URL.ORDER,
		component: React.lazy(() => import("../../pages/client/Order.page")),
		isEnd: true,
		showInNav: true,
	},
	{
		label: "Danh mục",
		path: ROUTER_URL.CATEGORIES,
		component: React.lazy(() => import("@/modules/product/pages/CategoryList")),
		isEnd: true,
		showInNav: true,
	},
	{
		label: "Sản phẩm",
		path: ROUTER_URL.PRODUCTS,
		component: React.lazy(() => import("@/modules/product/pages/ProductList")),
		isEnd: true,
		showInNav: true,
	},
	{
		label: "Chi tiết sản phẩm",
		path: ROUTER_URL.PRODUCT_DETAIL,
		component: React.lazy(() => import("@/modules/product/pages/ProductDetail")),
		isEnd: false,
		showInNav: false, // Hidden from nav
	},
	{
		label: "Giới thiệu",
		path: ROUTER_URL.ABOUT,
		component: React.lazy(() => import("../../pages/client/About.page.tsx")),
		isEnd: true,
		showInNav: true,
	},
	{
		label: "Liên hệ",
		path: ROUTER_URL.CONTACT,
		component: React.lazy(() => import("../../pages/client/Contact.page.tsx")),
		isEnd: true,
		showInNav: true,
	},
	{
		label: "Hồ sơ",
		path: ROUTER_URL.PROFILE,
		component: React.lazy(() => import("@/modules/product/pages/Profile")),
		isEnd: true,
		showInNav: true,
	},
	{
		label: "Đơn hàng",
		path: ROUTER_URL.ORDERS,
		component: React.lazy(() => import("../../pages/client/OrderList.page")),
		isEnd: true,
		showInNav: false,
	},
	{
		label: "Chi tiết đơn hàng",
		path: ROUTER_URL.ORDER_DETAIL,
		component: React.lazy(() => import("../../pages/client/OrderDetail.page")),
		isEnd: false,
		showInNav: false,
	},
	{
		label: "Tích điểm",
		path: ROUTER_URL.LOYALTY,
		component: React.lazy(() => import("../../pages/client/Loyalty.page")),
		isEnd: true,
		showInNav: false,
	},
];

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
];

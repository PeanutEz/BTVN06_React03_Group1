import type { JSX } from "react";
import React from "react";
import { ROUTER_URL } from "../router.const";

export type ClientMenuItem = {
	label: string;
	path: string;
	component: React.LazyExoticComponent<() => JSX.Element>;
	isEnd?: boolean;
};

export const CLIENT_MENU: ClientMenuItem[] = [
	{
		label: "Trang chủ",
		path: ROUTER_URL.HOME,
		component: React.lazy(() => import("../../pages/client/Home.page.tsx")),
		isEnd: true,
	},
	{
		label: "Giới thiệu",
		path: ROUTER_URL.ABOUT,
		component: React.lazy(() => import("../../pages/client/About.page.tsx")),
		isEnd: true,
	},
	{
		label: "Liên hệ",
		path: ROUTER_URL.CONTACT,
		component: React.lazy(() => import("../../pages/client/Contact.page.tsx")),
		isEnd: true,
	},
];

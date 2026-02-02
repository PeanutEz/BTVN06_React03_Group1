export const ROUTER_URL = {
	HOME: "/",
	ABOUT: "/about",
	CONTACT: "/contact",
	LOGIN: "/login",
	REGISTER: "/register",
	RESET_PASSWORD: "/reset-password",

	// Browse & Product
	CATEGORIES: "/categories",
	PRODUCTS: "/products",
	PRODUCT_DETAIL: "/products/:id",

	ADMIN: "/admin",
	ADMIN_LOGIN: "/admin/login",
	ADMIN_ROUTES: {
		DASHBOARD: "dashboard",
		USERS: "users",
	},
} as const;

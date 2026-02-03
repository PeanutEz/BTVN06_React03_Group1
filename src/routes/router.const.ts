export const ROUTER_URL = {
	HOME: "/",
	ORDER: "/order",
	ABOUT: "/about",
	CONTACT: "/contact",
	LOGIN: "/login",
	REGISTER: "/register",
	RESET_PASSWORD: "/reset-password",
	PROFILE: "/profile",

	// Browse & Product
	CATEGORIES: "/categories",
	PRODUCTS: "/products",
	PRODUCT_DETAIL: "/products/:id",
	CART: "/cart",

	ADMIN: "/admin",
	ADMIN_LOGIN: "/admin/login",
	ADMIN_ROUTES: {
		DASHBOARD: "dashboard",
		USERS: "users",
		ORDERS: "orders",
		ORDER_DETAIL: "orders/:id",
		CUSTOMERS: "customers",
		CUSTOMER_DETAIL: "customers/:id",
		PAYMENTS: "payments",
		PAYMENT_DETAIL: "payments/:id",
		LOYALTY: "loyalty",
	},
} as const;

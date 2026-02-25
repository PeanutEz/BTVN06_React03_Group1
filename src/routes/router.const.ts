export const ROUTER_URL = {
  HOME: "/",
  ORDER: "/order",
  STORE_LOCATOR: "/he-thong-khong-gian",
  CONTACT: "/contact",
  LOGIN: "/login",
  REGISTER: "/register",
  RESET_PASSWORD: "/reset-password",
  PROFILE: "/profile",
  ACCOUNT: "/account",
  CART: "/cart",

  // Browse & Product
  CATEGORIES: "/categories",
  PRODUCTS: "/products",
  PRODUCT_DETAIL: "/products/:id",

  // Orders
  ORDERS_LIST: "/orders",
  ORDERS_STAFF: "/staff/orders", // KAN-86: Staff POS list
  ORDER_DETAIL: "/orders/:id",
  CUSTOMER_ORDERS: "/my-orders",

  // Loyalty
  LOYALTY_DASHBOARD: "/loyalty",
  LOYALTY_POINTS: "/loyalty/points",
  LOYALTY_TIER: "/loyalty/tier",
  LOYALTY_HISTORY: "/loyalty/history",

  // Static Pages
  STATIC_PAGE: "/page/:slug",

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
    PRODUCTS: "products",
    FRANCHISE_LIST: "franchises",
    FRANCHISE_DETAIL: "franchises/:id",
    FRANCHISE_CREATE: "franchises/create",
    INVENTORY_BY_FRANCHISE: "franchises/:id/inventory",
  },
} as const;

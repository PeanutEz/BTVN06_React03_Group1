export const ROUTER_URL = {
  HOME: "/",
  STORE_LOCATOR: "/he-thong-khong-gian",
  CONTACT: "/contact",  LOGIN: "/login",
  REGISTER: "/register",
  RESET_PASSWORD: "/reset-password",
  VERIFY_EMAIL: "/verify-customer-email/:token",
  PROFILE: "/profile",
  ACCOUNT: "/customer/account",
  CART: "/cart",

  // Customer account sub-pages
  CUSTOMER_PROFILE: "/customer/account",
  CUSTOMER_ADDRESS_BOOK: "/customer/address-book",
  CUSTOMER_MEMBERSHIP: "/customer/membership",
  CUSTOMER_VOUCHERS: "/customer/vouchers",
  CUSTOMER_ORDER_HISTORY: "/customer/order",
  CUSTOMER_CART: "/customer/cart",
  CUSTOMER_FAVORITES: "/customer/product-favorite",
  CUSTOMER_ORDERED: "/customer/ordered",
  CUSTOMER_SUPPORT: "/customer/support",

  // Browse & Product
  PRODUCT_DETAIL: "/products/:id",

  // Receiving setup (mandatory before browsing menu)
  RECEIVING_SETUP: "/receiving-setup",

  // Menu (new ecommerce menu flow)
  MENU: "/menu",
  MENU_DETAIL: "/menu/:id",
  MENU_CHECKOUT: "/menu/checkout",
  MENU_ORDER_STATUS: "/menu/orders/:orderId",
  CHECKOUT: "/checkout",

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

  // Inbox / Notifications
  INBOX: "/inbox",

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

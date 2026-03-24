import React from "react";
import type { JSX } from "react";
import { ROUTER_URL } from "../router.const";

export type AdminMenuItem = {
  label: string;
  path: string;
  component: React.LazyExoticComponent<() => JSX.Element | null>;
  isEnd?: boolean;
};

export const ADMIN_MENU: AdminMenuItem[] = [
  {
    label: "Dashboard",
    path: ROUTER_URL.ADMIN_ROUTES.DASHBOARD,
    component: React.lazy(
      () => import("../../pages/admin/dashboard/Dashboard.page.tsx"),
    ),
    isEnd: true,
  },
  {
    label: "Users",
    path: ROUTER_URL.ADMIN_ROUTES.USERS,
    component: React.lazy(() => import("../../pages/admin/user/User.page.tsx")),
  },
  {
    label: "User Franchise Roles",
    path: ROUTER_URL.ADMIN_ROUTES.USER_FRANCHISE_ROLES,
    component: React.lazy(
      () =>
        import("../../pages/admin/user-franchise-role/UserFranchiseRole.page.tsx"),
    ),
    isEnd: true,
  },  {
    label: "Orders",
    path: ROUTER_URL.ADMIN_ROUTES.ORDERS,
    component: React.lazy(
      () => import("../../pages/admin/order/OrderList.page.tsx"),
    ),
    isEnd: true,
  },
  {
    label: "Carts",
    path: ROUTER_URL.ADMIN_ROUTES.CARTS,
    component: React.lazy(
      () => import("../../pages/admin/cart/CartList.page.tsx"),
    ),
    isEnd: true,
  },
  {
    label: "Staff Create Cart",
    path: ROUTER_URL.ADMIN_ROUTES.STAFF_CREATE_CART,
    component: React.lazy(
      () => import("../../pages/admin/cart/StaffCreateCart.page.tsx"),
    ),
    isEnd: true,
  },
  {
    label: "Deliveries",
    path: ROUTER_URL.ADMIN_ROUTES.DELIVERIES,
    component: React.lazy(
      () => import("../../pages/admin/delivery/Delivery.page.tsx"),
    ),
    isEnd: true,
  },
  {
    label: "Order Detail",
    path: ROUTER_URL.ADMIN_ROUTES.ORDER_DETAIL,
    component: React.lazy(
      () => import("../../pages/admin/order/OrderDetail.page.tsx"),
    ),
  },  {
    label: "Customers",
    path: ROUTER_URL.ADMIN_ROUTES.CUSTOMERS,
    component: React.lazy(
      () => import("../../pages/admin/customer/CustomerList.page.tsx"),
    ),
    isEnd: true,
  },
  {
    label: "Customer Detail",
    path: ROUTER_URL.ADMIN_ROUTES.CUSTOMER_DETAIL,
    component: React.lazy(
      () => import("../../pages/admin/customer/CustomerDetail.page.tsx"),
    ),
  },
  {
    label: "Customer Franchises",
    path: ROUTER_URL.ADMIN_ROUTES.CUSTOMER_FRANCHISES,
    component: React.lazy(
      () => import("../../pages/admin/customer-franchise/CustomerFranchise.page.tsx"),
    ),
    isEnd: true,
  },
  {
    label: "Payments",
    path: ROUTER_URL.ADMIN_ROUTES.PAYMENTS,
    component: React.lazy(
      () => import("../../pages/admin/payment/PaymentList.page.tsx"),
    ),
    isEnd: true,
  },
  {
    label: "Payment Detail",
    path: ROUTER_URL.ADMIN_ROUTES.PAYMENT_DETAIL,
    component: React.lazy(
      () => import("../../pages/admin/payment/PaymentDetail.page.tsx"),
    ),
  },
  {
    label: "Loyalty",
    path: ROUTER_URL.ADMIN_ROUTES.LOYALTY,
    component: React.lazy(
      () => import("../../pages/admin/loyalty/LoyaltyManagement.page.tsx"),
    ),
  },
  {
    label: "Products",
    path: ROUTER_URL.ADMIN_ROUTES.PRODUCTS,
    component: React.lazy(
      () => import("../../pages/admin/product/ProductList.page.tsx"),
    ),
  },
  {
    label: "Vouchers",
    path: ROUTER_URL.ADMIN_ROUTES.VOUCHERS,
    component: React.lazy(
      () => import("../../pages/admin/voucher/VoucherList.page.tsx"),
    ),
  },
  {
    label: "Product Franchises",
    path: ROUTER_URL.ADMIN_ROUTES.PRODUCT_FRANCHISES,
    component: React.lazy(
      () =>
        import("../../pages/admin/product-franchise/ProductFranchise.page.tsx"),
    ),
    isEnd: true,
  },
  {
    label: "Franchises",
    path: ROUTER_URL.ADMIN_ROUTES.FRANCHISE_LIST,
    component: React.lazy(
      () => import("../../pages/admin/franchise/FranchiseList.page.tsx"),
    ),
    isEnd: true,
  },
  {
    label: "Franchise Create",
    path: ROUTER_URL.ADMIN_ROUTES.FRANCHISE_CREATE,
    component: React.lazy(
      () => import("../../pages/admin/franchise/FranchiseCreateEdit.page.tsx"),
    ),
  },
  {
    label: "Franchise Edit",
    path: ROUTER_URL.ADMIN_ROUTES.FRANCHISE_EDIT,
    component: React.lazy(
      () => import("../../pages/admin/franchise/FranchiseCreateEdit.page.tsx"),
    ),
  },
  {
    label: "Franchise Categories",
    path: ROUTER_URL.ADMIN_ROUTES.CATEGORY_FRANCHISE,
    component: React.lazy(
      () => import("../../pages/admin/franchise/CategoryFranchise.page.tsx"),
    ),
  },
  {
    label: "Promotions",
    path: ROUTER_URL.ADMIN_ROUTES.PROMOTIONS,
    component: React.lazy(
      () => import("../../pages/admin/promotion/Promotion.page.tsx"),
    ),
    isEnd: true,
  },
  {
    label: "Inventories",
    path: ROUTER_URL.ADMIN_ROUTES.INVENTORIES,
    component: React.lazy(
      () => import("../../pages/admin/inventory/InventoryList.page.tsx"),
    ),
  },  {
    label: "Categories",
    path: ROUTER_URL.ADMIN_ROUTES.CATEGORIES,
    component: React.lazy(
      () => import("../../pages/admin/category/CategoryList.page.tsx"),
    ),
  },
  {
    label: "Franchise Categories",
    path: ROUTER_URL.ADMIN_ROUTES.CATEGORY_FRANCHISE,
    component: React.lazy(
      () => import("../../pages/admin/franchise/CategoryFranchise.page.tsx"),
    ),
  },
  {
    label: "Category Franchises",
    path: ROUTER_URL.ADMIN_ROUTES.CATEGORY_FRANCHISES,
    component: React.lazy(
      () => import("../../pages/admin/franchise/CategoryFranchise.page.tsx"),
    ),
    isEnd: true,
  },
  {
    label: "Roles",
    path: ROUTER_URL.ADMIN_ROUTES.ROLES,
    component: React.lazy(
      () => import("../../pages/admin/role/RoleList.page.tsx"),
    ),
  },
  {
    label: "Profile",
    path: ROUTER_URL.ADMIN_ROUTES.PROFILE,
    component: React.lazy(
      () => import("../../pages/admin/profile/AdminProfile.page.tsx"),
    ),
  },
  {
    label: "Product Category Franchises",
    path: ROUTER_URL.ADMIN_ROUTES.PRODUCT_CATEGORY_FRANCHISES,
    component: React.lazy(
      () =>
        import("../../pages/admin/product-category-franchise/ProductCategoryFranchise.page.tsx"),
    ),
    isEnd: true,
  },
  {
    label: "Shifts",
    path: ROUTER_URL.ADMIN_ROUTES.SHIFTS,
    component: React.lazy(
      () => import("../../pages/admin/shift/Shift.page.tsx"),
    ),
    isEnd: true,
  },
  {
    label: "Shift Assignments",
    path: ROUTER_URL.ADMIN_ROUTES.SHIFT_ASSIGNMENTS,
    component: React.lazy(
      () => import("../../pages/admin/shift-assignment/ShiftAssignment.page.tsx"),
    ),
    isEnd: true,
  },
];

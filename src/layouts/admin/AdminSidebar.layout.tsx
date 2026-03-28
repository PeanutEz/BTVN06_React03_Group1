import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { ROUTER_URL } from "../../routes/router.const";
import { useAuthStore, useFranchiseStore } from "../../store";
import { logoutUser } from "../../services/auth.service";
import { showSuccess } from "../../utils";
import logoHylux from "../../assets/logo-hylux.png";

const adminNav: Array<{
  label: string;
  to: string;
  icon: React.ReactNode;
  hiddenForRoles?: string[];
}> = [
    {
      label: "Dashboard",
      to: `${ROUTER_URL.ADMIN}/${ROUTER_URL.ADMIN_ROUTES.DASHBOARD}`,
      hiddenForRoles: ["STAFF", "SHIPPER"],
      icon: (
        <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
        </svg>
      ),
    },    {
      label: "Roles",
      to: `${ROUTER_URL.ADMIN}/${ROUTER_URL.ADMIN_ROUTES.ROLES}`,
      hiddenForRoles: ["MANAGER", "STAFF", "SHIPPER"],
      icon: (
        <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
        </svg>
      ),
    },
    {
      label: "Users",
      to: `${ROUTER_URL.ADMIN}/${ROUTER_URL.ADMIN_ROUTES.USERS}`,
      hiddenForRoles: ["MANAGER", "STAFF", "SHIPPER"],
      icon: (
        <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0112.75 0v.109zm-6.375-7.5a3 3 0 100-6 3 3 0 000 6zm8.625-2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
        </svg>
      ),
    },
    {
      label: "User Roles",
      to: `${ROUTER_URL.ADMIN}/${ROUTER_URL.ADMIN_ROUTES.USER_FRANCHISE_ROLES}`,
      hiddenForRoles: ["MANAGER", "STAFF", "SHIPPER"],
      icon: (
        <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm1.294 6.336a6.721 6.721 0 01-3.17.789 6.721 6.721 0 01-3.168-.789 3.376 3.376 0 016.338 0z" />
        </svg>
      ),
    },    {
      label: "Customers",
      to: `${ROUTER_URL.ADMIN}/${ROUTER_URL.ADMIN_ROUTES.CUSTOMERS}`,
      hiddenForRoles: ["SHIPPER"],
      icon: (
        <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
        </svg>
      ),
    },
    {
      label: "Customer Franchise",
      to: `${ROUTER_URL.ADMIN}/${ROUTER_URL.ADMIN_ROUTES.CUSTOMER_FRANCHISES}`,
      hiddenForRoles: ["SHIPPER"],
      icon: (
        <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
        </svg>
      ),
    },
    {
      label: "Franchises",
      to: `${ROUTER_URL.ADMIN}/${ROUTER_URL.ADMIN_ROUTES.FRANCHISE_LIST}`,
      hiddenForRoles: ["MANAGER", "STAFF", "SHIPPER"],
      icon: (
        <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" />
        </svg>
      ),
    },    {
      label: "Categories",
      to: `${ROUTER_URL.ADMIN}/${ROUTER_URL.ADMIN_ROUTES.CATEGORIES}`,
      hiddenForRoles: ["STAFF", "SHIPPER"],
      icon: (
        <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
        </svg>
      ),
    },
    {
      label: "Category Franchises",
      to: `${ROUTER_URL.ADMIN}/${ROUTER_URL.ADMIN_ROUTES.CATEGORY_FRANCHISES}`,
      hiddenForRoles: ["STAFF", "SHIPPER"],
      icon: (
        <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" />
        </svg>
      ),
    },
    {
      label: "Products",
      to: `${ROUTER_URL.ADMIN}/${ROUTER_URL.ADMIN_ROUTES.PRODUCTS}`,
      hiddenForRoles: ["STAFF", "SHIPPER"],
      icon: (
        <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
        </svg>
      ),
    },    {
      label: "Product Franchise",
      to: `${ROUTER_URL.ADMIN}/${ROUTER_URL.ADMIN_ROUTES.PRODUCT_FRANCHISES}`,
      hiddenForRoles: ["STAFF", "SHIPPER"],
      icon: (
        <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
        </svg>
      ),
    },    {
      label: "Product Category Franchise",
      to: `${ROUTER_URL.ADMIN}/${ROUTER_URL.ADMIN_ROUTES.PRODUCT_CATEGORY_FRANCHISES}`,
      hiddenForRoles: ["STAFF", "SHIPPER"],
      icon: (
        <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
        </svg>
      ),
    },
    {
      label: "Vouchers",
      to: `${ROUTER_URL.ADMIN}/${ROUTER_URL.ADMIN_ROUTES.VOUCHERS}`,
      hiddenForRoles: ["STAFF", "SHIPPER"],
      icon: (
        <svg
          className="size-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"
          />
        </svg>
      ),    },
    {
      label: "Promotions",
      to: `${ROUTER_URL.ADMIN}/${ROUTER_URL.ADMIN_ROUTES.PROMOTIONS}`,
      hiddenForRoles: ["STAFF", "SHIPPER"],
      icon: (
        <svg
          className="size-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 14l6-6m-6 0h6v6M5 5h14v14H5z"
          />
        </svg>
      ),
    },
    {
      label: "Staff Order",
      to: `${ROUTER_URL.ADMIN}/${ROUTER_URL.ADMIN_ROUTES.STAFF_ORDER}`,
      hiddenForRoles: ["SHIPPER"],
      icon: (
        <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 6.75h15m-15 5.25h15m-15 5.25h9" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M18 16.5l1.5 1.5 3-3" />
        </svg>
      ),
    },
    {
      label: "Pending Payments",
      to: `${ROUTER_URL.ADMIN}/${ROUTER_URL.ADMIN_ROUTES.PENDING_PAYMENTS}`,
      hiddenForRoles: ["SHIPPER"],
      icon: (
        <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5v10.5H3.75z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 10.5h16.5" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 15h3.75m5.25-1.5 1.5 1.5 2.25-2.25" />
        </svg>
      ),
    },
    {
      label: "Orders",
      to: `${ROUTER_URL.ADMIN}/${ROUTER_URL.ADMIN_ROUTES.ORDERS}`,
      icon: (
        <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
        </svg>
      ),
    },
    {
      label: "Carts",
      to: `${ROUTER_URL.ADMIN}/${ROUTER_URL.ADMIN_ROUTES.CARTS}`,
      hiddenForRoles: ["SHIPPER"],
      icon: (
        <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 9.75h6m-6 3h4.5" />
        </svg>
      ),
    },
    {
      label: "Deliveries",
      to: `${ROUTER_URL.ADMIN}/${ROUTER_URL.ADMIN_ROUTES.DELIVERIES}`,
      icon: (
        <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5h1.5l1.125 3.375m-2.625-3.375L6.75 3h10.5l2.25 4.5h1.5m-1.5 0v9.75a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 16.25V7.5zM7.5 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zm13.5 0a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
        </svg>
      ),
    },
    {
      label: "Payments",
      to: `${ROUTER_URL.ADMIN}/${ROUTER_URL.ADMIN_ROUTES.PAYMENTS}`,
      icon: (
        <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
        </svg>
      ),
    },
    {
      label: "Loyalty",
      to: `${ROUTER_URL.ADMIN}/${ROUTER_URL.ADMIN_ROUTES.LOYALTY}`,
      hiddenForRoles: ["STAFF", "SHIPPER"],
      icon: (
        <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
        </svg>
      ),
    },    {
      label: "Inventories",
      to: `${ROUTER_URL.ADMIN}/${ROUTER_URL.ADMIN_ROUTES.INVENTORIES}`,
      hiddenForRoles: ["SHIPPER"],
      icon: (
        <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
        </svg>
      ),    },
    {
      label: "Shifts",
      to: `${ROUTER_URL.ADMIN}/${ROUTER_URL.ADMIN_ROUTES.SHIFTS}`,
      hiddenForRoles: ["SHIPPER"],
      icon: (
        <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: "Shift Assignments",
      to: `${ROUTER_URL.ADMIN}/${ROUTER_URL.ADMIN_ROUTES.SHIFT_ASSIGNMENTS}`,
      hiddenForRoles: ["SHIPPER"],
      icon: (
        <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8.25 6.75h7.5M8.25 12h7.5M8.25 17.25h4.5M4.5 3.75h15a2.25 2.25 0 012.25 2.25v12a2.25 2.25 0 01-2.25 2.25h-15A2.25 2.25 0 012.25 18V6A2.25 2.25 0 014.5 3.75z"
          />
        </svg>
      ),
    },
  ];

interface AdminSidebarProps {
  isOpen?: boolean;
  onToggle?: () => void;
  isMobile?: boolean;
}

const AdminSidebar = (props: AdminSidebarProps) => {
  void props;
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { clear: clearFranchises } = useFranchiseStore();
  const activeContext = user?.active_context as { role?: string } | null;
  const currentRole = (activeContext?.role || user?.role || "").toUpperCase();
  const visibleNav = adminNav.filter(
    (item) => !item.hiddenForRoles?.includes(currentRole),
  );

  const handleLogout = async () => {
    await logoutUser().catch(() => { });
    logout();
    clearFranchises();
    showSuccess("Đăng xuất thành công");
    navigate(ROUTER_URL.ADMIN_LOGIN, { replace: true });
  };

  return (
    <div className="flex h-full flex-col">
      {/* Logo / Brand */}
      <div className="flex items-center gap-3 px-5 pt-7 pb-5">
        <img
          src={logoHylux}
          alt="Hylux"
          className="w-10 h-10 rounded-xl object-contain shrink-0"
        />
        <div>
          <h2 className="text-base font-bold text-white tracking-tight">Hylux</h2>
          <p className="text-[11px] text-white/40 font-medium">Admin Panel</p>
        </div>
      </div>

      {/* Divider */}
      <div className="mx-4 mb-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }} />

      {/* Navigation — each item is a glass card */}
      <nav className="flex-1 flex flex-col gap-3 px-4 overflow-y-auto pb-2">
        {visibleNav.map((item) => {
          const isActive =
            location.pathname === item.to ||
            location.pathname.startsWith(item.to + "/");
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className="flex items-center gap-3.5 px-4 py-4 transition-all duration-200 group shrink-0"
              style={
                isActive
                  ? {
                    background: "rgba(239, 68, 68, 0.18)",
                    border: "1px solid rgba(239, 68, 68, 0.35)",
                    borderRadius: "14px",
                    boxShadow: "0 0 20px rgba(239,68,68,0.15), inset 0 1px 0 rgba(255,255,255,0.08)",
                  }
                  : {
                    background: "rgba(255, 255, 255, 0.04)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: "14px",
                  }
              }
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
                  e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.18)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.04)";
                  e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.08)";
                }
              }}
            >
              <span
                className="flex-shrink-0"
                style={
                  isActive
                    ? { color: "#f87171", filter: "drop-shadow(0 0 8px rgba(248,113,113,0.6))" }
                    : { color: "rgba(255,255,255,0.55)" }
                }
              >
                {item.icon}
              </span>
              <span
                className="whitespace-nowrap text-sm font-medium"
                style={
                  isActive
                    ? { color: "#ffffff" }
                    : { color: "rgba(255,255,255,0.6)" }
                }
              >
                {item.label}
              </span>
              {isActive && (
                <span
                  className="ml-auto w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ background: "#f87171", boxShadow: "0 0 8px rgba(248,113,113,0.8)" }}
                />
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Logout button */}
      <div className="px-4 pb-5 shrink-0">
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-3 px-4 py-4 text-sm font-semibold transition-all duration-200"
          style={{
            background: "rgba(239, 68, 68, 0.15)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            borderRadius: "14px",
            color: "#fca5a5",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(239, 68, 68, 0.3)";
            e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.5)";
            e.currentTarget.style.color = "#ffffff";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(239, 68, 68, 0.15)";
            e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.3)";
            e.currentTarget.style.color = "#fca5a5";
          }}
        >
          <svg className="size-5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="1.8" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
          </svg>
          <span>Đăng xuất</span>
        </button>
      </div>
    </div>
  );
};

export default AdminSidebar;

import { NavLink } from "react-router-dom";
import { ROUTER_URL } from "../../routes/router.const";

const adminNav = [
  {
    label: "Dashboard",
    to: `${ROUTER_URL.ADMIN}/${ROUTER_URL.ADMIN_ROUTES.DASHBOARD}`,
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
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
        />
      </svg>
    ),
  },
  {
    label: "Users",
    to: `${ROUTER_URL.ADMIN}/${ROUTER_URL.ADMIN_ROUTES.USERS}`,
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
          d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
        />
      </svg>
    ),
  },
  {
    label: "Orders",
    to: `${ROUTER_URL.ADMIN}/${ROUTER_URL.ADMIN_ROUTES.ORDERS}`,
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
          d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
        />
      </svg>
    ),
  },
  {
    label: "Products",
    to: `${ROUTER_URL.ADMIN}/${ROUTER_URL.ADMIN_ROUTES.PRODUCTS}`,
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
          d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
        />
      </svg>
    ),
  },
  {
    label: "Customers",
    to: `${ROUTER_URL.ADMIN}/${ROUTER_URL.ADMIN_ROUTES.CUSTOMERS}`,
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
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
        />
      </svg>
    ),
  },
  {
    label: "Payments",
    to: `${ROUTER_URL.ADMIN}/${ROUTER_URL.ADMIN_ROUTES.PAYMENTS}`,
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
          d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
        />
      </svg>
    ),
  },
  {
    label: "Loyalty",
    to: `${ROUTER_URL.ADMIN}/${ROUTER_URL.ADMIN_ROUTES.LOYALTY}`,
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
          d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
        />
      </svg>
    ),
  },
  {
    label: "Franchises",
    to: `${ROUTER_URL.ADMIN}/${ROUTER_URL.ADMIN_ROUTES.FRANCHISE_LIST}`,
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
          d="M3 7h18M3 12h18M3 17h18M6 4v3M6 17v3M12 4v3M12 17v3M18 4v3M18 17v3"
        />
      </svg>
    ),
  },
];

const AdminSidebar = () => {
  return (
    <aside className="peer group fixed left-0 z-40 h-[calc(100vh-72px)] w-20 border-r border-primary-500/20 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 shadow-2xl shadow-primary-500/20 transition-all duration-300 hover:w-60 hover:shadow-primary-500/30 backdrop-blur-xl">
      <div className="flex h-full flex-col py-6">
        <nav className="flex-1 space-y-2 px-3">
          {adminNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-4 rounded-xl px-3 py-3 transition-all duration-200 ${isActive ? "bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-lg shadow-primary-500/50" : "text-slate-300 hover:bg-slate-700/50 hover:text-white"}`
              }
              end
            >
              <span className="flex-shrink-0">{item.icon}</span>
              <span className="whitespace-nowrap text-sm font-medium opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                {item.label}
              </span>
            </NavLink>
          ))}
        </nav>
      </div>
    </aside>
  );
};

export default AdminSidebar;

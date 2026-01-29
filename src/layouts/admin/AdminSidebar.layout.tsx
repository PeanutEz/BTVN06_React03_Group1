import { NavLink } from "react-router-dom";
import { ROUTER_URL } from "../../routes/router.const";

const adminNav = [
  { 
    label: "Dashboard", 
    to: `${ROUTER_URL.ADMIN}/${ROUTER_URL.ADMIN_ROUTES.DASHBOARD}`,
    icon: (
      <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    )
  },
  { 
    label: "Users", 
    to: `${ROUTER_URL.ADMIN}/${ROUTER_URL.ADMIN_ROUTES.USERS}`,
    icon: (
      <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    )
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

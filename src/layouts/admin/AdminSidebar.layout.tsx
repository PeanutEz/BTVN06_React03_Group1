import { Link, NavLink } from "react-router-dom";
import { ROUTER_URL } from "../../routes/router.const";

const adminNav = [
  { label: "Dashboard", to: `${ROUTER_URL.ADMIN}/${ROUTER_URL.ADMIN_ROUTES.DASHBOARD}` },
  { label: "Users", to: `${ROUTER_URL.ADMIN}/${ROUTER_URL.ADMIN_ROUTES.USERS}` },
];

const AdminSidebar = () => {
  return (
    <aside className="border-r border-slate-200 bg-white px-4 py-6 shadow-sm">
      <Link to={ROUTER_URL.ADMIN} className="mb-6 block text-xl font-semibold text-blue-700">
        Admin
      </Link>
      <nav className="space-y-2 text-sm font-medium text-slate-700">
        {adminNav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-2 rounded-lg px-3 py-2 transition hover:bg-slate-100 ${isActive ? "bg-slate-100 text-blue-700" : ""}`
            }
            end
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};

export default AdminSidebar;

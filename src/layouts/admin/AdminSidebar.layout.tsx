import { Link, NavLink } from "react-router-dom";
import { ROUTER_URL } from "../../routes/router.const";

const adminNav = [
  { label: "Dashboard", to: `${ROUTER_URL.ADMIN}/${ROUTER_URL.ADMIN_ROUTES.DASHBOARD}` },
  { label: "Users", to: `${ROUTER_URL.ADMIN}/${ROUTER_URL.ADMIN_ROUTES.USERS}` },
];

const AdminSidebar = () => {
  return (
    <aside className="border-r border-primary-900/40 bg-[#120c0a]/80 px-4 py-6 text-primary-50 shadow-lg shadow-black/30">
      <Link to={ROUTER_URL.ADMIN} className="mb-6 block text-xl font-semibold text-primary-50">
        Admin
      </Link>
      <nav className="space-y-2 text-sm font-medium">
        {adminNav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-2 rounded-lg px-3 py-2 transition hover:bg-primary-50/10 ${isActive ? "bg-primary-50/10 text-accent" : "text-primary-100/80"}`
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

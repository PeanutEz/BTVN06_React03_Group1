import { Link, NavLink, useNavigate } from "react-router-dom";
import { ROUTER_URL } from "../../routes/router.const";
import { useAuthStore } from "../../store";

const navItems = [
  { label: "Trang chủ", to: ROUTER_URL.HOME },
  { label: "Giới thiệu", to: ROUTER_URL.ABOUT },
  { label: "Liên hệ", to: ROUTER_URL.CONTACT },
];

const ClientHeader = () => {
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);

  return (
    <header className="border-b border-primary-800/40 bg-[#120c0a]/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 text-primary-50">
        <Link to={ROUTER_URL.HOME} className="text-lg font-semibold tracking-tight">
          BTVN06 Group1
        </Link>
        <nav className="flex items-center gap-6 text-sm font-medium">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `transition hover:text-primary-200 ${isActive ? "text-accent" : "text-primary-100/80"}`
              }
              end
            >
              {item.label}
            </NavLink>
          ))}
          <button
            type="button"
            onClick={() => {
              // Đảm bảo rời trạng thái đăng nhập cũ trước khi vào trang login
              logout();
              navigate(ROUTER_URL.LOGIN);
            }}
            className="rounded-full bg-primary-500 px-4 py-2 text-primary-foreground shadow-lg shadow-primary-900/40 transition hover:bg-primary-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-300"
          >
            Đăng nhập
          </button>
        </nav>
      </div>
    </header>
  );
};

export default ClientHeader;

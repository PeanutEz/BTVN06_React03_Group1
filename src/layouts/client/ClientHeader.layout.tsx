import { useEffect, useRef, useState } from "react";
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
  const { user, logout } = useAuthStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
    navigate(ROUTER_URL.HOME);
  };

  return (
    <header className="border-b border-slate-800/50 bg-slate-900/80 backdrop-blur-xl shadow-lg shadow-black/20">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 text-white">
        <Link to={ROUTER_URL.HOME} className="text-lg font-semibold tracking-tight">
          BTVN06 Group1
        </Link>
        <nav className="absolute left-1/2 -translate-x-1/2 flex items-center gap-6 text-sm font-medium">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `transition-all duration-200 hover:text-primary-400 ${isActive ? "text-primary-500 font-semibold" : "text-slate-300"}`
              }
              end
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-6">
          {!user ? (
            <button
              type="button"
              onClick={() => {
                logout();
                navigate(ROUTER_URL.LOGIN);
              }}
              className="rounded-full bg-primary-500 px-4 py-2 text-primary-foreground shadow-lg shadow-primary-900/40 transition hover:bg-primary-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-300"
            >
              Đăng nhập
            </button>
          ) : (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                className="flex items-center gap-3 rounded-full border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-semibold text-white shadow-lg shadow-black/20 transition-all duration-200 hover:bg-slate-700 hover:border-primary-500 hover:shadow-primary-500/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
                aria-expanded={menuOpen}
              >
                <img src={user.avatar} alt={user.name} className="size-8 rounded-full object-cover" />
                <div className="text-left leading-tight">
                  <p className="text-sm font-semibold">{user.name}</p>
                  <p className="text-xs text-primary-100/80">{user.role}</p>
                </div>
                <svg viewBox="0 0 20 20" aria-hidden className="size-4 text-primary-100/70">
                  <path fill="currentColor" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.51a.75.75 0 0 1-1.08 0L5.21 8.27a.75.75 0 0 1 .02-1.06Z" />
                </svg>
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-700 bg-slate-900/95 backdrop-blur-xl py-2 shadow-2xl shadow-primary-500/20 animate-fade-in">
                  <div className="flex items-center gap-3 px-4 pb-2">
                    <img src={user.avatar} alt={user.name} className="size-10 rounded-full object-cover" />
                    <div className="leading-tight">
                      <p className="text-sm font-semibold text-primary-50">{user.name}</p>
                      <p className="text-xs text-primary-100/70">{user.role}</p>
                    </div>
                  </div>
                  <div className="px-2">
                    <Link
                      to={ROUTER_URL.PROFILE}
                      className="flex w-full items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-200 transition-all hover:bg-slate-800 rounded-lg"
                    >
                      <span>Hồ sơ</span>
                    </Link>
                  </div>
                  <div className="my-2 border-t border-slate-700" />
                  <div className="px-2">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-slate-200 transition-all hover:bg-primary-600 hover:text-white rounded-lg"
                    >
                      <span>Đăng xuất</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default ClientHeader;

import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "../../store";

const AdminHeader = () => {
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
  };

  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 shadow-sm">
      <h1 className="text-lg font-semibold text-slate-900">Admin Panel</h1>
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          className="flex items-center gap-3 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          aria-expanded={menuOpen}
        >
          {user && (
            <>
              <img src={user.avatar} alt={user.name} className="size-8 rounded-full object-cover" />
              <div className="text-left leading-tight">
                <p className="text-sm font-semibold">{user.name}</p>
                <p className="text-xs text-slate-500">{user.role}</p>
              </div>
            </>
          )}
          <svg viewBox="0 0 20 20" aria-hidden className="size-4 text-slate-500">
            <path fill="currentColor" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.51a.75.75 0 0 1-1.08 0L5.21 8.27a.75.75 0 0 1 .02-1.06Z" />
          </svg>
        </button>

        {menuOpen && (
          <div className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-200 bg-white py-2 shadow-xl">
            {user && (
              <div className="flex items-center gap-3 px-4 pb-2">
                <img src={user.avatar} alt={user.name} className="size-10 rounded-full object-cover" />
                <div className="leading-tight">
                  <p className="text-sm font-semibold text-slate-900">{user.name}</p>
                  <p className="text-xs text-slate-500">{user.role}</p>
                </div>
              </div>
            )}
            <div className="my-2 border-t border-slate-100" />
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
            >
              <span>Đăng xuất</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default AdminHeader;

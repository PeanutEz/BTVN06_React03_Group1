import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ROUTER_URL } from "../../routes/router.const";
import { useAuthStore, useFranchiseStore } from "../../store";
import { logoutUser } from "../../services/auth.service";

interface AdminHeaderProps {
  onMenuToggle?: () => void;
  isMobile?: boolean;
}

const AdminHeader = ({ onMenuToggle, isMobile }: AdminHeaderProps) => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { clear: clearFranchises, selectedFranchise, setSelectedFranchise } = useFranchiseStore();
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
  const handleLogout = async () => {
    await logoutUser().catch(() => {});
    logout();
    clearFranchises();
    setMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between border-b border-primary-500/20 bg-slate-900/80 backdrop-blur-xl px-4 sm:px-6 py-4 text-white shadow-lg shadow-primary-500/10">
      <div className="flex items-center gap-3">
        {/* Hamburger menu for mobile */}
        {isMobile && (
          <button
            type="button"
            onClick={onMenuToggle}
            className="flex items-center justify-center rounded-lg p-2 text-slate-300 transition-colors hover:bg-slate-700/50 hover:text-white"
            aria-label="Toggle menu"
          >
            <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}
        <h1 className="text-lg sm:text-xl font-bold">Admin</h1>
        {/* Franchise badge + change button */}
        {selectedFranchise && (
          <button
            type="button"
            onClick={() => {
              setSelectedFranchise(null);
              navigate(ROUTER_URL.ADMIN_SELECT_FRANCHISE, { replace: true });
            }}
            className="hidden sm:flex items-center gap-1.5 rounded-full border border-primary-500/40 bg-primary-500/10 px-3 py-1 text-xs font-semibold text-primary-300 transition hover:bg-primary-500/20"
            title="Đổi cửa hàng"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <span>{selectedFranchise.name}</span>
            <svg className="h-3 w-3 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        )}
      </div>
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          className="flex items-center gap-3 rounded-full border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-semibold text-white shadow-lg shadow-black/20 transition-all duration-200 hover:bg-slate-700 hover:border-primary-500 hover:shadow-primary-500/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
          aria-expanded={menuOpen}
        >
          {user && (
            <>
              {user.avatar ? (
                <img src={user.avatar} alt={user.name} className="size-8 rounded-full object-cover" />
              ) : (
                <span className="flex size-8 items-center justify-center rounded-full bg-primary-600 text-sm font-bold text-white">
                  {user.name?.charAt(0)?.toUpperCase() ?? "A"}
                </span>
              )}
              <div className="hidden sm:block text-left leading-tight">
                <p className="text-sm font-semibold">{user.name}</p>
                <p className="text-xs text-primary-100/80">{user.role}</p>
              </div>
            </>
          )}
          <svg viewBox="0 0 20 20" aria-hidden className="size-4 text-primary-100/70">
            <path fill="currentColor" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.51a.75.75 0 0 1-1.08 0L5.21 8.27a.75.75 0 0 1 .02-1.06Z" />
          </svg>
        </button>

        {menuOpen && (
          <div className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-700 bg-slate-900/95 backdrop-blur-xl py-2 shadow-2xl shadow-primary-500/20 animate-fade-in">
            {user && (
              <div className="flex items-center gap-3 px-4 pb-2">
                {user.avatar ? (
                  <img src={user.avatar} alt={user.name} className="size-10 rounded-full object-cover" />
                ) : (
                  <span className="flex size-10 items-center justify-center rounded-full bg-primary-600 text-base font-bold text-white">
                    {user.name?.charAt(0)?.toUpperCase() ?? "A"}
                  </span>
                )}
                <div className="leading-tight">
                  <p className="text-sm font-semibold text-primary-50">{user.name}</p>
                  <p className="text-xs text-primary-100/70">{user.role}</p>
                </div>
              </div>
            )}
            <div className="my-2 border-t border-slate-700" />
            <div className="px-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedFranchise(null);
                  navigate(ROUTER_URL.ADMIN_SELECT_FRANCHISE, { replace: true });
                  setMenuOpen(false);
                }}
                className="flex w-full items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-slate-200 transition-all hover:bg-primary-600 hover:text-white rounded-lg"
              >
                <span>Đổi cửa hàng</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  navigate(ROUTER_URL.PROFILE);
                  setMenuOpen(false);
                }}
                className="flex w-full items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-slate-200 transition-all hover:bg-primary-600 hover:text-white rounded-lg"
              >
                <span>Hồ sơ</span>
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-slate-200 transition-all hover:bg-red-600 hover:text-white rounded-lg mt-2"
              >
                <span>Đăng xuất</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default AdminHeader;

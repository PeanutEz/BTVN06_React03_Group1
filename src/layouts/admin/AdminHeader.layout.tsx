import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ROUTER_URL } from "../../routes/router.const";
import { useAuthStore, useFranchiseStore } from "../../store";
import { logoutUser, switchContextAndGetProfile, type RoleInfo } from "../../services/auth.service";
import { showSuccess, showError } from "../../utils";
import FranchisePickerModal from "../../components/admin/FranchisePickerModal";

interface AdminHeaderProps {
  onMenuToggle?: () => void;
  isMobile?: boolean;
}

const AdminHeader = ({ onMenuToggle, isMobile }: AdminHeaderProps) => {
  const navigate = useNavigate();
  const { user, logout, setUser } = useAuthStore();
  const { clear: clearFranchises } = useFranchiseStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [showSwitchContext, setShowSwitchContext] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);

  // Lấy franchise name và role từ active_context hoặc roles
  const activeContext = user?.active_context as { franchise_id?: string; franchise_name?: string; role?: string; scope?: string } | null;
  const currentRole = activeContext?.role || user?.role || "";
  const currentFranchise = activeContext
    ? (activeContext.franchise_name || "Hệ thống (Global)")
    : (user?.roles?.find(r => r.franchise_id && r.franchise_name)?.franchise_name || null);

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
    showSuccess("Đăng xuất thành công");
    navigate(ROUTER_URL.ADMIN_LOGIN, { replace: true });
  };

  const handleSwitchContext = async (role: RoleInfo) => {
    try {
      setIsSwitching(true);
      const updatedProfile = await switchContextAndGetProfile(role.franchise_id);
      setUser(updatedProfile);
      setShowSwitchContext(false);
      setMenuOpen(false);
      showSuccess(`Đã chuyển sang: ${role.franchise_name || "Hệ thống (Global)"}`);
      // Reload trang để các data admin tải lại theo context mới
      window.location.reload();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Chuyển chi nhánh thất bại";
      showError(msg);
    } finally {
      setIsSwitching(false);
    }
  };

  return (
    <>
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
              <img src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`} alt={user.name} className="size-8 rounded-full object-cover shrink-0" />
              <div className="hidden sm:block text-left leading-tight min-w-0 max-w-[160px]">
                <p className="text-sm font-semibold truncate">{user.name}</p>
                <p className="text-xs text-primary-100/80 truncate">
                  {currentFranchise ? `${currentFranchise} · ` : ""}{currentRole}
                </p>
              </div>
            </>
          )}
          <svg viewBox="0 0 20 20" aria-hidden className="size-4 text-primary-100/70">
            <path fill="currentColor" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.51a.75.75 0 0 1-1.08 0L5.21 8.27a.75.75 0 0 1 .02-1.06Z" />
          </svg>
        </button>

        {menuOpen && (
          <div className="absolute right-0 mt-2 w-72 rounded-xl border border-slate-700 bg-slate-900/95 backdrop-blur-xl py-2 shadow-2xl shadow-primary-500/20 animate-fade-in">
            {user && (
              <div className="flex items-center gap-3 px-4 pb-2">
                <img src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`} alt={user.name} className="size-10 rounded-full object-cover shrink-0" />
                <div className="min-w-0 leading-tight">
                  <p className="text-sm font-semibold text-primary-50 truncate">{user.name}</p>
                  <p className="text-xs text-primary-100/70 truncate">
                    {currentFranchise ? `${currentFranchise} · ` : ""}{currentRole}
                  </p>
                </div>
              </div>
            )}
            <div className="my-2 border-t border-slate-700" />
            <div className="px-2">
              <button
                type="button"
                onClick={() => {
                  navigate(`${ROUTER_URL.ADMIN}/${ROUTER_URL.ADMIN_ROUTES.PROFILE}`);
                  setMenuOpen(false);
                }}
                className="flex w-full items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-200 transition-all hover:bg-primary-600 hover:text-white rounded-lg"
              >
                <svg className="size-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                </svg>
                <span>Hồ sơ</span>
              </button>
              {user?.roles && user.roles.length > 1 && (
                <button
                  type="button"
                  onClick={() => {
                    setShowSwitchContext(true);
                    setMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-200 transition-all hover:bg-amber-600 hover:text-white rounded-lg mt-1"
                >
                  <svg className="size-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                  </svg>
                  <span>Chuyển chi nhánh</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-200 transition-all hover:bg-red-600 hover:text-white rounded-lg mt-1"
              >
                <svg className="size-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
                </svg>
                <span>Đăng xuất</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </header>

      {/* Switch Context Modal */}
      {showSwitchContext && user?.roles && (
        <FranchisePickerModal
          roles={user.roles}
          loading={isSwitching}
          onSelect={handleSwitchContext}
          onClose={() => setShowSwitchContext(false)}
        />
      )}
    </>
  );
};

export default AdminHeader;

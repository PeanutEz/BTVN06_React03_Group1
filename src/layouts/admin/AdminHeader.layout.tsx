import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ROUTER_URL } from "../../routes/router.const";
import { useAuthStore } from "../../store";
import { switchContextAndGetProfile, type RoleInfo } from "../../services/auth.service";
import { showSuccess, showError } from "../../utils";
import FranchisePickerModal from "../../components/admin/FranchisePickerModal";

interface AdminHeaderProps {
  onMenuToggle?: () => void;
  isMobile?: boolean;
}

const AdminHeader = ({ onMenuToggle, isMobile }: AdminHeaderProps) => {
  const navigate = useNavigate();
  const { user, setUser } = useAuthStore();
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const avatarMenuRef = useRef<HTMLDivElement>(null);
  const [showSwitchContext, setShowSwitchContext] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);

  // Lấy franchise name và role từ active_context hoặc roles
  const activeContext = user?.active_context as { franchise_id?: string; franchise_name?: string; role?: string; scope?: string } | null;
  const currentRole = activeContext?.role || user?.role || "";

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (avatarMenuRef.current && !avatarMenuRef.current.contains(event.target as Node)) {
        setAvatarMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSwitchContext = async (role: RoleInfo) => {
    try {
      setIsSwitching(true);
      const updatedProfile = await switchContextAndGetProfile(role.franchise_id);
      setUser(updatedProfile);
      setShowSwitchContext(false);
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
    <header className="sticky top-0 z-50 flex items-center justify-between border-b border-red-500/20 bg-red-600 px-4 sm:px-6 py-4 text-white shadow-lg shadow-red-500/10">
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
        {/* Avatar */}
        <div className="relative" ref={avatarMenuRef}>
          <button
            type="button"
            onClick={() => setAvatarMenuOpen((open) => !open)}
            className="flex items-center gap-3 rounded-xl px-3 py-3 text-white hover:bg-slate-700 transition-all duration-200"
          >
            <img
              src={user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email}`}
              alt={user?.name}
              className="size-8 rounded-full object-cover shrink-0"
            />
            <div className="text-left leading-tight min-w-0 flex-1">
              <p className="text-sm font-semibold truncate">{user?.name}</p>
              <p className="text-xs text-slate-400 truncate">
                {currentRole}
              </p>
            </div>
            <svg viewBox="0 0 20 20" aria-hidden className="size-4 text-slate-400">
              <path fill="currentColor" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.51a.75.75 0 0 1-1.08 0L5.21 8.27a.75.75 0 0 1 .02-1.06Z" />
            </svg>
          </button>

          {avatarMenuOpen && (
            <div className="absolute left-0 mt-2 w-full rounded-xl border border-slate-700 bg-slate-900/95 backdrop-blur-xl py-2 shadow-2xl shadow-primary-500/20 animate-fade-in z-50">
              <button
                type="button"
                onClick={() => {
                  navigate(`${ROUTER_URL.ADMIN}/${ROUTER_URL.ADMIN_ROUTES.PROFILE}`);
                  setAvatarMenuOpen(false);
                }}
                className="flex w-full items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-200 transition-all hover:bg-primary-600 hover:text-white rounded-lg"
              >
                <svg className="size-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                </svg>
                <span>Hồ sơ</span>
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        {user?.roles && user.roles.length > 1 && (
          <button
            type="button"
            onClick={() => setShowSwitchContext(true)}
            className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:border-slate-400"
          >
            <svg className="size-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
            </svg>
            <span className="hidden sm:inline">Chuyển chi nhánh</span>
          </button>
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

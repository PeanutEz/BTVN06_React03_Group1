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
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [showSwitchContext, setShowSwitchContext] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);

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

  const handleSwitchContext = async (role: RoleInfo) => {
    try {
      setIsSwitching(true);
      const updatedProfile = await switchContextAndGetProfile(role.franchise_id);
      setUser(updatedProfile);
      setShowSwitchContext(false);
      setMenuOpen(false);
      showSuccess(`Đã chuyển sang: ${role.franchise_name || "Hệ thống (Global)"}`);
      window.location.reload();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Chuyển chi nhánh thất bại";
      showError(msg);
    } finally {
      setIsSwitching(false);
    }
  };

  const displayName = user?.name || "Admin";

  return (
    <>
      <header
        className="flex items-center justify-between px-6 py-4 text-white shrink-0 relative"
        style={{
          background: "rgba(15, 23, 42, 0.20)",
          backdropFilter: "blur(16px) saturate(140%)",
          WebkitBackdropFilter: "blur(16px) saturate(140%)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: "20px",
          boxShadow: "0 4px 24px rgba(0, 0, 0, 0.2)",
          zIndex: 20,
        }}
      >
        {/* Left: User info greeting */}
        <div className="flex items-center gap-3">
          {isMobile && (
            <button
              type="button"
              onClick={onMenuToggle}
              className="flex items-center justify-center rounded-xl p-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Toggle menu"
            >
              <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          )}
          {user && (
            <img
              src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`}
              alt={user.name}
              className="size-10 rounded-xl object-cover shrink-0"
              style={{ border: "2px solid rgba(255,255,255,0.15)" }}
            />
          )}
          <div>
            <h1 className="text-lg font-bold text-white">
              Hi, {displayName}!
            </h1>
            <p className="text-xs text-white/50">Chào mừng trở lại bảng điều khiển</p>
          </div>
        </div>

        {/* Right: Notification + Settings (with dropdown) */}
        <div className="flex items-center gap-3">
          {/* Notification bell */}
          <button
            type="button"
            className="relative flex items-center justify-center rounded-xl p-2.5 text-white/70 transition-all hover:bg-white/10 hover:text-white"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "14px",
            }}
          >
            <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
            </svg>
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary-500 text-[10px] font-bold text-white shadow-lg shadow-primary-500/40">
              3
            </span>
          </button>

          {/* Settings — dropdown with Profile, Switch Branch, Logout */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              className="flex items-center justify-center rounded-xl p-2.5 text-white/70 transition-all hover:bg-white/10 hover:text-white"
              style={{
                background: menuOpen ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "14px",
              }}
              aria-expanded={menuOpen}
              aria-label="Settings"
            >
              <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>

            {menuOpen && (
              <div
                className="absolute right-0 mt-2 w-64 py-2 animate-fade-in"
                style={{
                  background: "rgba(15, 23, 42, 0.65)",
                  backdropFilter: "blur(20px) saturate(140%)",
                  WebkitBackdropFilter: "blur(20px) saturate(140%)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  borderRadius: "16px",
                  boxShadow: "0 20px 60px rgba(0, 0, 0, 0.5)",
                  zIndex: 100,
                }}
              >
                {/* User info preview */}
                {user && (
                  <div className="flex items-center gap-3 px-4 pb-2 pt-1">
                    <img
                      src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`}
                      alt={user.name}
                      className="size-9 rounded-xl object-cover shrink-0"
                      style={{ border: "2px solid rgba(255,255,255,0.15)" }}
                    />
                    <div className="min-w-0 leading-tight">
                      <p className="text-sm font-semibold text-white truncate">{user.name}</p>
                      <p className="text-xs text-white/50 truncate">
                        {currentFranchise ? `${currentFranchise} · ` : ""}{currentRole}
                      </p>
                    </div>
                  </div>
                )}
                <div className="my-2 mx-3" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }} />
                <div className="px-2 space-y-0.5">
                  <button
                    type="button"
                    onClick={() => { navigate(`${ROUTER_URL.ADMIN}/${ROUTER_URL.ADMIN_ROUTES.PROFILE}`); setMenuOpen(false); }}
                    className="flex w-full items-center gap-3 px-3 py-2.5 text-sm font-medium text-white/80 transition-all rounded-xl hover:bg-white/10 hover:text-white"
                  >
                    <svg className="size-[18px] shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="1.8" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                    </svg>
                    <span>Hồ sơ</span>
                  </button>
                  {user?.roles && user.roles.length > 1 && (
                    <button
                      type="button"
                      onClick={() => { setShowSwitchContext(true); setMenuOpen(false); }}
                      className="flex w-full items-center gap-3 px-3 py-2.5 text-sm font-medium text-white/80 transition-all rounded-xl hover:bg-amber-500/15 hover:text-amber-300"
                    >
                      <svg className="size-[18px] shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="1.8" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                      </svg>
                      <span>Chuyển chi nhánh</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

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

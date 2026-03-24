import { useState, useRef, useEffect, useCallback } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ROUTER_URL } from "../../routes/router.const";
import { useAuthStore } from "../../store/auth.store";
import { useDeliveryStore } from "../../store/delivery.store";
import { isBranchOpen } from "../../services/branch.service";
import { logoutUser } from "../../services/auth.service";
import { showSuccess } from "../../utils";
import BranchPickerModal from "../../components/menu/BranchPickerModal";
import logoHylux from "../../assets/logo-hylux.png";

const NAV_LINKS: Array<{ label: string; path: string; highlight?: boolean }> = [
  { label: "Trang chủ", path: ROUTER_URL.HOME },
  { label: "Menu", path: ROUTER_URL.MENU },
  { label: "Đơn hàng của tôi", path: ROUTER_URL.CUSTOMER_ORDER_HISTORY },
  { label: "Hệ thống cửa hàng", path: ROUTER_URL.STORE_LOCATOR },
  { label: "Liên hệ", path: ROUTER_URL.CONTACT },
];

const ClientHeader = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [showBranchPicker, setShowBranchPicker] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  // ── Delivery / receiving store ────────────────────────────────────────
  const { orderMode, selectedBranch, hydrate, selectedFranchiseName, selectedFranchiseId } = useDeliveryStore();
  useEffect(() => { hydrate(); }, [hydrate]);

  const branchOpen = selectedBranch ? isBranchOpen(selectedBranch) : false;

  // Chỉ hiển thị tên franchise khi đã chọn
  const receivingLabel = selectedFranchiseId != null ? selectedFranchiseName : null;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (accountRef.current && !accountRef.current.contains(event.target as Node)) {
        setAccountOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []); const handleLogout = async () => {
    await logoutUser().catch(() => { });
    logout();
    setAccountOpen(false);
    showSuccess("Đăng xuất thành công");
    navigate(ROUTER_URL.HOME);
  };

  const openPicker = useCallback(() => {
    setShowBranchPicker(true);
  }, []);

  return (
    <header className="sticky top-0 z-50 bg-white shadow-md">
      <div className="mx-auto max-w-7xl">

        {/* ── ROW 1: Logo · Search · Actions ── */}
        <div className="flex items-center gap-4 py-3 px-4 sm:px-6 lg:px-8">

          {/* Logo */}
          <Link to={ROUTER_URL.HOME} className="shrink-0 flex items-center group" aria-label="Hylux Coffee - Trang chủ">
            <img
              src={logoHylux}
              alt="Hylux Coffee"
              className="h-16 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
            />
          </Link>

          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <input
                type="text"
                placeholder="Xin chào, bạn cần gì hôm nay?"
                className="w-full px-4 py-2.5 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent text-sm transition"
              />
              <button
                aria-label="Tìm kiếm"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-600 p-2 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {/* ── Receiving Method Pill ───────────────────────────────── */}
            <div className="hidden lg:flex items-center gap-2">
              <button
                onClick={openPicker}
                aria-label="Phương thức nhận hàng"
                className={`flex items-center gap-2 border-2 font-semibold text-sm px-3 py-2 rounded-full transition-all duration-200 hover:shadow-md whitespace-nowrap ${!selectedBranch
                  ? "border-amber-400 bg-amber-50 text-amber-700 animate-pulse"
                  : !branchOpen
                    ? "border-red-400 bg-red-50 text-red-700"
                    : orderMode === "PICKUP"
                      ? "border-blue-400 bg-blue-50 text-blue-700"
                      : "border-emerald-400 bg-emerald-50 text-emerald-700"
                  }`}
              >
                <span className="text-base">🏪</span>
                <span className="max-w-[180px] truncate">
                  {!receivingLabel
                    ? "Chọn chi nhánh"
                    : `Franchise – ${receivingLabel}`}
                </span>
                {selectedBranch && !branchOpen && (
                  <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-bold">Đóng</span>
                )}
              </button>
            </div>

            {/* ── BranchPickerModal (desktop) ─────────────────────── */}
            {showBranchPicker && (
              <BranchPickerModal
                onClose={() => {
                  const { selectedFranchiseName } = useDeliveryStore.getState();

                  if (selectedFranchiseName) {
                    toast.success(`Đã chọn: ${selectedFranchiseName}`, {
                      description: "Franchise đã được cập nhật.",
                    });
                  }

                  setShowBranchPicker(false);
                }}
              />
            )}            {/* Account Dropdown */}
            <div className="relative" ref={accountRef}>
              {user ? (
                <>
                  <button
                    onClick={() => setAccountOpen(!accountOpen)}
                    className="hidden lg:flex items-center justify-center w-10 h-10 rounded-full border-2 border-red-600 hover:bg-red-50 text-red-700 transition-all duration-200"
                    aria-expanded={accountOpen}
                    aria-label="Tài khoản"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <circle cx="12" cy="8" r="4" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                    </svg>
                  </button>

                  {/* Dropdown Panel */}
                  <div className={`absolute right-0 top-[calc(100%+8px)] w-60 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 overflow-hidden transition-all duration-200 origin-top-right ${accountOpen ? "opacity-100 scale-100 visible" : "opacity-0 scale-95 invisible"
                    }`}>
                    {/* Header */}
                    <div className="px-4 py-3 bg-gradient-to-r from-red-700 to-red-600">
                      <p className="text-white font-bold text-sm truncate">{user.name}</p>
                      <p className="text-red-200 text-xs truncate">{user.email}</p>
                    </div>

                    {/* Menu Items */}
                    <div className="py-1">
                      {[
                        { icon: "👤", label: "Thông tin cá nhân", path: ROUTER_URL.CUSTOMER_PROFILE },
                        { icon: "⭐", label: "Khách hàng thành viên", path: ROUTER_URL.CUSTOMER_MEMBERSHIP },
                        { icon: "📦", label: "Đơn hàng", path: ROUTER_URL.CUSTOMER_ORDER_HISTORY },
                        { icon: "🛒", label: "Giỏ hàng", path: ROUTER_URL.CUSTOMER_CART },
                        { icon: "💬", label: "Trung tâm trợ giúp", path: ROUTER_URL.CUSTOMER_SUPPORT },
                      ].map((item) => (
                        <Link
                          key={item.path + item.label}
                          to={item.path}
                          onClick={() => setAccountOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors group"
                        >
                          <span className="w-6 text-base text-center shrink-0">{item.icon}</span>
                          <span className="text-sm text-gray-700 group-hover:text-gray-900 flex-1">{item.label}</span>
                        </Link>
                      ))}

                      <div className="h-px bg-gray-100 mx-3 my-1" />

                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-4 py-2.5 w-full hover:bg-red-50 transition-colors group"
                      >
                        <span className="w-6 text-base text-center shrink-0">🚪</span>
                        <span className="text-sm text-red-600 font-semibold group-hover:text-red-700">Đăng xuất</span>
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <Link
                  to={ROUTER_URL.LOGIN}
                  className="hidden lg:flex items-center gap-2 hover:bg-gray-50 px-3 py-2 rounded-lg transition-colors border border-gray-200"
                >
                  <svg className="w-5 h-5 text-gray-600 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm font-semibold text-gray-700">Đăng nhập</span>
                </Link>
              )}
            </div>

            {/* Mobile hamburger */}
            <button
              className="lg:hidden text-gray-600 p-2"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Toggle menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {menuOpen
                  ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                }
              </svg>
            </button>
          </div>
        </div>

        {NAV_LINKS.length > 0 && (
          <>
            {/* ── DIVIDER ── */}
            <div className="relative px-4 sm:px-6 lg:px-8">
              <div className="h-px bg-gradient-to-r from-transparent via-red-300 to-transparent" />
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-red-600/30 to-transparent blur-sm" />
            </div>

            {/* ── ROW 2: Category Dropdown · Nav Links ── */}
            <div className="hidden lg:flex items-center justify-center gap-2 px-4 sm:px-6 lg:px-8 py-2">

              {/* Nav Links */}
              <nav className="flex items-center gap-1">
                {NAV_LINKS.map((link) => (
                  <NavLink
                    key={link.path}
                    to={link.path}
                    end={link.path === ROUTER_URL.HOME}
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    className={({ isActive }) =>
                      `px-3 py-2 rounded text-sm font-medium transition-colors whitespace-nowrap ${isActive
                        ? "text-red-700 bg-red-50 font-semibold"
                        : link.highlight
                          ? "text-amber-600 hover:text-amber-700 hover:bg-amber-50 font-semibold"
                          : "text-gray-700 hover:text-red-700 hover:bg-red-50"
                      }`
                    }
                  >
                    {link.label}
                  </NavLink>
                ))}
              </nav>
            </div>
          </>
        )}

        {/* ── MOBILE MENU ── */}
        {menuOpen && (
          <div className="lg:hidden pb-4 px-4 space-y-1 bg-gray-50 border-t border-gray-100">
            {NAV_LINKS.length > 0 && (
              <>
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.path}
                    to={link.path}
                    className="block px-4 py-2.5 text-gray-700 hover:bg-red-50 hover:text-red-700 rounded transition-colors text-sm font-medium"
                    onClick={() => { setMenuOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  >
                    {link.label}
                  </Link>
                ))}
                <div className="h-px bg-gray-200 my-1" />
              </>
            )}
            {/* Mobile receiving method */}
            <button
              onClick={() => { setMenuOpen(false); openPicker(); }}
              className={`flex items-center gap-2 w-full px-4 py-2.5 rounded text-sm font-medium transition-colors ${!selectedBranch
                ? "text-amber-700 bg-amber-50"
                : orderMode === "PICKUP"
                  ? "text-blue-700 bg-blue-50"
                  : "text-emerald-700 bg-emerald-50"
                }`}
            >
              <span>{!selectedBranch ? "🛵" : orderMode === "PICKUP" ? "🏪" : "🛵"}</span>
              <span className="truncate">
                {!selectedBranch
                  ? "Chọn phương thức nhận hàng"
                  : orderMode === "PICKUP"
                    ? `Lấy tại quán – ${receivingLabel}`
                    : `Giao hàng – ${receivingLabel}`}
              </span>
            </button>
            <div className="h-px bg-gray-200 my-1" />
            <Link
              to={user ? ROUTER_URL.CUSTOMER_PROFILE : ROUTER_URL.LOGIN}
              className="block px-4 py-2.5 text-gray-700 hover:bg-red-50 hover:text-red-700 rounded transition-colors text-sm font-medium"
              onClick={() => setMenuOpen(false)}
            >
              {user ? `Tài khoản (${user.name})` : "Đăng nhập"}
            </Link>
          </div>
        )}
      </div>
    </header>
  );
};

export default ClientHeader;
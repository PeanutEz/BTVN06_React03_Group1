import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ROUTER_URL } from "../../routes/router.const";
import { useAuthStore } from "../../store/auth.store";
import { useCartStore } from "../../store/cart.store";
import { showSuccess } from "../../utils";

const ClientHeader = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  const { user, logout } = useAuthStore();
  const { items } = useCartStore();

  const handleLogout = async () => {
    await logout();
    showSuccess("Đã đăng xuất");
    navigate(ROUTER_URL.LOGIN, { replace: true });
  };

  return (
    <header className="sticky top-0 z-50 bg-white shadow-md">
      <div className="mx-auto max-w-7xl">
        <div className="flex items-center gap-4 py-3 px-4 sm:px-6 lg:px-8">

          {/* Account */}
          <Link
            to={user ? ROUTER_URL.ACCOUNT : ROUTER_URL.LOGIN}
            className="hidden lg:flex items-center gap-2 hover:bg-gray-50 px-2 py-1 rounded transition-colors"
          >
            <svg className="w-5 h-5 text-gray-700" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                clipRule="evenodd"
              />
            </svg>

            <div className="text-xs">
              <div className="text-gray-600">Tài khoản</div>
              <div className="font-bold text-gray-900">
                {user ? user.name : "Đăng nhập"}
              </div>
            </div>
          </Link>

          {/* Logout */}
          {user && (
            <button
              type="button"
              onClick={handleLogout}
              className="hidden lg:flex items-center gap-2 hover:bg-red-50 px-2 py-1 rounded transition-colors text-red-500 hover:text-red-600"
              title="Đăng xuất"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <div className="text-xs">
                <div className="font-semibold">Đăng xuất</div>
              </div>
            </button>
          )}

          {/* Cart */}
          {user && (
            <Link
              to={ROUTER_URL.CART}
              className="flex items-center gap-2 border border-orange-400 hover:bg-orange-50 px-3 py-2 rounded transition-colors"
            >
              <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5"
                />
              </svg>

              <div className="text-xs">
                <div className="text-gray-600">Giỏ hàng</div>
                <div className="font-bold text-orange-600">
                  {items?.length || 0}
                </div>
              </div>
            </Link>
          )}

          {/* Mobile Menu Button */}
          <button
            className="lg:hidden text-gray-600 p-2"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>

        </div>
      </div>
    </header>
  );
};

export default ClientHeader;

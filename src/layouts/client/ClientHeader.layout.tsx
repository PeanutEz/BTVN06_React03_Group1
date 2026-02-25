import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ROUTER_URL } from "@/constants/router-url";
import { useAuthStore } from "@/store/auth.store";

import logoHylux from "@/assets/logo-hylux.png";
import {
  ShoppingCart,
  User,
  Menu,
  X,
  ChevronDown,
  LogOut,
} from "lucide-react";

const ClientHeader = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setAccountOpen(false);
    navigate(ROUTER_URL.HOME);
  };

  return (
    <header className="w-full shadow-sm bg-white">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo */}
        <Link to={ROUTER_URL.HOME} className="flex items-center gap-2">
          <img src={logoHylux} alt="Hylux" className="h-8" />
        </Link>

        {/* Desktop Menu */}
        <nav className="hidden md:flex items-center gap-6">
          <Link to={ROUTER_URL.HOME} className="hover:text-primary">
            Trang chủ
          </Link>
          <Link to={ROUTER_URL.SHOP} className="hover:text-primary">
            Sản phẩm
          </Link>
          <Link to={ROUTER_URL.CONTACT} className="hover:text-primary">
            Liên hệ
          </Link>
        </nav>

        {/* Right Section */}
        <div className="flex items-center gap-4">
          {/* Cart */}
          <button
            onClick={() => navigate(ROUTER_URL.CART)}
            className="relative"
          >
            <ShoppingCart size={22} />
          </button>

          {/* Account */}
          {user ? (
            <div className="relative">
              <button
                onClick={() => setAccountOpen(!accountOpen)}
                className="flex items-center gap-1"
              >
                <User size={20} />
                <ChevronDown size={16} />
              </button>

              {accountOpen && (
                <div className="absolute right-0 mt-2 w-40 bg-white border rounded shadow">
                  <Link
                    to={ROUTER_URL.PROFILE}
                    className="block px-4 py-2 hover:bg-gray-100"
                    onClick={() => setAccountOpen(false)}
                  >
                    Tài khoản
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2"
                  >
                    <LogOut size={16} />
                    Đăng xuất
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link to={ROUTER_URL.LOGIN}>
              <User size={22} />
            </Link>
          )}

          {/* Mobile Menu Toggle */}
          <button
            className="md:hidden"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden px-4 pb-4 space-y-2">
          <Link
            to={ROUTER_URL.HOME}
            className="block"
            onClick={() => setMenuOpen(false)}
          >
            Trang chủ
          </Link>
          <Link
            to={ROUTER_URL.SHOP}
            className="block"
            onClick={() => setMenuOpen(false)}
          >
            Sản phẩm
          </Link>
          <Link
            to={ROUTER_URL.CONTACT}
            className="block"
            onClick={() => setMenuOpen(false)}
          >
            Liên hệ
          </Link>
        </div>
      )}
    </header>
  );
};

export default ClientHeader;
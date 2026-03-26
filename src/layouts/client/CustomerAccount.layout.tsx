﻿import { Link, Outlet, useNavigate } from "react-router-dom";
import { ROUTER_URL } from "../../routes/router.const";
import { useAuthStore } from "../../store/auth.store";
import { logoutCustomer } from "../../services/auth.service";
import AccountSidebar from "./AccountSidebar.layout";
import { showSuccess } from "../../utils";

export default function CustomerAccountLayout() {
  const { logout } = useAuthStore();
  const navigate = useNavigate();
  const handleLogout = async () => {
    await logoutCustomer().catch(() => {});
    logout();
    showSuccess("Đăng xuất thành công");
    navigate(ROUTER_URL.LOGIN);
  };

  return (
    <div>
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-gray-400 mb-7">
        <Link to={ROUTER_URL.HOME} className="hover:text-green-600 transition-colors">
          Trang chủ
        </Link>
        <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-gray-700 font-medium">Tài khoản</span>
      </nav>

      {/* Layout */}
      <div className="flex flex-col md:flex-row gap-6 items-start">
        <AccountSidebar onLogout={handleLogout} />
        <div className="flex-1 min-w-0">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
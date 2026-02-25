import { Link, Outlet, useNavigate } from "react-router-dom";
import { ROUTER_URL } from "../../routes/router.const";
import { useAuthStore } from "../../store/auth.store";
import AccountSidebar from "./AccountSidebar.layout";

export default function CustomerAccountLayout() {
  const { logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate(ROUTER_URL.LOGIN);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-6 text-sm text-gray-500">
        <Link to={ROUTER_URL.HOME} className="text-green-600 hover:underline">
          Trang chủ
        </Link>
        <span> / Tài khoản</span>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        <AccountSidebar onLogout={handleLogout} />

        <div className="flex-1 min-h-[400px]">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

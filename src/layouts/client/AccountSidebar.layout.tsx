import { NavLink } from "react-router-dom";
import { ROUTER_URL } from "../../routes/router.const";

type AccountSidebarProps = {
  onLogout: () => void;
};

const MENU_ITEMS = [
  { icon: "👤", label: "Thông tin cá nhân", to: ROUTER_URL.CUSTOMER_PROFILE },
  { icon: "⭐", label: "Khách hàng thành viên", to: ROUTER_URL.CUSTOMER_MEMBERSHIP },
  { icon: "🎁", label: "Ưu đãi của tôi", to: ROUTER_URL.CUSTOMER_VOUCHERS },
  { icon: "📍", label: "Sổ địa chỉ", to: ROUTER_URL.CUSTOMER_ADDRESS_BOOK },
  { icon: "🛒", label: "Đơn hàng", to: ROUTER_URL.CUSTOMER_ORDER_HISTORY },
  { icon: "❤️", label: "Sản phẩm yêu thích", to: ROUTER_URL.CUSTOMER_FAVORITES },
  { icon: "🔐", label: "Sản phẩm đã đặt", to: ROUTER_URL.CUSTOMER_ORDERED },
  { icon: "💬", label: "Trung tâm trợ giúp", to: ROUTER_URL.CUSTOMER_SUPPORT },
];

export default function AccountSidebar({ onLogout }: AccountSidebarProps) {
  return (
    <aside className="w-full md:w-72 flex-shrink-0 border border-gray-200 rounded-2xl bg-white overflow-hidden">
      <nav className="flex flex-col px-6 py-4">
        {MENU_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end
            className={({ isActive }) =>
              `flex items-center justify-between border-b border-gray-200 py-5 transition-colors border-l-4 pl-2 ${
                isActive
                  ? "text-green-700 border-l-green-700"
                  : "text-gray-800 hover:text-green-700 border-l-transparent"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className="flex items-center gap-4">
                  <span className="text-3xl leading-none">{item.icon}</span>
                  <span className={`text-lg leading-tight ${isActive ? "font-semibold" : "font-medium"}`}>
                    {item.label}
                  </span>
                </div>
                <span className="text-3xl leading-none text-gray-300">›</span>
              </>
            )}
          </NavLink>
        ))}

        <button
          onClick={onLogout}
          className="flex items-center justify-between border-b border-gray-200 border-l-4 border-l-transparent pl-2 py-5 text-left transition-colors text-gray-800 hover:text-red-600"
        >
          <div className="flex items-center gap-4">
            <span className="text-3xl leading-none">🚪</span>
            <span className="text-lg leading-tight font-medium">Đăng xuất</span>
          </div>
          <span className="text-3xl leading-none text-gray-300">›</span>
        </button>
      </nav>
    </aside>
  );
}

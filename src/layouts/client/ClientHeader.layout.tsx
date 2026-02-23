import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { ROUTER_URL } from "../../routes/router.const";
import { useAuthStore } from "../../store/auth.store";
import { useCartStore } from "../../store/cart.store";

const ClientHeader = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { user } = useAuthStore();
  const { items } = useCartStore();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const categories = [
    { id: "ca-phe", name: "☕ Cà Phê", emoji: "☕" },
    { id: "tra", name: "🥤 Trà", emoji: "🥤" },
    { id: "freeze", name: "🧊 Freeze", emoji: "🧊" },
    { id: "phindi", name: "🥛 Phindi", emoji: "🥛" },
    { id: "banh-mi-que", name: "🍞 Bánh Mì Que", emoji: "🍞" },
    { id: "banh-ngot", name: "🍰 Bánh Ngọt", emoji: "🍰" },
    { id: "thuc-uong-khac", name: "🥤 Thức Uống Khác", emoji: "🥤" },
    { id: "binh-giu-nhiet", name: "🍶 Bình Giữ Nhiệt", emoji: "🍶" },
    { id: "ly-giu-nhiet", name: "🥤 Ly Giữ Nhiệt", emoji: "🥤" },
    { id: "ca-phe-dong-goi", name: "📦 Cà Phê Đóng Gói", emoji: "📦" },
    { id: "the-qua-tang", name: "🎁 Thẻ Quà Tặng", emoji: "🎁" },
    { id: "tra-sua-hylux", name: "🧋 Trà Sữa Hylux", emoji: "🧋" },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white shadow-md">
      <div className="mx-auto max-w-7xl">
        {/* Single Row: Menu, Search, Actions */}
        <div className="flex items-center gap-4 py-3 px-4 sm:px-6 lg:px-8">
          {/* Category Dropdown Menu - Left */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 px-3 py-2 border border-gray-300 hover:border-gray-400 rounded transition-colors whitespace-nowrap"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              <span className="font-medium text-sm">Danh mục sản phẩm</span>
            </button>

            {dropdownOpen && (
              <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-md shadow-lg border border-gray-200 py-1 max-h-96 overflow-y-auto animate-dropdown z-50">
                {categories.map((category) => (
                  <Link
                    key={category.id}
                    to={`${ROUTER_URL.PRODUCTS}?category=${category.id}`}
                    className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 transition-colors"
                    onClick={() => setDropdownOpen(false)}
                  >
                    <span className="text-xl">{category.emoji}</span>
                    <span className="text-gray-800 text-sm">{category.name.split(" ").slice(1).join(" ")}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Search Bar - Center */}
          <div className="flex-1 max-w-3xl">
            <div className="relative">
              <input
                type="text"
                placeholder="Xin chào, bạn cần gì hôm nay?"
                className="w-full px-4 py-2.5 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
              <button className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600 p-2 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </div>
          </div>

          {/* Actions - Right */}
          <div className="flex items-center gap-3">
            {/* Language Flag */}
            <button className="hidden lg:flex items-center hover:opacity-80 transition-opacity">
              <img 
                src="https://flagcdn.com/w20/vn.png" 
                alt="Tiếng Việt" 
                className="w-6 h-4 object-cover"
              />
            </button>

            {/* Phone */}
            <div className="hidden lg:flex items-center gap-2">
              <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
              </svg>
              <div className="text-xs">
                <div className="text-gray-600">Giao tận nơi</div>
                <div className="font-bold text-gray-900">19001755</div>
              </div>
            </div>

            {/* Account */}
            <Link 
              to={user ? ROUTER_URL.ACCOUNT : ROUTER_URL.LOGIN} 
              className="hidden lg:flex items-center gap-2 hover:bg-gray-50 px-2 py-1 rounded transition-colors"
            >
              <svg className="w-5 h-5 text-gray-700" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
              <div className="text-xs">
                <div className="text-gray-600">Tài khoản</div>
                <div className="font-bold text-gray-900">{user ? user.name : "Đăng nhập"}</div>
              </div>
            </Link>

            {/* Cart - Only show when logged in */}
            {user && (
              <Link 
                to={ROUTER_URL.CART} 
                className="flex items-center gap-2 border border-orange-400 hover:bg-orange-50 px-3 py-2 rounded transition-colors"
              >
                <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <div className="text-xs">
                  <div className="text-gray-600">Giỏ hàng</div>
                  <div className="font-bold text-orange-600">{items?.length || 0}</div>
                </div>
              </Link>
            )}

            {/* Mobile Menu Button */}
            <button
              className="lg:hidden text-gray-600 p-2"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Toggle menu"
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

        {/* Mobile Menu */}
        {menuOpen && (
          <div className="lg:hidden pb-4 space-y-2 px-4 bg-gray-50">
            <Link
              to={ROUTER_URL.PRODUCTS}
              className="block px-4 py-2 text-gray-700 hover:bg-red-50 rounded transition-colors"
              onClick={() => setMenuOpen(false)}
            >
              Sản phẩm
            </Link>
            <Link
              to={ROUTER_URL.ORDER}
              className="block px-4 py-2 text-gray-700 hover:bg-red-50 rounded transition-colors"
              onClick={() => setMenuOpen(false)}
            >
              Đặt hàng
            </Link>
            <Link
              to={ROUTER_URL.STORE_LOCATOR}
              className="block px-4 py-2 text-gray-700 hover:bg-red-50 rounded transition-colors"
              onClick={() => setMenuOpen(false)}
            >
              Hệ thống cửa hàng
            </Link>
            <Link
              to={ROUTER_URL.CONTACT}
              className="block px-4 py-2 text-gray-700 hover:bg-red-50 rounded transition-colors"
              onClick={() => setMenuOpen(false)}
            >
              Liên hệ
            </Link>
          </div>
        )}
      </div>
    </header>
  );
};

export default ClientHeader;
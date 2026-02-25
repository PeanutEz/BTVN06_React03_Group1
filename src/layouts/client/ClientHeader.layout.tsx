import { useState, useRef, useEffect } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { ROUTER_URL } from "../../routes/router.const";
import { useAuthStore } from "../../store/auth.store";
import logoHylux from "../../assets/logo-hylux.png";

const CATEGORIES = [
  { id: "ca-phe", name: "Cà Phê", emoji: "☕" },
  { id: "tra", name: "Trà", emoji: "🥤" },
  { id: "freeze", name: "Freeze", emoji: "🧊" },
  { id: "phindi", name: "Phindi", emoji: "🥛" },
  { id: "banh-mi-que", name: "Bánh Mì Que", emoji: "🍞" },
  { id: "banh-ngot", name: "Bánh Ngọt", emoji: "🍰" },
  { id: "thuc-uong-khac", name: "Thức Uống Khác", emoji: "🥤" },
  { id: "binh-giu-nhiet", name: "Bình Giữ Nhiệt", emoji: "🍶" },
  { id: "ly-giu-nhiet", name: "Ly Giữ Nhiệt", emoji: "🥤" },
  { id: "ca-phe-dong-goi", name: "Cà Phê Đóng Gói", emoji: "📦" },
  { id: "the-qua-tang", name: "Thẻ Quà Tặng", emoji: "🎁" },
  { id: "tra-sua-hylux", name: "Trà Sữa Hylux", emoji: "🧋" },
];

const NAV_LINKS = [
  { label: "Trang chủ", path: ROUTER_URL.HOME },
  { label: "Menu", path: ROUTER_URL.MENU },
  { label: "Hệ thống cửa hàng", path: ROUTER_URL.STORE_LOCATOR },
  { label: "Liên hệ", path: ROUTER_URL.CONTACT },
  { label: "Hội viên", path: ROUTER_URL.LOYALTY_DASHBOARD, highlight: true },
];

const STORES = [
  { id: "1", name: "Hylux - 44 Nguyễn Trãi", address: "44 Nguyễn Trãi, P. Bến Thành, Q.1, TP. Hồ Chí Minh", phone: "(028) 3823 4400", hours: "07:00 - 22:30", status: "Mở cửa" },
  { id: "2", name: "Hylux - Vincom Đồng Khởi", address: "72 Lê Thánh Tôn, P. Bến Nghé, Q.1, TP. Hồ Chí Minh", phone: "(028) 3821 5500", hours: "08:00 - 22:00", status: "Mở cửa" },
  { id: "3", name: "Hylux - Gò Vấp", address: "210 Nguyễn Oanh, P.7, Q. Gò Vấp, TP. Hồ Chí Minh", phone: "(028) 3894 6600", hours: "07:00 - 22:00", status: "Mở cửa" },
  { id: "4", name: "Hylux - Bình Thạnh", address: "58 Đinh Tiên Hoàng, P.3, Q. Bình Thạnh, TP. Hồ Chí Minh", phone: "(028) 3515 7700", hours: "07:30 - 22:30", status: "Mở cửa" },
  { id: "5", name: "Hylux - Phú Nhuận", address: "116 Phan Xích Long, P.7, Q. Phú Nhuận, TP. Hồ Chí Minh", phone: "(028) 3845 8800", hours: "07:00 - 22:00", status: "Mở cửa" },
  { id: "6", name: "Hylux - Tân Bình", address: "330 Cộng Hòa, P.13, Q. Tân Bình, TP. Hồ Chí Minh", phone: "(028) 3812 9900", hours: "07:00 - 22:30", status: "Đóng cửa" },
  { id: "7", name: "Hylux - Thủ Đức", address: "150 Võ Văn Ngân, P. Bình Thọ, TP. Thủ Đức, TP. Hồ Chí Minh", phone: "(028) 3722 1010", hours: "07:30 - 21:30", status: "Mở cửa" },
];

const ClientHeader = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [deliveryOpen, setDeliveryOpen] = useState(false);
  const [deliveryTab, setDeliveryTab] = useState<"delivery" | "pickup">("delivery");
  const [savedAddresses, setSavedAddresses] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("hylux_addresses") || "[]"); }
    catch { return []; }
  });
  const [storeSearch, setStoreSearch] = useState("");
  const [selectedDelivery, setSelectedDelivery] = useState<{ type: "delivery" | "pickup"; label: string } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);
  const deliveryRef = useRef<HTMLDivElement>(null);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
      if (accountRef.current && !accountRef.current.contains(event.target as Node)) {
        setAccountOpen(false);
      }
      if (deliveryRef.current && !deliveryRef.current.contains(event.target as Node)) {
        setDeliveryOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    setAccountOpen(false);
    navigate(ROUTER_URL.HOME);
  };

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
            {/* Delivery Method Button + Panel */}
            <div className="relative hidden lg:block" ref={deliveryRef}>
              <button
                onClick={() => setDeliveryOpen(!deliveryOpen)}
                aria-label="Chọn phương thức nhận hàng"
                className="flex items-center gap-2 border-2 border-red-500 hover:bg-red-50 text-red-700 font-semibold text-sm px-3 py-2 rounded-full transition-all duration-200 hover:shadow-md whitespace-nowrap"
              >
                <span className="text-xl">{selectedDelivery?.type === "pickup" ? "🏪" : "🛵"}</span>
                <span className="max-w-[180px] truncate">
                  {selectedDelivery ? selectedDelivery.label : "Chọn Phương Thức Nhận Hàng"}
                </span>
                <svg className={`w-3.5 h-3.5 transition-transform duration-200 ${deliveryOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Delivery Panel */}
              <div className={`absolute left-0 top-[calc(100%+8px)] w-[420px] bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden transition-all duration-200 origin-top-left ${
                deliveryOpen ? "opacity-100 scale-100 visible" : "opacity-0 scale-95 invisible"
              }`}>
                {/* Tabs */}
                <div className="flex border-b border-gray-200">
                  <button
                    onClick={() => setDeliveryTab("delivery")}
                    className={`flex-1 py-3.5 text-sm font-bold tracking-wide transition-colors ${
                      deliveryTab === "delivery"
                        ? "text-red-700 border-b-2 border-red-600 bg-white"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    GIAO HÀNG
                  </button>
                  <button
                    onClick={() => setDeliveryTab("pickup")}
                    className={`flex-1 py-3.5 text-sm font-bold tracking-wide transition-colors ${
                      deliveryTab === "pickup"
                        ? "text-red-700 border-b-2 border-red-600 bg-white"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    ĐẾN LẤY
                  </button>
                </div>

                {/* GIAO HÀNG Tab */}
                {deliveryTab === "delivery" && (
                  <div className="p-4 space-y-3">
                    {/* Saved addresses */}
                    {savedAddresses.length > 0 ? (
                      <div className="space-y-2 max-h-52 overflow-y-auto">
                        <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Địa chỉ của bạn</p>
                        {savedAddresses.map((addr, idx) => (
                            <div key={idx} className="flex items-center gap-2 group">
                              <button
                                onClick={() => {
                                  setSelectedDelivery({ type: "delivery", label: addr });
                                  setDeliveryOpen(false);
                                }}
                                className="flex-1 flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-50 border border-gray-100 hover:border-red-200 transition-colors text-left"
                              >
                                <svg className="w-4 h-4 text-red-600 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                                </svg>
                                <span className="text-sm text-gray-700 flex-1 truncate">{addr}</span>
                              </button>
                              <button
                                onClick={() => {
                                  const updated = savedAddresses.filter((_, i) => i !== idx);
                                  setSavedAddresses(updated);
                                  localStorage.setItem("hylux_addresses", JSON.stringify(updated));
                                }}
                                className="p-1.5 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                aria-label="Xóa địa chỉ"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400 text-center py-2">Bạn chưa có địa chỉ nào</p>
                    )}

                    {/* Link to address book */}
                    <Link
                      to={ROUTER_URL.CUSTOMER_ADDRESS_BOOK}
                      onClick={() => setDeliveryOpen(false)}
                      className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl border border-dashed border-red-400 hover:bg-red-50 text-red-700 font-semibold text-sm transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Thêm địa chỉ mới
                    </Link>
                  </div>
                )}

                {/* ĐẾN LẤY Tab */}
                {deliveryTab === "pickup" && (
                  <div className="p-4 space-y-3">
                    <div className="relative">
                      <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <input
                        type="text"
                        value={storeSearch}
                        onChange={(e) => setStoreSearch(e.target.value)}
                        placeholder="Vui lòng nhập địa điểm, tên cửa hàng"
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-red-400 transition"
                      />
                    </div>
                    <p className="text-red-700 font-bold text-sm">Danh sách cửa hàng</p>
                    <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                      {STORES.filter((s) =>
                        storeSearch === "" ||
                        s.name.toLowerCase().includes(storeSearch.toLowerCase()) ||
                        s.address.toLowerCase().includes(storeSearch.toLowerCase())
                      ).map((store) => (
                        <div key={store.id} className="flex items-start gap-3 pb-3 border-b border-gray-100 last:border-0">
                          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0 text-red-700 text-lg">
                            🏪
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-red-700 font-semibold text-sm truncate">{store.name}</p>
                            <p className="text-gray-500 text-xs mt-0.5"><span className="font-medium text-gray-700">Địa chỉ: </span>{store.address}</p>
                            <p className="text-gray-500 text-xs"><span className="font-medium text-gray-700">Số điện thoại: </span>{store.phone}</p>
                            <p className="text-gray-500 text-xs"><span className="font-medium text-gray-700">Giờ hoạt động: </span>{store.hours}</p>
                            <p className="text-gray-500 text-xs"><span className="font-medium text-gray-700">Trạng thái: </span>
                              <span className={store.status === "Mở cửa" ? "text-red-600 font-semibold" : "text-red-500 font-semibold"}>{store.status}</span>
                            </p>
                          </div>
                          <div className="flex flex-col gap-1.5 shrink-0">
                            <button
                              onClick={() => {
                                setSelectedDelivery({ type: "pickup", label: store.name });
                                setDeliveryOpen(false);
                              }}
                              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-colors whitespace-nowrap"
                            >
                              Chọn cửa hàng
                            </button>
                            <a
                              href={`https://www.google.com/maps/search/${encodeURIComponent(store.address)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-center gap-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-colors whitespace-nowrap"
                            >
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                              </svg>
                              Chỉ đường
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Mail Icon */}
            <button
              className="hidden lg:flex items-center justify-center relative"
              aria-label="Hộp thư"
            >
              <div className="w-10 h-10 rounded-full border-2 border-red-600 flex items-center justify-center hover:bg-red-50 text-red-700 transition-all duration-200">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="absolute -top-0.5 -right-0.5 bg-red-600 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 leading-none">
                2
              </span>
            </button>

            {/* Account Dropdown */}
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
                  <div className={`absolute right-0 top-[calc(100%+8px)] w-60 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 overflow-hidden transition-all duration-200 origin-top-right ${
                    accountOpen ? "opacity-100 scale-100 visible" : "opacity-0 scale-95 invisible"
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
                        { icon: "📍", label: "Sổ địa chỉ", path: ROUTER_URL.CUSTOMER_ADDRESS_BOOK },
                        { icon: "⭐", label: "Khách hàng thành viên", path: ROUTER_URL.CUSTOMER_MEMBERSHIP },
                        { icon: "🎁", label: "Ưu đãi của tôi", path: ROUTER_URL.CUSTOMER_VOUCHERS },
                        { icon: "📦", label: "Đơn hàng", path: ROUTER_URL.CUSTOMER_ORDER_HISTORY },
                        { icon: "🛒", label: "Giỏ hàng", path: ROUTER_URL.CUSTOMER_CART },
                        { icon: "❤️", label: "Sản phẩm yêu thích", path: ROUTER_URL.CUSTOMER_FAVORITES },
                        { icon: "🔐", label: "Sản phẩm đã đặt", path: ROUTER_URL.CUSTOMER_ORDERED },
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

        {/* ── DIVIDER ── */}
        <div className="relative px-4 sm:px-6 lg:px-8">
          <div className="h-px bg-gradient-to-r from-transparent via-red-300 to-transparent" />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-red-600/30 to-transparent blur-sm" />
        </div>

        {/* ── ROW 2: Category Dropdown · Nav Links ── */}
        <div className="hidden lg:flex items-center gap-2 px-4 sm:px-6 lg:px-8 py-2">

          {/* Category Dropdown */}
          <div className="relative w-56 shrink-0" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded transition-colors text-sm font-medium border ${
                dropdownOpen
                  ? "border-red-400 bg-red-50 text-red-700"
                  : "border-gray-300 hover:border-red-400 hover:bg-red-50 hover:text-red-700 text-gray-700 bg-white"
              }`}
              aria-expanded={dropdownOpen}
              aria-haspopup="listbox"
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              <span className="flex-1 text-left whitespace-nowrap">Danh mục sản phẩm</span>
              <svg className={`w-4 h-4 shrink-0 transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            <div className={`absolute top-[calc(100%+6px)] left-0 w-full bg-white rounded-lg shadow-xl z-50 overflow-hidden border border-gray-100 transition-all duration-200 ease-in-out origin-top ${
              dropdownOpen ? "opacity-100 scale-y-100 visible" : "opacity-0 scale-y-95 invisible"
            }`}>
              <div className="py-1 max-h-72 overflow-y-auto">
                {CATEGORIES.map((cat) => (
                  <Link
                    key={cat.id}
                    to={`${ROUTER_URL.MENU}?category=${cat.id}`}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-red-50 hover:text-red-700 transition-colors"
                    onClick={() => setDropdownOpen(false)}
                  >
                    <span className="w-6 h-6 flex items-center justify-center text-base shrink-0">{cat.emoji}</span>
                    <span className="text-sm font-medium">{cat.name}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Separator */}
          <div className="h-6 w-px bg-gray-200 mx-1 shrink-0" />

          {/* Nav Links */}
          <nav className="flex items-center gap-1 flex-1">
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.path}
                to={link.path}
                end={link.path === ROUTER_URL.HOME}
                className={({ isActive }) =>
                  `px-3 py-2 rounded text-sm font-medium transition-colors whitespace-nowrap ${
                    isActive
                      ? "text-red-700 bg-red-50 font-semibold"
                      : (link as { highlight?: boolean }).highlight
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

        {/* ── MOBILE MENU ── */}
        {menuOpen && (
          <div className="lg:hidden pb-4 px-4 space-y-1 bg-gray-50 border-t border-gray-100">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className="block px-4 py-2.5 text-gray-700 hover:bg-red-50 hover:text-red-700 rounded transition-colors text-sm font-medium"
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
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
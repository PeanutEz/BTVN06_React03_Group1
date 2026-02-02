import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { ROUTER_URL } from "../../routes/router.const";
import { useAuthStore } from "../../store";
import logoHylux from "../../assets/logo-hylux.png";

const navItems = [
  { label: "Trang chủ", to: ROUTER_URL.HOME },
  { label: "Đặt hàng", to: ROUTER_URL.ORDER },
  { label: "Sản phẩm", to: ROUTER_URL.PRODUCTS },
  { label: "Danh mục", to: ROUTER_URL.CATEGORIES },
  { label: "Giới thiệu", to: ROUTER_URL.ABOUT },
  { label: "Liên hệ", to: ROUTER_URL.CONTACT },
];

const ClientHeader = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [scrollOpacity, setScrollOpacity] = useState(1);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      setScrolled(scrollPosition > 20);
      // Tính opacity từ 1 đến 0.85 khi scroll từ 0 đến 300px
      const opacity = Math.max(0.85, 1 - (scrollPosition / 1000));
      setScrollOpacity(opacity);
    };

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", handleScroll);
    
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
    navigate(ROUTER_URL.HOME);
  };

  return (
    <header 
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled 
          ? "bg-white/95 backdrop-blur-xl shadow-lg border-b border-red-100" 
          : "bg-white border-b border-red-50"
      }`}
      style={{ opacity: scrollOpacity }}
    >
      {/* Top Bar - Premium Touch */}
      <div className="bg-gradient-to-r from-red-900 via-red-800 to-red-900 text-white py-2">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between text-xs sm:text-sm">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                </svg>
                Hotline: 1900-xxxx
              </span>
              <span className="hidden sm:flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                </svg>
                support@hylux.com
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden md:inline text-amber-200">✨ Miễn phí vận chuyển đơn từ 200k</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-4">
          {/* Logo & Brand */}
          <Link to={ROUTER_URL.HOME} className="flex items-center gap-3 group">
            <div className="relative w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center">
              <img 
                src={logoHylux}
                alt="Hylux Coffee Logo" 
                className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-110 drop-shadow-lg"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-3xl sm:text-4xl font-bold tracking-tight text-red-900 leading-none font-serif">
                Hylux
              </span>
              <span className="text-xs sm:text-sm text-red-800 font-medium tracking-[0.2em] uppercase mt-0.5">
                Premium Coffee
              </span>
            </div>
          </Link>

          {/* Navigation - Desktop */}
          <nav className="hidden lg:flex items-center gap-8">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `relative text-sm font-semibold transition-colors duration-200 py-2 group ${
                    isActive 
                      ? "text-red-800" 
                      : "text-slate-700 hover:text-red-700"
                  }`
                }
                end
              >
                {item.label}
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-red-800 to-red-600 transition-all duration-300 group-hover:w-full" />
              </NavLink>
            ))}
          </nav>
          {/* Actions */}
          <div className="flex items-center gap-4">
            {/* Search Icon */}
            <button className="hidden md:flex items-center justify-center w-10 h-10 rounded-full hover:bg-red-50 text-slate-600 hover:text-red-700 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>

            {/* Cart Icon */}
            <button className="hidden md:flex items-center justify-center w-10 h-10 rounded-full hover:bg-red-50 text-slate-600 hover:text-red-700 transition-colors relative">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-semibold">
                0
              </span>
            </button>

            {!user ? (
              <button
                type="button"
                onClick={() => {
                  logout();
                  navigate(ROUTER_URL.LOGIN);
                }}
                className="relative overflow-hidden rounded-full bg-gradient-to-r from-red-800 to-red-700 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-red-900/30 transition-all duration-300 hover:shadow-xl hover:shadow-red-900/40 hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700 group"
              >
                <span className="relative z-10">Đăng nhập</span>
                <div className="absolute inset-0 bg-gradient-to-r from-red-700 to-red-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </button>
            ) : (
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setMenuOpen((open) => !open)}
                  className="flex items-center gap-3 rounded-full border-2 border-red-100 bg-white hover:border-red-300 px-3 py-2 text-sm font-semibold shadow-md hover:shadow-lg transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
                  aria-expanded={menuOpen}
                >
                  <img src={user.avatar} alt={user.name} className="size-8 rounded-full object-cover ring-2 ring-red-100" />
                  <div className="hidden sm:block text-left leading-tight">
                    <p className="text-sm font-semibold text-slate-800">{user.name}</p>
                    <p className="text-xs text-red-700">{user.role}</p>
                  </div>
                  <svg viewBox="0 0 20 20" aria-hidden className="size-4 text-slate-600">
                    <path fill="currentColor" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.51a.75.75 0 0 1-1.08 0L5.21 8.27a.75.75 0 0 1 .02-1.06Z" />
                  </svg>
                </button>

                {menuOpen && (
                  <div className="absolute right-0 mt-3 w-64 z-50 rounded-2xl border border-red-100 bg-white shadow-2xl shadow-red-900/10 py-2 animate-fade-in">
                    <div className="flex items-center gap-3 px-4 py-3 border-b border-red-50">
                      <img src={user.avatar} alt={user.name} className="size-12 rounded-full object-cover ring-2 ring-red-100" />
                      <div className="leading-tight flex-1">
                        <p className="text-sm font-bold text-slate-900">{user.name}</p>
                        <p className="text-xs text-red-700 font-medium">{user.role}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{user.email}</p>
                      </div>
                    </div>
                    
                    <div className="py-2 px-2">
                      <button
                        type="button"
                        onClick={() => {
                          navigate(ROUTER_URL.PROFILE);
                          setMenuOpen(false);
                        }}
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-red-50 hover:text-red-700 rounded-lg transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span>Hồ sơ</span>
                      </button>
                      <button
                        type="button"
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-red-50 hover:text-red-700 rounded-lg transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span>Đơn hàng của tôi</span>
                      </button>
                    </div>

                    <div className="border-t border-red-50 mt-2 pt-2 px-2">
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        <span>Đăng xuất</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Mobile Menu Toggle */}
            <button 
              className="lg:hidden flex items-center justify-center w-10 h-10 rounded-lg hover:bg-red-50 text-slate-700 hover:text-red-700 transition-colors"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {menuOpen && (
          <nav className="lg:hidden py-4 border-t border-red-50 animate-fade-in">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `block px-4 py-3 text-sm font-semibold rounded-lg transition-colors ${
                    isActive 
                      ? "bg-red-50 text-red-800" 
                      : "text-slate-700 hover:bg-red-50 hover:text-red-700"
                  }`
                }
                end
                onClick={() => setMenuOpen(false)}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        )}
      </div>
    </header>
  );
};

export default ClientHeader;

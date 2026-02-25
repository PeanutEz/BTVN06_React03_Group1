import { Link } from "react-router-dom";
import { ROUTER_URL } from "../../routes/router.const";

const ClientFooter = () => {
  return (
    <footer className="bg-slate-900 text-white pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-8">
          {/* Brand */}
          <div>
            <h3 className="text-2xl font-bold mb-4 text-amber-200">Hylux Coffee</h3>
            <p className="text-slate-400 mb-4">
              Mang đến trải nghiệm cà phê đẳng cấp cho người Việt
            </p>
            <div className="flex gap-4">
              <a href="#" className="hover:text-amber-200 transition-colors">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </a>
              <a href="#" className="hover:text-amber-200 transition-colors">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-bold text-lg mb-4 text-amber-200">Liên Kết</h4>
            <ul className="space-y-2">
              <li>
                <Link to={ROUTER_URL.MENU} className="text-slate-400 hover:text-white transition-colors">
                  Đặt Hàng
                </Link>
              </li>
              <li>
                <Link to={ROUTER_URL.STORE_LOCATOR} className="text-slate-400 hover:text-white transition-colors">
                  Hệ Thống Cửa Hàng
                </Link>
              </li>
              <li>
                <Link to={ROUTER_URL.MENU} className="text-slate-400 hover:text-white transition-colors">
                  Sản Phẩm
                </Link>
              </li>
              <li>
                <Link to={ROUTER_URL.CONTACT} className="text-slate-400 hover:text-white transition-colors">
                  Liên Hệ
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="font-bold text-lg mb-4 text-amber-200">Liên Hệ</h4>
            <ul className="space-y-2 text-slate-400">
              <li>Email: info@hylux.vn</li>
              <li>Hotline: 1900 xxxx</li>
              <li>Địa chỉ: Hà Nội, Việt Nam</li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h4 className="font-bold text-lg mb-4 text-amber-200">Nhận Tin</h4>
            <p className="text-slate-400 mb-4 text-sm">
              Đăng ký để nhận ưu đãi mới nhất
            </p>
            <div className="flex gap-2">
              <input 
                type="email" 
                placeholder="Email của bạn"
                className="flex-1 px-4 py-2 rounded bg-slate-800 text-white border border-slate-700 focus:outline-none focus:border-amber-200"
              />
              <button className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded font-bold transition-colors">
                Gửi
              </button>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-800 pt-8 text-center text-slate-400 text-sm">
          <p>&copy; 2026 BTVN06 Group1. Build with React + Vite</p>
        </div>
      </div>
    </footer>
  );
};

export default ClientFooter;

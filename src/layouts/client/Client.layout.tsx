import { Outlet, Link, useLocation } from "react-router-dom";
import ClientHeader from "./ClientHeader.layout";
import ClientFooter from "./ClientFooter.layout";
import { useCartStore } from "../../store";
import { ROUTER_URL } from "../../routes/router.const";

const ClientLayout = () => {
  const cartCount = useCartStore((s) => s.items.reduce((sum, x) => sum + x.quantity, 0));
  const { pathname } = useLocation();
  const showFloatingCart = pathname === ROUTER_URL.ORDER || pathname.startsWith(ROUTER_URL.PRODUCTS);

  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col antialiased">
      {/* Sticky header with bottom border for subtle separation */}
      <ClientHeader />

      {/* Page content
          Default: centered 1280 px column with responsive padding.
          Pages that need a full-bleed hero can break out with -mx-4 sm:-mx-6 lg:-mx-8
          or import <PageContainer fluid> for a dedicated full-width section. */}
      <main className="flex-1 w-full">
        <div className="mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-8 py-8 sm:py-10 lg:py-12">
          <Outlet />
        </div>
      </main>

      <ClientFooter />

      {/* ── Floating cart FAB ── */}
      {showFloatingCart && (
        <Link
          to={ROUTER_URL.CART}
          className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-14 h-14 rounded-full bg-red-700 hover:bg-red-600 text-white shadow-xl ring-1 ring-red-800/20 transition-all duration-200 hover:scale-105 active:scale-95"
          aria-label="Giỏ hàng"
        >
          <div className="relative">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            {cartCount > 0 && (
              <span className="absolute -top-2.5 -right-2.5 min-w-[20px] h-5 flex items-center justify-center px-1 rounded-full bg-amber-400 text-red-900 text-[10px] font-extrabold leading-none ring-2 ring-white">
                {cartCount > 99 ? "99+" : cartCount}
              </span>
            )}
          </div>
        </Link>
      )}
    </div>
  );
};

export default ClientLayout;

import { useState, useMemo, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { menuCategories, menuProducts, getProductsByCategory } from "@/services/menu.service";
import { useMenuCartStore, useMenuCartTotals } from "@/store/menu-cart.store";
import { useDeliveryStore } from "@/store/delivery.store";
import { useAuthStore } from "@/store/auth.store";
import type { MenuProduct } from "@/types/menu.types";
import { ROUTER_URL } from "@/routes/router.const";
import MenuSidebar from "@/components/menu/MenuSidebar";
import MenuProductCard from "@/components/menu/MenuProductCard";
import MenuProductModal from "@/components/menu/MenuProductModal";
import MenuOrderPanel from "@/components/menu/MenuOrderPanel";
import BranchPickerModal from "@/components/menu/BranchPickerModal";

const fmt = (n: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n);

function ProductGrid({ products, onAdd }: { products: MenuProduct[]; onAdd: (p: MenuProduct) => void }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4 sm:gap-5">
      {products.map((product) => (
        <MenuProductCard key={product.id} product={product} onAdd={onAdd} />
      ))}
    </div>
  );
}

export default function MenuPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<MenuProduct | null>(null);
  const [showOrderPanel, setShowOrderPanel] = useState(false);
  const [showBranchPicker, setShowBranchPicker] = useState(false);

  const { user } = useAuthStore();

  const initialCategoryId = Number(searchParams.get("category")) || 0;
  const [activeCategoryId, setActiveCategoryId] = useState(initialCategoryId);

  const { itemCount, total } = useMenuCartTotals();

  // Hydrate stores on mount
  const hydrateCart = useMenuCartStore((s) => s.hydrate);
  const hydrateDelivery = useDeliveryStore((s) => s.hydrate);

  useEffect(() => {
    hydrateCart();
    hydrateDelivery();
  }, [hydrateCart, hydrateDelivery]);

  const productCounts = useMemo(() => {
    const map: Record<number, number> = {};
    menuCategories.forEach((cat) => {
      map[cat.id] = menuProducts.filter((p) => p.categoryId === cat.id && p.isAvailable).length;
    });
    return map;
  }, []);

  const products = useMemo(() => {
    const base =
      activeCategoryId === 0
        ? menuProducts.filter((p) => p.isAvailable)
        : getProductsByCategory(activeCategoryId);
    if (!search.trim()) return base;
    const q = search.toLowerCase();
    return base.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q),
    );
  }, [activeCategoryId, search]);

  // Group products by category (used when "Tất cả" is selected)
  const groupedProducts = useMemo(() => {
    if (activeCategoryId !== 0) return null;
    return menuCategories
      .map((cat) => ({
        category: cat,
        items: products.filter((p) => p.categoryId === cat.id),
      }))
      .filter((g) => g.items.length > 0);
  }, [activeCategoryId, products]);

  const activeCategory = menuCategories.find((c) => c.id === activeCategoryId);
  const activeCategoryLabel = activeCategoryId === 0
    ? { icon: "🍽️", name: "Tất cả", description: "Toàn bộ thực đơn Hylux" }
    : activeCategory;

  function handleSelectCategory(id: number) {
    setActiveCategoryId(id);
    setSearchParams(id !== 0 ? { category: String(id) } : {});
  }

  // Auth-gated product selection: guests see a login prompt
  const handleAddProduct = useCallback((product: MenuProduct) => {
    if (!user) {
      toast.error("Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng", {
        action: {
          label: "Đăng nhập",
          onClick: () => navigate(ROUTER_URL.LOGIN, { state: { from: { pathname: ROUTER_URL.MENU } } }),
        },
      });
      return;
    }
    setSelectedProduct(product);
  }, [user, navigate]);

  return (
    <>
      {/* Break out of parent layout container padding/max-width */}
      <div className="-mx-4 sm:-mx-6 lg:-mx-8 -my-8 sm:-my-10 lg:-my-12 min-h-screen bg-white">
        {/* ── Page header ── */}
        <div className="border-b border-gray-100 bg-white">
          <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8 py-6">
            <nav className="flex items-center gap-2 text-sm text-gray-400 mb-3">
              <a href="/" className="hover:text-gray-600 transition-colors">Trang chủ</a>
              <span>/</span>
              <span className="text-gray-900 font-medium">Menu</span>
              {activeCategoryId !== 0 && activeCategory && (
                <>
                  <span>/</span>
                  <span className="text-amber-600 font-medium">{activeCategory.name}</span>
                </>
              )}
            </nav>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
                  {activeCategoryLabel?.icon} {activeCategoryLabel?.name}
                </h1>
                <p className="text-sm text-gray-500 mt-0.5">{activeCategoryLabel?.description}</p>
              </div>
              <div className="flex items-center gap-3">
                {/* Search */}
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0" />
                  </svg>
                  <input
                    type="search"
                    placeholder="Tìm sản phẩm..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 pr-4 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent w-48 sm:w-60 transition-all"
                  />
                </div>

                {/* Cart badge button (opens order panel on mobile) */}
                {itemCount > 0 && (
                  <button
                    onClick={() => setShowOrderPanel(true)}
                    className="lg:hidden flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all active:scale-95"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <span>{itemCount}</span>
                    <span className="hidden sm:inline">· {fmt(total)}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Mobile category tabs */}
            <div className="mt-4 flex gap-2 overflow-x-auto pb-1 scrollbar-none md:hidden">
              <button
                onClick={() => handleSelectCategory(0)}
                className={cn(
                  "shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all",
                  activeCategoryId === 0
                    ? "bg-amber-500 text-white shadow-sm"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200",
                )}
              >
                <span>🍽️</span>
                <span>Tất cả</span>
              </button>
              {menuCategories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => handleSelectCategory(cat.id)}
                  className={cn(
                    "shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all",
                    cat.id === activeCategoryId
                      ? "bg-amber-500 text-white shadow-sm"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200",
                  )}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Main layout ── */}
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex gap-8">
            {/* Sidebar — desktop only */}
            <div className="hidden md:block self-start sticky top-40">
              <MenuSidebar
                categories={menuCategories}
                activeId={activeCategoryId}
                productCounts={productCounts}
                onSelect={handleSelectCategory}
              />
            </div>

            {/* Product grid */}
            <div className="flex-1 min-w-0">
              {products.length > 0 && (
                <p className="text-sm text-gray-500 mb-5">{products.length} sản phẩm</p>
              )}

              {products.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                  <div className="text-5xl mb-4">🔍</div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">Không tìm thấy</h3>
                  <p className="text-sm text-gray-500">Hãy thử từ khóa khác hoặc chọn danh mục khác</p>
                  <button
                    onClick={() => setSearch("")}
                    className="mt-4 text-sm text-amber-600 hover:text-amber-700 font-medium"
                  >
                    Xóa tìm kiếm
                  </button>
                </div>
              ) : groupedProducts ? (
                /* ── Grouped by category (Tất cả) ── */
                <div className="space-y-10">
                  {groupedProducts.map(({ category, items }) => (
                    <section key={category.id}>
                      {/* Category header */}
                      <div className="flex items-center gap-3 mb-5">
                        <div className="flex items-center gap-2.5">
                          <span className="text-2xl">{category.icon}</span>
                          <h2 className="text-lg font-bold text-emerald-700 tracking-tight">
                            {category.name}
                          </h2>
                          <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                            {items.length} món
                          </span>
                        </div>
                        <div className="flex-1 h-px bg-emerald-100" />
                      </div>
                      <ProductGrid products={items} onAdd={handleAddProduct} />
                    </section>
                  ))}
                </div>
              ) : (
                /* ── Single category view ── */
                <ProductGrid products={products} onAdd={handleAddProduct} />
              )}
            </div>

            {/* ── Order Panel (desktop sticky right) ── */}
            <aside className="hidden lg:flex w-[280px] xl:w-[300px] shrink-0 sticky top-40 self-start flex-col rounded-2xl border border-gray-200 bg-white shadow-sm">
              <MenuOrderPanel onOpenBranchPicker={() => setShowBranchPicker(true)} />
            </aside>
          </div>
        </div>
      </div>

      {/* Product customization modal */}
      <MenuProductModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
      />

      {/* Branch picker modal */}
      {showBranchPicker && (
        <BranchPickerModal onClose={() => setShowBranchPicker(false)} />
      )}

      {/* Mobile: sticky bottom cart button */}
      {itemCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 p-4 bg-white border-t border-gray-100 shadow-lg lg:hidden">
          <button
            onClick={() => setShowOrderPanel(true)}
            className="flex items-center justify-between w-full bg-amber-500 hover:bg-amber-600 text-white px-5 py-3.5 rounded-2xl font-semibold transition-all active:scale-[0.98]"
          >
            <span className="flex items-center gap-2">
              <span className="bg-white/20 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {itemCount}
              </span>
              Xem đơn hàng
            </span>
            <span>{fmt(total)}</span>
          </button>
        </div>
      )}

      {/* Mobile: Order panel bottom sheet */}
      {showOrderPanel && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowOrderPanel(false)} />
          <div className="relative bg-white rounded-t-2xl shadow-2xl flex flex-col max-h-[90dvh] overflow-hidden">
            <MenuOrderPanel
              onRequestClose={() => setShowOrderPanel(false)}
              onOpenBranchPicker={() => { setShowOrderPanel(false); setShowBranchPicker(true); }}
            />
          </div>
        </div>
      )}
    </>
  );
}

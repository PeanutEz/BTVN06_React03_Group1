import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { clientService } from "@/services/client.service";
import type { ClientFranchiseItem, ClientCategoryByFranchiseItem } from "@/models/store.model";
import type { ClientProductListItem } from "@/models/product.model";
import { useDeliveryStore } from "@/store/delivery.store";
import MenuProductModal from "@/components/menu/MenuProductModal";
import MenuOrderPanel from "@/components/menu/MenuOrderPanel";
import BranchPickerModal from "@/components/menu/BranchPickerModal";
import { useMenuCartStore, useMenuCartTotals } from "@/store/menu-cart.store";
import { useAuthStore } from "@/store/auth.store";
import { ROUTER_URL } from "@/routes/router.const";
import { hashStringToNumber } from "@/services/menu-api.adapter";
import type { MenuProduct, MenuCartItem, MenuSize, SugarLevel, IceLevel, Topping } from "@/types/menu.types";

const fmtVnd = (n: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n);

type LoadingPhase = "franchises" | "categories" | "products" | "productDetail" | null;

/* ─── EmptyState ──────────────────────────────────────────────── */
function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center px-4">
      <div className="text-5xl mb-4">😕</div>
      <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>
      {description && <p className="text-sm text-gray-500">{description}</p>}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-4 text-sm text-amber-600 hover:text-amber-700 font-medium"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

/* ─── Sidebar Category Nav ───────────────────────────────────── */
function CategorySidebar({
  categories,
  activeId,
  productCounts,
  loading,
  onSelect,
}: {
  categories: ClientCategoryByFranchiseItem[];
  activeId: string | null;
  productCounts: Record<string, number>;
  loading: boolean;
  onSelect: (cat: ClientCategoryByFranchiseItem | null) => void;
}) {
  const totalCount = Object.values(productCounts).reduce((s, n) => s + n, 0);

  return (
    <aside className="w-60 shrink-0 hidden lg:block">
      <div className="sticky top-28">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3 px-3">
          Danh mục
        </p>

        {loading ? (
          <div className="space-y-1 px-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-10 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : categories.length === 0 ? (
          <p className="text-sm text-gray-400 px-3">Chưa có danh mục.</p>
        ) : (
          <nav className="space-y-0.5">
            {/* Tất cả */}
            <button
              onClick={() => onSelect(null)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 text-left group",
                activeId === null
                  ? "bg-amber-50 text-amber-700 shadow-sm"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
              )}
            >
              <span className={cn("text-xl shrink-0 transition-transform duration-150", activeId === null ? "scale-110" : "group-hover:scale-105")}>
                🍽️
              </span>
              <span className="flex-1 truncate">Tất cả</span>
              <span
                className={cn(
                  "text-xs px-1.5 py-0.5 rounded-full font-semibold tabular-nums shrink-0",
                  activeId === null
                    ? "bg-amber-600 text-white"
                    : "bg-gray-100 text-gray-500 group-hover:bg-gray-200",
                )}
              >
                {totalCount}
              </span>
            </button>

            {categories.map((cat) => {
              const isActive = cat.category_id === activeId;
              return (
                <button
                  key={cat.category_id}
                  onClick={() => onSelect(cat)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 text-left group",
                    isActive
                      ? "bg-amber-50 text-amber-700 shadow-sm"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                  )}
                >
                  <span className={cn("text-xl shrink-0 transition-transform duration-150", isActive ? "scale-110" : "group-hover:scale-105")}>
                    ☕
                  </span>
                  <span className="flex-1 truncate">{cat.category_name}</span>
                  <span
                    className={cn(
                      "text-xs px-1.5 py-0.5 rounded-full font-semibold tabular-nums shrink-0",
                      isActive
                        ? "bg-amber-600 text-white"
                        : "bg-gray-100 text-gray-500 group-hover:bg-gray-200",
                    )}
                  >
                    {productCounts[cat.category_id] ?? 0}
                  </span>
                </button>
              );
            })}
          </nav>
        )}

        {/* Promo banner */}
        <div className="mt-6 mx-3 p-4 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 text-white">
          <p className="text-xs font-semibold uppercase tracking-wider opacity-80 mb-1">
            Ưu đãi hôm nay
          </p>
          <p className="text-sm font-bold leading-snug">Giảm 15% đơn từ 150k</p>
          <p className="text-xs opacity-75 mt-1">Code: HYLUX15</p>
        </div>
      </div>
    </aside>
  );
}

/* ─── Mobile Category Tabs ───────────────────────────────────── */
function MobileCategoryTabs({
  categories,
  activeId,
  loading,
  onSelect,
}: {
  categories: ClientCategoryByFranchiseItem[];
  activeId: string | null;
  loading: boolean;
  onSelect: (cat: ClientCategoryByFranchiseItem | null) => void;
}) {
  if (loading && categories.length === 0) {
    return (
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none lg:hidden">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-9 w-20 rounded-xl bg-gray-100 animate-pulse shrink-0" />
        ))}
      </div>
    );
  }
  if (categories.length === 0) return null;

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none lg:hidden">
      <button
        onClick={() => onSelect(null)}
        className={cn(
          "shrink-0 px-3 py-1.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all border",
          activeId === null
            ? "bg-amber-500 text-white border-amber-500 shadow-sm"
            : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50",
        )}
      >
        Tất cả
      </button>
      {categories.map((c) => (
        <button
          key={c.category_id}
          onClick={() => onSelect(c)}
          className={cn(
            "shrink-0 px-3 py-1.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all border",
            c.category_id === activeId
              ? "bg-amber-500 text-white border-amber-500 shadow-sm"
              : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50",
          )}
        >
          {c.category_name}
        </button>
      ))}
    </div>
  );
}

/* ─── Product Card (inline, uses API data) ────────────────────── */
function ProductCard({
  product,
  onClickProduct,
  cartQty,
  onQuickAdd,
  onQuickMinus,
}: {
  product: ClientProductListItem;
  onClickProduct: (p: ClientProductListItem) => void;
  cartQty: number;
  onQuickAdd: (p: ClientProductListItem) => void;
  onQuickMinus: (p: ClientProductListItem) => void;
}) {
  return (
    <div className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:border-amber-200 hover:shadow-lg transition-all duration-200 flex flex-col">
      <div
        onClick={() => onClickProduct(product)}
        className="block relative aspect-[4/3] overflow-hidden bg-gray-50 cursor-pointer"
      >
        <img
          src={product.image_url}
          alt={product.name}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200" />
      </div>

      <div className="p-4 flex flex-col flex-1">
        <div className="flex justify-between items-start gap-2 mb-1">
          <div
            onClick={() => onClickProduct(product)}
            className="hover:text-amber-600 transition-colors cursor-pointer"
          >
            <h3 className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2">
              {product.name}
            </h3>
          </div>
        </div>

        <p className="text-xs text-gray-500 line-clamp-2 mb-3 leading-relaxed flex-1">
          {product.description}
        </p>

        <div className="flex items-center justify-between mt-auto">
          <p className="font-bold text-amber-600 text-sm">
            Từ {fmtVnd(product.sizes[0]?.price ?? 0)}
          </p>
          {cartQty > 0 ? (
            <div
              className="flex items-center gap-1 border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => onQuickMinus(product)}
                className="w-9 h-9 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors"
                aria-label="Giảm số lượng"
                title="Giảm"
              >
                −
              </button>
              <span className="w-7 text-center text-sm font-bold text-gray-900 select-none tabular-nums">
                {cartQty}
              </span>
              <button
                type="button"
                onClick={() => onQuickAdd(product)}
                className="w-9 h-9 flex items-center justify-center text-amber-600 hover:bg-amber-50 transition-colors"
                aria-label="Tăng số lượng"
                title="Tăng"
              >
                +
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClickProduct(product);
              }}
              className="h-9 px-3 rounded-xl bg-amber-50 hover:bg-amber-500 text-amber-600 hover:text-white flex items-center justify-center transition-colors shadow-sm text-sm font-semibold"
              aria-label="Thêm"
              title="Thêm"
            >
              + Thêm
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
/*  MENU PAGE                                                    */
/* ═══════════════════════════════════════════════════════════════ */
export default function MenuPage() {
  const navigate = useNavigate();
  // ─── STATE ──────────────────────────────────────────────────────
  const [franchises, setFranchises] = useState<ClientFranchiseItem[]>([]);
  const [selectedFranchise, setSelectedFranchise] = useState<ClientFranchiseItem | null>(null);

  const [categories, setCategories] = useState<ClientCategoryByFranchiseItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<ClientCategoryByFranchiseItem | null>(null);

  const [products, setProducts] = useState<ClientProductListItem[]>([]);
  const [searchQuery, setSearchQuery] = useState(""); // Added searchQuery state
  const [selectedProduct, setSelectedProduct] = useState<MenuProduct | null>(null);

  const [loading, setLoading] = useState<LoadingPhase>(null);
  const [error, setError] = useState<string | null>(null);
  const [categoriesLoadedForFranchiseId, setCategoriesLoadedForFranchiseId] = useState<string | null>(null);

  const [detailOpen, setDetailOpen] = useState(false);
  const [showBranchPicker, setShowBranchPicker] = useState(false);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  const [editingCartKey, setEditingCartKey] = useState<string | null>(null);
  const [modalInitial, setModalInitial] = useState<{
    size: MenuSize;
    sugar: SugarLevel;
    ice: IceLevel;
    toppings: Topping[];
    note?: string;
    quantity: number;
  } | undefined>(undefined);

  const { selectedFranchiseId } = useDeliveryStore();
  const { itemCount, total } = useMenuCartTotals();
  const cartItems = useMenuCartStore((s) => s.items);
  const addItem = useMenuCartStore((s) => s.addItem);
  const updateQuantity = useMenuCartStore((s) => s.updateQuantity);
  const removeItem = useMenuCartStore((s) => s.removeItem);
  const user = useAuthStore((s) => s.user);

  const categoriesReqKeyRef = useRef<string | null>(null);
  const productsReqKeyRef = useRef<string | null>(null);
  const franchisesLoadedRef = useRef<boolean>(false);

  // ─── BƯỚC 1: LOAD FRANCHISES ───────────────────────────────────
  useEffect(() => {
    if (franchisesLoadedRef.current) return;
    franchisesLoadedRef.current = true;

    queueMicrotask(() => {
      setLoading("franchises");
      setError(null);
    });

    clientService
      .getAllFranchises()
      .then((data) => setFranchises(data))
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : "Không tải được danh sách franchise");
        setFranchises([]);
      })
      .finally(() => setLoading(null));
  }, []);

  // Sync selectedFranchise with global selectedFranchiseId
  useEffect(() => {
    if (!selectedFranchiseId) {
      queueMicrotask(() => setSelectedFranchise(null));
      return;
    }
    const next = franchises.find((f) => String(f.id) === String(selectedFranchiseId)) ?? null;
    queueMicrotask(() => setSelectedFranchise(next ? { ...next, id: String(next.id) } : null));
  }, [selectedFranchiseId, franchises]);

  // ─── BƯỚC 2: LOAD CATEGORIES ──────────────────────────────────
  useEffect(() => {
    const franchiseId = selectedFranchise?.id ?? null;
    if (!franchiseId) {
      queueMicrotask(() => {
        setCategories([]);
        setSelectedCategory(null);
        setProducts([]);
        setCategoriesLoadedForFranchiseId(null);
      });
      categoriesReqKeyRef.current = null;
      productsReqKeyRef.current = null;
      return;
    }

    const alreadyLoaded =
      categoriesReqKeyRef.current === franchiseId &&
      categoriesLoadedForFranchiseId === franchiseId &&
      categories.length > 0;
    if (alreadyLoaded) return;
    categoriesReqKeyRef.current = franchiseId;

    let alive = true;
    queueMicrotask(() => {
      setLoading("categories");
      setError(null);
      setCategories([]);
      setSelectedCategory(null);
      setProducts([]);
      setCategoriesLoadedForFranchiseId(null);
    });

    clientService
      .getCategoriesByFranchise(franchiseId)
      .then((data) => {
        if (!alive) return;
        const sorted = [...data].sort((a, b) => a.display_order - b.display_order);
        setCategories(sorted);
        setSelectedCategory(null); // Start with "Tất cả"
        setCategoriesLoadedForFranchiseId(franchiseId);
      })
      .catch((e: unknown) => {
        if (!alive) return;
        setError(e instanceof Error ? e.message : "Không tải được category theo franchise");
        setCategories([]);
        setSelectedCategory(null);
        setCategoriesLoadedForFranchiseId(franchiseId);
      })
      .finally(() => { if (alive) setLoading(null); });

    return () => { alive = false; };
  }, [selectedFranchise?.id, categoriesLoadedForFranchiseId, categories.length]);

  // ─── BƯỚC 3: LOAD PRODUCTS ────────────────────────────────────
  useEffect(() => {
    const franchiseId = selectedFranchise?.id ?? null;
    if (!franchiseId) return;

    const categoryId = selectedCategory?.category_id;

    const categoriesReadyForThisFranchise = categoriesLoadedForFranchiseId === franchiseId;
    if (!categoriesReadyForThisFranchise) return;

    const key = `${franchiseId}::${categoryId ?? "all"}`;
    if (productsReqKeyRef.current === key) return;
    productsReqKeyRef.current = key;

    let alive = true;
    queueMicrotask(() => {
      setLoading("products");
      setError(null);
    });

    clientService
      .getProductsByFranchiseAndCategory(franchiseId, categoryId)
      .then((data) => { if (alive) setProducts(data); })
      .catch((e: unknown) => {
        if (!alive) return;
        setError(e instanceof Error ? e.message : "Không tải được danh sách sản phẩm");
        setProducts([]);
      })
      .finally(() => { if (alive) setLoading(null); });

    return () => { alive = false; };
  }, [selectedFranchise?.id, selectedCategory?.category_id, categoriesLoadedForFranchiseId]);

  // ─── Derived helpers ──────────────────────────────────────────
  const canShowMenu = selectedFranchise !== null;
  const showLoadingSkeleton = loading === "products";

  // Product counts per category for sidebar badges
  const productCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of products) {
      const catId = (p as { category_id?: string }).category_id ?? "unknown";
      counts[catId] = (counts[catId] ?? 0) + 1;
    }
    return counts;
  }, [products]);

  // ─── BƯỚC 4: CLICK SẢN PHẨM → MỞ MODAL ─────────────────────────
  function handleOpenDetail(p: ClientProductListItem) {
    const franchiseId = selectedFranchise?.id ?? "";
    const normalizedProduct: MenuProduct & {
      _apiFranchiseId: string;
      _apiProductId: string;
      _apiIsHaveTopping?: boolean;
    } = {
      id: hashStringToNumber(p.product_id),
      sku: p.SKU,
      name: p.name,
      description: p.description,
      content: p.description,
      price: p.sizes[0]?.price || 0,
      image: p.image_url,
      categoryId: hashStringToNumber(p.category_id),
      rating: 5,
      reviewCount: 99,
      isAvailable: true,
      _apiFranchiseId: String(franchiseId),
      _apiProductId: String(p.product_id),
      _apiIsHaveTopping: p.is_have_topping ?? undefined,
    };

    setSelectedProduct(normalizedProduct);
    setDetailOpen(true);
  }

  function handleCloseDetail() {
    setDetailOpen(false);
    setSelectedProduct(null);
    setEditingCartKey(null);
    setModalInitial(undefined);
  }

  function handleSelectCategory(cat: ClientCategoryByFranchiseItem | null) {
    setSelectedCategory(cat);
    // Reset product request key so it refetches
    productsReqKeyRef.current = null;
  }

  function getCartQtyForProduct(productId: string | number): number {
    const pid = String(hashStringToNumber(String(productId)));
    return cartItems
      .filter((i) => String(i.productId) === pid)
      .reduce((s, i) => s + i.quantity, 0);
  }

  function quickAdd(p: ClientProductListItem) {
    if (!user) {
      toast.error("Vui lòng đăng nhập để thêm vào giỏ hàng", {
        action: { label: "Đăng nhập", onClick: () => navigate(ROUTER_URL.LOGIN) },
      });
      return;
    }
    const normalized: MenuProduct = {
      id: hashStringToNumber(p.product_id),
      sku: p.SKU,
      name: p.name,
      description: p.description,
      content: p.description,
      price: p.sizes[0]?.price || 0,
      image: p.image_url,
      categoryId: hashStringToNumber(p.category_id),
      rating: 5,
      reviewCount: 99,
      isAvailable: true,
    } as MenuProduct;

    addItem(
      normalized,
      { size: "M", sugar: "100%", ice: "Đá vừa", toppings: [] },
      1,
    );
  }

  function quickMinus(p: ClientProductListItem) {
    const pid = hashStringToNumber(p.product_id);
    const first = cartItems.find((i) => i.productId === pid);
    if (!first) return;
    if (first.quantity > 1) updateQuantity(first.cartKey, first.quantity - 1);
    else removeItem(first.cartKey);
  }

  function openEditItem(item: MenuCartItem) {
    // Build a minimal MenuProduct from cart item for editing.
    const product: MenuProduct = {
      id: item.productId,
      sku: "",
      name: item.name,
      description: "",
      content: "",
      price: item.basePrice,
      image: item.image,
      categoryId: 0,
      rating: 5,
      reviewCount: 0,
      isAvailable: true,
    };
    setSelectedProduct(product);
    setModalInitial({
      size: item.options.size,
      sugar: item.options.sugar,
      ice: item.options.ice,
      toppings: item.options.toppings,
      note: item.options.note,
      quantity: item.quantity,
    });
    setEditingCartKey(item.cartKey);
    setDetailOpen(true);
  }

  return (
    <>
      {showBranchPicker && (
        <BranchPickerModal onClose={() => setShowBranchPicker(false)} />
      )}

      <div className="-mx-4 sm:-mx-6 lg:-mx-8 -my-8 sm:-my-10 lg:-my-12 min-h-screen bg-white">
        {/* ── Header ── */}
        <div className="border-b border-gray-100 bg-white">
          <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">Thực đơn</h1>
                <p className="text-sm text-gray-500 mt-0.5">
                  {canShowMenu
                    ? `${categories.length} danh mục · ${products.length} sản phẩm`
                    : "Vui lòng chọn franchise để xem thực đơn."}
                </p>
              </div>

              {/* Search Bar */}
              {canShowMenu && (
                <div className="w-full sm:w-72 lg:w-96">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Tìm kiếm sản phẩm..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full px-4 py-2.5 pr-12 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent text-sm transition-all"
                    />
                    {searchQuery ? (
                      <button
                        onClick={() => setSearchQuery("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    ) : (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Mobile category tabs (hidden on lg) */}
            {canShowMenu && (
              <div className="mt-4">
                <MobileCategoryTabs
                  categories={categories}
                  activeId={selectedCategory?.category_id ?? null}
                  loading={loading === "categories"}
                  onSelect={handleSelectCategory}
                />
              </div>
            )}

            {error && (
              <div className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-xl">
                {error}
              </div>
            )}
          </div>
        </div>

        {/* ── Content: Sidebar + Grid ── */}
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8 py-8">
          {!canShowMenu ? (
            <EmptyState
              title="Chưa chọn franchise"
              description="Hãy chọn franchise ở dropdown để hệ thống tải category và sản phẩm."
            />
          ) : (
            <div className="flex gap-8">
              {/* Sidebar (desktop only) */}
              <CategorySidebar
                categories={categories}
                activeId={selectedCategory?.category_id ?? null}
                productCounts={productCounts}
                loading={loading === "categories"}
                onSelect={handleSelectCategory}
              />

              {/* Product grid */}
              <div className="flex-1 min-w-0">
                {showLoadingSkeleton ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5 animate-pulse">
                    {Array.from({ length: 9 }).map((_, i) => (
                      <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                        <div className="aspect-[4/3] bg-gray-100" />
                        <div className="p-3.5 space-y-2">
                          <div className="h-4 bg-gray-100 rounded w-2/3" />
                          <div className="h-3 bg-gray-100 rounded w-full" />
                          <div className="h-3 bg-gray-100 rounded w-5/6" />
                          <div className="h-8 bg-gray-100 rounded w-full" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (() => { // Changed to an IIFE to handle conditional rendering and filtering
                  const filteredProducts = products.filter(p =>
                    p.name.toLowerCase().includes(searchQuery.toLowerCase())
                  );

                  if (filteredProducts.length === 0) {
                    return (
                      <EmptyState
                        title={searchQuery ? "Không tìm thấy sản phẩm" : "Không có sản phẩm"}
                        description={searchQuery ? `Không có sản phẩm nào khớp với "${searchQuery}"` : "Franchise/category này hiện chưa có sản phẩm hiển thị."}
                      />
                    );
                  }

                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4 sm:gap-5 px-0 sm:px-2">
                      {filteredProducts.map((p) => (
                        <ProductCard
                          key={`${p.product_id}-${p.SKU}-${p.sizes.map(s => s.size).join('-')}`}
                          product={p}
                          onClickProduct={handleOpenDetail}
                          cartQty={getCartQtyForProduct(p.product_id)}
                          onQuickAdd={quickAdd}
                          onQuickMinus={quickMinus}
                        />
                      ))}
                    </div>
                  );
                })()}
              </div>

              {/* Cart / Order panel (desktop) */}
              <aside className="hidden lg:block w-[360px] shrink-0">
                <div className="sticky top-28 h-[calc(100vh-7rem)] bg-white rounded-2xl border border-gray-100 overflow-hidden">
                  <MenuOrderPanel
                    onOpenBranchPicker={() => setShowBranchPicker(true)}
                    onEditItem={openEditItem}
                  />
                </div>
              </aside>
            </div>
          )}
        </div>
      </div>

      {/* Mobile: floating cart button + drawer */}
      <div className="lg:hidden">
        {itemCount > 0 && (
          <button
            onClick={() => setMobileCartOpen(true)}
            className="fixed bottom-5 right-5 z-40 rounded-2xl bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-white shadow-lg shadow-amber-200 px-4 py-3 flex items-center gap-3 transition-all"
            aria-label="Mở giỏ hàng"
          >
            <span className="text-lg">🛒</span>
            <div className="text-left leading-tight">
              <div className="text-xs opacity-90">{itemCount} món</div>
              <div className="text-sm font-bold">{fmtVnd(total)}</div>
            </div>
          </button>
        )}

        {mobileCartOpen && (
          <div className="fixed inset-0 z-50">
            <button
              className="absolute inset-0 bg-black/40"
              onClick={() => setMobileCartOpen(false)}
              aria-label="Đóng giỏ hàng"
            />
            <div className="absolute bottom-0 left-0 right-0 h-[85vh] bg-white rounded-t-3xl shadow-2xl overflow-hidden border-t border-gray-100">
              <MenuOrderPanel
                visible={true}
                onRequestClose={() => setMobileCartOpen(false)}
                onOpenBranchPicker={() => setShowBranchPicker(true)}
                onEditItem={openEditItem}
              />
            </div>
          </div>
        )}
      </div>

      {/* Detail modal (replaces inline ProductDetailModal) */}
      <MenuProductModal
        product={detailOpen ? selectedProduct : null}
        onClose={handleCloseDetail}
        initialOptions={modalInitial}
        submitLabel={editingCartKey ? "Cập nhật" : "Thêm vào giỏ"}
        onSubmit={
          editingCartKey
            ? ({ options, quantity }) => {
                // Replace old cart item with updated options/quantity
                removeItem(editingCartKey);
                if (selectedProduct) addItem(selectedProduct, options, quantity);
                toast.success("Đã cập nhật sản phẩm trong đơn hàng");
              }
            : undefined
        }
      />
    </>
  );
}

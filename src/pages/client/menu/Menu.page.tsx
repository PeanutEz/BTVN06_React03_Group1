import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { clientService } from "@/services/client.service";
import type { ClientFranchiseItem, ClientCategoryByFranchiseItem } from "@/models/store.model";
import type { ClientProductListItem } from "@/models/product.model.tsx";
import { useDeliveryStore } from "@/store/delivery.store";
import { useMenuCartStore, useMenuCartTotals } from "@/store/menu-cart.store";
import { useAuthStore } from "@/store/auth.store";
import { useLoadingStore } from "@/store/loading.store";
import MenuOrderPanel from "@/components/menu/MenuOrderPanel";
import BranchPickerModal from "@/components/menu/BranchPickerModal";
import MenuProductModal from "@/components/menu/MenuProductModal";
import type { MenuProduct } from "@/types/menu.types";
import { cartClient } from "@/services/cart.client";

const fmtVnd = (n: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n);

type LoadingPhase = "franchises" | "categories" | "products" | "productDetail" | null;

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
    <div className="flex flex-col items-center justify-center py-20 text-center">
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


// Convert API product to MenuProduct shape expected by MenuProductModal/cart store
function toMenuProduct(p: ClientProductListItem, franchiseId: string, franchiseName?: string): MenuProduct {
  const available = p.sizes.filter((s) => s.is_available);
  const baseSize = available[0] ?? p.sizes[0];
  // Hash string ID deterministically to a positive integer
  const hashStr = (str: string) =>
    (str.split("").reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) | 0, 0) >>> 0);
  return Object.assign(
    {
      id: hashStr(p.product_id),
      sku: p.SKU ?? "",
      name: p.name,
      description: p.description ?? "",
      content: "",
      price: baseSize?.price ?? 0,
      image: p.image_url,
      images: [],
      categoryId: hashStr(p.category_id),
      rating: 0,
      reviewCount: 0,
      isAvailable: available.length > 0,
      isFeatured: false,
    } as MenuProduct,
    // Extra metadata for MenuProductModal to fetch real detail from API
    {
      _apiFranchiseId: franchiseId,
      _apiFranchiseName: franchiseName,
      _apiProductId: p.product_id,
      _apiCategoryName: p.category_name,
      _apiSizes: p.sizes,
    },
  );
}

// Map category name keywords → emoji icon
function getCategoryIcon(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("c\u00e0 ph\u00ea") || n.includes("coffee") || n.includes("espresso") || n.includes("cappuccino") || n.includes("latte")) return "\u2615";
  if (n.includes("tr\u00e0 s\u1eefa") || n.includes("milk tea") || n.includes("milktea")) return "\ud83e\uddca";
  if (n.includes("tr\u00e0") || n.includes("tea")) return "\ud83c\udf75";
  if (n.includes("freeze") || n.includes("\u0111\u00e1 xay") || n.includes("blended") || n.includes("ice blended")) return "\ud83e\uddca";
  if (n.includes("smoothie")) return "\ud83e\udd64";
  if (n.includes("juice") || n.includes("n\u01b0\u1edbc \u00e9p")) return "\ud83e\uddc3";
  if (n.includes("b\u00e1nh m\u00ec")) return "\ud83e\udd56";
  if (n.includes("b\u00e1nh") || n.includes("snack") || n.includes("pastry")) return "\ud83e\udd50";
  if (n.includes("topping")) return "\ud83c\udf61";
  if (n.includes("phindi") || n.includes("phin")) return "\ud83e\uddd0";
  if (n.includes("non-coffee") || n.includes("kh\u00f4ng c\u00e0 ph\u00ea")) return "\ud83c\udf3f";
  if (n.includes("vi\u1ec7t") || n.includes("vietnamese")) return "\ud83c\uddfb\ud83c\uddf3";
  return "\ud83c\udf79"; // default cup
}

function ProductGrid({
  items,
  onAdd,
}: {
  items: ClientProductListItem[];
  onAdd: (product: ClientProductListItem) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
      {items.map((p) => {
        const available = p.sizes.filter((s) => s.is_available);
        const isAvailable = available.length > 0;
        const basePrice = available[0]?.price ?? p.sizes[0]?.price ?? 0;
        return (
          <div
            key={`${p.product_id}-${p.SKU}`}
            className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:border-amber-200 hover:shadow-lg transition-all duration-200"
          >
            <button
              type="button"
              className="block w-full text-left"
              onClick={() => onAdd(p)}
              disabled={!isAvailable}
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-gray-50">
                <img
                  src={p.image_url}
                  alt={p.name}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200" />
                {!isAvailable && (
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                    <span className="text-white text-xs font-semibold bg-black/50 px-3 py-1 rounded-full">Hết hàng</span>
                  </div>
                )}
              </div>
            </button>
            <div className="p-3.5">
              <h3 className="font-semibold text-gray-900 text-sm leading-snug line-clamp-1 mb-1">
                {p.name}
              </h3>
              <p className="text-xs text-gray-500 line-clamp-2 mb-3 leading-relaxed">
                {p.description}
              </p>
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-bold text-amber-700">
                  {fmtVnd(basePrice)}
                </span>
                <button
                  type="button"
                  onClick={() => onAdd(p)}
                  disabled={!isAvailable}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold transition-all active:scale-[0.97]",
                    isAvailable
                      ? "bg-amber-500 hover:bg-amber-600 text-white shadow-sm"
                      : "bg-gray-100 text-gray-400 cursor-not-allowed",
                  )}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                  </svg>
                  Thêm
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function MenuPage() {
  // ─── REQUIRED STATE ─────────────────────────────────────────────────────────
  const [franchises, setFranchises] = useState<ClientFranchiseItem[]>([]);
  const [selectedFranchise, setSelectedFranchise] = useState<ClientFranchiseItem | null>(null);

  const [categories, setCategories] = useState<ClientCategoryByFranchiseItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<ClientCategoryByFranchiseItem | null>(null);

  const [products, setProducts] = useState<ClientProductListItem[]>([]);
  const [addToCartProduct, setAddToCartProduct] = useState<MenuProduct | null>(null);

  const [loading, setLoading] = useState<LoadingPhase>(null);
  const [error, setError] = useState<string | null>(null);
  const [categoriesLoadedForFranchiseId, setCategoriesLoadedForFranchiseId] = useState<string | null>(null);

  // Global franchise selection (from BranchPickerModal)
  const { selectedFranchiseId } = useDeliveryStore();

  // Prevent duplicate calls + handle stale responses
  const categoriesReqKeyRef = useRef<string | null>(null);
  const productsReqKeyRef = useRef<string | null>(null);
  const franchisesLoadedRef = useRef<boolean>(false);

  // BƯỚC 1 – LOAD FRANCHISE
  useEffect(() => {
    // Ensure we only trigger this once even under React.StrictMode
    if (franchisesLoadedRef.current) return;
    franchisesLoadedRef.current = true;

    setLoading("franchises");
    setError(null);

    clientService
      .getAllFranchises()
      .then((data) => {
        setFranchises(data);
      })
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : "Không tải được danh sách franchise";
        setError(msg);
        setFranchises([]);
      })
      .finally(() => {
        setLoading(null);
      });
  }, []);

  // Sync selectedFranchise with global selectedFranchiseId
  useEffect(() => {
    if (!selectedFranchiseId) {
      setSelectedFranchise(null);
      return;
    }
    const next = franchises.find((f) => String(f.id) === String(selectedFranchiseId)) ?? null;
    setSelectedFranchise(next ? { ...next, id: String(next.id) } : null);
  }, [selectedFranchiseId, franchises]);

  // BƯỚC 2 – SAU KHI CHỌN FRANCHISE → load categories, sort by display_order, auto-select first
  useEffect(() => {
    const franchiseId = selectedFranchise?.id ?? null;
    if (!franchiseId) {
      // Clear downstream state when no franchise selected
      setCategories([]);
      setSelectedCategory(null);
      setProducts([]);
      setCategoriesLoadedForFranchiseId(null);
      // Reset request keys so re-selecting the same franchise will refetch properly
      categoriesReqKeyRef.current = null;
      productsReqKeyRef.current = null;
      return;
    }

    // Avoid duplicate API call for the same franchiseId only when we already have data for it.
    // (If user cleared selection then re-selected the same franchise, we should refetch.)
    const alreadyLoadedThisFranchise =
      categoriesReqKeyRef.current === franchiseId &&
      categoriesLoadedForFranchiseId === franchiseId &&
      categories.length > 0;
    if (alreadyLoadedThisFranchise) return;
    categoriesReqKeyRef.current = franchiseId;

    let alive = true;
    setLoading("categories");
    setError(null);

    // Reset downstream while loading new categories
    setCategories([]);
    setSelectedCategory(null);
    setProducts([]);
    setCategoriesLoadedForFranchiseId(null);

    clientService
      .getCategoriesByFranchise(franchiseId)
      .then((data) => {
        if (!alive) return;
        const sorted = [...data].sort((a, b) => a.display_order - b.display_order);
        setCategories(sorted);
        setSelectedCategory(null); // default to "Tất cả"
        setCategoriesLoadedForFranchiseId(franchiseId);
      })
      .catch((e: unknown) => {
        if (!alive) return;
        const msg = e instanceof Error ? e.message : "Không tải được category theo franchise";
        setError(msg);
        setCategories([]);
        setSelectedCategory(null);
        setCategoriesLoadedForFranchiseId(franchiseId);
      })
      .finally(() => {
        if (!alive) return;
        setLoading(null);
      });

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- guard dùng categories.length / categoriesLoadedForFranchiseId; thêm vào deps gây fetch lặp sau setCategories([])
  }, [selectedFranchise?.id]);

  // BƯỚC 3 – LOAD ALL PRODUCTS for this franchise once, filter client-side by category
  useEffect(() => {
    const franchiseId = selectedFranchise?.id ?? null;
    if (!franchiseId) return;

    // Wait until categories are loaded for this franchise
    if (categoriesLoadedForFranchiseId !== franchiseId) return;

    // Only fetch once per franchise
    if (productsReqKeyRef.current === franchiseId) return;
    productsReqKeyRef.current = franchiseId;

    let alive = true;
    setLoading("products");
    setError(null);

    clientService
      .getProductsByFranchiseAndCategory(franchiseId) // no categoryId → all products
      .then((data) => {
        if (!alive) return;
        setProducts(data);
      })
      .catch((e: unknown) => {
        if (!alive) return;
        const msg = e instanceof Error ? e.message : "Không tải được danh sách sản phẩm";
        setError(msg);
        setProducts([]);
      })
      .finally(() => {
        if (!alive) return;
        setLoading(null);
      });

    return () => {
      alive = false;
    };
  }, [selectedFranchise?.id, categoriesLoadedForFranchiseId]);

  // Derived UI helpers
  const canShowMenu = selectedFranchise !== null;
  const showLoadingSkeleton = loading === "products";

  // Show global loading screen while menu data is being fetched after franchise selection
  const showGlobalLoading = useLoadingStore((s) => s.show);
  const hideGlobalLoading = useLoadingStore((s) => s.hide);
  useEffect(() => {
    if (loading === "categories" || loading === "products") {
      showGlobalLoading("Đang tải thực đơn...");
    } else {
      hideGlobalLoading();
    }
  }, [loading, showGlobalLoading, hideGlobalLoading]);

  // Count products per category (from the full product list)
  const categoryCounts = useMemo(() => {
    const map: Record<string, number> = {};
    products.forEach((p) => {
      map[p.category_id] = (map[p.category_id] ?? 0) + 1;
    });
    return map;
  }, [products]);

  // Filter client-side; null selectedCategory = show all
  const visibleProducts = useMemo(() => {
    if (!selectedCategory) return products;
    return products.filter((p) => p.category_id === selectedCategory.category_id);
  }, [products, selectedCategory]);

  // Group all products by category (used when "Tất cả" is selected)
  const groupedProducts = useMemo(() => {
    if (selectedCategory !== null) return null;
    const grouped: { categoryId: string; categoryName: string; items: typeof products }[] = [];
    const seen = new Set<string>();
    // preserve display_order by following categories array order
    categories.forEach((cat) => {
      const items = products.filter((p) => p.category_id === cat.category_id);
      if (items.length > 0) {
        grouped.push({ categoryId: cat.category_id, categoryName: cat.category_name, items });
        seen.add(cat.category_id);
      }
    });
    // append any products whose category wasn't in categories list
    products.forEach((p) => {
      if (!seen.has(p.category_id)) {
        const existing = grouped.find((g) => g.categoryId === p.category_id);
        if (existing) existing.items.push(p);
        else grouped.push({ categoryId: p.category_id, categoryName: p.category_name, items: [p] });
        seen.add(p.category_id);
      }
    });
    return grouped;
  }, [selectedCategory, products, categories]);

  // BƯỚC 4 – Click "Thêm vào giỏ" on a product card
  function handleAddProduct(p: ClientProductListItem) {
    const franchiseId = selectedFranchise?.id ?? "";
    const franchiseName = selectedFranchise?.name;
    setAddToCartProduct(toMenuProduct(p, franchiseId, franchiseName));
  }


  const [showBranchPicker, setShowBranchPicker] = useState(false);
  const [showOrderPanel, setShowOrderPanel] = useState(false);
  const openBranchPicker = () => {
    setShowBranchPicker(true);
  };
  const { itemCount: localItemCount, total: localTotal } = useMenuCartTotals();

  const cartId = useMenuCartStore((s) => s.cartId);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);

  const { data: apiCart } = useQuery({
    queryKey: ["cart-detail", cartId],
    queryFn: () => cartClient.getCartDetail(cartId!),
    enabled: !!cartId && isLoggedIn,
    staleTime: 10_000,
  });

  const apiItemCount = (apiCart?.items ?? []).reduce((s, i) => s + (i.quantity ?? 1), 0);
  const apiTotal = apiCart?.total_amount ?? 0;
  const itemCount = apiItemCount > 0 ? apiItemCount : localItemCount;
  const total = apiTotal > 0 ? apiTotal : localTotal;

  return (
    <>
      <div className="-mx-4 sm:-mx-6 lg:-mx-8 -my-8 sm:-my-10 lg:-my-12 min-h-screen bg-white">
        {/* ── Page header ── */}
        <div className="border-b border-gray-100 bg-white">
          <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8 py-6">
            <nav className="flex items-center gap-2 text-sm text-gray-400 mb-3">
              <a href="/" className="hover:text-gray-600 transition-colors">Trang chủ</a>
              <span>/</span>
              <span className="text-gray-900 font-medium">Menu</span>
              {selectedCategory && (
                <>
                  <span>/</span>
                  <span className="text-amber-600 font-medium">{selectedCategory.category_name}</span>
                </>
              )}
            </nav>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
                  🍽️ {selectedCategory?.category_name ?? "Tất cả"}
                </h1>
                <p className="text-sm text-gray-500 mt-0.5">
                  {canShowMenu ? "Toàn bộ thực đơn Hylux" : "Vui lòng chọn phương thức đặt hàng để xem thực đơn"}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {/* Mobile cart button */}
                {itemCount > 0 && (
                  <button
                    onClick={() => setShowOrderPanel(true)}
                    className="lg:hidden flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all active:scale-95"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <span>{itemCount}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Mobile: horizontal category tabs */}
            {canShowMenu && (
              <div className="mt-4 flex gap-2 overflow-x-auto pb-1 scrollbar-none md:hidden">
                {loading === "categories" && categories.length === 0 ? (
                  <div className="text-sm text-gray-400 py-2">Đang tải...</div>
                ) : (
                  <>
                    <button
                      onClick={() => setSelectedCategory(null)}
                      className={cn(
                        "shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all",
                        !selectedCategory
                          ? "bg-amber-500 text-white shadow-sm"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200",
                      )}
                    >
                      🍽️ Tất cả
                      {products.length > 0 && (
                        <span className={cn(
                          "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                          !selectedCategory ? "bg-white/20" : "bg-gray-200 text-gray-500",
                        )}>{products.length}</span>
                      )}
                    </button>
                    {categories.map((c) => (
                      <button
                        key={c.category_id}
                        onClick={() => setSelectedCategory(c)}
                        className={cn(
                          "shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all",
                          c.category_id === selectedCategory?.category_id
                            ? "bg-amber-500 text-white shadow-sm"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200",
                        )}
                      >
                        <span>{getCategoryIcon(c.category_name)}</span>
                        {c.category_name}
                        {categoryCounts[c.category_id] !== undefined && (
                          <span className={cn(
                            "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                            c.category_id === selectedCategory?.category_id ? "bg-white/20" : "bg-gray-200 text-gray-500",
                          )}>{categoryCounts[c.category_id]}</span>
                        )}
                      </button>
                    ))}
                  </>
                )}
              </div>
            )}

            {error && (
              <div className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-xl">
                {error}
              </div>
            )}
          </div>
        </div>

        {/* ── Main 3-panel layout ── */}
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex gap-8 min-h-screen">

            {/* ── LEFT: Category Sidebar (desktop only) ── */}
            <aside className="hidden md:flex w-56 shrink-0 flex-col sticky top-40 self-start">
              <div className="pr-1">
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3 px-3">
                  Danh mục
                </p>
                <div className="max-h-[640px] overflow-y-auto pr-1">
                  <nav className="space-y-0.5">
                  {loading === "categories" && categories.length === 0 ? (
                    <div className="space-y-1.5 animate-pulse px-3">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="h-9 bg-gray-100 rounded-xl" />
                      ))}
                    </div>
                  ) : categories.length === 0 ? (
                    <p className="text-xs text-gray-400 px-3">
                      {canShowMenu ? "Chưa có danh mục" : "Chọn phương thức đặt hàng để xem"}
                    </p>
                  ) : (
                    <>
                      {/* Tất cả */}
                      <button
                        onClick={() => setSelectedCategory(null)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 text-left group",
                          !selectedCategory
                            ? "bg-amber-50 text-amber-700 shadow-sm"
                            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                        )}
                      >
                        <span className={cn("text-xl shrink-0 transition-transform duration-150", !selectedCategory ? "scale-110" : "group-hover:scale-105")}>🍽️</span>
                        <span className="flex-1 truncate">Tất cả</span>
                        <span className={cn(
                          "text-xs px-1.5 py-0.5 rounded-full font-semibold tabular-nums shrink-0",
                          !selectedCategory ? "bg-amber-600 text-white" : "bg-gray-100 text-gray-500 group-hover:bg-gray-200",
                        )}>
                          {products.length}
                        </span>
                      </button>

                      {categories.map((cat) => {
                        const isActive = cat.category_id === selectedCategory?.category_id;
                        const count = categoryCounts[cat.category_id] ?? 0;
                        return (
                          <button
                            key={cat.category_id}
                            onClick={() => setSelectedCategory(cat)}
                            className={cn(
                              "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 text-left group",
                              isActive
                                ? "bg-amber-50 text-amber-700 shadow-sm"
                                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                            )}
                          >
                            <span className={cn("text-xl shrink-0 transition-transform duration-150", isActive ? "scale-110" : "group-hover:scale-105")}>
                              {getCategoryIcon(cat.category_name)}
                            </span>
                            <span className="flex-1 truncate">{cat.category_name}</span>
                            {count > 0 && (
                              <span className={cn(
                                "text-xs px-1.5 py-0.5 rounded-full font-semibold tabular-nums shrink-0",
                                isActive ? "bg-amber-600 text-white" : "bg-gray-100 text-gray-500 group-hover:bg-gray-200",
                              )}>
                                {count}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </>
                  )}
                  </nav>
                </div>

                {canShowMenu && (
                  <div className="mt-6 mx-3 p-4 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 text-white">
                    <p className="text-xs font-semibold uppercase tracking-wider opacity-80 mb-1">
                      Ưu đãi hôm nay
                    </p>
                    <p className="text-sm font-bold leading-snug">Giảm 15% đơn từ 150k</p>
                    <p className="text-xs opacity-75 mt-1">Code: HYLUX15</p>
                  </div>
                )}
              </div>
            </aside>

            {/* ── MIDDLE: Product Grid ── */}
            <div className="flex-1 min-w-0">
              {!canShowMenu ? (
                <EmptyState
                  title="Chưa chọn cửa hàng"
                  description="Hãy chọn phương thức đặt hàng để hệ thống tải thực đơn."
                  actionLabel="📍 Chọn phương thức đặt hàng"
                  onAction={openBranchPicker}
                />
              ) : showLoadingSkeleton ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 animate-pulse">
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
              ) : visibleProducts.length === 0 ? (
                <EmptyState
                  title="Không có sản phẩm"
                  description="Franchise/category này hiện chưa có sản phẩm hiển thị."
                />
              ) : (
                <>
                  <p className="text-sm text-gray-500 mb-5">{visibleProducts.length} sản phẩm</p>

                  {groupedProducts ? (
                    /* ── Grouped by category (Tất cả) ── */
                    <div className="space-y-10">
                      {groupedProducts.map(({ categoryId, categoryName, items }) => (
                        <section key={categoryId}>
                          {/* Category section header */}
                          <div className="flex items-center gap-3 mb-5">
                            <div className="flex items-center gap-2.5">
                              <h2 className="text-lg font-bold text-emerald-700 tracking-tight">
                                {categoryName}
                              </h2>
                              <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                                {items.length} món
                              </span>
                            </div>
                            <div className="flex-1 h-px bg-emerald-100" />
                          </div>
                          <ProductGrid items={items} onAdd={handleAddProduct} />
                        </section>
                      ))}
                    </div>
                  ) : (
                    /* ── Single category view ── */
                    <ProductGrid items={visibleProducts} onAdd={handleAddProduct} />
                  )}
                </>
              )}
            </div>

            {/* ── RIGHT: Cart / Order Panel (desktop sticky) ── */}
            <aside
              className="hidden lg:flex w-[280px] xl:w-[300px] shrink-0 sticky top-40 self-start flex-col rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden min-h-0"
              style={{ height: "calc(100vh - 10rem)", maxHeight: "calc(100vh - 10rem)" }}
            >
              <MenuOrderPanel />
            </aside>
          </div>
        </div>
      </div>

      {/* Add-to-cart modal (size / sugar / ice / topping customisation) */}
      <MenuProductModal product={addToCartProduct} onClose={() => setAddToCartProduct(null)} />

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
            <span>{new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(total)}</span>
          </button>
        </div>
      )}

      {/* Mobile: Order panel bottom sheet */}
      {showOrderPanel && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowOrderPanel(false)} />
          <div className="relative bg-white rounded-t-2xl shadow-2xl flex flex-col max-h-[90dvh] overflow-hidden min-h-0">
            <MenuOrderPanel
              onRequestClose={() => setShowOrderPanel(false)}
            />
          </div>
        </div>
      )}
    </>
  );
}

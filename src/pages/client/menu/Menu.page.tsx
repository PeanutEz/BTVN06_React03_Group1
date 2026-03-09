import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { clientService } from "@/services/client.service";
import {
  mapClientCategoryToMenuCategory,
  mapClientProductToMenuProduct,
  type MenuCategoryWithApi,
  type MenuProductWithApi,
} from "@/services/menu-api.adapter";
import { useMenuCartStore, useMenuCartTotals } from "@/store/menu-cart.store";
import { useDeliveryStore } from "@/store/delivery.store";

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


function ProductDetailModal({
  open,
  loading,
  product,
  onClose,
}: {
  open: boolean;
  loading: boolean;
  product: ClientProductDetailResponse | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;


  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative w-full sm:max-w-2xl bg-white sm:rounded-2xl shadow-2xl overflow-hidden max-h-[92dvh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div className="min-w-0">
            <p className="text-xs text-gray-500">Chi tiết sản phẩm</p>
            <h2 className="text-base font-semibold text-gray-900 truncate">
              {product?.name ?? (loading ? "Đang tải..." : "—")}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors flex items-center justify-center"
            aria-label="Đóng"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-4">
          {loading ? (
            <div className="animate-pulse space-y-3">
              <div className="h-40 bg-gray-100 rounded-xl" />
              <div className="h-4 bg-gray-100 rounded w-2/3" />
              <div className="h-3 bg-gray-100 rounded w-full" />
              <div className="h-3 bg-gray-100 rounded w-5/6" />
            </div>
          ) : !product ? (
            <EmptyState title="Không tải được chi tiết sản phẩm" description="Vui lòng thử lại." />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="aspect-square rounded-2xl overflow-hidden border border-gray-100 bg-gray-50">
                  <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                </div>
                {product.images_url?.length > 0 && (
                  <div className="grid grid-cols-4 gap-2">
                    {product.images_url.slice(0, 4).map((img) => (
                      <div key={img} className="aspect-square rounded-xl overflow-hidden border border-gray-100 bg-gray-50">
                        <img src={img} alt="" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 inline-flex px-2 py-0.5 rounded-full">
                    {product.category_name}
                  </p>
                  <h3 className="mt-2 text-xl font-bold text-gray-900 leading-tight">{product.name}</h3>
                  <p className="mt-1 text-sm text-gray-500">{product.description}</p>
                </div>

                {product.content && (
                  <div className="text-sm text-gray-600 leading-relaxed">
                    {product.content}
                  </div>
                )}

                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Sizes</p>
                  <div className="flex flex-wrap gap-2">
                    {product.sizes.map((s) => (
                      <span
                        key={s.product_franchise_id}
                        className={cn(
                          "text-sm px-3 py-1.5 rounded-xl border",
                          s.is_available
                            ? "border-gray-200 text-gray-700 bg-white"
                            : "border-gray-100 text-gray-400 bg-gray-50 line-through",
                        )}
                        title={s.is_available ? undefined : "Không khả dụng"}
                      >
                        {s.size} · {fmtVnd(s.price)}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Loading skeleton for product cards
// (skeleton removed — inline skeletons are used where needed)


export default function MenuPage() {
  // ─── REQUIRED STATE ─────────────────────────────────────────────────────────
  const [franchises, setFranchises] = useState<ClientFranchiseItem[]>([]);
  const [selectedFranchise, setSelectedFranchise] = useState<ClientFranchiseItem | null>(null);

  const [categories, setCategories] = useState<ClientCategoryByFranchiseItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<ClientCategoryByFranchiseItem | null>(null);

  const [products, setProducts] = useState<ClientProductListItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ClientProductDetailResponse | null>(null);

  const [loading, setLoading] = useState<LoadingPhase>(null);
  const [error, setError] = useState<string | null>(null);
  const [categoriesLoadedForFranchiseId, setCategoriesLoadedForFranchiseId] = useState<string | null>(null);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  // Global franchise selection (from BranchPickerModal)
  const { selectedFranchiseId } = useDeliveryStore();

  // Prevent duplicate calls + handle stale responses
  const categoriesReqKeyRef = useRef<string | null>(null);
  const productsReqKeyRef = useRef<string | null>(null);
  const detailReqKeyRef = useRef<string | null>(null);
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
        setSelectedCategory(sorted[0] ?? null);
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
  }, [selectedFranchise?.id]);

  // BƯỚC 3 – LOAD MENU / PRODUCTS (franchiseId required, categoryId optional)
  useEffect(() => {
    const franchiseId = selectedFranchise?.id ?? null;
    if (!franchiseId) return; // Không gọi nếu franchiseId null

    const categoryId = selectedCategory?.category_id;

    // Avoid duplicate calls when switching franchise:
    // wait until categories are loaded (and auto-selected) before loading products,
    // unless franchise truly has zero categories.
    const categoriesReadyForThisFranchise = categoriesLoadedForFranchiseId === franchiseId;
    const hasCategories = categories.length > 0;
    if (!categoriesReadyForThisFranchise) return;
    if (!categoryId && hasCategories) return;

    const key = `${franchiseId}::${categoryId ?? ""}`;

    // Avoid duplicate API call for the same params
    if (productsReqKeyRef.current === key) return;
    productsReqKeyRef.current = key;

    let alive = true;
    setLoading("products");
    setError(null);

    clientService
      .getProductsByFranchiseAndCategory(franchiseId, categoryId)
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
  }, [selectedFranchise?.id, selectedCategory?.category_id]);

  // Derived UI helpers
  const canShowMenu = selectedFranchise !== null;
  const showLoadingSkeleton = loading === "products";

  const visibleProducts = useMemo(() => {
    // API already returns by franchise/category; no extra filtering here.
    return products;
  }, [products]);

  // BƯỚC 4 – CLICK PRODUCT SIZE → gọi API (5) load detail
  async function handleClickSize(productFranchiseId: string, productId: string) {
    if (!productFranchiseId) return;

    // open modal immediately, then load detail
    setDetailOpen(true);
    setSelectedProduct(null);
    setDetailLoading(true);
    setLoading("productDetail");
    setError(null);

    // Avoid duplicate calls for same productFranchiseId while modal open
    if (detailReqKeyRef.current === productFranchiseId) {
      setDetailLoading(false);
      setLoading(null);
      return;
    }
    detailReqKeyRef.current = productFranchiseId;

    try {
      const franchiseId = selectedFranchise?.id ?? "";
      if (!franchiseId) throw new Error("No franchise selected");
      const detail = await clientService.getProductDetail(franchiseId, productId);
      setSelectedProduct(detail);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Không tải được chi tiết sản phẩm";
      setError(msg);
      setSelectedProduct(null);
    } finally {
      setDetailLoading(false);
      setLoading(null);
    }
  }

  function handleCloseDetail() {
    setDetailOpen(false);
    setSelectedProduct(null);
    setDetailLoading(false);
    detailReqKeyRef.current = null;
  }

  // use showLoadingSkeleton when needed; no separate isLoading variable

  const isLoading = loading;

  return (
    <>
      <div className="-mx-4 sm:-mx-6 lg:-mx-8 -my-8 sm:-my-10 lg:-my-12 min-h-screen bg-white">
        {/* Header */}
        <div className="border-b border-gray-100 bg-white">
          <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">Menu</h1>
                <p className="text-sm text-gray-500 mt-0.5">
                  Vui lòng chọn franchise trong bước chọn phương thức đặt hàng để xem thực đơn.
                </p>
              </div>
            </div>

            {/* Category tabs */}
            {canShowMenu && (
              <div className="mt-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <p className="text-xs text-gray-500">
                    Category:{" "}
                    <span className="font-semibold text-gray-700">
                      {selectedCategory?.category_name ?? (loading === "categories" ? "Đang tải..." : "—")}
                    </span>
                  </p>
                </div>

                <div className="mt-2 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {loading === "categories" && categories.length === 0 ? (
                    <div className="text-sm text-gray-400 py-2">Đang tải categories...</div>
                  ) : categories.length === 0 ? (
                    <div className="text-sm text-gray-400 py-2">Franchise này chưa có category.</div>
                  ) : (
                    categories.map((c) => (
                      <button
                        key={c.category_id}
                        onClick={() => setSelectedCategory(c)}
                        className={cn(
                          "shrink-0 px-3 py-1.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all border",
                          c.category_id === selectedCategory?.category_id
                            ? "bg-amber-500 text-white border-amber-500 shadow-sm"
                            : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50",
                        )}
                      >
                        {c.category_name}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}

            {error && (
              <div className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-xl">
                {error}
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8 py-8">
          {!canShowMenu ? (
            <EmptyState
              title="Chưa chọn franchise"
              description="Hãy chọn franchise ở dropdown để hệ thống tải category và sản phẩm."
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid- cols-3 gap-4 sm:gap-5">
              {visibleProducts.map((p) => (
                <div
                  key={`${p.product_id}-${p.SKU}`}
                  className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:border-amber-200 hover:shadow-lg transition-all duration-200"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-gray-50">
                    <img
                      src={p.image_url}
                      alt={p.name}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200" />
                  </div>

                  <div className="p-3.5">
                    <h3 className="font-semibold text-gray-900 text-sm leading-snug line-clamp-1 mb-1">
                      {p.name}
                    </h3>
                    <p className="text-xs text-gray-500 line-clamp-2 mb-3 leading-relaxed">
                      {p.description}
                    </p>

                    {/* map sizes (size + price), disable if is_available = false */}
                    <div className="flex flex-wrap gap-2">
                      {p.sizes.map((s) => (
                        <button
                          key={s.product_franchise_id}
                          type="button"
                          onClick={() => handleClickSize(s.product_franchise_id, p.product_id)}
                          disabled={!s.is_available}
                          className={cn(
                            "px-3 py-1.5 rounded-xl text-sm font-semibold border transition-all",
                            s.is_available
                              ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 active:scale-[0.98]"
                              : "border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed",
                          )}
                          title={s.is_available ? "Xem chi tiết" : "Không khả dụng"}
                        >
                          {s.size} · {fmtVnd(s.price)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* BƯỚC 4/5 – Modal detail */}
      <ProductDetailModal open={detailOpen} loading={detailLoading} product={selectedProduct} onClose={handleCloseDetail} />
    </>
  );
}

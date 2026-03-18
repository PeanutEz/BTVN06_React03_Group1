import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useMenuCartStore } from "@/store/menu-cart.store";
import { useAuthStore } from "@/store/auth.store";
import { cartClient } from "@/services/cart.client";
import {
  SUGAR_LEVELS,
  ICE_LEVELS,
  TOPPINGS,
  type MenuProduct,
  type SugarLevel,
  type IceLevel,
  type Topping,
} from "@/types/menu.types";

const fmt = (n: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n);

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-2.5">
      {children}
    </p>
  );
}

interface MenuProductModalProps {
  product: MenuProduct | null;
  onClose: () => void;
}

interface ApiSize {
  product_franchise_id: string;
  size: string;
  price: number;
  is_available: boolean;
}

export default function MenuProductModal({ product, onClose }: MenuProductModalProps) {
  const queryClient = useQueryClient();
  const addItem = useMenuCartStore((s) => s.addItem);
  const setCartId = useMenuCartStore((s) => s.setCartId);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const user = useAuthStore((s) => s.user);

  const [tab, setTab] = useState<"order" | "content">("order");
  const [selectedSize, setSelectedSize] = useState<ApiSize | null>(null);
  const [sugar, setSugar] = useState<SugarLevel>("100%");
  const [ice, setIce] = useState<IceLevel>("Đá vừa");
  const [toppingQtys, setToppingQtys] = useState<Record<string, number>>({});
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  // Reset state when product changes
  useEffect(() => {
    if (product) {
      setTab("order");
      setSugar("100%");
      setIce("Đá vừa");
      setToppingQtys({});
      setQuantity(1);
      setNote("");
      // Auto-select first available size from list-level sizes
      const listSizes: ApiSize[] = (product as any)._apiSizes ?? [];
      const firstAvailable = listSizes.find((s) => s.is_available) ?? listSizes[0] ?? null;
      setSelectedSize(firstAvailable);
    }
  }, [product?.id]);

  // Fetch full product detail from API (CLIENT-05) to get real sizes
  const [productDetail, setProductDetail] = useState<any>(null);
  useEffect(() => {
    if (!product) {
      setProductDetail(null);
      return;
    }
    const apiFranchiseId = (product as any)?._apiFranchiseId;
    const apiProductId = (product as any)?._apiProductId;
    if (!apiFranchiseId || !apiProductId) return;

    let cancelled = false;
    (async () => {
      try {
        const { clientService } = await import("@/services/client.service");
        const detail = await clientService.getProductDetail(apiFranchiseId, apiProductId);
        if (!cancelled) {
          setProductDetail(detail);
          // Update selectedSize from detail sizes (more accurate than list-level data)
          if (detail?.sizes?.length) {
            const detailSizes: ApiSize[] = detail.sizes;
            setSelectedSize((prev) => {
              // Keep selection if product_franchise_id still exists in detail
              if (prev && detailSizes.some((s) => s.product_franchise_id === prev.product_franchise_id)) {
                return detailSizes.find((s) => s.product_franchise_id === prev.product_franchise_id) ?? prev;
              }
              return detailSizes.find((s) => s.is_available) ?? detailSizes[0] ?? null;
            });
          }
        }
      } catch (err) {
        console.error("Failed to fetch product detail:", err);
      }
    })();
    return () => { cancelled = true; };
  }, [product?.id]);

  // Lock body scroll
  useEffect(() => {
    if (product) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [product]);

  if (!product) return null;

  // Use detail content if loaded, fallback to list data
  const displayContent = productDetail?.content || product.content;
  const displayImage = productDetail?.image_url || product.image;

  // Real sizes from API detail (preferred) or fallback to list-level sizes
  const displaySizesRaw: ApiSize[] = productDetail?.sizes ?? (product as any)._apiSizes ?? [];
  // API đôi khi trả duplicate size (vd: "M" 2 lần). Dedupe theo `size`, ưu tiên item available.
  const displaySizes: ApiSize[] = (() => {
    const bySize = new Map<string, ApiSize>();
    for (const s of displaySizesRaw) {
      const key = String(s.size ?? "").trim();
      if (!key) continue;
      const prev = bySize.get(key);
      if (!prev) {
        bySize.set(key, s);
        continue;
      }
      // Prefer available size; if both same availability, keep the first.
      if (!prev.is_available && s.is_available) {
        bySize.set(key, s);
      }
    }
    // Keep a stable, user-friendly order
    const order = ["S", "M", "L"];
    return Array.from(bySize.values()).sort((a, b) => {
      const ai = order.indexOf(String(a.size).toUpperCase());
      const bi = order.indexOf(String(b.size).toUpperCase());
      if (ai !== -1 || bi !== -1) return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
      return a.price - b.price;
    });
  })();

  const toppingTotal = TOPPINGS.reduce((sum, t) => sum + t.price * (toppingQtys[t.id] ?? 0), 0);
  const basePrice = selectedSize?.price ?? product.price;
  const unitPrice = basePrice + toppingTotal;
  const totalPrice = unitPrice * quantity;

  // Derive category info from API-enriched product or fallback
  const categoryName = (product as any)._apiCategoryName ?? "";

  function changeToppingQty(topping: Topping, delta: number) {
    setToppingQtys((prev) => {
      const next = Math.min(3, Math.max(0, (prev[topping.id] ?? 0) + delta));
      if (next === 0) {
        const { [topping.id]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [topping.id]: next };
    });
  }

  async function handleAddToCart() {
    if (!product || isAdding) return;
    if (!isLoggedIn) {
      toast.error("Vui lòng đăng nhập để thêm vào giỏ hàng");
      return;
    }

    const franchiseId = (product as any)._apiFranchiseId as string | undefined;
    const productFranchiseId = selectedSize?.product_franchise_id;

    if (!franchiseId || !productFranchiseId) {
      toast.error("Không thể xác định sản phẩm. Vui lòng thử lại.");
      return;
    }

    setIsAdding(true);

    // Save to local store immediately for instant UI feedback
    const toppingsFlat: Topping[] = TOPPINGS.flatMap((t) =>
      Array(toppingQtys[t.id] ?? 0).fill(t)
    );
    addItem(
      { ...product, price: basePrice },
      { size: (selectedSize?.size ?? "M") as any, sugar, ice, toppings: toppingsFlat, note: note.trim() || undefined },
      quantity,
    );

    // Then call API to persist to backend
    try {
      await cartClient.addProduct({
        franchise_id: franchiseId,
        product_franchise_id: productFranchiseId,
        quantity,
        note: note.trim() || undefined,
      });

      // Resolve cart ID from backend
      const customerId = String((user as any)?.user?.id ?? (user as any)?.user?._id ?? (user as any)?.id ?? "");
      if (customerId) {
        try {
          const carts = await cartClient.getCartsByCustomerId(customerId, { status: "ACTIVE" });
          const first = (carts as any[])[0];
          const resolvedId = first?._id ?? first?.id;
          if (resolvedId) setCartId(String(resolvedId));
        } catch { /* keep existing cartId */ }
      }

      // Refetch cart detail so all cart UIs update from API
      queryClient.invalidateQueries({ queryKey: ["cart-detail"] });
    } catch (err) {
      console.error("Add to cart API failed (saved locally):", err);
    }

    const toppingDesc = TOPPINGS
      .filter((t) => (toppingQtys[t.id] ?? 0) > 0)
      .map((t) => `${t.name}${toppingQtys[t.id]! > 1 ? ` x${toppingQtys[t.id]}` : ""}`)
      .join(", ");
    toast.success(`Đã thêm "${product.name}" vào giỏ!`, {
      description: `Size ${selectedSize?.size} • ${sugar} đường • ${ice}${toppingDesc ? ` • ${toppingDesc}` : ""}${note.trim() ? ` • "${note.trim()}"` : ""}`,
    });
    setIsAdding(false);
    onClose();
  }

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-full sm:max-w-lg bg-white sm:rounded-2xl shadow-2xl overflow-hidden h-[92dvh] sm:h-[88dvh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header + image */}
        <div className="relative shrink-0">
          <div className="h-44 sm:h-52 overflow-hidden bg-gray-100">
            <img
              src={displayImage}
              alt={product.name}
              className="w-full h-full object-cover"
            />
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          </div>

          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/40 flex items-center justify-center text-white hover:bg-black/60 transition-colors"
            aria-label="Đóng"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Tags */}
          <div className="absolute top-3 left-3 flex gap-1.5">
            {product.tags?.includes("bestseller") && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500 text-white">🔥 Bestseller</span>
            )}
            {product.tags?.includes("new") && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500 text-white">✨ Mới</span>
            )}
          </div>

          {/* Product info overlay */}
          <div className="absolute bottom-0 left-0 right-0 px-4 pb-3">
            {categoryName && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/20 text-white backdrop-blur-sm">
                {categoryName}
              </span>
            )}
            <h2 className="text-lg font-bold text-white mt-1 tracking-tight leading-tight">
              {product.name}
            </h2>
            <div className="flex items-center gap-2 mt-0.5">
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <svg key={i} className={cn("w-3 h-3", i < Math.floor(product.rating) ? "text-amber-400 fill-current" : "text-white/40 fill-current")} viewBox="0 0 20 20">
                    <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                  </svg>
                ))}
              </div>
              <span className="text-xs text-white/80">{product.rating.toFixed(1)} ({product.reviewCount})</span>
            </div>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="shrink-0 flex border-b border-gray-100 bg-white">
          <button
            onClick={() => setTab("order")}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-semibold transition-all duration-150 border-b-2",
              tab === "order"
                ? "border-amber-500 text-amber-600"
                : "border-transparent text-gray-400 hover:text-gray-600",
            )}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Đặt hàng
          </button>
          <button
            onClick={() => setTab("content")}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-semibold transition-all duration-150 border-b-2",
              tab === "content"
                ? "border-amber-500 text-amber-600"
                : "border-transparent text-gray-400 hover:text-gray-600",
            )}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Nội dung
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-4 py-4 space-y-4">
          {tab === "order" ? (
            <>
              {/* Size – from real API (product_franchise_id) */}
              <div>
                <SectionLabel>Chọn size</SectionLabel>
                {displaySizes.length === 0 ? (
                  <p className="text-xs text-gray-400 py-2">Đang tải kích cỡ...</p>
                ) : (
                  <div className="flex gap-2 flex-wrap">
                    {displaySizes.map((s) => (
                      <button
                        key={s.product_franchise_id}
                        onClick={() => s.is_available && setSelectedSize(s)}
                        disabled={!s.is_available}
                        className={cn(
                          "flex-1 min-w-[72px] py-2.5 rounded-xl border text-sm font-semibold transition-all duration-150",
                          !s.is_available
                            ? "border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed"
                            : selectedSize?.product_franchise_id === s.product_franchise_id
                            ? "border-amber-500 bg-amber-50 text-amber-700 ring-2 ring-amber-200"
                            : "border-gray-200 text-gray-600 hover:border-gray-300 bg-white",
                        )}
                      >
                        <div>{s.size}</div>
                        <div className="text-[10px] font-normal mt-0.5 opacity-70">
                          {fmt(s.price)}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Sugar */}
              <div>
                <SectionLabel>Lượng đường</SectionLabel>
                <div className="flex flex-wrap gap-2">
                  {SUGAR_LEVELS.map((level) => (
                    <button
                      key={level}
                      onClick={() => setSugar(level)}
                      className={cn(
                        "px-3 py-1.5 rounded-xl border text-xs font-medium transition-all duration-150",
                        sugar === level
                          ? "border-amber-500 bg-amber-50 text-amber-700"
                          : "border-gray-200 text-gray-600 hover:border-gray-300 bg-white",
                      )}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              {/* Ice */}
              <div>
                <SectionLabel>Lượng đá</SectionLabel>
                <div className="flex flex-wrap gap-2">
                  {ICE_LEVELS.map((level) => (
                    <button
                      key={level}
                      onClick={() => setIce(level)}
                      className={cn(
                        "px-3 py-1.5 rounded-xl border text-xs font-medium transition-all duration-150",
                        ice === level
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-gray-200 text-gray-600 hover:border-gray-300 bg-white",
                      )}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              {/* Note */}
              <div>
                <SectionLabel>Ghi chú</SectionLabel>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="VD: ít đường hơn, không hành, dị ứng..."
                  rows={2}
                  maxLength={200}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white resize-none focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-transparent placeholder:text-gray-400 transition-all"
                />
              </div>

              {/* Toppings */}
              <div>
                <SectionLabel>Topping (tuỳ chọn)</SectionLabel>
                <div className="grid grid-cols-2 gap-2">
                  {TOPPINGS.map((topping) => {
                    const qty = toppingQtys[topping.id] ?? 0;
                    return (
                      <div
                        key={topping.id}
                        className={cn(
                          "flex items-center gap-2 px-3 py-2 rounded-xl border text-xs transition-all duration-150",
                          qty > 0
                            ? "border-amber-500 bg-amber-50"
                            : "border-gray-200 bg-white",
                        )}
                      >
                        <span className="shrink-0 text-base">{topping.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <div className={cn("font-medium truncate", qty > 0 ? "text-amber-800" : "text-gray-700")}>{topping.name}</div>
                          <div className="text-[10px] text-gray-400">+{fmt(topping.price)}</div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => changeToppingQty(topping, -1)}
                            disabled={qty === 0}
                            className="w-5 h-5 rounded-full border flex items-center justify-center transition-all disabled:opacity-30 border-gray-300 hover:border-amber-400 hover:bg-amber-50"
                          >
                            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M20 12H4" />
                            </svg>
                          </button>
                          <span className={cn("w-4 text-center font-semibold text-xs", qty > 0 ? "text-amber-700" : "text-gray-400")}>
                            {qty}
                          </span>
                          <button
                            onClick={() => changeToppingQty(topping, 1)}
                            disabled={qty >= 3}
                            className="w-5 h-5 rounded-full border flex items-center justify-center transition-all disabled:opacity-30 border-gray-300 hover:border-amber-400 hover:bg-amber-50"
                          >
                            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            /* Content tab */
            displayContent ? (
              <div
                className="text-sm text-gray-600 leading-relaxed space-y-2 [&>h3]:text-gray-800 [&>h3]:font-bold [&>h3]:mt-3 [&>ul]:list-disc [&>ul]:pl-5 [&>p>strong]:text-gray-700"
                dangerouslySetInnerHTML={{ __html: displayContent }}
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center text-gray-400">
                <svg className="w-10 h-10 mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-sm">Chưa có mô tả chi tiết</p>
              </div>
            )
          )}
        </div>

        {/* Footer: qty + total + CTA */}
        <div className="shrink-0 border-t border-gray-100 bg-white px-4 py-3">
          <div className="flex items-center gap-3">
            {/* Quantity */}
            <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden shrink-0">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1}
                className="w-9 h-10 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-40"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </button>
              <span className="w-8 text-center text-sm font-semibold select-none">{quantity}</span>
              <button
                onClick={() => setQuantity((q) => q + 1)}
                className="w-9 h-10 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>

            {/* Add to cart */}
            <button
              onClick={handleAddToCart}
              disabled={isAdding || !selectedSize}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold transition-all duration-150 text-sm",
                isAdding || !selectedSize
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                  : "bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-white shadow-sm shadow-amber-200",
              )}
            >
              {isAdding ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Đang thêm...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Thêm vào giỏ · {fmt(totalPrice)}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

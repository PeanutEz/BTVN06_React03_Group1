import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useQueries, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useMenuCartStore } from "@/store/menu-cart.store";
import { useAuthStore } from "@/store/auth.store";
import {
  cartClient,
  formatDiscountTypeText,
  getCartItems,
  getCartItemId,
  getCartItemImage,
  getCartItemLineTotal,
  getCartItemName,
  getCartItemProductId,
  getCartItemSize,
  getCartPricingSummary,
  getCartItemUnitPrice,
  normalizeCustomerCarts,
  toCustomerCartEntry,
  type CartPricingSummary,
  type CartApiData,
  type ApiCartItem,
  type CartItemOption,
} from "@/services/cart.client";
import { ROUTER_URL } from "@/routes/router.const";
import {
  formatCartOptionsSummary,
  formatToppingsSummary,
  parseCartSelectionNote,
  stripGeneratedCartNote,
} from "@/utils/cartSelectionNote.util";
import type { IceLevel, SugarLevel, MenuProduct } from "@/types/menu.types";
import CartItemEditDialog from "@/components/menu/CartItemEditDialog";
import { clientService } from "@/services/client.service";

const fmt = (n: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n);

interface DisplayItem {
  key: string;
  cartId?: string;
  apiItemId?: string;
  apiProductId?: string;
  apiProductFranchiseId?: string;
  apiFranchiseId?: string;
  toppingsParsed?: Array<{ name: string; quantity: number }>;
  name: string;
  franchiseName?: string;
  image: string;
  size?: string;
  sugar?: SugarLevel;
  ice?: IceLevel;
  toppingsText?: string;
  apiOptions?: CartItemOption[];
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  note?: string;
  isLocal?: boolean;
  options?: any;
  productId?: number;
  basePrice?: number;
  apiCategoryName?: string;
  apiSizes?: any[];
}

const customerIdFromUser = (user: any) =>
  String(user?.user?.id ?? user?.user?._id ?? user?.id ?? user?._id ?? "");

function getCartFranchiseId(cart: CartApiData | null | undefined): string | undefined {
  if (!cart) return undefined;
  const raw = cart as Record<string, unknown>;
  const franchise =
    raw.franchise && typeof raw.franchise === "object"
      ? (raw.franchise as Record<string, unknown>)
      : null;

  const resolved =
    cart.franchise_id ??
    raw.franchiseId ??
    franchise?._id ??
    franchise?.id;

  return resolved == null ? undefined : String(resolved).trim() || undefined;
}

export default function CartPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const carts = useMenuCartStore((s) => s.carts);
  const cartIds = useMenuCartStore((s) => s.cartIds);
  const setCarts = useMenuCartStore((s) => s.setCarts);
  const clearCart = useMenuCartStore((s) => s.clearCart);
  const clearItemsOnly = useMenuCartStore((s) => s.clearItemsOnly);
  const removeCartId = useMenuCartStore((s) => s.removeCartId);
  const user = useAuthStore((s) => s.user);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const customerId = customerIdFromUser(user);

  const [cancellingCartId, setCancellingCartId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<DisplayItem | null>(null);
  const [pendingReorder, setPendingReorder] = useState<{
    fromIndex: number;
    fingerprint: null | {
      apiProductId?: string;
      apiProductFranchiseId?: string;
      size?: string;
      sugar?: SugarLevel;
      ice?: IceLevel;
      toppings?: Array<{ name: string; quantity: number }>;
      note?: string;
    };
  } | null>(null);

  const { data: cartsData, isLoading: cartsLoading } = useQuery({
    queryKey: ["carts-by-customer", customerId],
    queryFn: () => cartClient.getCartsByCustomerId(customerId, { status: "ACTIVE" }),
    enabled: !!customerId && isLoggedIn,
    staleTime: 10_000,
  });

  useEffect(() => {
    if (cartsLoading) return;

    const entries = normalizeCustomerCarts(cartsData)
      .map(toCustomerCartEntry)
      .filter((entry): entry is NonNullable<typeof entry> => !!entry);
    if (entries.length > 0) {
      setCarts(entries);
      clearItemsOnly();
    } else {
      clearCart();
    }
  }, [cartsData, cartsLoading, setCarts, clearCart, clearItemsOnly]);

  const cartDetails = useQueries({
    queries: cartIds.map((cartId) => ({
      queryKey: ["cart-detail", cartId],
      queryFn: () => cartClient.getCartDetail(cartId),
      enabled: !!cartId && isLoggedIn,
      staleTime: 5_000,
    })),
  });

  interface CartSection {
    cartId: string;
    franchiseName: string;
    detail: CartApiData | null;
    items: DisplayItem[];
    pricing: CartPricingSummary;
  }

  const customerCarts = normalizeCustomerCarts(cartsData);

  const sections: CartSection[] = carts.map((entry, idx) => {
    const listCart = customerCarts.find((cart) => String(cart._id ?? cart.id ?? "") === entry.cartId);
    const detail = (cartDetails[idx]?.data as CartApiData | undefined) ?? listCart;
    const franchiseName = entry.franchise_name ?? detail?.franchise_name ?? (detail as any)?.franchise?.name ?? `Chi nhánh ${idx + 1}`;
    const apiItems: DisplayItem[] = getCartItems(detail ?? listCart).map((item: ApiCartItem, i: number) => {
      const qty = item.quantity ?? 1;
      const price = getCartItemUnitPrice(item);
      const parsed = parseCartSelectionNote(String(item.note ?? ""));
      return {
        key: `${entry.cartId}-${getCartItemId(item) ?? i}`,
        cartId: entry.cartId,
        apiItemId: getCartItemId(item),
        apiProductId: getCartItemProductId(item),
        apiProductFranchiseId: (item as any)?.product_franchise_id ? String((item as any)?.product_franchise_id) : undefined,
        apiFranchiseId: getCartFranchiseId(detail) ?? getCartFranchiseId(listCart),
        toppingsParsed: parsed.toppings,
        name: getCartItemName(item),
        franchiseName: (item as any)?.franchise_name ?? (item as any)?.franchiseName ?? franchiseName,
        image: getCartItemImage(item),
        size: getCartItemSize(item),
        quantity: qty,
        unitPrice: price,
        lineTotal: getCartItemLineTotal(item),
        sugar: parsed.sugar,
        ice: parsed.ice,
        toppingsText: formatCartOptionsSummary(item.options as CartItemOption[] | undefined) || formatToppingsSummary(parsed.toppings),
        apiOptions: item.options as CartItemOption[] | undefined,
        note: stripGeneratedCartNote(item.note ? String(item.note) : undefined),
      };
    });
    const itemsSubtotal = apiItems.reduce((s, i) => s + i.lineTotal, 0);
    const pricing = getCartPricingSummary(detail ?? listCart, itemsSubtotal);
    return { cartId: entry.cartId, franchiseName, detail: detail ?? null, items: apiItems, pricing };
  });

  const sectionsWithItems = sections.filter((s) => s.items.length > 0);
  const apiItems: DisplayItem[] = sections.flatMap((s) => s.items);
  const toppingFranchiseIds = Array.from(
    new Set(
      sections
        .map((section) => String(section.detail?.franchise_id ?? "").trim())
        .filter(Boolean),
    ),
  );

  const toppingCatalogQueries = useQueries({
    queries: toppingFranchiseIds.map((franchiseId) => ({
      queryKey: ["franchise-toppings", franchiseId],
      queryFn: () => clientService.getToppingsByFranchise(franchiseId),
      enabled: !!franchiseId,
      staleTime: 60_000,
    })),
  });

  const toppingNameByOptionId = useMemo(() => {
    const map = new Map<string, string>();
    toppingCatalogQueries.forEach((query) => {
      (query.data ?? []).forEach((product: any) => {
        const sizes = Array.isArray(product?.sizes) ? product.sizes : [];
        sizes.forEach((size: any) => {
          const optionId = String(size?.product_franchise_id ?? "").trim();
          if (!optionId || map.has(optionId)) return;
          const productName = String(product?.name ?? "").trim();
          if (productName) map.set(optionId, productName);
        });
      });
    });
    return map;
  }, [toppingCatalogQueries]);

  // Keep stable item positions when switching from local -> API by sorting API items

  const norm = (s?: string) =>
    String(s ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase();

  const toppingsToQtyMap = (toppings?: Array<{ name: string; quantity: number }>) => {
    const map = new Map<string, number>();
    (toppings ?? []).forEach((t) => {
      const k = norm(t.name);
      map.set(k, (map.get(k) ?? 0) + (t.quantity ?? 0));
    });
    return map;
  };

  const fingerprintMatches = (
    item: DisplayItem,
    fp: NonNullable<typeof pendingReorder>["fingerprint"],
  ) => {
    if (!fp) return false;
    if (fp.apiProductFranchiseId && item.apiProductFranchiseId !== fp.apiProductFranchiseId) return false;
    if (fp.apiProductId && item.apiProductId !== fp.apiProductId) return false;
    if (fp.size && item.size && String(item.size).trim().toUpperCase() !== String(fp.size).trim().toUpperCase()) return false;
    if (fp.sugar && item.sugar && item.sugar !== fp.sugar) return false;
    if (fp.ice && item.ice && item.ice !== fp.ice) return false;

    const fpToppingsMap = toppingsToQtyMap(fp.toppings);
    const itemToppingsMap = toppingsToQtyMap(item.toppingsParsed);
    if (fpToppingsMap.size !== itemToppingsMap.size) return false;
    for (const [k, v] of fpToppingsMap.entries()) {
      if ((itemToppingsMap.get(k) ?? 0) !== v) return false;
    }
    return true;
  };

  const orderedApiItems = (() => {
    if (!pendingReorder?.fingerprint) return apiItems;
    const targetIndex = apiItems.findIndex((it) => fingerprintMatches(it, pendingReorder.fingerprint));
    if (targetIndex < 0) return apiItems;
    if (targetIndex === pendingReorder.fromIndex) return apiItems;
    const next = [...apiItems];
    const [moved] = next.splice(targetIndex, 1);
    next.splice(Math.max(0, Math.min(pendingReorder.fromIndex, next.length)), 0, moved);
    return next;
  })();

  const items = orderedApiItems;
  const pricingSummary = sections.reduce(
    (acc, section) => ({
      subtotalAmount: acc.subtotalAmount + section.pricing.subtotalAmount,
      promotionDiscount: acc.promotionDiscount + section.pricing.promotionDiscount,
      voucherDiscount: acc.voucherDiscount + section.pricing.voucherDiscount,
      loyaltyDiscount: acc.loyaltyDiscount + section.pricing.loyaltyDiscount,
      loyaltyPointsUsed: acc.loyaltyPointsUsed + section.pricing.loyaltyPointsUsed,
      finalAmount: acc.finalAmount + section.pricing.finalAmount,
    }),
    {
      subtotalAmount: 0,
      promotionDiscount: 0,
      voucherDiscount: 0,
      loyaltyDiscount: 0,
      loyaltyPointsUsed: 0,
      finalAmount: 0,
    },
  );
  const itemCount = items.reduce((s, i) => s + i.quantity, 0);
  const isLoading = cartIds.length > 0 && cartDetails.some((q) => q.isLoading);

  // After edit+save triggers delete+add, backend may return item in a different order.
  // Reorder it back to the original index once we can match the new item.
  useEffect(() => {
    if (!pendingReorder?.fingerprint) return;
    const idx = apiItems.findIndex((it) => fingerprintMatches(it, pendingReorder.fingerprint));
    if (idx < 0) return;
    // Only clear when backend already returns item in the original position.
    if (idx === pendingReorder.fromIndex) setPendingReorder(null);
  }, [apiItems, pendingReorder?.fingerprint]);

  function invalidateCart(cartId: string | undefined) {
    if (cartId) queryClient.invalidateQueries({ queryKey: ["cart-detail", cartId] });
    else queryClient.invalidateQueries({ queryKey: ["cart-detail"] });
  }

  async function handleUpdateQty(item: DisplayItem, newQty: number) {
    if (newQty < 1) {
      handleRemove(item);
      return;
    }
    if (!item.apiItemId) {
      toast.error("Khong the cap nhat so luong. San pham chua dong bo voi server.");
      return;
    }
    try {
      await cartClient.updateCartItemQuantity({ cart_item_id: item.apiItemId, quantity: newQty });
      invalidateCart(item.cartId);
    } catch {
      toast.error("Không thể cập nhật số lượng");
    }
  }

  async function handleRemove(item: DisplayItem) {
    if (!item.apiItemId) {
      toast.error("Khong the xoa san pham. San pham chua dong bo voi server.");
      return;
    }
    try {
      await cartClient.deleteCartItem(item.apiItemId);
      invalidateCart(item.cartId);
      toast.success("Đã xóa sản phẩm khỏi giỏ hàng");
    } catch {
      toast.error("Không thể xóa sản phẩm");
    }
  }

  async function handleCancelCart(cartIdToCancel: string) {
    if (cancellingCartId) return;
    setCancellingCartId(cartIdToCancel);
    try {
      await cartClient.cancelCart(cartIdToCancel);
      removeCartId(cartIdToCancel);
      queryClient.invalidateQueries({ queryKey: ["cart-detail", cartIdToCancel] });
      queryClient.invalidateQueries({ queryKey: ["carts-by-customer", customerId] });
      toast.success("Đã hủy giỏ hàng");
      if (cartIds.length <= 1) navigate(ROUTER_URL.MENU);
    } catch {
      toast.error("Không thể hủy giỏ hàng");
    } finally {
      setCancellingCartId(null);
    }
  }

  function handleOpenEditDialog(item: DisplayItem) {
    if (!item.apiItemId) {
      toast.error("San pham nay chua co cart item id de chinh sua.");
      return;
    }
    const fromIndex = apiItems.findIndex((i) => i.key === item.key);
    setPendingReorder(fromIndex >= 0 ? { fromIndex, fingerprint: null } : null);
    setEditingItem(item);
  }

  function hashStr(str: string) {
    return (str.split("").reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) | 0, 0) >>> 0) as any;
  }

  const editingInitialApiToppings =
    (editingItem?.apiOptions && editingItem.apiOptions.length > 0
      ? editingItem.apiOptions.flatMap((opt, idx) => {
          const optName =
            String(
              (opt as any).product_name ??
              opt.product_name_snapshot ??
              opt.name ??
              toppingNameByOptionId.get(String(opt.product_franchise_id ?? "").trim()) ??
              "",
            ).trim() || "Topping";
          return Array.from({ length: opt.quantity ?? 0 }, (_, i) => ({
            id: `${optName}-${idx}-${i}`,
            name: optName,
            price: 0,
            emoji: "",
          }));
        })
      : editingItem?.toppingsParsed?.flatMap((t, idx) =>
      Array.from({ length: t.quantity }, (_, i) => ({
        id: `${t.name}-${idx}-${i}`,
        name: t.name,
        price: 0,
        emoji: "",
      })),
    )) ?? undefined;

  const editingMenuProduct: MenuProduct | null =
    editingItem?.apiItemId
      ? Object.assign(
          {
            id: hashStr(String(editingItem.apiProductId ?? editingItem.apiProductFranchiseId ?? editingItem.key ?? editingItem.name)),
            sku: "",
            name: editingItem.name,
            description: "",
            content: "",
            price: editingItem.unitPrice,
            image: editingItem.image,
            images: [],
            categoryId: 0,
            rating: 0,
            reviewCount: 0,
            isAvailable: true,
            isFeatured: false,
          } as MenuProduct,
          {
            _apiFranchiseId: editingItem.apiFranchiseId,
            _apiProductId: editingItem.apiProductId,
            _apiSizes: editingItem.apiProductFranchiseId
              ? [
                  {
                    product_franchise_id: editingItem.apiProductFranchiseId,
                    size: editingItem.size ?? "M",
                    price: 0,
                    is_available: true,
                  },
                ]
              : [],
            _apiFranchiseName: editingItem.franchiseName ?? undefined,
          },
        )
      : null;
  if (!isLoggedIn) {
    return (
      <div>
        <h2 className="text-xl font-bold text-green-700 mb-6">Giỏ hàng</h2>
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 py-20">
          <span className="text-5xl mb-4">🔒</span>
          <p className="text-gray-500 font-medium">Vui lòng đăng nhập</p>
          <p className="mt-1 text-sm text-gray-400">Đăng nhập để xem giỏ hàng của bạn</p>
          <Link to={ROUTER_URL.LOGIN} className="mt-4 px-5 py-2.5 bg-green-700 hover:bg-green-800 text-white rounded-xl font-semibold text-sm transition-colors">
            Đăng nhập
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading && items.length === 0) {
    return (
      <div>
        <h2 className="text-xl font-bold text-green-700 mb-6">Giỏ hàng</h2>
        <div className="flex items-center justify-center py-20">
          <p className="text-gray-500">Đang tải giỏ hàng...</p>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div>
        <h2 className="text-xl font-bold text-green-700 mb-6">Giỏ hàng</h2>
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 py-20">
          <span className="text-5xl mb-4">🛒</span>
          <p className="text-gray-500 font-medium">Giỏ hàng trống</p>
          <p className="mt-1 text-sm text-gray-400">Thêm sản phẩm vào giỏ hàng để tiến hành thanh toán</p>
          <Link to={ROUTER_URL.MENU} className="mt-4 px-5 py-2.5 bg-green-700 hover:bg-green-800 text-white rounded-xl font-semibold text-sm transition-colors">
            Xem Menu
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-green-700">
          Giỏ hàng <span className="text-gray-400 font-normal text-base">({itemCount} sản phẩm)</span>
        </h2>
        <Link to={ROUTER_URL.MENU} className="text-sm text-green-700 hover:underline font-medium">
          + Thêm món
        </Link>
      </div>

      {
        sectionsWithItems.map((section) => (
          <div key={section.cartId} className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-semibold text-gray-900">🏪 {section.franchiseName}</h3>
              <button
                onClick={() => handleCancelCart(section.cartId)}
                disabled={cancellingCartId === section.cartId}
                className="text-sm text-red-600 hover:text-red-700 font-medium disabled:opacity-50"
                title="Hủy giỏ chi nhánh này"
              >
                {cancellingCartId === section.cartId ? "Đang hủy..." : "Hủy giỏ"}
              </button>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
              {section.items.map((item) => (
          <div key={item.key} className="flex gap-4 p-4">
            {item.image && (
              <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-50 shrink-0">
                <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">{item.name}</p>
                  {item.franchiseName && (
                    <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">🏪 {item.franchiseName}</p>
                  )}
                  {item.size && (
                    <p className="mt-0.5 text-[11px] font-medium text-blue-700">Size : {item.size}</p>
                  )}
                  {(item.sugar || item.ice) && (
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {item.sugar && (
                        <span className="inline-flex items-center rounded-full bg-purple-50 px-2 py-0.5 text-[11px] font-medium text-purple-700">
                          Đường: {item.sugar}
                        </span>
                      )}
                      {item.ice && (
                        <span className="inline-flex items-center rounded-full bg-cyan-50 px-2 py-0.5 text-[11px] font-medium text-cyan-700">
                          Đá: {item.ice}
                        </span>
                      )}
                    </div>
                  )}
                  {item.toppingsText && (!item.apiOptions || item.apiOptions.length === 0) && (
                    <div className="mt-1 flex items-start gap-2">
                      <span className="text-[11px] text-amber-700 font-medium shrink-0">Topping:</span>
                      <div className="min-w-0 space-y-0.5 pt-px">
                        {item.toppingsText.split(",").map((part, idx) => {
                          const text = part.trim();
                          if (!text) return null;
                          return (
                            <div
                              key={`${item.key}-fallback-${idx}`}
                              className="text-[10px] font-medium leading-tight text-amber-800"
                            >
                              {text}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {item.apiOptions && item.apiOptions.length > 0 && (
                    <div className="mt-1 flex items-start gap-2">
                      <span className="text-[11px] text-amber-700 font-medium shrink-0">Topping:</span>
                      <div className="min-w-0 space-y-0.5 pt-px">
                        {item.apiOptions.map((opt) => {
                          const optId = opt.product_franchise_id;
                          if (!optId) return null;
                          const qty = opt.quantity ?? 0;
                          const optName =
                            String(
                              (opt as any).product_name ??
                              opt.product_name_snapshot ??
                              opt.name ??
                              toppingNameByOptionId.get(String(optId).trim()) ??
                              "",
                            ).trim() || "Topping";
                          return (
                            <div
                              key={optId}
                              className="text-[10px] font-medium leading-tight text-amber-800"
                            >
                              {optName} x{qty}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {item.note && <p className="text-xs text-gray-400 mt-0.5 italic">Ghi chú: {item.note}</p>}
                  <p className="text-xs text-green-700 font-medium mt-0.5">{fmt(item.unitPrice)}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleOpenEditDialog(item)}
                    className="h-7 px-2 flex items-center justify-center gap-1 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 transition-all text-xs font-medium"
                    aria-label="Chỉnh sửa"
                    title="Chỉnh sửa size/sugar/ice/topping/ghi chú"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 18l-4 1 1-4 12.5-11.5z" />
                    </svg>
                    <span>Sửa</span>
                  </button>
                  <button
                    onClick={() => handleRemove(item)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
                    title="Xóa"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between mt-2.5">
                <div className="flex items-center gap-0.5 border border-gray-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => item.quantity > 1 ? handleUpdateQty(item, item.quantity - 1) : handleRemove(item)}
                    className="w-7 h-7 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors text-sm"
                  >
                    {item.quantity === 1 ? "🗑" : "−"}
                  </button>
                  <span className="w-7 text-center text-xs font-semibold select-none">{item.quantity}</span>
                  <button
                    onClick={() => handleUpdateQty(item, item.quantity + 1)}
                    className="w-7 h-7 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors text-sm"
                  >
                    +
                  </button>
                </div>
                <span className="text-sm font-bold text-gray-900">{fmt(item.lineTotal)}</span>
              </div>
            </div>
          </div>
              ))}
            </div>
          </div>
        ))

      }

      <div className="mt-6 bg-white rounded-xl border border-gray-200 p-5">
        <div className="space-y-2.5 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>Tạm tính ({itemCount} sản phẩm)</span>
            <span>{fmt(pricingSummary.subtotalAmount)}</span>
          </div>
          {pricingSummary.promotionDiscount > 0 && (
            <div className="flex justify-between text-emerald-700">
              <span>
                Giảm khuyến mãi
                {formatDiscountTypeText(
                  sections.find((section) => section.pricing.promotionDiscount > 0)?.pricing.promotionType,
                  sections.find((section) => section.pricing.promotionDiscount > 0)?.pricing.promotionValue,
                )}
              </span>
              <span>-{fmt(pricingSummary.promotionDiscount)}</span>
            </div>
          )}
          {pricingSummary.voucherDiscount > 0 && (
            <div className="flex justify-between text-red-600">
              <span>
                Giảm voucher
                {formatDiscountTypeText(
                  sections.find((section) => section.pricing.voucherDiscount > 0)?.pricing.voucherType,
                  sections.find((section) => section.pricing.voucherDiscount > 0)?.pricing.voucherValue,
                )}
              </span>
              <span>-{fmt(pricingSummary.voucherDiscount)}</span>
            </div>
          )}
          {pricingSummary.loyaltyDiscount > 0 && (
            <div className="flex justify-between text-amber-700">
              <span>
                Giảm điểm thưởng
                {pricingSummary.loyaltyPointsUsed > 0 ? ` (${pricingSummary.loyaltyPointsUsed} điểm)` : ""}
              </span>
              <span>-{fmt(pricingSummary.loyaltyDiscount)}</span>
            </div>
          )}
          <div className="h-px bg-gray-100" />
          <div className="flex justify-between font-bold text-base text-gray-900">
            <span>Tổng cộng</span>
            <span className="text-green-700">{fmt(pricingSummary.finalAmount)}</span>
          </div>
        </div>
        <Link
          to={ROUTER_URL.MENU_CHECKOUT}
          className="mt-4 flex items-center justify-center gap-2 w-full py-3 bg-green-700 hover:bg-green-800 text-white rounded-xl font-semibold text-sm transition-all active:scale-[0.98]"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Tiến hành thanh toán · {fmt(pricingSummary.finalAmount)}
        </Link>
      </div>

      {editingMenuProduct && editingItem && (
        <CartItemEditDialog
          product={editingMenuProduct}
          onClose={() => {
            setEditingItem(null);
            setPendingReorder((p) => (p?.fingerprint ? p : null));
          }}
          initialApiOptions={editingItem.apiOptions}
          replaceApiItemId={editingItem.apiItemId}
          replaceCartId={editingItem.cartId}
          initialQuantity={editingItem.quantity}
          initialSelection={{
            size: editingItem.size,
            productFranchiseId: editingItem.apiProductFranchiseId,
            sugar: editingItem.sugar,
            ice: editingItem.ice,
            toppings: editingInitialApiToppings,
            note: editingItem.note,
          }}
          onSaved={(payload) => {
            setPendingReorder((p) => (p ? { ...p, fingerprint: payload.fingerprint } : p));
          }}
        />
      )}
    </div>
  );
}




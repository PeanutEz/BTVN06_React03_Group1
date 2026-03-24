import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useQueries, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useMenuCartStore } from "@/store/menu-cart.store";
import { useAuthStore } from "@/store/auth.store";
import { cartClient, type CartApiData, type ApiCartItem, type CartItemOption } from "@/services/cart.client";
import { ROUTER_URL } from "@/routes/router.const";
import { aggregateToppings, formatToppingsSummary, parseCartSelectionNote } from "@/utils/cartSelectionNote.util";
import type { IceLevel, SugarLevel, MenuProduct } from "@/types/menu.types";
import MenuProductModal from "@/components/menu/MenuProductModal";

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

export default function CartPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const carts = useMenuCartStore((s) => s.carts);
  const cartIds = useMenuCartStore((s) => s.cartIds);
  const setCarts = useMenuCartStore((s) => s.setCarts);
  const clearCart = useMenuCartStore((s) => s.clearCart);
  const removeCartId = useMenuCartStore((s) => s.removeCartId);
  const localItems = useMenuCartStore((s) => s.items);
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

    const raw = cartsData as unknown;
    const rawObj = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : null;
    const dataList = rawObj?.data;
    const cartsList = rawObj?.carts;
    const list = Array.isArray(raw)
      ? raw
      : Array.isArray(dataList)
        ? dataList
        : Array.isArray(cartsList)
          ? cartsList
          : [];

    const entries = (list as CartApiData[]).map((c) => ({
      cartId: String(c._id ?? c.id ?? ""),
      franchise_id: c.franchise_id,
      franchise_name: c.franchise_name ?? (c as any)?.franchise?.name,
    })).filter((e) => e.cartId);
    if (entries.length > 0) setCarts(entries);
    else clearCart();
  }, [cartsData, cartsLoading, setCarts, clearCart]);

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
    totalAmount: number;
  }

  const sections: CartSection[] = carts.map((entry, idx) => {
    const detail = cartDetails[idx]?.data as CartApiData | undefined;
    const franchiseName = entry.franchise_name ?? detail?.franchise_name ?? (detail as any)?.franchise?.name ?? `Chi nhánh ${idx + 1}`;
    const apiItems: DisplayItem[] = (detail?.items ?? []).map((item: ApiCartItem, i: number) => {
      const qty = item.quantity ?? 1;
      const price = item.price_snapshot ?? item.price ?? 0;
      const parsed = parseCartSelectionNote(String(item.note ?? ""));
      return {
        key: `${entry.cartId}-${item._id ?? item.id ?? i}`,
        cartId: entry.cartId,
        apiItemId: item._id ?? item.id,
        apiProductId: (item as any)?.product_id ? String((item as any)?.product_id) : undefined,
        apiProductFranchiseId: (item as any)?.product_franchise_id ? String((item as any)?.product_franchise_id) : undefined,
        apiFranchiseId: detail?.franchise_id ? String(detail.franchise_id) : undefined,
        toppingsParsed: parsed.toppings,
        name: item.product_name_snapshot ?? item.name ?? "Sản phẩm",
        franchiseName: (item as any)?.franchise_name ?? (item as any)?.franchiseName ?? franchiseName,
        image: item.image_url ?? "",
        size: item.size,
        quantity: qty,
        unitPrice: price,
        lineTotal: item.line_total ?? price * qty,
        sugar: parsed.sugar,
        ice: parsed.ice,
        toppingsText: formatToppingsSummary(parsed.toppings),
        apiOptions: item.options as CartItemOption[] | undefined,
        note: parsed.userNote ?? (item.note ? String(item.note) : undefined),
      };
    });
    const totalAmount = detail?.final_amount ?? apiItems.reduce((s, i) => s + i.lineTotal, 0);
    return { cartId: entry.cartId, franchiseName, detail: detail ?? null, items: apiItems, totalAmount };
  });

  const sectionsWithItems = sections.filter((s) => s.items.length > 0);
  const apiItems: DisplayItem[] = sections.flatMap((s) => s.items);

  const localDisplayItems: DisplayItem[] = localItems.map((li) => ({
    key: li.cartKey,
    name: li.name,
    franchiseName: li.options.franchiseName,
    image: li.image,
    size: li.options.size,
    sugar: li.options.sugar,
    ice: li.options.ice,
    toppingsParsed: aggregateToppings(li.options.toppings).map(({ topping, quantity }) => ({
      name: topping.name,
      quantity,
    })),
    toppingsText: formatToppingsSummary(
      aggregateToppings(li.options.toppings).map(({ topping, quantity }) => ({
        name: topping.name,
        quantity,
      })),
    ),
    quantity: li.quantity,
    unitPrice: li.unitPrice,
    lineTotal: li.unitPrice * li.quantity,
    note: li.note,
    isLocal: true,
    apiFranchiseId: li.apiFranchiseId,
    apiProductId: li.apiProductId ? String(li.apiProductId) : undefined,
    apiProductFranchiseId: li.options.productFranchiseId,
    options: li.options,
    productId: li.productId,
    basePrice: li.basePrice,
    apiCategoryName: li.apiCategoryName,
    apiSizes: li.apiSizes,
  }));

  const hasApiItems = apiItems.length > 0;

  // Keep stable item positions when switching from local -> API by sorting API items
  // according to the current local cart order.
  const selectionKey = (item: DisplayItem) => {
    const toppings = item.toppingsParsed ?? [];
    const toppingParts = [...toppings]
      .map((t) => ({
        n: String(t.name ?? "")
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .trim()
          .toLowerCase(),
        q: t.quantity ?? 0,
      }))
      .sort((a, b) => a.n.localeCompare(b.n))
      .map((t) => `${t.n}#${t.q}`)
      .join("|");

    return [
      item.apiProductFranchiseId ?? "",
      item.apiProductId ?? item.name ?? "",
      item.size ? String(item.size).trim().toUpperCase() : "",
      item.sugar ?? "",
      item.ice ?? "",
      toppingParts,
    ].join("::");
  };

  const apiItemsStableByLocal = (() => {
    if (!hasApiItems || localDisplayItems.length === 0) return apiItems;
    const keyToFirstIndex = new Map<string, number>();
    for (let i = 0; i < localDisplayItems.length; i++) {
      const k = selectionKey(localDisplayItems[i]);
      if (!keyToFirstIndex.has(k)) keyToFirstIndex.set(k, i);
    }

    return apiItems
      .map((it, originalIndex) => {
        const k = selectionKey(it);
        const idx = keyToFirstIndex.get(k);
        return { it, sortIndex: idx ?? Number.MAX_SAFE_INTEGER, originalIndex };
      })
      .sort((a, b) => a.sortIndex - b.sortIndex || a.originalIndex - b.originalIndex)
      .map((x) => x.it);
  })();

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
    if (!hasApiItems || !pendingReorder?.fingerprint) return apiItemsStableByLocal;
    const targetIndex = apiItemsStableByLocal.findIndex((it) => fingerprintMatches(it, pendingReorder.fingerprint));
    if (targetIndex < 0) return apiItemsStableByLocal;
    if (targetIndex === pendingReorder.fromIndex) return apiItemsStableByLocal;
    const next = [...apiItemsStableByLocal];
    const [moved] = next.splice(targetIndex, 1);
    next.splice(Math.max(0, Math.min(pendingReorder.fromIndex, next.length)), 0, moved);
    return next;
  })();

  // Keep same UX as MenuOrderPanel: fallback to local items while API items are unavailable.
  const items = hasApiItems ? orderedApiItems : localDisplayItems;
  const totalAmount = hasApiItems
    ? sections.reduce((s, sec) => s + sec.totalAmount, 0)
    : localDisplayItems.reduce((s, i) => s + i.lineTotal, 0);
  const itemCount = items.reduce((s, i) => s + i.quantity, 0);
  const isLoading = cartIds.length > 0 && cartDetails.some((q) => q.isLoading);

  // After edit+save triggers delete+add, backend may return item in a different order.
  // Reorder it back to the original index once we can match the new item.
  useEffect(() => {
    if (!pendingReorder?.fingerprint || !hasApiItems) return;
    const idx = apiItemsStableByLocal.findIndex((it) => fingerprintMatches(it, pendingReorder.fingerprint));
    if (idx < 0) return;
    // Only clear when backend already returns item in the original position.
    if (idx === pendingReorder.fromIndex) setPendingReorder(null);
  }, [hasApiItems, apiItemsStableByLocal, pendingReorder?.fingerprint]);

  function invalidateCart(cartId: string | undefined) {
    if (cartId) queryClient.invalidateQueries({ queryKey: ["cart-detail", cartId] });
    else queryClient.invalidateQueries({ queryKey: ["cart-detail"] });
  }

  async function handleUpdateQty(item: DisplayItem, newQty: number) {
    if (newQty < 1) {
      handleRemove(item);
      return;
    }
    if (item.apiItemId) {
      try {
        await cartClient.updateCartItemQuantity({ cart_item_id: item.apiItemId, quantity: newQty });
        invalidateCart(item.cartId);
      } catch {
        toast.error("Không thể cập nhật số lượng");
      }
    } else {
      useMenuCartStore.getState().updateQuantity(item.key, newQty);
    }
  }

  async function handleRemove(item: DisplayItem) {
    if (item.apiItemId) {
      try {
        await cartClient.deleteCartItem(item.apiItemId);
        invalidateCart(item.cartId);
        toast.success("Đã xóa sản phẩm khỏi giỏ hàng");
      } catch {
        toast.error("Không thể xóa sản phẩm");
      }
    } else {
      useMenuCartStore.getState().removeItem(item.key);
      toast.success("Đã xóa sản phẩm");
    }
  }

  async function handleUpdateOption(item: DisplayItem, optionProductFranchiseId: string, newQty: number) {
    if (!item.apiItemId) {
      toast.error("Không thể cập nhật topping. Sản phẩm chưa đồng bộ với server.");
      console.warn("Item missing apiItemId:", item);
      return;
    }
    if (!optionProductFranchiseId) return;
    try {
      if (newQty < 1) {
        await cartClient.removeOption({
          cart_item_id: item.apiItemId,
          option_product_franchise_id: optionProductFranchiseId,
        });
      } else {
        await cartClient.updateOption({
          cart_item_id: item.apiItemId,
          option_product_franchise_id: optionProductFranchiseId,
          quantity: newQty,
        });
      }
      invalidateCart(item.cartId);
      toast.success("Đã cập nhật topping");
    } catch {
      toast.error("Không thể cập nhật topping trong giỏ hàng");
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

  const editingLocalItem =
    editingItem?.isLocal && editingItem.key
      ? localItems.find((li) => li.cartKey === editingItem.key) ?? null
      : null;

  function hashStr(str: string) {
    return (str.split("").reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) | 0, 0) >>> 0) as any;
  }

  const editingInitialApiToppings =
    editingItem?.toppingsParsed?.flatMap((t, idx) =>
      Array.from({ length: t.quantity }, (_, i) => ({
        id: `${t.name}-${idx}-${i}`,
        name: t.name,
        price: 0,
        emoji: "",
      })),
    ) ?? undefined;

  const editingMenuProduct: MenuProduct | null = editingLocalItem
    ? Object.assign(
        {
          id: editingLocalItem.productId,
          sku: "",
          name: editingLocalItem.name,
          description: "",
          content: "",
          price: editingLocalItem.basePrice,
          image: editingLocalItem.image,
          images: [],
          categoryId: 0,
          rating: 0,
          reviewCount: 0,
          isAvailable: true,
          isFeatured: false,
        } as MenuProduct,
        {
          _apiFranchiseId: editingLocalItem.apiFranchiseId ?? editingLocalItem.options.franchiseId ?? undefined,
          _apiProductId: editingLocalItem.apiProductId ?? undefined,
          _apiCategoryName: editingLocalItem.apiCategoryName ?? undefined,
          _apiSizes:
            Array.isArray(editingLocalItem.apiSizes) && editingLocalItem.apiSizes.length > 0
              ? editingLocalItem.apiSizes
              : editingLocalItem.options.productFranchiseId && editingLocalItem.options.size
              ? [
                  {
                    product_franchise_id: editingLocalItem.options.productFranchiseId,
                    size: editingLocalItem.options.size,
                    price: editingLocalItem.basePrice,
                    is_available: true,
                  },
                ]
              : [],
          _apiFranchiseName: editingLocalItem.options.franchiseName ?? undefined,
        },
      )
    : editingItem?.apiProductId && editingItem.apiProductFranchiseId && editingItem.apiFranchiseId && editingItem.apiItemId
      ? Object.assign(
          {
            id: hashStr(String(editingItem.apiProductId)),
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

      {hasApiItems ? (
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
                  {item.size && <p className="text-xs text-gray-400 mt-0.5">Size {item.size}</p>}
                  {(item.sugar || item.ice) && (
                    <p className="text-xs text-gray-400 mt-0.5 leading-snug">
                      {item.sugar && `Đường ${item.sugar}`}
                      {item.ice && (item.sugar ? " · " : "")}
                      {item.ice && `Đá: ${item.ice}`}
                    </p>
                  )}
                  {item.toppingsText && <p className="text-xs text-gray-400 mt-0.5 leading-snug">Topping: {item.toppingsText}</p>}
                  {item.apiOptions && item.apiOptions.length > 0 && (
                    <div className="mt-2">
                      {item.apiOptions.map((opt) => {
                        const optId = opt.product_franchise_id;
                        if (!optId) return null;
                        const qty = opt.quantity ?? 0;
                        return (
                          <div key={optId} className="flex items-center justify-between gap-3 mt-1">
                            <p className="text-[10px] text-gray-500 truncate">Topping #{optId}</p>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleUpdateOption(item, optId, qty - 1)}
                                className="w-5 h-5 rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                disabled={qty <= 0}
                                title="Giảm topping"
                              >
                                <span className="text-[11px] leading-none">−</span>
                              </button>
                              <span className="text-[10px] font-semibold text-gray-700 tabular-nums">{qty}</span>
                              <button
                                onClick={() => handleUpdateOption(item, optId, qty + 1)}
                                className="w-5 h-5 rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
                                title="Tăng topping"
                              >
                                <span className="text-[11px] leading-none">+</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {item.note && <p className="text-xs text-gray-400 mt-0.5 italic">Ghi chú: {item.note}</p>}
                  <p className="text-xs text-green-700 font-medium mt-0.5">{fmt(item.unitPrice)}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {(item.apiProductId && item.apiProductFranchiseId && item.apiFranchiseId && (item.isLocal || item.apiItemId)) && (
                    <button
                      onClick={() => {
                        const fromIndex = apiItemsStableByLocal.findIndex((i) => i.key === item.key);
                        setPendingReorder(
                          hasApiItems && item.apiItemId
                            ? { fromIndex: Math.max(0, fromIndex), fingerprint: null }
                            : null,
                        );
                        setEditingItem(item);
                      }}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-all"
                      aria-label="Chỉnh sửa"
                      title="Chỉnh sửa size/sugar/ice/topping/ghi chú"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 20h9" />
                        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 18l-4 1 1-4 12.5-11.5z" />
                      </svg>
                    </button>
                  )}
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
                    {item.quantity === 1 ? "×" : "−"}
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
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
          {localDisplayItems.map((item) => (
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
                  {item.size && <p className="text-xs text-gray-400 mt-0.5">Size {item.size}</p>}
                  {(item.sugar || item.ice) && (
                    <p className="text-xs text-gray-400 mt-0.5 leading-snug">
                      {item.sugar && `Đường ${item.sugar}`}
                      {item.ice && (item.sugar ? " · " : "")}
                      {item.ice && `Đá: ${item.ice}`}
                    </p>
                  )}
                  {item.toppingsText && <p className="text-xs text-gray-400 mt-0.5 leading-snug">Topping: {item.toppingsText}</p>}
                  {item.apiOptions && item.apiOptions.length > 0 && (
                    <div className="mt-2">
                      {item.apiOptions.map((opt) => {
                        const optId = opt.product_franchise_id;
                        if (!optId) return null;
                        const qty = opt.quantity ?? 0;
                        return (
                          <div key={optId} className="flex items-center justify-between gap-3 mt-1">
                            <p className="text-[10px] text-gray-500 truncate">Topping #{optId}</p>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleUpdateOption(item, optId, qty - 1)}
                                className="w-5 h-5 rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                disabled={qty <= 0}
                                title="Giảm topping"
                              >
                                <span className="text-[11px] leading-none">−</span>
                              </button>
                              <span className="text-[10px] font-semibold text-gray-700 tabular-nums">{qty}</span>
                              <button
                                onClick={() => handleUpdateOption(item, optId, qty + 1)}
                                className="w-5 h-5 rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
                                title="Tăng topping"
                              >
                                <span className="text-[11px] leading-none">+</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {item.note && <p className="text-xs text-gray-400 mt-0.5 italic">Ghi chú: {item.note}</p>}
                  <p className="text-xs text-green-700 font-medium mt-0.5">{fmt(item.unitPrice)}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {(item.apiProductId && item.apiProductFranchiseId && item.apiFranchiseId && (item.isLocal || item.apiItemId)) && (
                    <button
                      onClick={() => {
                        const fromIndex = apiItemsStableByLocal.findIndex((i) => i.key === item.key);
                        setPendingReorder(
                          hasApiItems && item.apiItemId
                            ? { fromIndex: Math.max(0, fromIndex), fingerprint: null }
                            : null,
                        );
                        setEditingItem(item);
                      }}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-all"
                      aria-label="Chỉnh sửa"
                      title="Chỉnh sửa size/sugar/ice/topping/ghi chú"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 20h9" />
                        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 18l-4 1 1-4 12.5-11.5z" />
                      </svg>
                    </button>
                  )}
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
                    {item.quantity === 1 ? "×" : "−"}
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
      )}

      <div className="mt-6 bg-white rounded-xl border border-gray-200 p-5">
        <div className="space-y-2.5 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>Tạm tính ({itemCount} sản phẩm)</span>
            <span>{fmt(totalAmount)}</span>
          </div>
          <div className="h-px bg-gray-100" />
          <div className="flex justify-between font-bold text-base text-gray-900">
            <span>Tổng cộng</span>
            <span className="text-green-700">{fmt(totalAmount)}</span>
          </div>
        </div>
        <Link
          to={ROUTER_URL.MENU_CHECKOUT}
          className="mt-4 flex items-center justify-center gap-2 w-full py-3 bg-green-700 hover:bg-green-800 text-white rounded-xl font-semibold text-sm transition-all active:scale-[0.98]"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Tiến hành thanh toán · {fmt(totalAmount)}
        </Link>
      </div>

      {editingMenuProduct && editingItem && (
        <MenuProductModal
          product={editingMenuProduct}
          onClose={() => {
            setEditingItem(null);
            setPendingReorder((p) => (p?.fingerprint ? p : null));
          }}
          replaceLocalCartKey={editingLocalItem?.cartKey}
          replaceApiItemId={editingItem.isLocal ? undefined : editingItem.apiItemId}
          replaceCartId={editingItem.isLocal ? undefined : editingItem.cartId}
          initialQuantity={editingItem.quantity}
          initialSelection={{
            size: editingLocalItem ? editingLocalItem.options.size : editingItem.size,
            productFranchiseId: editingLocalItem ? editingLocalItem.options.productFranchiseId : editingItem.apiProductFranchiseId,
            sugar: editingLocalItem ? editingLocalItem.options.sugar : editingItem.sugar,
            ice: editingLocalItem ? editingLocalItem.options.ice : editingItem.ice,
            toppings: editingLocalItem ? editingLocalItem.options.toppings : editingInitialApiToppings,
            note: editingLocalItem ? editingLocalItem.note : editingItem.note,
          }}
          onSaved={(payload) => {
            setPendingReorder((p) => (p ? { ...p, fingerprint: payload.fingerprint } : p));
          }}
        />
      )}
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueries, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useMenuCartStore } from "@/store/menu-cart.store";
import { useDeliveryStore } from "@/store/delivery.store";
import { useAuthStore } from "@/store/auth.store";
import { isBranchOpen } from "@/services/branch.service";
import { ROUTER_URL } from "@/routes/router.const";
import { cartClient, type ApiCartItem, type CartApiData, type CartItemOption } from "@/services/cart.client";
import { aggregateToppings, formatToppingsSummary, parseCartSelectionNote } from "@/utils/cartSelectionNote.util";
import type { IceLevel, SugarLevel, MenuItemOptions, MenuProduct } from "@/types/menu.types";
import MenuProductModal from "@/components/menu/MenuProductModal";

const fmt = (n: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n);

interface DisplayCartItem {
  key: string;
  cartId?: string;
  apiItemId?: string;
  apiProductId?: string;
  apiProductFranchiseId?: string;
  apiFranchiseId?: string;
  name: string;
  franchiseName?: string;
  image: string;
  size?: string;
  sugar?: SugarLevel;
  ice?: IceLevel;
  toppingsText?: string;
  toppingsParsed?: Array<{ name: string; quantity: number }>;
  apiOptions?: CartItemOption[];
  localBasePrice?: number;
  localProductId?: number;
  localOptions?: MenuItemOptions;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  note?: string;
  isLocal?: boolean;
}

function apiItemToDisplay(
  item: ApiCartItem,
  idx: number,
  franchiseName?: string,
  franchiseId?: string,
): DisplayCartItem {
  const qty = item.quantity ?? 1;
  const price = item.price_snapshot ?? item.price ?? 0;
  const parsed = parseCartSelectionNote(String(item.note ?? ""));
  const itemFranchiseName =
    (item as any)?.franchise_name ?? (item as any)?.franchiseName ?? (item as any)?.franchise?.name;
  return {
    key: item._id ?? item.id ?? `api-${idx}`,
    apiItemId: item._id ?? item.id,
    apiProductId: item.product_id,
    apiProductFranchiseId: item.product_franchise_id,
    apiFranchiseId: franchiseId,
    name: item.product_name_snapshot ?? item.name ?? "Sản phẩm",
    franchiseName: (typeof itemFranchiseName === "string" ? itemFranchiseName : undefined) ?? franchiseName,
    image: item.image_url ?? "",
    size: item.size,
    quantity: qty,
    unitPrice: price,
    lineTotal: item.line_total ?? price * qty,
    sugar: parsed.sugar,
    ice: parsed.ice,
    toppingsText: formatToppingsSummary(parsed.toppings),
    toppingsParsed: parsed.toppings,
    apiOptions: (item.options as CartItemOption[] | undefined) ?? undefined,
    note: parsed.userNote ?? (item.note ? String(item.note) : undefined),
  };
}

interface MenuOrderPanelProps {
  visible?: boolean;
  onRequestClose?: () => void;
}

export default function MenuOrderPanel({
  visible = true,
  onRequestClose,
}: MenuOrderPanelProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const carts = useMenuCartStore((s) => s.carts);
  const cartIds = useMenuCartStore((s) => s.cartIds);
  const setCarts = useMenuCartStore((s) => s.setCarts);
  const removeCartId = useMenuCartStore((s) => s.removeCartId);
  const clearLocalCart = useMenuCartStore((s) => s.clearCart);
  const localItems = useMenuCartStore((s) => s.items);
  const user = useAuthStore((s) => s.user);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const resolved = useRef(false);

  const customerId = String(
    (user as any)?.user?.id ?? (user as any)?.user?._id ?? (user as any)?.id ?? (user as any)?._id ?? "",
  );

  const [cancellingCart, setCancellingCart] = useState(false);
  const [editingItem, setEditingItem] = useState<DisplayCartItem | null>(null);
  const [pendingReorder, setPendingReorder] = useState<{
    fromIndex: number;
    kind: "api" | "local";
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

  const {
    orderMode,
    selectedBranch,
    selectedFranchiseId,
    selectedFranchiseName,
    isReadyToOrder,
    currentDeliveryFee,
  } = useDeliveryStore();

  const safeSelectedFranchiseName =
    typeof selectedFranchiseName === "string" ? selectedFranchiseName : undefined;

  const { data: cartsData } = useQuery({
    queryKey: ["carts-by-customer", customerId],
    queryFn: () => cartClient.getCartsByCustomerId(customerId, { status: "ACTIVE" }),
    enabled: !!customerId && isLoggedIn,
    staleTime: 10_000,
  });

  useEffect(() => {
    if (!cartsData || !Array.isArray(cartsData) || resolved.current) return;
    resolved.current = true;
    const entries = (cartsData as CartApiData[]).map((c) => ({
      cartId: String(c._id ?? c.id ?? ""),
      franchise_id: c.franchise_id,
      franchise_name: c.franchise_name ?? (c as any)?.franchise?.name,
    })).filter((e) => e.cartId);
    setCarts(entries);
  }, [cartsData, setCarts]);

  const cartDetails = useQueries({
    queries: cartIds.map((cartId) => ({
      queryKey: ["cart-detail", cartId],
      queryFn: () => cartClient.getCartDetail(cartId),
      enabled: !!cartId && isLoggedIn,
      refetchOnWindowFocus: true,
      staleTime: 10_000,
    })),
  });

  interface CartSection {
    cartId: string;
    franchiseName: string;
    detail: CartApiData | null;
    items: DisplayCartItem[];
    subtotal: number;
  }

  const sections: CartSection[] = carts.map((entry, idx) => {
    const detail = cartDetails[idx]?.data as CartApiData | undefined;
    const franchiseName =
      entry.franchise_name ?? detail?.franchise_name ?? (detail as any)?.franchise?.name ?? safeSelectedFranchiseName ?? `Chi nhánh ${idx + 1}`;
    const items: DisplayCartItem[] = (detail?.items ?? []).map((item, i) => ({
      ...apiItemToDisplay(item, i, franchiseName, detail?.franchise_id),
      cartId: entry.cartId,
    }));
    const subtotal = detail?.total_amount ?? items.reduce((s, i) => s + i.lineTotal, 0);
    return { cartId: entry.cartId, franchiseName, detail: detail ?? null, items, subtotal };
  });

  const sectionsWithItems = sections.filter((s) => s.items.length > 0);
  const apiItems: DisplayCartItem[] = sections.flatMap((s) => s.items);

  // Map local items as fallback
  const localDisplayItems: DisplayCartItem[] = localItems.map((li) => {
    const localFranchiseName =
      typeof li.options.franchiseName === "string" ? li.options.franchiseName : undefined;
    return {
      key: li.cartKey,
      name: li.name,
      franchiseName:
        localFranchiseName ?? (orderMode === "PICKUP" ? safeSelectedFranchiseName : undefined),
      image: li.image,
      size: li.options.size,
      sugar: li.options.sugar,
      ice: li.options.ice,
      apiProductId: li.apiProductId,
      apiProductFranchiseId: li.options.productFranchiseId,
      apiFranchiseId: li.apiFranchiseId,
      toppingsText: formatToppingsSummary(
        aggregateToppings(li.options.toppings).map(({ topping, quantity }) => ({
          name: topping.name,
          quantity,
        })),
      ),
      toppingsParsed: aggregateToppings(li.options.toppings).map(({ topping, quantity }) => ({
        name: topping.name,
        quantity,
      })),
      // For local editing (topping/options)
      localOptions: li.options,
      localProductId: li.productId,
      localBasePrice: li.basePrice,
      quantity: li.quantity,
      unitPrice: li.unitPrice,
      lineTotal: li.unitPrice * li.quantity,
      note: li.note,
      isLocal: true,
    };
  });

  // Use API items if available, otherwise fallback to local items
  const hasApiItems = apiItems.length > 0;

  // Stable ordering: when API items are available, keep their visual order aligned
  // with current local cart order to avoid "jumping" positions after add/edit.
  const selectionKey = (item: DisplayCartItem) => {
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
    item: DisplayCartItem,
    fp: NonNullable<typeof pendingReorder>["fingerprint"],
  ) => {
    if (!fp) return false;
    if (fp.apiProductFranchiseId && item.apiProductFranchiseId && String(item.apiProductFranchiseId) !== String(fp.apiProductFranchiseId)) return false;
    if (fp.apiProductId && item.apiProductId && String(item.apiProductId) !== String(fp.apiProductId)) return false;
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

  const reorderItems = (base: DisplayCartItem[], fromIndex: number) => {
    if (!pendingReorder?.fingerprint) return base;
    const targetIndex = base.findIndex((it) => fingerprintMatches(it, pendingReorder.fingerprint!));
    if (targetIndex < 0) return base;
    if (targetIndex === fromIndex) return base;
    const next = [...base];
    const [moved] = next.splice(targetIndex, 1);
    next.splice(Math.max(0, Math.min(fromIndex, next.length)), 0, moved);
    return next;
  };

  const orderedApiItems =
    pendingReorder?.kind === "api"
      ? reorderItems(apiItemsStableByLocal, pendingReorder.fromIndex)
      : apiItemsStableByLocal;
  const orderedLocalItems =
    pendingReorder?.kind === "local" ? reorderItems(localDisplayItems, pendingReorder.fromIndex) : localDisplayItems;

  const displayItems: DisplayCartItem[] = hasApiItems ? orderedApiItems : orderedLocalItems;

  const itemCount = displayItems.reduce((s, i) => s + i.quantity, 0);
  useEffect(() => {
    if (!pendingReorder?.fingerprint) return;
    const base = pendingReorder.kind === "api" ? apiItemsStableByLocal : localDisplayItems;
    const idx = base.findIndex((it) => fingerprintMatches(it, pendingReorder.fingerprint!));
    if (idx === pendingReorder.fromIndex) setPendingReorder(null);
  }, [
    pendingReorder?.fingerprint,
    pendingReorder?.kind,
    pendingReorder?.fromIndex,
    apiItemsStableByLocal,
    localDisplayItems,
  ]);
  const subtotal = hasApiItems
    ? sectionsWithItems.reduce((s, sec) => s + sec.subtotal, 0)
    : localDisplayItems.reduce((s, i) => s + i.lineTotal, 0);
  const deliveryFee = orderMode === "DELIVERY" ? currentDeliveryFee : 0;
  const total = subtotal + deliveryFee;
  const cartLoading = cartIds.length > 0 && cartDetails.some((q) => q.isLoading);

  function invalidateCart(cartId: string | undefined) {
    if (cartId) queryClient.invalidateQueries({ queryKey: ["cart-detail", cartId] });
    else queryClient.invalidateQueries({ queryKey: ["cart-detail"] });
  }

  async function handleRemoveItem(item: DisplayCartItem) {
    console.log("🗑️ [MenuOrderPanel] handleRemoveItem called:", {
      itemName: item.name,
      apiItemId: item.apiItemId,
      cartId: item.cartId
    });

    if (item.apiItemId) {
      try {
        console.log("🌐 Calling API deleteCartItem:", item.apiItemId);
        await cartClient.deleteCartItem(item.apiItemId);
        console.log("✅ Delete successful, invalidating cart...");
        invalidateCart(item.cartId);
        toast.success("Đã xóa sản phẩm khỏi giỏ hàng");
      } catch (error) {
        console.error("❌ Delete API call failed:", error);
        toast.error("Không thể xóa sản phẩm: " + ((error as any)?.response?.data?.message || (error as any)?.message || "Lỗi không xác định"));
      }
    } else {
      console.log("⚠️ No apiItemId, removing from local store only");
      useMenuCartStore.getState().removeItem(item.key);
      toast.success("Đã xóa sản phẩm");
    }
  }

  async function handleCancelCart() {
    const cartIdToCancel = sectionsWithItems[0]?.cartId ?? cartIds[0] ?? null;
    if (cartIdToCancel == null) {
      clearLocalCart();
      toast.success("Đã xóa giỏ hàng");
      return;
    }
    if (!isLoggedIn) {
      clearLocalCart();
      toast.success("Đã xóa giỏ tạm trên thiết bị");
      return;
    }
    if (cancellingCart) return;
    setCancellingCart(true);
    try {
      await cartClient.cancelCart(cartIdToCancel);
      const isLastCart = cartIds.length <= 1;
      removeCartId(cartIdToCancel);
      queryClient.invalidateQueries({ queryKey: ["cart-detail", cartIdToCancel] });
      queryClient.invalidateQueries({ queryKey: ["cart-detail"] });
      queryClient.invalidateQueries({ queryKey: ["carts-by-customer", customerId] });
      if (isLastCart) {
        // Avoid showing stale local fallback items after cancelling the final server cart.
        clearLocalCart();
      }
      toast.success("Đã hủy giỏ hàng");
      if (isLastCart) {
        onRequestClose?.();
        navigate(ROUTER_URL.MENU);
      }
    } catch {
      toast.error("Không thể hủy giỏ hàng");
    } finally {
      setCancellingCart(false);
    }
  }

  function handleCheckout() {
    if (!user) {
      toast.error("Vui lòng đăng nhập để đặt hàng", {
        description: "Giỏ hàng và cửa hàng của bạn sẽ được giữ nguyên.",
      });
      return;
    }
    navigate(ROUTER_URL.MENU_CHECKOUT);
  }

  const hasLocation = orderMode === "PICKUP" ? !!selectedFranchiseName : !!selectedBranch;
  const branchOpen = selectedBranch ? isBranchOpen(selectedBranch) : false;

  const disabledReason = !isLoggedIn
    ? "Vui lòng đăng nhập"
    : !hasLocation
    ? "Vui lòng chọn cửa hàng"
    : orderMode === "DELIVERY" && !branchOpen
    ? "Cửa hàng đang đóng cửa"
    : orderMode === "DELIVERY" && !isReadyToOrder
    ? "Địa chỉ chưa xác nhận"
    : displayItems.length === 0
    ? "Chưa có món"
    : null;

  const canCheckout = !disabledReason && displayItems.length > 0 && isLoggedIn;
  const editingLocalItem =
    editingItem?.isLocal && editingItem.key
      ? localItems.find((li) => li.cartKey === editingItem.key) ?? null
      : null;
  function hashStr(str: string) {
    return (str.split("").reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) | 0, 0) >>> 0) as any;
  }

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
          _apiFranchiseId:
            editingLocalItem.apiFranchiseId ??
            (editingLocalItem.options as any)?.franchiseId ??
            selectedFranchiseId ??
            undefined,
          _apiProductId: editingLocalItem.apiProductId ?? undefined,
          _apiCategoryName: editingLocalItem.apiCategoryName ?? undefined,
          _apiSizes:
            Array.isArray(editingLocalItem.apiSizes) && editingLocalItem.apiSizes.length > 0
              ? editingLocalItem.apiSizes
              : (editingLocalItem.options as any)?.productFranchiseId && (editingLocalItem.options as any)?.size
              ? [
                  {
                    product_franchise_id: (editingLocalItem.options as any).productFranchiseId,
                    size: (editingLocalItem.options as any).size,
                    price: editingLocalItem.basePrice,
                    is_available: true,
                  },
                ]
              : [],
          _apiFranchiseName: editingLocalItem.options.franchiseName ?? safeSelectedFranchiseName,
        },
      )
    : editingItem?.apiProductId && editingItem.apiFranchiseId
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
            _apiSizes:
              editingItem.apiProductFranchiseId && editingItem.size
                ? [
                    {
                      product_franchise_id: editingItem.apiProductFranchiseId,
                      size: editingItem.size,
                      price: 0,
                      is_available: true,
                    },
                  ]
                : [],
            _apiFranchiseName: editingItem.franchiseName ?? safeSelectedFranchiseName,
          },
        )
      : null;

  const editingInitialApiToppings =
    editingItem?.toppingsParsed?.flatMap((t, idx) =>
      Array.from({ length: t.quantity }, (_, i) => ({
        id: `${t.name}-${idx}-${i}`,
        name: t.name,
        price: 0,
        emoji: "",
      })),
    ) ?? undefined;

  // Empty state - require login
  if (!isLoggedIn) {
    return (
      <div className={cn("flex flex-col h-full min-h-0", !visible && "hidden lg:flex")}>
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100 shrink-0">
          <h2 className="font-bold text-gray-900 text-sm">Đơn hàng của bạn</h2>
          {onRequestClose && (
            <button onClick={onRequestClose} className="lg:hidden text-gray-400 hover:text-gray-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 text-center">
          <div className="text-5xl mb-3">🔒</div>
          <p className="font-semibold text-gray-700 mb-1 text-sm">Vui lòng đăng nhập</p>
          <p className="text-xs text-gray-400 mb-4">Đăng nhập để xem giỏ hàng và đặt món</p>
          <button
            onClick={() => navigate(ROUTER_URL.LOGIN)}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-semibold transition-colors"
          >
            Đăng nhập ngay
          </button>
        </div>
      </div>
    );
  }

  // Empty cart state
  if (displayItems.length === 0 && !cartLoading) {
    return (
      <div className={cn("flex flex-col h-full min-h-0", !visible && "hidden lg:flex")}>
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100 shrink-0">
          <h2 className="font-bold text-gray-900 text-sm">Đơn hàng của bạn</h2>
          {onRequestClose && (
            <button onClick={onRequestClose} className="lg:hidden text-gray-400 hover:text-gray-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 text-center">
          <div className="text-5xl mb-3">🛒</div>
          <p className="font-semibold text-gray-700 mb-1 text-sm">Giỏ hàng trống</p>
          <p className="text-xs text-gray-400">Chọn đồ uống từ menu để đặt hàng nhé!</p>
        </div>
      </div>
    );
  }

  // Loading state
  if (cartLoading && displayItems.length === 0) {
    return (
      <div className={cn("flex flex-col h-full min-h-0", !visible && "hidden lg:flex")}>
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100 shrink-0">
          <h2 className="font-bold text-gray-900 text-sm">Đơn hàng của bạn</h2>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-xs text-gray-400">Đang tải giỏ hàng...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col h-full min-h-0", !visible && "hidden lg:flex")}>
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100 shrink-0">
        <h2 className="font-bold text-gray-900 text-sm">
          Đơn hàng <span className="text-gray-400 font-normal">({itemCount} món)</span>
        </h2>
        {onRequestClose && (
          <button onClick={onRequestClose} className="lg:hidden text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      <div className="flex-1 min-h-0 flex flex-col">
        {/* Scroll area: chỉ danh sách sản phẩm */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="divide-y divide-gray-50">
            {hasApiItems ? (
              sectionsWithItems.map((section) => (
                <div key={section.cartId}>
                  <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
                    <p className="text-[11px] font-semibold text-gray-600">🏪 {section.franchiseName}</p>
                  </div>
                  {section.items.map((item) => (
              <div key={item.key} className="px-3 py-2 border-b border-gray-100 last:border-0 hover:bg-gray-50/50 transition-colors">
                <div className="flex gap-2.5">
                  {/* Product Image - Smaller */}
                  {item.image ? (
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center text-lg shrink-0">
                      🍵
                    </div>
                  )}

                  {/* Product Info - Compact */}
                  <div className="flex-1 min-w-0">
                    {/* Header - Compact */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 text-sm leading-tight truncate">{item.name}</h4>
                        {item.franchiseName && (
                          <p className="text-xs text-gray-500 truncate">🏪 {item.franchiseName}</p>
                        )}
                      </div>

                      {/* Action buttons - Smaller */}
                      <div className="flex items-center gap-0.5 shrink-0">
                        {/* Edit button */}
                        {item.isLocal || (item.apiFranchiseId && item.apiProductId) ? (
                          <button
                            onClick={() => {
                              const base = hasApiItems ? apiItemsStableByLocal : localDisplayItems;
                              const fromIndex = base.findIndex((i) => i.key === item.key);
                              if (fromIndex >= 0) {
                                setPendingReorder({
                                  fromIndex,
                                  kind: item.isLocal ? "local" : "api",
                                  fingerprint: null,
                                });
                              } else {
                                setPendingReorder(null);
                              }
                              setEditingItem(item);
                            }}
                            className="w-5 h-5 rounded flex items-center justify-center text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-all"
                            title="Chỉnh sửa"
                          >
                            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M12 20h9" />
                              <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 18l-4 1 1-4 12.5-11.5z" />
                            </svg>
                          </button>
                        ) : null}

                        {/* Delete button */}
                        <button
                          onClick={() => handleRemoveItem(item)}
                          className="w-5 h-5 rounded flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
                          title="Xóa"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Details - Single line when possible */}
                    <div className="mt-1 space-y-0.5">
                      {(item.size || item.sugar || item.ice) && (
                        <p className="text-xs text-gray-500">
                          {[item.size, item.sugar && `${item.sugar} đường`, item.ice].filter(Boolean).join(" • ")}
                        </p>
                      )}

                      {/* Toppings - Inline */}
                      {(item.toppingsText || (item.apiOptions && item.apiOptions.length > 0)) && (
                        <div className="flex flex-wrap items-center gap-1">
                          <span className="text-xs text-amber-700 font-medium">Topping:</span>
                          {item.toppingsText && (
                            <span className="text-xs text-gray-600">{item.toppingsText}</span>
                          )}
                          {item.apiOptions?.map((opt) => {
                            const optId = opt.product_franchise_id;
                            if (!optId) return null;
                            const qty = opt.quantity ?? 0;
                            return (
                              <span key={optId} className="inline-flex items-center px-1.5 py-0.5 bg-gray-100 rounded text-[10px] text-gray-600">
                                #{optId.slice(-4)} × {qty}
                              </span>
                            );
                          })}
                        </div>
                      )}

                      {item.note && (
                        <p className="text-xs text-gray-500 italic">
                          <span className="font-medium">Ghi chú:</span> {item.note}
                        </p>
                      )}
                    </div>

                    {/* Bottom row - Quantity & Price */}
                    <div className="flex items-center justify-between mt-2">
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded text-xs font-semibold">
                        <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m-9 3v10a2 2 0 002 2h6a2 2 0 002-2V7M7 7h10" />
                        </svg>
                        {item.quantity}
                      </span>
                      <span className="text-sm font-bold text-gray-900">
                        {fmt(item.lineTotal)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
                  ))}
                </div>
              ))
            ) : (
              displayItems.map((item) => (
              <div key={item.key} className="px-3 py-2 border-b border-gray-100 last:border-0 hover:bg-gray-50/50 transition-colors">
                <div className="flex gap-2.5">
                  {/* Product Image - Smaller */}
                  {item.image ? (
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center text-lg shrink-0">
                      🍵
                    </div>
                  )}

                  {/* Product Info - Compact */}
                  <div className="flex-1 min-w-0">
                    {/* Header - Compact */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 text-sm leading-tight truncate">{item.name}</h4>
                        {item.franchiseName && (
                          <p className="text-xs text-gray-500 truncate">🏪 {item.franchiseName}</p>
                        )}
                      </div>

                      {/* Action buttons - Smaller */}
                      <div className="flex items-center gap-0.5 shrink-0">
                        {/* Edit button */}
                        {item.isLocal || (item.apiFranchiseId && item.apiProductId) ? (
                          <button
                            onClick={() => {
                              const base = hasApiItems ? apiItemsStableByLocal : localDisplayItems;
                              const fromIndex = base.findIndex((i) => i.key === item.key);
                              if (fromIndex >= 0) {
                                setPendingReorder({
                                  fromIndex,
                                  kind: item.isLocal ? "local" : "api",
                                  fingerprint: null,
                                });
                              } else {
                                setPendingReorder(null);
                              }
                              setEditingItem(item);
                            }}
                            className="w-5 h-5 rounded flex items-center justify-center text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-all"
                            title="Chỉnh sửa"
                          >
                            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M12 20h9" />
                              <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 18l-4 1 1-4 12.5-11.5z" />
                            </svg>
                          </button>
                        ) : null}

                        {/* Delete button */}
                        <button
                          onClick={() => handleRemoveItem(item)}
                          className="w-5 h-5 rounded flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
                          title="Xóa"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Details - Single line when possible */}
                    <div className="mt-1 space-y-0.5">
                      {(item.size || item.sugar || item.ice) && (
                        <p className="text-xs text-gray-500">
                          {[item.size, item.sugar && `${item.sugar} đường`, item.ice].filter(Boolean).join(" • ")}
                        </p>
                      )}

                      {/* Toppings - Inline */}
                      {(item.toppingsText || (item.apiOptions && item.apiOptions.length > 0)) && (
                        <div className="flex flex-wrap items-center gap-1">
                          <span className="text-xs text-amber-700 font-medium">Topping:</span>
                          {item.toppingsText && (
                            <span className="text-xs text-gray-600">{item.toppingsText}</span>
                          )}
                          {item.apiOptions?.map((opt) => {
                            const optId = opt.product_franchise_id;
                            if (!optId) return null;
                            const qty = opt.quantity ?? 0;
                            return (
                              <span key={optId} className="inline-flex items-center px-1.5 py-0.5 bg-gray-100 rounded text-[10px] text-gray-600">
                                #{optId.slice(-4)} × {qty}
                              </span>
                            );
                          })}
                        </div>
                      )}

                      {item.note && (
                        <p className="text-xs text-gray-500 italic">
                          <span className="font-medium">Ghi chú:</span> {item.note}
                        </p>
                      )}
                    </div>

                    {/* Bottom row - Quantity & Price */}
                    <div className="flex items-center justify-between mt-2">
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded text-xs font-semibold">
                        <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m-9 3v10a2 2 0 002 2h6a2 2 0 002-2V7M7 7h10" />
                        </svg>
                        {item.quantity}
                      </span>
                      <span className="text-sm font-bold text-gray-900">
                        {fmt(item.lineTotal)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
          </div>
        </div>

        {/* Fixed footer (không nằm trong scroll) */}
        <div className="mx-4 mt-3 bg-gray-50 rounded-xl p-3.5 space-y-2 text-xs flex-shrink-0">
          <div className="flex justify-between text-gray-600">
            <span>Tạm tính ({itemCount} món)</span>
            <span>{fmt(subtotal)}</span>
          </div>
          {orderMode === "DELIVERY" && (
            <div className="flex justify-between text-gray-600">
              <span>Phí giao hàng</span>
              {currentDeliveryFee === 0 ? <span className="text-emerald-600 font-medium">Miễn phí</span> : <span>{fmt(currentDeliveryFee)}</span>}
            </div>
          )}

          <div className="h-px bg-gray-200" />
          <div className="flex justify-between font-bold text-sm text-gray-900">
            <span>Tổng cộng</span>
            <span className="text-amber-600">{fmt(total)}</span>
          </div>
        </div>
        <div className="border-t border-gray-100 bg-white px-4 py-3 flex flex-col gap-2 flex-shrink-0">
          {disabledReason && (
            <div className="flex items-center gap-2 bg-orange-50 border border-orange-100 rounded-xl px-3 py-2">
              <span className="text-sm">⚠️</span>
              <p className="text-xs text-orange-700 font-medium">{disabledReason}</p>
            </div>
          )}
          <button
            disabled={cancellingCart}
            onClick={() => !cancellingCart && handleCancelCart()}
            className={cn(
              "w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm transition-all duration-150",
              cancellingCart ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-100"
            )}
            title="Hủy giỏ hàng"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            {cancellingCart ? "Đang hủy..." : "Hủy giỏ"}
          </button>
          <button disabled={!canCheckout} onClick={() => canCheckout && handleCheckout()} className={cn("w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all duration-150", canCheckout ? "bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-white shadow-sm shadow-amber-200" : "bg-gray-100 text-gray-400 cursor-not-allowed")}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            Đặt hàng · {fmt(total)}
          </button>
        </div>
      </div>
      {editingMenuProduct && editingItem && (
        <MenuProductModal
          product={editingMenuProduct}
          onClose={() => {
            setEditingItem(null);
            setPendingReorder(null);
          }}
          replaceLocalCartKey={editingLocalItem?.cartKey}
          replaceApiItemId={editingItem.apiItemId}
          replaceCartId={editingItem.cartId}
          initialQuantity={editingItem.quantity}
          initialSelection={{
            size: editingItem.size,
            productFranchiseId: editingItem.apiProductFranchiseId,
            sugar: editingItem.sugar,
            ice: editingItem.ice,
            toppings: editingLocalItem?.options.toppings ?? editingInitialApiToppings,
            note: editingItem.note,
          }}
          onSaved={(payload) => {
            setPendingReorder((p) => (p ? { ...p, fingerprint: payload.fingerprint ?? null } : p));
          }}
        />
      )}
    </div>
  );
}

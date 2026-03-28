import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueries, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useMenuCartStore } from "@/store/menu-cart.store";
import { useDeliveryStore } from "@/store/delivery.store";
import { useAuthStore } from "@/store/auth.store";
import { useLoadingStore } from "@/store/loading.store";
import { isBranchOpen } from "@/services/branch.service";
import { ROUTER_URL } from "@/routes/router.const";
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
  type ApiCartItem,
  type CartApiData,
  type CartItemOption,
  type CartPricingSummary,
} from "@/services/cart.client";
import {
  formatCartOptionsSummary,
  formatToppingsSummary,
  parseCartSelectionNote,
  stripGeneratedCartNote,
} from "@/utils/cartSelectionNote.util";
import type { IceLevel, SugarLevel, MenuItemOptions, MenuProduct } from "@/types/menu.types";
import CartItemEditDialog from "@/components/menu/CartItemEditDialog";
import { clientService } from "@/services/client.service";

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
  const price = getCartItemUnitPrice(item);
  const parsed = parseCartSelectionNote(String(item.note ?? ""));
  const itemFranchiseName =
    (item as any)?.franchise_name ?? (item as any)?.franchiseName ?? (item as any)?.franchise?.name;
  return {
    key: getCartItemId(item) ?? `api-${idx}`,
    apiItemId: getCartItemId(item),
    apiProductId: getCartItemProductId(item),
    apiProductFranchiseId: item.product_franchise_id,
    apiFranchiseId: franchiseId,
    name: getCartItemName(item),
    franchiseName: (typeof itemFranchiseName === "string" ? itemFranchiseName : undefined) ?? franchiseName,
    image: getCartItemImage(item),
    size: getCartItemSize(item),
    quantity: qty,
    unitPrice: price,
    lineTotal: getCartItemLineTotal(item),
    sugar: parsed.sugar,
    ice: parsed.ice,
    toppingsText: formatCartOptionsSummary((item.options as CartItemOption[] | undefined) ?? undefined) || formatToppingsSummary(parsed.toppings),
    toppingsParsed: parsed.toppings,
    apiOptions: (item.options as CartItemOption[] | undefined) ?? undefined,
    note: stripGeneratedCartNote(item.note ? String(item.note) : undefined),
  };
}

interface MenuOrderPanelProps {
  visible?: boolean;
  onRequestClose?: () => void;
}

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
  const clearItemsOnly = useMenuCartStore((s) => s.clearItemsOnly);
  const user = useAuthStore((s) => s.user);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const showGlobalLoading = useLoadingStore((s) => s.show);
  const hideGlobalLoading = useLoadingStore((s) => s.hide);

  const customerId = String(
    (user as any)?.user?.id ?? (user as any)?.user?._id ?? (user as any)?.id ?? (user as any)?._id ?? "",
  );

  const [cancellingCart, setCancellingCart] = useState(false);
  const [editingItem, setEditingItem] = useState<DisplayCartItem | null>(null);
  const [removingItemKey, setRemovingItemKey] = useState<string | null>(null);
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

  const {
    orderMode,
    selectedBranch,
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
    if (!isLoggedIn) {
      setCarts([]);
      return;
    }

    const entries = normalizeCustomerCarts(cartsData)
      .map(toCustomerCartEntry)
      .filter((entry): entry is NonNullable<typeof entry> => !!entry);
    setCarts(entries);
    clearItemsOnly();
  }, [cartsData, isLoggedIn, setCarts, clearItemsOnly]);

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
    pricing: CartPricingSummary;
  }

  const customerCarts = normalizeCustomerCarts(cartsData);

  const sections: CartSection[] = carts.map((entry, idx) => {
    const listCart = customerCarts.find((cart) => String(cart._id ?? cart.id ?? "") === entry.cartId);
    const detail = (cartDetails[idx]?.data as CartApiData | undefined) ?? listCart;
    const franchiseName =
      entry.franchise_name ?? detail?.franchise_name ?? (detail as any)?.franchise?.name ?? safeSelectedFranchiseName ?? `Chi nhánh ${idx + 1}`;
    const items: DisplayCartItem[] = getCartItems(detail ?? listCart).map((item, i) => ({
      ...apiItemToDisplay(
        item,
        i,
        franchiseName,
        getCartFranchiseId(detail) ?? getCartFranchiseId(listCart),
      ),
      cartId: entry.cartId,
    }));
    const itemsSubtotal = items.reduce((s, i) => s + i.lineTotal, 0);
    const pricing = getCartPricingSummary(detail ?? listCart, itemsSubtotal);
    return { cartId: entry.cartId, franchiseName, detail: detail ?? null, items, pricing };
  });

  const sectionsWithItems = sections.filter((s) => s.items.length > 0);
  const apiItems: DisplayCartItem[] = sections.flatMap((s) => s.items);
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

  const orderedApiItems = reorderItems(apiItems, pendingReorder?.fromIndex ?? 0);

  const displayItems: DisplayCartItem[] = orderedApiItems;

  const itemCount = displayItems.reduce((s, i) => s + i.quantity, 0);
  useEffect(() => {
    if (!pendingReorder?.fingerprint) return;
    const idx = apiItems.findIndex((it) => fingerprintMatches(it, pendingReorder.fingerprint!));
    if (idx === pendingReorder.fromIndex) setPendingReorder(null);
  }, [pendingReorder?.fingerprint, pendingReorder?.fromIndex, apiItems]);
  const pricingSummary = sectionsWithItems.reduce(
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
  const deliveryFee = orderMode === "DELIVERY" ? currentDeliveryFee : 0;
  const total = pricingSummary.finalAmount + deliveryFee;
  const cartLoading = cartIds.length > 0 && cartDetails.some((q) => q.isLoading);
  const isOrderPanelBusy = cancellingCart || removingItemKey !== null;

  function invalidateCart(cartId: string | undefined) {
    if (cartId) queryClient.invalidateQueries({ queryKey: ["cart-detail", cartId] });
    else queryClient.invalidateQueries({ queryKey: ["cart-detail"] });
  }

  async function handleRemoveItem(item: DisplayCartItem) {
    if (removingItemKey === item.key) return;
    if (!item.apiItemId) {
      toast.error("Không thể xóa sản phẩm. Sản phẩm chưa đồng bộ với server.");
      return;
    }
    setRemovingItemKey(item.key);
    try {
      await cartClient.deleteCartItem(item.apiItemId);
      invalidateCart(item.cartId);
      toast.success("Đã xóa sản phẩm khỏi giỏ hàng");
    } catch (error) {
      toast.error("Không thể xóa sản phẩm: " + ((error as any)?.response?.data?.message || (error as any)?.message || "Lỗi không xác định"));
    } finally {
      setRemovingItemKey(null);
    }
  }

  async function handleCancelCart() {
    const cartIdToCancel = sectionsWithItems[0]?.cartId ?? cartIds[0] ?? null;
    if (cartIdToCancel == null) {
      showGlobalLoading("Đang hủy giỏ hàng...");
      clearLocalCart();
      hideGlobalLoading();
      toast.success("Đã xóa giỏ hàng");
      return;
    }
    if (!isLoggedIn) {
      showGlobalLoading("Đang hủy giỏ hàng...");
      clearLocalCart();
      hideGlobalLoading();
      toast.success("Đã xóa giỏ tạm trên thiết bị");
      return;
    }
    if (cancellingCart) return;
    setCancellingCart(true);
    showGlobalLoading("Đang hủy giỏ hàng...");
    try {
      await cartClient.cancelCart(cartIdToCancel);
      const isLastCart = cartIds.length <= 1;
      removeCartId(cartIdToCancel);
      await queryClient.invalidateQueries({ queryKey: ["cart-detail", cartIdToCancel] });
      await queryClient.invalidateQueries({ queryKey: ["cart-detail"] });
      if (customerId) {
        await queryClient.fetchQuery({
          queryKey: ["carts-by-customer", customerId],
          queryFn: () => cartClient.getCartsByCustomerId(customerId, { status: "ACTIVE" }),
          staleTime: 0,
        });
      } else {
        await queryClient.invalidateQueries({ queryKey: ["carts-by-customer"] });
      }
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
      hideGlobalLoading();
    }
  }

  function handleOpenEditDialog(item: DisplayCartItem) {
    if (!item.apiItemId) {
      toast.error("Sản phẩm này chưa có cart item id để chỉnh sửa.");
      return;
    }
    const fromIndex = apiItems.findIndex((i) => i.key === item.key);
    setPendingReorder(fromIndex >= 0 ? { fromIndex, fingerprint: null } : null);
    setEditingItem(item);
  }

  function handleCheckout() {
    if (!user) {
      toast.error("Vui lòng đăng nhập để đặt hàng", {
        description: "Giỏ hàng và cửa hàng của bạn sẽ được giữ nguyên.",
      });
      return;
    }
    showGlobalLoading("Đang chuyển sang thanh toán...", {
      persistOnNextRoute: true,
    });
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

  const canCheckout = !disabledReason && displayItems.length > 0 && isLoggedIn;  function hashStr(str: string) {
    return (str.split("").reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) | 0, 0) >>> 0) as any;
  }

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
          <button
            onClick={onRequestClose}
            disabled={isOrderPanelBusy}
            className={cn(
              "lg:hidden text-gray-400",
              isOrderPanelBusy ? "cursor-not-allowed opacity-50" : "hover:text-gray-600",
            )}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      <div className="flex-1 min-h-0 flex flex-col">
        {/* Scroll area: chứa danh sách sản phẩm */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
          <div className="divide-y divide-gray-50">
            {
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
                        {item.size && (
                          <p className="mt-0.5 text-[11px] font-medium text-blue-700">Size : {item.size}</p>
                        )}
                      </div>

                      {/* Action buttons - Smaller */}
                      <div className="flex items-center gap-0.5 shrink-0">
                        {/*
                          Keep feedback local to the row: delete shows spinner here,
                          while edit loading is handled in the modal submit button.
                        */}
                        {/* Edit button */}
                        <button
                          onClick={() => handleOpenEditDialog(item)}
                          disabled={isOrderPanelBusy}
                          className={cn(
                            "h-6 px-2 rounded flex items-center justify-center gap-1 transition-all text-[11px] font-medium",
                            isOrderPanelBusy
                              ? "bg-amber-50/70 text-amber-400 cursor-not-allowed"
                              : "bg-amber-50 text-amber-700 hover:bg-amber-100",
                          )}
                          title="Chỉnh sửa"
                        >
                          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 20h9" />
                            <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 18l-4 1 1-4 12.5-11.5z" />
                          </svg>
                          <span>Sửa</span>
                        </button>

                        {/* Delete button */}
                        <button
                          onClick={() => handleRemoveItem(item)}
                          disabled={isOrderPanelBusy}
                          className={cn(
                            "w-5 h-5 rounded flex items-center justify-center transition-all",
                            removingItemKey === item.key
                              ? "text-red-400 bg-red-50 cursor-wait"
                              : isOrderPanelBusy
                              ? "text-gray-300 bg-gray-50 cursor-not-allowed"
                              : "text-gray-400 hover:text-red-500 hover:bg-red-50",
                          )}
                          title="Xóa"
                        >
                          {removingItemKey === item.key ? (
                            <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                            </svg>
                          ) : (
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Details - Single line when possible */}
                    <div className="mt-1 space-y-0.5">
                      {(item.sugar || item.ice) && (
                        <div className="flex flex-wrap gap-1.5">
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

                      {/* Toppings - Inline */}
                      {item.toppingsText && (!item.apiOptions || item.apiOptions.length === 0) && (
                        <p className="text-[11px] leading-tight text-amber-800">
                          <span className="font-medium text-amber-700">Topping:</span>{" "}
                          <span>{item.toppingsText}</span>
                        </p>
                      )}

                      {item.apiOptions && item.apiOptions.length > 0 && (
                        (() => {
                          const toppingSummary = item.apiOptions
                            .map((opt) => {
                              const optId = opt.product_franchise_id;
                              if (!optId) return "";
                              const qty = opt.quantity ?? 0;
                              const optName =
                                String(
                                  (opt as any).product_name ??
                                  opt.product_name_snapshot ??
                                  opt.name ??
                                  toppingNameByOptionId.get(String(optId).trim()) ??
                                  "",
                                ).trim() || "Topping";
                              return `${optName} x${qty}`;
                            })
                            .filter(Boolean)
                            .join(", ");

                          if (!toppingSummary) return null;

                          return (
                            <p className="text-[11px] leading-tight text-amber-800">
                              <span className="font-medium text-amber-700">Topping:</span>{" "}
                              <span>{toppingSummary}</span>
                            </p>
                          );
                        })()
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

            }
          </div>
        </div>

        {/* Fixed footer (không nằm trong scroll) */}
        <div className="mx-4 mt-3 bg-gray-50 rounded-xl p-3.5 space-y-2 text-xs flex-shrink-0">
          <div className="flex justify-between text-gray-600">
            <span>Tạm tính ({itemCount} món)</span>
            <span>{fmt(pricingSummary.subtotalAmount)}</span>
          </div>
          {pricingSummary.promotionDiscount > 0 && (
            <div className="flex justify-between text-emerald-700">
              <span>
                Giảm khuyến mãi
                {formatDiscountTypeText(
                  sectionsWithItems.find((section) => section.pricing.promotionDiscount > 0)?.pricing.promotionType,
                  sectionsWithItems.find((section) => section.pricing.promotionDiscount > 0)?.pricing.promotionValue,
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
                  sectionsWithItems.find((section) => section.pricing.voucherDiscount > 0)?.pricing.voucherType,
                  sectionsWithItems.find((section) => section.pricing.voucherDiscount > 0)?.pricing.voucherValue,
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
            disabled={isOrderPanelBusy}
            onClick={() => !isOrderPanelBusy && handleCancelCart()}
            className={cn(
              "w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm transition-all duration-150",
              isOrderPanelBusy ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-100"
            )}
            title="Hủy giỏ hàng"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            {cancellingCart ? "Đang hủy..." : removingItemKey ? "Đang xử lý..." : "Hủy giỏ"}
          </button>
          <button disabled={!canCheckout || isOrderPanelBusy} onClick={() => canCheckout && !isOrderPanelBusy && handleCheckout()} className={cn("w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all duration-150", canCheckout && !isOrderPanelBusy ? "bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-white shadow-sm shadow-amber-200" : "bg-gray-100 text-gray-400 cursor-not-allowed")}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            {removingItemKey ? "Đang cập nhật giỏ..." : `Đặt hàng · ${fmt(total)}`}
          </button>
        </div>
      </div>
      {editingMenuProduct && editingItem && (
        <CartItemEditDialog
          product={editingMenuProduct}
          onClose={() => {
            setEditingItem(null);
            setPendingReorder(null);
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
            setPendingReorder((p) => (p ? { ...p, fingerprint: payload.fingerprint ?? null } : p));
          }}
        />
      )}
    </div>
  );
}

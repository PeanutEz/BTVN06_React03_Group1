import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useQueries, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useMenuCartStore } from "@/store/menu-cart.store";
import { useAuthStore } from "@/store/auth.store";
import { ROUTER_URL } from "@/routes/router.const";
import { PAYMENT_METHODS } from "@/const/payment-method.const";
import type { AppliedPromo } from "@/types/delivery.types";
import { cartClient, type CartApiData, type ApiCartItem, type CartItemOption } from "@/services/cart.client";
import { orderClient } from "@/services/order.client";
import { formatToppingsSummary, parseCartSelectionNote } from "@/utils/cartSelectionNote.util";
import type { IceLevel, SugarLevel } from "@/types/menu.types";
import { getCurrentCustomerProfile, updateCurrentCustomerProfile } from "@/services/customer.service";
import { promotionService } from "@/services/promotion.service";
import type { Promotion } from "@/models/promotion.model";
import { createMockCheckout } from "@/services/checkout-fallback.mock";

type CheckoutPaymentMethod = "COD" | "CARD";

const CHECKOUT_PAYMENT_OPTIONS: Array<{ value: CheckoutPaymentMethod; label: string; icon: string; description: string }> = [
  { value: PAYMENT_METHODS.COD, label: "Tiền mặt", icon: "💵", description: "Thanh toán khi nhận hàng" },
  { value: PAYMENT_METHODS.CARD, label: "VNPAY", icon: "🏦", description: "Thẻ/Internet Banking qua VNPAY" },
];

const fmt = (n: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n);
const fmtPercent = (n: number) => {
  const normalized = Number.isInteger(n) ? n : Number(n.toFixed(2));
  return `${normalized}%`;
};

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });

function getPromotionIdentity(promo: Promotion): string {
  const raw = promo as any;
  const id = raw?.id ?? raw?._id;
  if (id != null && String(id).trim()) return String(id);
  return [
    String(raw?.name ?? ""),
    String(raw?.start_date ?? ""),
    String(raw?.end_date ?? ""),
    String(raw?.type ?? ""),
    String(raw?.value ?? ""),
  ].join("|");
}
function parseNumberish(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value.replace(/,/g, "."));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function getPercentValueFromDiscount(type: unknown, value: unknown): number | undefined {
  const typeText = String(type ?? "").toUpperCase();
  if (!typeText.includes("PERCENT") && !typeText.includes("%")) return undefined;
  const parsedValue = parseNumberish(value);
  if (parsedValue == null || parsedValue <= 0) return undefined;
  return parsedValue;
}

function PromotionsBanner({
  franchiseName,
  promotions,
  isLoading,
  selectedPromotionId,
}: {
  franchiseName?: string;
  promotions: Promotion[];
  isLoading?: boolean;
  selectedPromotionId?: string;
}) {
  const active: Promotion[] = promotions ?? [];
  const [expanded, setExpanded] = useState(false);
  const appliedPromo = active.find(
    (promo) => !!selectedPromotionId && getPromotionIdentity(promo) === selectedPromotionId,
  );
  const appliedDiscountText = (() => {
    if (!appliedPromo) return null;
    const rawValue = Number((appliedPromo as any).value ?? 0);
    const promoValue = Number.isFinite(rawValue) ? rawValue : 0;
    const promoType = String((appliedPromo as any).type ?? "").toUpperCase();
    if (promoType.includes("PERCENT") || promoType.includes("%")) {
      return `Giảm ${promoValue}%`;
    }
    return `Giảm ${fmt(promoValue)}`;
  })();

  if (isLoading) return (
    <div className="px-4 pt-3">
      <div className="h-14 rounded-xl bg-amber-50 animate-pulse" />
    </div>
  );
  if (active.length === 0) return null;

  return (
    <div className="px-4 pt-3 pb-1">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100/70 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0 text-left">
          <span className="text-base">🎁</span>
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 truncate">
            {franchiseName
              ? `Khuyến mãi của ${franchiseName}`
              : "Khuyến mãi theo cửa hàng"}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] font-semibold text-amber-700 bg-white/80 px-2 py-0.5 rounded-full">
            {active.length} ưu đãi
          </span>
          <svg
            className={cn("w-4 h-4 text-amber-700 transition-transform", expanded && "rotate-180")}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {!expanded && appliedPromo && (
        <div className="mt-2 px-3 py-2 rounded-lg border border-emerald-200 bg-emerald-50 text-xs text-emerald-700">
          Đang áp dụng: <span className="font-semibold">{appliedPromo.name}</span>
          {appliedDiscountText ? <span> · {appliedDiscountText}</span> : null}
        </div>
      )}

      {expanded && (
        <div className="flex flex-col gap-2 mt-2">
          {active.map((promo) => {
            const promoIdentity = getPromotionIdentity(promo);
            const discountText =
              promo.type === "PERCENT"
                ? `Giảm ${promo.value}%`
                : `Giảm ${fmt(promo.value)}`;
            const isApplied = !!selectedPromotionId && promoIdentity === selectedPromotionId;
            return (
              <div
                key={promoIdentity}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl border",
                  isApplied
                    ? "bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200"
                    : "bg-gray-50 border-gray-200 opacity-85",
                )}
              >
                <div className={cn(
                  "shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-white text-base font-bold shadow-sm",
                  isApplied ? "bg-gradient-to-br from-amber-400 to-orange-500" : "bg-gray-300",
                )}>
                  {promo.type === "PERCENT" ? "%" : "₫"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn("text-sm font-semibold truncate", isApplied ? "text-gray-900" : "text-gray-700")}>{promo.name}</p>
                  <p className={cn("text-xs font-medium", isApplied ? "text-amber-700" : "text-gray-500")}>{discountText}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {fmtDate(promo.start_date)} – {promo.end_date ? fmtDate(promo.end_date) : "Không giới hạn"}
                  </p>
                </div>
                {isApplied ? (
                  <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                    Đang áp dụng
                  </span>
                ) : (
                  <span className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-200 text-gray-600">
                    Không áp dụng
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface DisplayItem {
  key: string;
  cartId: string;
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
  note?: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  apiOptions?: CartItemOption[];
}

interface CheckoutBlock {
  cartId: string;
  franchiseId?: string;
  franchiseName: string;
  items: DisplayItem[];
  subtotal: number;
  totalAmount: number;
  discountAmount: number;
  hasVoucher: boolean;
  voucherPercent?: number;
}

function getActivePromotions(promotions: Promotion[]): Promotion[] {
  const now = new Date();
  return (promotions ?? []).filter(
    (p) =>
      p.is_active &&
      !p.is_deleted &&
      new Date(p.start_date) <= now &&
      (!p.end_date || new Date(p.end_date) >= now),
  );
}

function pickBestPromotion(subtotal: number, items: DisplayItem[], promotions: Promotion[]): {
  selectedPromotionId?: string;
  discountAmount: number;
} {
  const eligiblePromotions = getActivePromotions(promotions);
  if (eligiblePromotions.length === 0) {
    return { selectedPromotionId: undefined, discountAmount: 0 };
  }

  let bestPromotionId: string | undefined;
  let bestDiscount = 0;

  for (const promo of eligiblePromotions) {
    const scopedProductFranchiseId = String((promo as any).product_franchise_id ?? "").trim();
    const hasValidProductScope = !!scopedProductFranchiseId && scopedProductFranchiseId !== "null" && scopedProductFranchiseId !== "undefined";

    const matchedScopedAmount = hasValidProductScope
      ? items
          .filter((item) => item.apiProductFranchiseId === scopedProductFranchiseId)
          .reduce((sum, item) => sum + item.lineTotal, 0)
      : 0;

    const eligibleAmount = hasValidProductScope
      ? (matchedScopedAmount > 0 ? matchedScopedAmount : subtotal)
      : subtotal;

    if (eligibleAmount <= 0) continue;

    const promoRawValue = (promo as any).value ?? (promo as any).discount_value ?? (promo as any).discountValue ?? 0;
    const promoValue = typeof promoRawValue === "string"
      ? Number.parseFloat(promoRawValue.replace(/,/g, "."))
      : Number(promoRawValue);
    if (!Number.isFinite(promoValue) || promoValue <= 0) continue;

    const promoType = String((promo as any).type ?? "").toUpperCase();
    const isPercent = promoType.includes("PERCENT") || promoType.includes("%");

    const rawDiscount = isPercent
      ? (eligibleAmount * promoValue) / 100
      : promoValue;

    const discount = Math.round(Math.max(0, Math.min(eligibleAmount, rawDiscount)));
    if (discount > bestDiscount) {
      bestDiscount = discount;
      bestPromotionId = getPromotionIdentity(promo);
    }
  }

  return {
    selectedPromotionId: bestPromotionId,
    discountAmount: bestDiscount,
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function getNestedRecord(
  source: Record<string, unknown> | null,
  key: string,
): Record<string, unknown> | null {
  return asRecord(source?.[key]);
}

function getUserId(value: unknown): string {
  const root = asRecord(value);
  const nestedUser = getNestedRecord(root, "user");
  return String(
    nestedUser?.id ??
    nestedUser?._id ??
    root?.id ??
    root?._id ??
    "",
  );
}

function getErrorMessage(error: unknown): string | null {
  const errorObj = asRecord(error);
  const response = getNestedRecord(errorObj, "response");
  const data = getNestedRecord(response, "data");
  const message = data?.message;
  if (typeof message !== "string" || !message.trim()) return null;
  const raw = message.trim();
  const lower = raw.toLowerCase();

  if (lower.includes("no data to update")) {
    return "Không có thông tin thay đổi để cập nhật.";
  }
  if (lower.includes("invalid phone") || lower.includes("phone is invalid")) {
    return "Số điện thoại không hợp lệ.";
  }
  if (lower.includes("customer not found")) {
    return "Không tìm thấy thông tin khách hàng.";
  }

  return raw;
}

function getProductName(item: ApiCartItem): string {
  const raw = item as Record<string, unknown>;
  const productObj = raw.product && typeof raw.product === "object" ? (raw.product as Record<string, unknown>) : null;
  const name =
    raw.product_name_snapshot ??
    raw.product_name ??
    raw.name ??
    raw.productName ??
    (productObj?.name) ??
    (productObj?.product_name) ??
    "";
  return String(name).trim() || "Sản phẩm";
}

function getItemImage(item: ApiCartItem): string {
  const raw = item as Record<string, unknown>;
  const productObj = raw.product && typeof raw.product === "object" ? (raw.product as Record<string, unknown>) : null;
  return String(
    raw.image_url ??
    raw.image ??
    productObj?.image_url ??
    productObj?.image ??
    ""
  ).trim();
}

function getItemPrice(item: ApiCartItem): number {
  const raw = item as Record<string, unknown>;
  const v = raw.price_snapshot ?? raw.price ?? (raw as ApiCartItem).price_snapshot ?? (raw as ApiCartItem).price;
  return Number(v) >= 0 ? Number(v) : 0;
}

function apiCartToDisplayItems(cartId: string, apiCart: CartApiData | null): DisplayItem[] {
  if (!apiCart) return [];
  const apiCartRaw = apiCart as Record<string, unknown>;
  const cartItems = apiCartRaw.cart_items;
  const rawItems = apiCart.items ?? (Array.isArray(cartItems) ? (cartItems as ApiCartItem[]) : []);
  if (!Array.isArray(rawItems) || rawItems.length === 0) return [];
  const franchise = getNestedRecord(apiCartRaw, "franchise");
  const franchiseName =
    apiCart.franchise_name ?? (typeof franchise?.name === "string" ? franchise.name : undefined) ?? "Chi nhánh";
  const franchiseId = apiCart.franchise_id ? String(apiCart.franchise_id) : undefined;
  const seen = new Set<string>();
  const result: DisplayItem[] = [];
  for (let idx = 0; idx < (rawItems as ApiCartItem[]).length; idx++) {
    const item = (rawItems as ApiCartItem[])[idx];
    const raw = item as Record<string, unknown>;
    const productObj = raw.product && typeof raw.product === "object" ? (raw.product as Record<string, unknown>) : null;
    const itemId = raw._id ?? raw.id ?? raw.cart_item_id ?? raw.cartItemId ?? `idx-${idx}`;
    const uniq = `${cartId}-${itemId}`;
    if (seen.has(uniq)) continue;
    seen.add(uniq);
    const qty = item.quantity ?? 1;
    const price = getItemPrice(item);
    const parsed = parseCartSelectionNote(String(item.note ?? ""));
    const apiItemId = raw._id ?? raw.id ?? raw.cart_item_id ?? raw.cartItemId;
    const apiProductId = raw.product_id != null ? String(raw.product_id) : (productObj?.id != null ? String(productObj.id) : undefined);
    const apiProductFranchiseId = raw.product_franchise_id ? String(raw.product_franchise_id) : undefined;
    result.push({
      key: uniq,
      cartId,
      apiItemId: apiItemId != null ? String(apiItemId) : undefined,
      apiProductId: apiProductId ?? undefined,
      apiProductFranchiseId: apiProductFranchiseId ?? undefined,
      apiFranchiseId: franchiseId,
      name: getProductName(item),
      franchiseName:
        (typeof raw.franchise_name === "string" ? raw.franchise_name : undefined) ??
        (typeof raw.franchiseName === "string" ? raw.franchiseName : undefined) ??
        franchiseName,
      image: getItemImage(item),
      size: item.size,
      sugar: parsed.sugar,
      ice: parsed.ice,
      toppingsText: formatToppingsSummary(parsed.toppings),
      toppingsParsed: parsed.toppings,
      note: parsed.userNote ?? (item.note ? String(item.note) : undefined),
      quantity: qty,
      unitPrice: price,
      lineTotal: (typeof raw.line_total === "number" ? raw.line_total : undefined) ?? price * qty,
      apiOptions: item.options as CartItemOption[] | undefined,
    });
  }
  return result;
}

export default function MenuCheckoutPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const setCarts = useMenuCartStore((s) => s.setCarts);
  const clearCart = useMenuCartStore((s) => s.clearCart);
  const user = useAuthStore((s) => s.user);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);

  const customerId = getUserId(user);

  // QueryKey đơn giản để sync với MenuOrderPanel
  const { data: cartsData, isLoading: cartsLoading } = useQuery({
    queryKey: ["carts-by-customer", customerId],
    queryFn: () => cartClient.getCartsByCustomerId(customerId, { status: "ACTIVE" }),
    enabled: !!customerId && isLoggedIn,
    staleTime: 0,
  });

  // Derive cart entries from API; dedupe by cartId so same cart is not shown twice
  const cartEntries = useMemo(() => {
    const raw = cartsData;
    const rawObj = asRecord(raw);
    const dataList = rawObj?.data;
    const cartsList = rawObj?.carts;
    const list = Array.isArray(raw)
      ? raw
      : Array.isArray(dataList)
        ? dataList
        : Array.isArray(cartsList)
          ? cartsList
          : [];
    const withIds = (list as CartApiData[]).map((c) => ({
      cartId: String(c._id ?? c.id ?? ""),
      franchise_id: c.franchise_id,
      franchise_name:
        c.franchise_name ??
        (() => {
          const cRaw = c as Record<string, unknown>;
          const franchise = getNestedRecord(cRaw, "franchise");
          return typeof franchise?.name === "string" ? franchise.name : undefined;
        })(),
    })).filter((e) => e.cartId);
    const seen = new Set<string>();
    return withIds.filter((e) => {
      if (seen.has(e.cartId)) return false;
      seen.add(e.cartId);
      return true;
    });
  }, [cartsData]);

  useEffect(() => {
    // Khi load/xử lý checkout theo API:
    // - Nếu còn carts ACTIVE => cập nhật danh sách cart trong store.
    // - Nếu hết carts ACTIVE => clear local để tránh fallback hiển thị dữ liệu cũ.
    if (cartsLoading) return;
    if (cartEntries.length > 0) setCarts(cartEntries);
    else clearCart();
  }, [cartEntries, setCarts, clearCart, cartsLoading]);

  // Fetch detail for each cart với query key đơn giản để sync với MenuOrderPanel
  const cartDetails = useQueries({
    queries: cartEntries.map((entry) => ({
      queryKey: ["cart-detail", entry.cartId],
      queryFn: () => cartClient.getCartDetail(entry.cartId),
      enabled: !!entry.cartId && isLoggedIn,
      staleTime: 0,
    })),
  });

  // Build blocks CHỈ từ API getCartDetail (mỗi cart) — không dùng dữ liệu từ list để đảm bảo đúng sản phẩm trong giỏ
  const blocks: CheckoutBlock[] = cartEntries.map((entry, idx) => {
    const detailFromQuery = cartDetails[idx]?.data as CartApiData | undefined;
    const cartsRaw = asRecord(cartsData);
    const dataList = cartsRaw?.data;
    const listSource = Array.isArray(cartsData)
      ? cartsData
      : Array.isArray(dataList)
        ? dataList
        : [];
    const detailFromList = listSource[idx] as CartApiData | undefined;
    const detail = detailFromQuery ?? detailFromList;
    const items = apiCartToDisplayItems(entry.cartId, detailFromQuery ?? null);
    // ✅ Ensure numbers: use API fields with fallback to calculations
    const subtotal: number = typeof detail?.subtotal_amount === "number"
      ? detail.subtotal_amount
      : items.reduce((s, i) => s + i.lineTotal, 0);
    const discountAmount: number = typeof detail?.voucher_discount === "number"
      ? detail.voucher_discount
      : 0;
    const totalAmount: number = typeof detail?.final_amount === "number"
      ? detail.final_amount
      : Math.max(0, subtotal - discountAmount);    const detailRaw = detail ? (detail as Record<string, unknown>) : null;
    const detailFranchise = getNestedRecord(detailRaw, "franchise");
    const detailVoucher = getNestedRecord(detailRaw, "voucher");
    const voucherType = detailVoucher?.type ?? detailRaw?.voucher_type;
    const voucherValue = detailVoucher?.value ?? detailRaw?.voucher_value;
    const voucherPercentFromType = getPercentValueFromDiscount(voucherType, voucherValue);
    const voucherPercent =
      voucherPercentFromType ??
      parseNumberish(detailRaw?.voucher_percent) ??
      parseNumberish(detailRaw?.voucher_discount_percent) ??
      undefined;
    const voucherCode = detailRaw?.voucher_code;
    const hasVoucher = !!(detail?.voucher ?? (typeof voucherCode === "string" ? voucherCode : undefined));
    const franchiseName =
      entry.franchise_name ??
      detail?.franchise_name ??
      (typeof detailFranchise?.name === "string" ? detailFranchise.name : undefined) ??
      `Chi nhánh ${idx + 1}`;
    // Resolve franchiseId: try entry first, then detail, then nested franchise object
    const franchiseId =
      (entry.franchise_id ? String(entry.franchise_id) : undefined) ??
      (detail?.franchise_id ? String(detail.franchise_id) : undefined) ??
      (detailFranchise?._id ? String(detailFranchise._id) : undefined) ??
      (detailFranchise?.id ? String(detailFranchise.id) : undefined);
    return {
      cartId: entry.cartId,
      franchiseId,
      franchiseName,
      items,
      subtotal,
      totalAmount,
      discountAmount,
      hasVoucher,
      voucherPercent,
    };
  }).filter((b) => b.items.length > 0);

  const promotionQueries = useQueries({
    queries: blocks.map((block) => ({
      queryKey: ["checkout-promotions", block.franchiseId],
      queryFn: () => promotionService.getPromotionsByFranchise(block.franchiseId!),
      enabled: !!block.franchiseId,
      staleTime: 60_000,
    })),
  });

  const pricingByCartId = useMemo(() => {
    const map: Record<string, {
      promotionAmount: number;
      voucherAmount: number;
      voucherPercent?: number;
      promotionPercent?: number;
      totalDiscount: number;
      finalTotal: number;
      promotions: Promotion[];
      promotionsLoading: boolean;
      selectedPromotionId?: string;
    }> = {};

    blocks.forEach((block, idx) => {
      const rawPromotions = (promotionQueries[idx]?.data ?? []) as Promotion[];
      const activePromotions = getActivePromotions(rawPromotions);
      const bestPromotion = pickBestPromotion(block.subtotal, block.items, activePromotions);
      const promoDiscount = bestPromotion.discountAmount;
      const selectedPromotion = activePromotions.find(
        (promo) => !!bestPromotion.selectedPromotionId && getPromotionIdentity(promo) === bestPromotion.selectedPromotionId,
      );
      const promotionPercent = selectedPromotion
        ? getPercentValueFromDiscount((selectedPromotion as any).type, (selectedPromotion as any).value)
        : undefined;

      const effectivePromoDiscount = promoDiscount;
      const totalDiscount = block.discountAmount + effectivePromoDiscount;
      const finalTotal = Math.max(0, block.subtotal - totalDiscount);

      map[block.cartId] = {
        promotionAmount: effectivePromoDiscount,
        voucherAmount: block.discountAmount,
        voucherPercent: block.voucherPercent,
        promotionPercent,
        totalDiscount,
        finalTotal,
        promotions: activePromotions,
        promotionsLoading: !!promotionQueries[idx]?.isLoading,
        selectedPromotionId: bestPromotion.selectedPromotionId,
      };
    });

    return map;
  }, [blocks, promotionQueries]);


  // Per-block voucher state: cartId -> { input, applied, error, loading }
  const [promoByCartId, setPromoByCartId] = useState<Record<string, { input: string; applied: AppliedPromo | null; error: string; loading: boolean }>>({});
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<CheckoutPaymentMethod>(PAYMENT_METHODS.COD);

  const getPromoState = (cartId: string) => promoByCartId[cartId] ?? { input: "", applied: null, error: "", loading: false };
  const setPromoState = (cartId: string, patch: Partial<{ input: string; applied: AppliedPromo | null; error: string; loading: boolean }>) => {
    setPromoByCartId((prev) => ({ ...prev, [cartId]: { ...getPromoState(cartId), ...patch } }));
  };
  const [form, setFormState] = useState({
    name: "",
    phone: "",
    address: "",
  });

  // Load customer profile and pre-fill form
  const { data: customerProfile, isLoading: profileLoading } = useQuery({
    queryKey: ["customer-profile"],
    queryFn: getCurrentCustomerProfile,
    enabled: isLoggedIn,
    retry: 1,
  });

  // Pre-fill form when customer profile is loaded
  useEffect(() => {
    if (customerProfile) {
      setFormState((prev) => ({
        ...prev,
        name: customerProfile.name || "",
        phone: customerProfile.phone || "",
        address: customerProfile.address || "",
      }));
    }
  }, [customerProfile]);

  // Điều khoản theo từng chi nhánh: cartId -> đã đồng ý
  const [termsByCartId, setTermsByCartId] = useState<Record<string, boolean>>({});
  const setTermsForCart = (cartId: string, accepted: boolean) => {
    setTermsByCartId((prev) => ({ ...prev, [cartId]: accepted }));
  };
  const isTermsAccepted = (cartId: string) => !!termsByCartId[cartId];
  const [errors, setErrors] = useState<Record<string, string>>({});  const [orderingCartId, setOrderingCartId] = useState<string | null>(null);

  function setField<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setFormState((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => { const n = { ...e }; delete n[key as string]; return n; });
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Vui lòng nhập họ tên";
    if (!form.phone.trim()) e.phone = "Vui lòng nhập số điện thoại";
    else if (!/^(0[3-9])\d{8}$/.test(form.phone.trim())) e.phone = "Số điện thoại không hợp lệ (VD: 0901234567)";
    if (!form.address.trim()) e.address = "Vui lòng nhập địa chỉ giao hàng";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function applyPromoForCart(cartId: string) {
    const state = getPromoState(cartId);
    if (!state.input.trim()) return;
    setPromoState(cartId, { loading: true, error: "" });
    try {
      await cartClient.applyVoucher(cartId, state.input.trim());
      const voucherCode = state.input.trim().toUpperCase();
      setPromoState(cartId, {
        input: "",
        applied: { code: voucherCode, label: voucherCode },
        error: "",
        loading: false,
      });
      // ✅ Invalidate cart-detail to refetch pricing with discount applied
      queryClient.invalidateQueries({ queryKey: ["cart-detail", cartId] });
      toast.success("Áp dụng mã thành công!");
    } catch {
      setPromoState(cartId, { error: "Mã giảm giá không hợp lệ hoặc đã hết hạn", loading: false });
    }
  }

  async function removePromoForCart(cartId: string) {
    setPromoState(cartId, { applied: null, error: "" });
    try {
      await cartClient.removeVoucher(cartId);
      queryClient.invalidateQueries({ queryKey: ["cart-detail", cartId] });
    } catch { /* ignore */ }
  }

  async function handleRemoveItem(item: DisplayItem) {
    if (!item.apiItemId) {
      toast.error("Không thể xóa. Sản phẩm chưa đồng bộ với server.");
      console.warn("Item missing apiItemId:", item);
      return;
    }
    try {
      await cartClient.deleteCartItem(item.apiItemId);
      queryClient.invalidateQueries({ queryKey: ["cart-detail", item.cartId] });
      queryClient.invalidateQueries({ queryKey: ["carts-by-customer", customerId] });
      toast.success("Đã xóa sản phẩm khỏi giỏ hàng");
    } catch (error) {
      console.error("Remove item failed:", error);
      toast.error("Không thể xóa sản phẩm");
    }
  }

  async function handleOrderOneBlock(block: CheckoutBlock) {
    const { cartId, franchiseName } = block;
    if (!validate() || orderingCartId || !isTermsAccepted(cartId)) return;

    setOrderingCartId(cartId);
    try {
      try {
        await updateCurrentCustomerProfile({
          name: form.name.trim(),
          phone: form.phone.trim(),
          address: form.address.trim(),
        });
        queryClient.invalidateQueries({ queryKey: ["customer-profile"] });
      } catch (profileError: unknown) {
        const profileMsg =
          getErrorMessage(profileError) ??
          (profileError instanceof Error && profileError.message.trim()
            ? profileError.message.trim()
            : null);
        const normalizedProfileMsg = (profileMsg ?? "").toLowerCase();

        // Do not block checkout when profile payload has no effective changes.
        if (
          normalizedProfileMsg.includes("không có thông tin thay đổi") ||
          normalizedProfileMsg.includes("no data to update")
        ) {
          // continue checkout flow
        } else {
          toast.error(profileMsg ?? "Không thể cập nhật thông tin khách hàng. Vui lòng thử lại.");
          return;
        }
      }

      const paymentMethod = selectedPaymentMethod;
      const bankName = paymentMethod === PAYMENT_METHODS.CARD ? "VNPAY" : undefined;
      // Checkout endpoint in current backend still expects BANK for card gateway flows.
      // If we send CARD directly, backend may silently fallback to COD.
      const checkoutPaymentMethod = paymentMethod === PAYMENT_METHODS.CARD ? "BANK" : paymentMethod;

      const updateCartBody: Parameters<typeof cartClient.updateCart>[1] = {
        phone: form.phone.trim(),
        address: form.address.trim() || undefined,
        payment_method: checkoutPaymentMethod,
        bank_name: bankName,
      };

      const checkoutBody: Parameters<typeof cartClient.checkoutCart>[1] = {
        payment_method: checkoutPaymentMethod,
        bank_name: bankName,
      };

      let orderId = "";

      try {
        await cartClient.updateCart(cartId, updateCartBody);
        await cartClient.checkoutCart(cartId, checkoutBody);
        const order = await orderClient.getOrderByCartId(cartId);
        orderId = String(order?._id ?? order?.id ?? "");
      } catch {
        const mock = createMockCheckout({
          cartId,
          franchiseName,
          customerName: form.name.trim(),
          customerPhone: form.phone.trim(),
          subtotalAmount: block.subtotal,
          finalAmount: block.totalAmount,
          paymentMethod,
          items: block.items.map((item) => ({
            name: item.name,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            lineTotal: item.lineTotal,
          })),
        });
        orderId = String(mock.order._id ?? mock.order.id ?? "");
        toast.info("API checkout chưa sẵn sàng, hệ thống đã chuyển sang mock payment.");
      }

      toast.success(`Đã đặt đơn tại ${franchiseName}`);
      if (orderId) {
        // Invalidate sau khi navigate để tránh flash "giỏ trống"
        const targetPath = paymentMethod === PAYMENT_METHODS.COD
          ? ROUTER_URL.PAYMENT_SUCCESS.replace(":orderId", String(orderId))
          : ROUTER_URL.PAYMENT_PROCESS.replace(":orderId", String(orderId));
        navigate(targetPath);
        queryClient.invalidateQueries({ queryKey: ["carts-by-customer", customerId] });
        queryClient.invalidateQueries({ queryKey: ["cart-detail", cartId] });
        return;
      }

      toast.error("Không lấy được thông tin đơn hàng sau khi checkout.");
    } catch (error: unknown) {
      const msg = getErrorMessage(error) ?? "Không thể đặt hàng. Vui lòng thử lại.";
      toast.error(msg);
    } finally {
      setOrderingCartId(null);
    }
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center max-w-sm">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Vui lòng đăng nhập</h2>
          <Link to={ROUTER_URL.LOGIN} className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-6 py-3 rounded-xl font-semibold transition-all">
            Đăng nhập
          </Link>
        </div>
      </div>
    );
  }

  const detailsLoading = cartEntries.length > 0 && cartDetails.some((q) => q.isLoading);
  if ((cartsLoading || detailsLoading || profileLoading) && blocks.length === 0 && !customerProfile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-gray-500">Đang tải thông tin...</p>
        </div>
      </div>
    );
  }

  if (blocks.length === 0) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center max-w-sm">
          <div className="text-6xl mb-4">🛒</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Không có đơn nào để thanh toán</h2>
          <p className="text-gray-500 text-sm mb-4">Thêm món từ menu hoặc kiểm tra giỏ hàng của bạn.</p>
          <Link to={ROUTER_URL.MENU} className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-6 py-3 rounded-xl font-semibold transition-all">
            Quay lại Menu
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8 py-8">
        <nav className="flex items-center gap-2 text-sm text-gray-400 mb-6">
          <Link to={ROUTER_URL.HOME} className="hover:text-gray-600">Trang chủ</Link>
          <span>/</span>
          <Link to={ROUTER_URL.MENU} className="hover:text-gray-600">Menu</Link>
          <span>/</span>
          <span className="text-gray-900 font-medium">Thanh toán</span>
        </nav>        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">Xác nhận đơn hàng</h1>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-6 items-start">

        {/* Customer Information Form */}
        <section className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6 space-y-5 mb-6 shadow-sm xl:mb-0 xl:order-2 xl:self-start xl:sticky xl:top-[10.5rem] xl:max-h-[calc(100vh-11.5rem)] xl:overflow-y-auto xl:pr-1">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex items-start gap-2.5 min-w-0">
              <div className="w-8 h-8 bg-gradient-to-r from-amber-500 to-amber-600 rounded-xl flex items-center justify-center">
                <svg className="w-4.5 h-4.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div className="min-w-0">
                <h2 className="text-base sm:text-lg font-bold text-gray-900 leading-tight">Thông tin khách hàng</h2>
                {customerProfile && (
                  <span className="inline-flex mt-1 text-[11px] text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                    ✓ Đã tải từ profile
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
              {profileLoading ? (
                // Loading skeletons
                <>
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
                    <div className="h-10 bg-gray-200 rounded-xl animate-pulse"></div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-28 animate-pulse"></div>
                    <div className="h-10 bg-gray-200 rounded-xl animate-pulse"></div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div>
                    <div className="h-10 bg-gray-200 rounded-xl animate-pulse"></div>
                  </div>
                </>
              ) : (
                // Actual form fields
                <>
                  <div>
                    <div className="mb-1.5">
                      <label className="block text-sm font-medium text-gray-700 leading-tight">
                        Họ và tên <span className="text-red-500 ml-0.5">*</span>
                      </label>
                    </div>
                    <input
                      type="text"
                      placeholder="Nguyễn Văn A"
                      value={form.name}
                      onChange={(e) => setField("name", (e.target as HTMLInputElement).value)}
                      className={cn(
                        "w-full px-4 py-2.5 rounded-xl border text-sm transition-all outline-none focus:ring-2",
                        errors.name ? "border-red-300 focus:ring-red-200 bg-red-50" : "border-gray-200 focus:ring-amber-300 focus:border-amber-400 bg-white",
                      )}
                    />
                    {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
                  </div>

                  <div>
                    <div className="mb-1.5">
                      <label className="block text-sm font-medium text-gray-700 leading-tight">
                        Số điện thoại <span className="text-red-500 ml-0.5">*</span>
                      </label>
                    </div>
                    <input
                      type="tel"
                      placeholder="0901234567"
                      value={form.phone}
                      onChange={(e) => setField("phone", (e.target as HTMLInputElement).value)}
                      className={cn(
                        "w-full px-4 py-2.5 rounded-xl border text-sm transition-all outline-none focus:ring-2",
                        errors.phone ? "border-red-300 focus:ring-red-200 bg-red-50" : "border-gray-200 focus:ring-amber-300 focus:border-amber-400 bg-white",
                      )}
                    />
                    {errors.phone && <p className="mt-1 text-xs text-red-500">{errors.phone}</p>}
                  </div>

                  <div>
                    <div className="mb-1.5">
                      <label className="block text-sm font-medium text-gray-700 leading-tight">
                        Địa chỉ giao hàng <span className="text-red-500 ml-0.5">*</span>
                      </label>
                    </div>
                    <input
                      type="text"
                      placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành..."
                      value={form.address}
                      onChange={(e) => setField("address", e.target.value)}
                      className={cn(
                        "w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition-all bg-white focus:ring-2",
                        errors.address ? "border-red-300 focus:ring-red-200 bg-red-50" : "border-gray-200 focus:ring-amber-300 focus:border-amber-400",
                      )}
                    />
                    {errors.address && <p className="mt-1 text-xs text-red-500">{errors.address}</p>}
                  </div>

                  <div className="pt-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-base">💳</span>
                      <h3 className="text-sm font-semibold text-gray-900">Phương thức thanh toán</h3>
                    </div>
                    <p className="text-[11px] text-gray-500 mb-2">Phương thức này sẽ áp dụng cho tất cả đơn hàng bên trái</p>
                    <div className="grid grid-cols-1 gap-2">
                      {CHECKOUT_PAYMENT_OPTIONS.map((opt) => {
                        const active = selectedPaymentMethod === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setSelectedPaymentMethod(opt.value)}
                            className={cn(
                              "rounded-xl border px-3 py-2.5 text-left transition-all",
                              active
                                ? "border-amber-400 bg-amber-50"
                                : "border-gray-200 bg-white hover:border-amber-200 hover:bg-amber-50/40",
                            )}
                          >
                            <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                              <span>{opt.icon}</span>
                              <span>{opt.label}</span>
                            </div>
                            <p className="mt-0.5 text-[11px] text-gray-500">{opt.description}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                </>
              )}
          </div>
        </section>

        {/* One block per franchise */}
        <div className="space-y-8 xl:order-1">
          {blocks.map((block) => {
            const promo = getPromoState(block.cartId);
            const missingCustomerFields: string[] = [];
            if (!form.name.trim()) missingCustomerFields.push("họ tên");
            if (!/^(0[3-9])\d{8}$/.test(form.phone.trim())) missingCustomerFields.push("số điện thoại hợp lệ");
            if (!form.address.trim()) missingCustomerFields.push("địa chỉ giao hàng");
            const hasCompleteCustomerInfo =
              !!form.name.trim() &&
              /^(0[3-9])\d{8}$/.test(form.phone.trim()) &&
              !!form.address.trim();
            const canPlace = block.items.length > 0 && isTermsAccepted(block.cartId) && hasCompleteCustomerInfo;
            const isOrdering = orderingCartId === block.cartId;
            const pricing = pricingByCartId[block.cartId] ?? {
              promotionAmount: 0,
              voucherAmount: block.discountAmount,
              voucherPercent: block.voucherPercent,
              promotionPercent: undefined,
              totalDiscount: block.discountAmount,
              finalTotal: block.totalAmount,
              promotions: [] as Promotion[],
              promotionsLoading: false,
              selectedPromotionId: undefined,
            };

            return (
              <div key={block.cartId} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-4 bg-gray-50/50">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🏪</span>
                    <h2 className="font-semibold text-gray-900">{block.franchiseName}</h2>
                  </div>
                  <button
                    onClick={() => navigate(ROUTER_URL.MENU)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-lg transition-all"
                    title="Thêm sản phẩm từ menu"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Thêm món
                  </button>
                </div>

                <div className="divide-y divide-gray-100">
                  {block.items.map((item) => (
                    <div key={item.key} className="px-4 py-4 flex gap-4 items-start">
                      {/* Product Image */}
                      {item.image ? (
                        <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 shrink-0 border border-gray-100">
                          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-amber-50 to-amber-100 flex items-center justify-center text-2xl shrink-0 border border-amber-200">
                          🍵
                        </div>
                      )}

                      {/* Product Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <h3 className="font-semibold text-gray-900 text-base truncate">{item.name}</h3>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => handleRemoveItem(item)}
                              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
                              title="Xóa sản phẩm"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>

                        {/* Product Options */}
                        {(item.size || item.sugar || item.ice || item.toppingsText || item.note) && (
                          <div className="mb-3">
                            <div className="flex flex-wrap gap-1.5 mb-2">
                              {item.size && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium">
                                  📏 Size {item.size}
                                </span>
                              )}
                              {item.sugar && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-50 text-purple-700 rounded-lg text-xs font-medium">
                                  🍯 Đường {item.sugar}
                                </span>
                              )}
                              {item.ice && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-cyan-50 text-cyan-700 rounded-lg text-xs font-medium">
                                  🧊 {item.ice}
                                </span>
                              )}
                              {item.toppingsText && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 rounded-lg text-xs font-medium">
                                  🧋 {item.toppingsText}
                                </span>
                              )}
                            </div>
                            {item.note && (
                              <p className="text-xs text-gray-500 italic bg-gray-50 px-2.5 py-1.5 rounded-lg">
                                💭 Ghi chú: {item.note}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Quantity and Price */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">Số lượng:</span>
                            <span className="px-3 py-1.5 bg-emerald-100 text-emerald-800 rounded-lg text-sm font-bold">
                              {item.quantity}
                            </span>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-amber-700">{fmt(item.lineTotal)}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Promotions Banner */}
                {block.franchiseId && (
                  <PromotionsBanner
                    franchiseName={block.franchiseName}
                    promotions={pricing.promotions}
                    isLoading={pricing.promotionsLoading}
                    selectedPromotionId={pricing.selectedPromotionId}
                  />
                )}

                {/* Voucher Section */}
                <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/30">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">🎫</span>
                    <h3 className="font-medium text-gray-900 text-sm">Mã giảm giá</h3>
                  </div>

                  {promo.applied ? (
                    <div className="flex items-center justify-between p-3 bg-emerald-100 border border-emerald-200 rounded-lg">
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-600 text-lg">✓</span>
                        <span className="font-semibold text-emerald-800 text-sm">{promo.applied.code}</span>
                      </div>
                      <button
                        onClick={() => removePromoForCart(block.cartId)}
                        className="text-xs text-red-600 hover:text-red-700 font-medium"
                      >
                        Hủy
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        value={promo.input}
                        onChange={(e) => {
                          setPromoState(block.cartId, { input: e.target.value.toUpperCase(), error: "" });
                        }}
                        onKeyDown={(e) => e.key === "Enter" && void applyPromoForCart(block.cartId)}
                        placeholder="Nhập mã..."
                        className={cn(
                          "flex-1 px-3 py-2 rounded-lg border text-xs outline-none transition-all uppercase font-mono",
                          promo.error
                            ? "border-red-300 bg-red-50"
                            : "border-gray-200 focus:ring-1 focus:ring-emerald-300 bg-white"
                        )}
                      />
                      <button
                        onClick={() => void applyPromoForCart(block.cartId)}
                        disabled={promo.loading || !promo.input.trim()}
                        className={cn(
                          "px-4 py-2 rounded-lg text-xs font-medium transition-all",
                          promo.loading || !promo.input.trim()
                            ? "bg-gray-200 text-gray-400"
                            : "bg-emerald-500 hover:bg-emerald-600 text-white"
                        )}
                      >
                        {promo.loading ? "..." : "Áp dụng"}
                      </button>
                    </div>
                  )}

                  {promo.error && (
                    <p className="mt-2 text-xs text-red-600 flex items-center gap-1">
                      <span>⚠️</span>
                      {promo.error}
                    </p>
                  )}
                </div>

                <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50">
                  <label className="flex items-start gap-2.5 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={isTermsAccepted(block.cartId)}
                      onChange={(e) => setTermsForCart(block.cartId, e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded border-gray-300 accent-amber-500 shrink-0"
                    />
                    <span className="text-xs text-gray-500 leading-relaxed">
                      Tôi đã đọc, hiểu và đồng ý với các điều khoản, điều kiện và chính sách liên quan
                    </span>
                  </label>
                  {!isTermsAccepted(block.cartId) && (
                    <p className="mt-2 text-xs text-amber-700">⚠️ Vui lòng đồng ý điều khoản để tiếp tục</p>
                  )}
                </div>

                {/* Pricing Breakdown: Subtotal → Discount → Final Total */}
                <div className="px-5 py-4 bg-gray-50 border-t border-gray-100">
                  <div className="space-y-2.5 text-sm mb-4">
                    {/* Subtotal */}
                    <div className="flex justify-between text-gray-600">
                      <span>Tạm tính ({block.items.reduce((s, i) => s + i.quantity, 0)} món)</span>
                      <span>{fmt(block.subtotal)}</span>
                    </div>

                    {/* Discount (if applied) */}
                    {pricing.voucherAmount > 0 && (
                      <div className="flex justify-between text-red-600 font-semibold">
                        <span>
                          Giảm voucher
                          {typeof pricing.voucherPercent === "number" && pricing.voucherPercent > 0
                            ? ` (${fmtPercent(pricing.voucherPercent)})`
                            : ""}
                        </span>
                        <span>-{fmt(pricing.voucherAmount)}</span>
                      </div>
                    )}

                    {pricing.promotionAmount > 0 && (
                      <div className="flex justify-between text-emerald-700 font-semibold">
                        <span>
                          Giảm khuyến mãi
                          {typeof pricing.promotionPercent === "number" && pricing.promotionPercent > 0
                            ? ` (${fmtPercent(pricing.promotionPercent)})`
                            : ""}
                        </span>
                        <span>-{fmt(pricing.promotionAmount)}</span>
                      </div>
                    )}

                    {/* Separator */}
                    <div className="h-px bg-gray-200" />

                    {/* Final Total (from API: already includes discount deduction) */}
                    <div className="flex justify-between font-bold text-base text-gray-900">
                      <span>Tổng cộng</span>
                      <span className="text-amber-600">{fmt(pricing.finalTotal)}</span>
                    </div>
                  </div>

                  {!hasCompleteCustomerInfo && (
                    <p className="mb-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                      ⚠️ Vui lòng điền đầy đủ thông tin khách hàng ({missingCustomerFields.join(", ")}) để xác nhận đơn.
                    </p>
                  )}

                  {/* Confirm Order Button */}
                  <button
                    onClick={() => handleOrderOneBlock(block)}
                    disabled={isOrdering || !canPlace}
                    className={cn(
                      "w-full px-6 py-3 rounded-xl font-semibold text-sm transition-all",
                      isOrdering || !canPlace
                        ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                        : "bg-amber-500 hover:bg-amber-600 text-white",
                    )}
                  >
                    {isOrdering ? "Đang xử lý..." : `Xác nhận đơn – ${block.franchiseName}`}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        </div>
      </div>
    </div>
  );
}

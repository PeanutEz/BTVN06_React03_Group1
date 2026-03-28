import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LOCAL_STORAGE_KEY } from "@/const/data.const";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store";
import { useLoadingStore } from "@/store/loading.store";
import { useManagerFranchiseId } from "@/hooks/useManagerFranchiseId";
import { clientService } from "@/services/client.service";
import { posService, type POSCustomerSearchResult } from "@/services/pos.service";
import { paymentClient, type PaymentData } from "@/services/payment.client";
import type { ApiCustomer } from "@/services/customer.service";
import { cartClient, formatDiscountTypeText, getCartItemId, getCartItemImage, getCartItemLineTotal, getCartItemName, getCartItemNote, getCartItemProductId, getCartItemSize, getCartItemUnitPrice, getCartItems, getCartPricingSummary, type CartItemOption, type CartPricingSummary } from "@/services/cart.client";
import { buildStaticPaymentQr } from "@/utils/payment-qr.util";
import { formatCartOptionsSummary, formatToppingsSummary, parseCartSelectionNote, stripGeneratedCartNote } from "@/utils/cartSelectionNote.util";
import { getItem, removeItem, setItem, showError, showSuccess } from "@/utils";
import type { IceLevel, MenuProduct, SugarLevel, Topping } from "@/types/menu.types";
import type { ClientFranchiseItem } from "@/models/store.model";
import type { ClientProductListItem } from "@/models/product.model";
import MenuProductModal from "@/components/menu/MenuProductModal";
import CartItemEditDialog from "@/components/menu/CartItemEditDialog";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ROUTER_URL } from "@/routes/router.const";

type StaffPaymentMethod = "CASH" | "VNPAY";

type StaffCartItemView = {
  id: string;
  name: string;
  image: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  size?: string;
  sugar?: SugarLevel;
  ice?: IceLevel;
  toppingsText?: string;
  note?: string;
  apiProductId?: string;
  apiProductFranchiseId?: string;
  apiCategoryName?: string;
  apiOptions: CartItemOption[];
  editToppings: Topping[];
  isLocal?: boolean;
  draftPayload?: StaffDraftCartPayload;
  draftSignature?: string;
};

type StaffDraftCartPayload = {
  productFranchiseId: string;
  quantity: number;
  note?: string;
  options?: Array<{ product_franchise_id: string; quantity: number }>;
};

type StaffCartEditState = {
  menuProduct: MenuProduct;
  apiItemId: string;
  cartId: string;
  initialQuantity: number;
  initialApiOptions: CartItemOption[];
  initialSelection: {
    size?: string;
    productFranchiseId?: string;
    sugar?: SugarLevel;
    ice?: IceLevel;
    toppings?: Topping[];
    note?: string;
  };
};

type PaymentModalState = {
  open: boolean;
  orderId: string;
  orderCode: string;
  paymentId: string;
  amount: number;
  method: StaffPaymentMethod;
  providerTxnId: string;
};

const EMPTY_PAYMENT_MODAL_STATE: PaymentModalState = {
  open: false,
  orderId: "",
  orderCode: "",
  paymentId: "",
  amount: 0,
  method: "CASH",
  providerTxnId: "",
};

type CreateCustomerFormState = {
  name: string;
  phone: string;
  email: string;
};

type StaffOrderCustomerPersistState = {
  keyword: string;
  selectedCustomer: POSCustomerSearchResult | null;
};

type ProductFranchiseMeta = {
  productId: string;
  productName: string;
  image: string;
  categoryName: string;
  size?: string;
  price: number;
};

const FRANCHISE_LOADING_MIN_MS = 1200;

const fmtCurrency = (value: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value);

function resolvePaymentField(payment: PaymentData, key: string) {
  const record = asRecord(payment);
  const rawValue = record?.[key];
  return rawValue == null ? "" : String(rawValue).trim();
}

function getPendingPaymentDisplayCode(payment: PaymentData) {
  return resolvePaymentField(payment, "order_code") || payment.code || "Không có mã đơn";
}

function toStaffPaymentMethod(value: unknown): StaffPaymentMethod {
  const normalized = String(value ?? "").trim().toUpperCase();
  return normalized === "CARD" || normalized === "VNPAY" || normalized === "QR" ? "VNPAY" : "CASH";
}


function isPendingPaymentStatus(value: unknown) {
  const normalized = String(value ?? "").trim().toUpperCase();
  return normalized === "PENDING" || normalized === "UNPAID";
}

function waitForNextPaint() {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }

  return new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => resolve());
    });
  });
}

const normalizeText = (value: unknown) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function getNestedRecord(
  source: Record<string, unknown> | null,
  key: string,
): Record<string, unknown> | null {
  return asRecord(source?.[key]);
}

function getErrorMessage(error: unknown, fallback: string) {
  const errorRecord = asRecord(error);
  const response = getNestedRecord(errorRecord, "response");
  const data = getNestedRecord(response, "data");
  const rawMessage = data?.message ?? errorRecord?.message;
  return rawMessage == null ? fallback : String(rawMessage).trim() || fallback;
}

function getAppliedVoucherCode(cart: unknown): string | undefined {
  const cartRecord = asRecord(cart);
  const rawVoucher = cartRecord?.voucher;
  if (typeof rawVoucher === "string" && rawVoucher.trim()) {
    return rawVoucher.trim();
  }

  const voucherRecord = getNestedRecord(cartRecord, "voucher");
  const rawCode =
    voucherRecord?.code ??
    voucherRecord?.voucher_code ??
    cartRecord?.voucher_code;

  return rawCode == null ? undefined : String(rawCode).trim() || undefined;
}

const getCategoryIcon = (name: string) => {
  const normalized = normalizeText(name);
  if (normalized.includes("ca phe") || normalized.includes("coffee")) return "☕";
  if (normalized.includes("tra sua") || normalized.includes("milk tea")) return "🧋";
  if (normalized.includes("tra")) return "🍵";
  if (normalized.includes("freeze") || normalized.includes("da xay")) return "🧊";
  if (normalized.includes("topping")) return "🧁";
  if (normalized.includes("banh")) return "🥐";
  return "🍽️";
};

const isToppingCategory = (name: string) => normalizeText(name).includes("topping");

const hashStringToInt = (input: string) =>
  input.split("").reduce((acc, char) => ((acc * 31 + char.charCodeAt(0)) | 0), 0) >>> 0;

function expandToppingsForEdit(toppings?: Array<{ name: string; quantity: number }>): Topping[] {
  if (!toppings?.length) return [];

  return toppings.flatMap((topping, index) => {
    const quantity = Math.max(1, Number(topping.quantity ?? 1));
    return Array.from({ length: quantity }, (_unused, offset) => ({
      id: `${topping.name}-${index}-${offset}`,
      name: topping.name,
      price: 0,
      emoji: "🍽️",
    }));
  });
}

function resolveRecordId(value: { _id?: unknown; id?: unknown } | null | undefined) {
  return String(value?._id ?? value?.id ?? "").trim();
}

function resolveOrderCode(value: { code?: unknown } | null | undefined, fallback: string) {
  return String(value?.code ?? fallback).trim();
}

function resolveRoleName(user: ReturnType<typeof useAuthStore.getState>["user"]) {
  const activeContext = user?.active_context as { role?: string } | null;
  return String(activeContext?.role ?? user?.role ?? user?.roles?.[0]?.role ?? "").toUpperCase();
}

function resolveUserId(user: ReturnType<typeof useAuthStore.getState>["user"]) {
  if (!user || typeof user !== "object") return "";

  const record = user as Record<string, unknown>;
  const nestedUser =
    record.user && typeof record.user === "object"
      ? (record.user as Record<string, unknown>)
      : null;

  return String(nestedUser?.id ?? nestedUser?._id ?? record.id ?? record._id ?? "").trim();
}

function coercePersistedCustomer(value: unknown): POSCustomerSearchResult | null {
  if (!value || typeof value !== "object") return null;

  const record = value as Record<string, unknown>;
  const id = String(record.id ?? "").trim();
  if (!id) return null;

  const email = String(record.email ?? "").trim();
  const address = String(record.address ?? "").trim();
  const avatarUrl = String(record.avatar_url ?? "").trim();
  const loyaltyPointsRaw = Number(record.loyalty_points);
  const loyaltyPoints = Number.isFinite(loyaltyPointsRaw) ? loyaltyPointsRaw : undefined;
  const loyaltyTier = String(record.loyalty_tier ?? "").trim();

  return {
    id,
    name: String(record.name ?? "").trim(),
    phone: String(record.phone ?? "").trim(),
    email: email || undefined,
    address: address || undefined,
    avatar_url: avatarUrl || undefined,
    loyalty_points: loyaltyPoints,
    loyalty_tier: loyaltyTier || undefined,
    is_active: record.is_active !== false,
  };
}

function isSameCustomerSelection(
  left: POSCustomerSearchResult | null,
  right: POSCustomerSearchResult | null,
) {
  if (left === right) return true;
  if (!left || !right) return false;

  return (
    left.id === right.id &&
    left.name === right.name &&
    left.phone === right.phone &&
    left.email === right.email &&
    left.address === right.address &&
    left.avatar_url === right.avatar_url &&
    left.loyalty_points === right.loyalty_points &&
    left.loyalty_tier === right.loyalty_tier &&
    left.is_active === right.is_active
  );
}

function getStaffOrderCustomerStorageKey(userId: string) {
  return userId
    ? `${LOCAL_STORAGE_KEY.STAFF_ORDER_CUSTOMER}:${userId}`
    : LOCAL_STORAGE_KEY.STAFF_ORDER_CUSTOMER;
}

function toCustomerSelection(customer: ApiCustomer): POSCustomerSearchResult {
  return {
    id: customer.id,
    name: customer.name,
    phone: customer.phone,
    email: customer.email,
    address: customer.address,
    avatar_url: customer.avatar_url,
    loyalty_points: (customer as { loyalty_points?: number }).loyalty_points,
    loyalty_tier: (customer as { loyalty_tier?: string }).loyalty_tier,
    is_active: customer.is_active,
  };
}

function getCartFranchiseId(raw: unknown) {
  if (!raw || typeof raw !== "object") return "";
  const cart = raw as Record<string, unknown>;
  const franchise =
    cart.franchise && typeof cart.franchise === "object"
      ? (cart.franchise as Record<string, unknown>)
      : null;

  return String(
    cart.franchise_id ??
      cart.franchiseId ??
      franchise?._id ??
      franchise?.id ??
      "",
  ).trim();
}

function toMenuProduct(product: ClientProductListItem, franchiseId: string, franchiseName?: string): MenuProduct {
  const sizes = Array.isArray(product.sizes) ? product.sizes : [];
  const availableSizes = sizes.filter((size) => size.is_available);
  const baseSize = availableSizes[0] ?? sizes[0];

  return Object.assign(
    {
      id: hashStringToInt(`${product.product_id}-${franchiseId}`),
      sku: product.SKU ?? "",
      name: product.name,
      description: product.description ?? "",
      content: "",
      price: baseSize?.price ?? 0,
      image: product.image_url,
      images: [],
      categoryId: hashStringToInt(product.category_id),
      rating: 0,
      reviewCount: 0,
      isAvailable: availableSizes.length > 0,
      isFeatured: false,
    } as MenuProduct,
    {
      _apiFranchiseId: franchiseId,
      _apiFranchiseName: franchiseName,
      _apiProductId: product.product_id,
      _apiCategoryName: product.category_name,
      _apiSizes: sizes,
    },
  );
}

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timeoutId);
  }, [delayMs, value]);

  return debounced;
}

function ProductCard({
  product,
  onSelect,
}: {
  product: ClientProductListItem;
  onSelect: (product: ClientProductListItem) => void;
}) {
  const sizes = Array.isArray(product.sizes) ? product.sizes : [];
  const availableSizes = sizes.filter((size) => size.is_available);
  const basePrice = availableSizes[0]?.price ?? sizes[0]?.price ?? 0;
  const isAvailable = availableSizes.length > 0;

  return (
    <button
      type="button"
      onClick={() => isAvailable && onSelect(product)}
      disabled={!isAvailable}
      className={cn(
        "group overflow-hidden rounded-3xl border text-left transition-all",
        isAvailable
          ? "border-slate-200 bg-white hover:-translate-y-1 hover:border-amber-300 hover:shadow-xl"
          : "cursor-not-allowed border-slate-200 bg-slate-50 opacity-70",
      )}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
        <img src={product.image_url} alt={product.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        {!isAvailable && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/35">
            <span className="rounded-full bg-red-500/95 px-3 py-1 text-xs font-bold text-white shadow-sm">Hết hàng</span>
          </div>
        )}
      </div>
      <div className="space-y-3 p-4">
        <div>
          <h3 className="line-clamp-1 text-base font-extrabold text-slate-900">{product.name}</h3>
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{product.description || "Không có mô tả"}</p>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-bold text-slate-900">{fmtCurrency(basePrice)}</span>
          {isAvailable && <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">Thêm món</span>}
        </div>
      </div>
    </button>
  );
}

function PaymentModal({
  state,
  onClose,
  onChangeMethod,
  onConfirm,
  confirming,
}: {
  state: PaymentModalState;
  onClose: () => void;
  onChangeMethod: (method: StaffPaymentMethod) => void;
  onConfirm: () => void;
  confirming: boolean;
}) {
  const qrCode = useMemo(
    () =>
      state.method === "VNPAY"
        ? buildStaticPaymentQr({
            provider: "BANK",
            amount: state.amount,
            orderRef: state.orderCode || state.orderId,
            bankName: "VNPAY",
          })
        : undefined,
    [state.amount, state.method, state.orderCode, state.orderId],
  );

  const orderReference = state.orderCode || state.orderId;
  const isConfirmDisabled = confirming;
  const statusDescription =
    state.method === "VNPAY"
      ? ""
      : "Thu tiền trực tiếp tại quầy, kiểm tra lại số tiền và xác nhận để hoàn tất đơn hàng.";
  const methodThemeClass =
    state.method === "VNPAY"
      ? "from-sky-500/20 via-blue-500/10 to-white/5"
      : "from-emerald-400/18 via-teal-500/10 to-white/5";

  return (
    <div className="fixed inset-0 z-[190] flex items-center justify-center bg-slate-950/72 p-4 backdrop-blur-md">
      <div className="flex h-[calc(100dvh-2.5rem)] max-h-[760px] w-full max-w-[1080px] min-h-0 flex-col overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(135deg,rgba(15,23,42,0.98)_0%,rgba(18,24,42,0.96)_42%,rgba(48,34,24,0.92)_100%)] text-[#fff7ed] shadow-[0_38px_100px_rgba(15,23,42,0.58)]">
        <div className="relative border-b border-white/10 px-5 py-4 sm:px-6">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.14),transparent_18%),radial-gradient(circle_at_left_bottom,rgba(59,130,246,0.12),transparent_20%),linear-gradient(180deg,rgba(255,255,255,0.03),transparent)]" />
          <div className="relative flex items-start justify-between gap-4">
            <div className="space-y-1.5">
                <h3 className="text-[1.85rem] font-black tracking-tight text-[#fff8ef]">Thanh toán đơn hàng</h3>
                <p className="max-w-2xl text-sm leading-6 text-[#ddd0bf]">
                  Đơn <span className="font-semibold text-[#fff8ef]">{orderReference}</span> đang chờ xác nhận thanh toán.
                </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={confirming}
              className="rounded-full border border-white/10 bg-white/5 p-2 text-[#d9cbb7] transition hover:rotate-90 hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
              aria-label="Đóng payment modal"
            >
              <svg className="size-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden px-5 py-4 sm:px-6">
          <div className="grid h-full gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
            <div className="space-y-4">
              <div className="relative overflow-hidden rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(2,6,23,0.92)_0%,rgba(15,23,42,0.76)_100%)] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.14),transparent_70%)]" />
                <p className="relative text-xs font-medium uppercase tracking-[0.14em] text-[#d7c9b7]">Tổng cần thanh toán</p>
                <p className="relative mt-2 text-[2.4rem] font-black tracking-tight text-[#fff7ed]">{fmtCurrency(state.amount)}</p>
                <div className="relative mt-4 space-y-2.5">
                  <div className="rounded-[18px] border border-white/8 bg-white/[0.04] px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#a99783]">Mã tham chiếu</p>
                    <p className="mt-1.5 break-all text-sm font-semibold text-[#f1e6d8]">{orderReference}</p>
                  </div>
                  <div className="grid gap-2.5">
                    <div className="rounded-[18px] border border-white/8 bg-black/10 px-4 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#a99783]">Kênh xử lý</p>
                      <p className="mt-1.5 text-sm font-semibold text-[#f4eadc]">Thanh toán tại quầy</p>
                    </div>
                    <div className="rounded-[18px] border border-white/8 bg-black/10 px-4 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#a99783]">Phương thức hiện tại</p>
                      <p className="mt-1.5 text-sm font-semibold text-[#f4eadc]">{state.method === "VNPAY" ? "VNPay QR" : "Tiền mặt"}</p>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            <div className={cn("flex min-h-0 flex-col rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0.05)_100%)] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]", `bg-gradient-to-br ${methodThemeClass}`)}>
              <div className="flex h-full flex-col gap-4">
                <div className="space-y-4">
                  <div className="relative grid grid-cols-2 rounded-[22px] border border-white/10 bg-[rgba(8,12,20,0.42)] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                    <span
                      className={cn(
                        "pointer-events-none absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-[18px] border shadow-[0_16px_32px_rgba(15,23,42,0.24)] transition-all duration-300",
                        state.method === "VNPAY"
                          ? "translate-x-full border-sky-300/25 bg-[linear-gradient(135deg,rgba(37,99,235,0.34)_0%,rgba(14,165,233,0.28)_100%)]"
                          : "translate-x-0 border-emerald-300/25 bg-[linear-gradient(135deg,rgba(5,150,105,0.34)_0%,rgba(16,185,129,0.28)_100%)]",
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => onChangeMethod("CASH")}
                      disabled={confirming}
                      className={cn(
                        "relative z-10 rounded-[18px] px-4 py-3 text-left transition",
                        state.method === "CASH" ? "text-white" : "text-[#d8cab7] hover:text-white",
                        confirming && "cursor-not-allowed opacity-60",
                      )}
                    >
                      <span className="block text-[11px] font-semibold uppercase tracking-[0.2em]">Tiền mặt</span>
                      <span className="mt-1 block text-sm font-bold tracking-tight">Thu trực tiếp</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onChangeMethod("VNPAY")}
                      disabled={confirming}
                      className={cn(
                        "relative z-10 rounded-[18px] px-4 py-3 text-left transition",
                        state.method === "VNPAY" ? "text-white" : "text-[#d8cab7] hover:text-white",
                        confirming && "cursor-not-allowed opacity-60",
                      )}
                    >
                      <span className="block text-[11px] font-semibold uppercase tracking-[0.2em]">VNPay</span>
                      <span className="mt-1 block text-sm font-bold tracking-tight">Quét QR</span>
                    </button>
                  </div>

                  <div className="rounded-[22px] border border-white/10 bg-[rgba(15,23,42,0.28)] p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#d5c2a3]">
                      {state.method === "VNPAY" ? "Quét mã thanh toán" : "Thanh toán tại quầy"}
                    </p>
                    {statusDescription ? <p className="mt-2 text-sm leading-6 text-[#ddd0bf]">{statusDescription}</p> : null}
                  </div>
                </div>

                {confirming ? (
                  <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-[24px] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.16),transparent_38%),linear-gradient(180deg,rgba(7,10,18,0.68)_0%,rgba(7,10,18,0.88)_100%)]">
                    <div className="relative flex flex-col items-center justify-center px-6 py-10 text-center">
                      <span className="pointer-events-none absolute h-44 w-44 rounded-full bg-emerald-400/16 blur-3xl" />
                      <span className="pointer-events-none absolute h-28 w-28 animate-ping rounded-full border border-emerald-300/30" />
                      <span className="relative flex h-24 w-24 items-center justify-center rounded-full border border-emerald-300/35 bg-[linear-gradient(135deg,rgba(5,150,105,0.28)_0%,rgba(16,185,129,0.16)_100%)] shadow-[0_24px_54px_rgba(16,185,129,0.24)]">
                        <svg className="h-10 w-10 text-emerald-200" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="m5 13 4 4L19 7" />
                        </svg>
                      </span>
                      <p className="relative mt-6 text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-200/90">
                        Đã nhận tiền
                      </p>
                      <p className="relative mt-2 text-lg font-black tracking-tight text-white">
                        Đang hoàn tất xác nhận thanh toán
                      </p>
                    </div>
                  </div>
                ) : state.method === "VNPAY" && qrCode ? (
                  <div className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,14,22,0.58)_0%,rgba(7,10,18,0.82)_100%)] p-4 shadow-[0_18px_36px_rgba(15,23,42,0.22)]">
                    <div className="flex justify-center">
                      <img
                        src={qrCode}
                        alt="VNPay QR"
                        className="size-48 rounded-[24px] border border-white/10 bg-white p-3 shadow-[0_20px_42px_rgba(15,23,42,0.3)]"
                      />
                    </div>
                    <p className="mt-3 text-center text-xs leading-5 text-[#cfbfaa]">
                      Hiển thị mã này cho khách hàng quét để hoàn tất thanh toán.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-[1.05fr_0.95fr]">
                    <div className="rounded-[22px] border border-emerald-300/20 bg-[linear-gradient(135deg,rgba(16,185,129,0.12)_0%,rgba(6,95,70,0.16)_100%)] p-4 text-emerald-50 shadow-[0_16px_32px_rgba(6,95,70,0.14)]">
                      <p className="text-sm leading-6">
                        Gợi ý: đọc lại tổng tiền cho khách trước khi xác nhận để tránh nhầm lẫn trong lúc giao dịch tại quầy.
                      </p>
                    </div>
                    <div className="rounded-[22px] border border-white/10 bg-[rgba(15,23,42,0.38)] p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#d5c2a3]">Ghi chú thao tác</p>
                      <div className="mt-2.5 space-y-2.5 text-sm leading-6 text-[#ddd0bf]">
                        <p>Chỉ bấm xác nhận sau khi đã nhận đủ tiền mặt từ khách và kiểm tra lại giá trị đơn hàng.</p>
                        <div className="rounded-[16px] border border-white/8 bg-black/10 px-4 py-3 text-[#f3ebdf]">
                          Checklist: nhận tiền, kiểm tra mệnh giá, đọc lại số tiền, xác nhận.
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-white/10 bg-[linear-gradient(180deg,rgba(7,10,18,0.26)_0%,rgba(7,10,18,0.42)_100%)] px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
          <button
            type="button"
            onClick={onClose}
            className="rounded-[18px] border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-[#e3d8ca] transition hover:bg-white/10"
          >
            Đóng
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isConfirmDisabled}
            className={cn(
              "rounded-[18px] px-5 py-3 text-sm font-bold text-white transition",
              isConfirmDisabled
                ? "cursor-not-allowed bg-slate-500/70"
                : state.method === "VNPAY"
                  ? "bg-[linear-gradient(135deg,#2563eb_0%,#0ea5e9_100%)] shadow-[0_18px_38px_rgba(37,99,235,0.26)] hover:-translate-y-0.5 hover:shadow-[0_22px_44px_rgba(37,99,235,0.34)]"
                  : "bg-[linear-gradient(135deg,#059669_0%,#10b981_100%)] shadow-[0_18px_38px_rgba(16,185,129,0.26)] hover:-translate-y-0.5 hover:shadow-[0_22px_44px_rgba(16,185,129,0.34)]",
            )}
          >
            {confirming
              ? "Đang xác nhận..."
              : state.method === "VNPAY"
                ? "Xác nhận giao dịch VNPay"
                : "Xác nhận đã thu tiền mặt"}
          </button>
        </div>
      </div>
    </div>
  );
}

function CheckoutDialog({
  open,
  onClose,
  customerName,
  customerPhone,
  franchiseName,
  cartItems,
  itemCount,
  pricingSummary,
  appliedVoucherCode,
  voucherCodeInput,
  onVoucherCodeChange,
  onApplyVoucher,
  onRemoveVoucher,
  canManageVoucher,
  isVoucherBusy,
  voucherError,
  notice,
  canCancelCart,
  canCheckout,
  onCancelCart,
  onCheckout,
  isCancellingCart,
  isSyncingDraftCart,
  isCheckouting,
}: {
  open: boolean;
  onClose: () => void;
  customerName?: string;
  customerPhone?: string;
  franchiseName?: string | null;
  cartItems: StaffCartItemView[];
  itemCount: number;
  pricingSummary: CartPricingSummary;
  appliedVoucherCode?: string;
  voucherCodeInput: string;
  onVoucherCodeChange: (value: string) => void;
  onApplyVoucher: () => void;
  onRemoveVoucher: () => void;
  canManageVoucher: boolean;
  isVoucherBusy: boolean;
  voucherError: string;
  notice: string;
  canCancelCart: boolean;
  canCheckout: boolean;
  onCancelCart: () => void;
  onCheckout: () => void;
  isCancellingCart: boolean;
  isSyncingDraftCart: boolean;
  isCheckouting: boolean;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[180] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
      <div className="flex h-[calc(100dvh-2rem)] max-h-[920px] w-full max-w-3xl min-h-0 flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
          <div>
            <h3 className="text-xl font-bold text-slate-950">Xác nhận đơn hàng</h3>
            <p className="mt-2 text-sm text-slate-500">
              {customerName
                ? `${customerName}${customerPhone ? ` • ${customerPhone}` : ""}`
                : "Chưa chọn khách hàng"}
              {franchiseName ? ` • ${franchiseName}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Đóng dialog thanh toán"
          >
            <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden px-6 py-6">
          <div className="flex h-full min-h-0 flex-col gap-5">
          <div className="min-h-0 flex flex-1 flex-col overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-4 py-3">
              <h3 className="text-sm font-semibold text-slate-900">Sản phẩm đã chọn</h3>
            </div>

            <div className="min-h-0 max-h-[42dvh] flex-1 overflow-y-scroll overscroll-contain px-4 py-4 pr-2">
              <div className="space-y-3">
              {cartItems.map((item) => (
                <div key={item.id} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                  {item.image ? (
                    <img src={item.image} alt={item.name} className="h-12 w-12 rounded-xl object-cover" />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-200 text-lg">
                      🍽️
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="line-clamp-1 text-sm font-semibold text-slate-900">{item.name}</p>
                        <p className="mt-1 text-xs text-slate-500">SL: {item.quantity}</p>
                        {item.size && <p className="mt-1 text-xs text-slate-500">Size: {item.size}</p>}
                        {(item.sugar || item.ice) && (
                          <p className="mt-1 text-xs text-slate-500">
                            {item.sugar ? `Đường: ${item.sugar}` : ""}
                            {item.sugar && item.ice ? " • " : ""}
                            {item.ice ? `Đá: ${item.ice}` : ""}
                          </p>
                        )}
                        {item.note && <p className="mt-1 line-clamp-2 text-xs italic text-slate-500">Ghi chú: {item.note}</p>}
                      </div>

                      <span className="shrink-0 text-sm font-bold text-slate-900">{fmtCurrency(item.lineTotal)}</span>
                    </div>
                  </div>
                </div>
              ))}
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
            {isVoucherBusy && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 backdrop-blur-[1px]">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm">
                  <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Đang cập nhật mã...
                </div>
              </div>
            )}

            <div className="border-b border-slate-100 px-4 py-3">
              <div className="flex items-center gap-1.5">
                <span className="text-sm leading-none">🎫</span>
                <h3 className="text-sm font-semibold text-slate-900">Mã giảm giá</h3>
              </div>
            </div>

            <div className="px-4 py-4">
              {appliedVoucherCode ? (
                <div
                  className={cn(
                    "flex items-center justify-between rounded-lg border px-3 py-2 transition-opacity",
                    isVoucherBusy
                      ? "border-emerald-100 bg-emerald-50 opacity-50 pointer-events-none"
                      : "border-emerald-200 bg-emerald-100",
                  )}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm text-emerald-600">✓</span>
                    <span className="text-xs font-semibold text-emerald-800">{appliedVoucherCode}</span>
                  </div>
                  <button
                    type="button"
                    onClick={onRemoveVoucher}
                    disabled={isVoucherBusy}
                    className="inline-flex h-6 w-6 items-center justify-center rounded-full text-rose-600 transition hover:bg-rose-50 hover:text-rose-700"
                    title="Gỡ voucher"
                    aria-label="Gỡ voucher"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ) : (
                <div
                  className={cn(
                    "flex gap-2 transition-opacity",
                    (isVoucherBusy || !canManageVoucher) && "opacity-60",
                  )}
                >
                  <input
                    value={voucherCodeInput}
                    onChange={(event) => onVoucherCodeChange(event.target.value.toUpperCase())}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && canManageVoucher && voucherCodeInput.trim()) {
                        event.preventDefault();
                        onApplyVoucher();
                      }
                    }}
                    placeholder="Nhập mã..."
                    disabled={isVoucherBusy || !canManageVoucher}
                    className={cn(
                      "min-w-0 flex-1 rounded-lg border bg-white px-3 py-2 text-sm font-mono uppercase outline-none transition-all",
                      voucherError
                        ? "border-rose-300 bg-rose-50"
                        : "border-slate-200 focus:ring-1 focus:ring-emerald-300",
                    )}
                  />
                  <button
                    type="button"
                    onClick={onApplyVoucher}
                    disabled={isVoucherBusy || !voucherCodeInput.trim() || !canManageVoucher}
                    className={cn(
                      "checkout-voucher-apply-button rounded-lg border px-4 py-2 text-sm font-medium transition-all",
                      isVoucherBusy || !voucherCodeInput.trim() || !canManageVoucher
                        ? "checkout-voucher-apply-button-disabled"
                        : "checkout-voucher-apply-button-active",
                    )}
                  >
                    Áp dụng
                  </button>
                </div>
              )}

              {!canManageVoucher && (
                <p className="mt-2 text-xs text-slate-500">Chọn customer trước khi áp voucher.</p>
              )}

                {voucherError && (
                  <p className="mt-2 text-xs text-rose-600">{voucherError}</p>
                )}
              </div>
            </div>

            <div className="shrink-0 overflow-hidden rounded-[24px] border border-slate-200 bg-slate-50 shadow-sm">
              <div className="bg-slate-50 px-4 py-4 text-[13px]">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-4 text-slate-600">
                    <span>Tạm tính ({itemCount} món)</span>
                    <span>{fmtCurrency(pricingSummary.subtotalAmount)}</span>
                  </div>

                  {pricingSummary.promotionDiscount > 0 && (
                    <div className="flex items-center justify-between gap-4 text-emerald-600">
                      <span>
                        Giảm khuyến mãi
                        {formatDiscountTypeText(pricingSummary.promotionType, pricingSummary.promotionValue)}
                      </span>
                      <span>-{fmtCurrency(pricingSummary.promotionDiscount)}</span>
                    </div>
                  )}

                  {pricingSummary.voucherDiscount > 0 && (
                    <div className="flex items-center justify-between gap-4 text-rose-600">
                      <span>
                        Giảm voucher
                        {formatDiscountTypeText(pricingSummary.voucherType, pricingSummary.voucherValue)}
                      </span>
                      <span>-{fmtCurrency(pricingSummary.voucherDiscount)}</span>
                    </div>
                  )}

                  {pricingSummary.loyaltyDiscount > 0 && (
                    <div className="flex items-center justify-between gap-4 text-amber-700">
                      <span>
                        Giảm điểm thưởng
                        {pricingSummary.loyaltyPointsUsed > 0 ? ` (${pricingSummary.loyaltyPointsUsed} điểm)` : ""}
                      </span>
                      <span>-{fmtCurrency(pricingSummary.loyaltyDiscount)}</span>
                    </div>
                  )}

                  <div className="h-px bg-slate-200/90" />

                  <div className="flex items-center justify-between gap-4 text-base font-bold text-slate-900">
                    <span>Tổng cộng</span>
                    <span className="text-amber-600">{fmtCurrency(pricingSummary.finalAmount)}</span>
                  </div>
                </div>
              </div>
            </div>

          {notice && (
            <div className="shrink-0 flex items-center gap-2 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2">
              <span className="text-sm">⚠️</span>
              <p className="text-xs font-medium text-amber-700">{notice}</p>
            </div>
          )}
        </div>

        </div>
        <div className="flex flex-col gap-3 border-t border-slate-100 px-6 py-5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Đóng
          </button>
          <button
            type="button"
            onClick={onCancelCart}
            disabled={!canCancelCart}
            className={cn(
              "checkout-cancel-cart-button rounded-2xl border px-5 py-3 text-sm font-semibold transition",
              canCancelCart
                ? "checkout-cancel-cart-button-active"
                : "checkout-cancel-cart-button-disabled",
            )}
          >
            {isCancellingCart ? "Đang hủy..." : "Hủy giỏ"}
          </button>
          <button
            type="button"
            onClick={onCheckout}
            disabled={!canCheckout}
            className={cn(
              "rounded-2xl px-5 py-3 text-sm font-semibold text-white transition",
              canCheckout ? "bg-amber-500 hover:bg-amber-600" : "bg-slate-400",
            )}
          >
            {isSyncingDraftCart
              ? "Đang đồng bộ giỏ tạm..."
              : isCheckouting
                ? "Đang checkout..."
                : `Đặt hàng · ${fmtCurrency(pricingSummary.finalAmount)}`}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function StaffOrderPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const showGlobalLoading = useLoadingStore((state) => state.show);
  const hideGlobalLoading = useLoadingStore((state) => state.hide);
  const managerFranchiseId = useManagerFranchiseId();
  const currentRole = resolveRoleName(user);
  const currentUserId = resolveUserId(user);
  const customerStorageKey = getStaffOrderCustomerStorageKey(currentUserId);

  const [selectedFranchiseId, setSelectedFranchiseId] = useState("");
  const [isFranchiseSelectOpen, setIsFranchiseSelectOpen] = useState(false);
  const [franchiseSearchKeyword, setFranchiseSearchKeyword] = useState("");
  const [pendingFranchiseViewId, setPendingFranchiseViewId] = useState<string | null>(null);
  const [isFranchiseLoadingMinElapsed, setIsFranchiseLoadingMinElapsed] = useState(true);
  const franchiseSelectWrapperRef = useRef<HTMLDivElement | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("ALL");
  const [isCategorySelectOpen, setIsCategorySelectOpen] = useState(false);
  const [isCategoryStickyActive, setIsCategoryStickyActive] = useState(false);
  const categorySelectWrapperRef = useRef<HTMLDivElement | null>(null);
  const categoryStickyShellRef = useRef<HTMLDivElement | null>(null);
  const categoryStickySentinelRef = useRef<HTMLDivElement | null>(null);
  const initialWorkspaceLoadingActiveRef = useRef(false);
  const franchiseLoadingActiveRef = useRef(false);
  const checkoutPaymentLoadingActiveRef = useRef(false);
  const [customerKeyword, setCustomerKeyword] = useState("");
  const [isCustomerSearchOpen, setIsCustomerSearchOpen] = useState(false);
  const customerSearchWrapperRef = useRef<HTMLDivElement | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<POSCustomerSearchResult | null>(null);
  const [isCustomerStateHydrated, setIsCustomerStateHydrated] = useState(false);
  const [showCreateCustomerForm, setShowCreateCustomerForm] = useState(false);
  const [createCustomerForm, setCreateCustomerForm] = useState<CreateCustomerFormState>({
    name: "",
    phone: "",
    email: "",
  });
  const [productModal, setProductModal] = useState<MenuProduct | null>(null);
  const [editingCartItem, setEditingCartItem] = useState<StaffCartEditState | null>(null);
  const [draftCartItemsByFranchise, setDraftCartItemsByFranchise] = useState<Record<string, StaffCartItemView[]>>({});
  const [removingCartItemId, setRemovingCartItemId] = useState<string | null>(null);
  const [paymentModal, setPaymentModal] = useState<PaymentModalState>(EMPTY_PAYMENT_MODAL_STATE);
  const [isCheckoutDialogOpen, setIsCheckoutDialogOpen] = useState(false);
  const [openingPendingPaymentId, setOpeningPendingPaymentId] = useState<string | null>(null);
  const [voucherCodeInput, setVoucherCodeInput] = useState("");
  const [voucherError, setVoucherError] = useState("");
  const [hasInitialWorkspaceLoaded, setHasInitialWorkspaceLoaded] = useState(false);
  const checkoutDialogOpeningRef = useRef(false);
  const resumePaymentHandledRef = useRef("");

  const debouncedCustomerKeyword = useDebouncedValue(customerKeyword, 350);
  const hasAccess = ["ADMIN", "SYSTEM", "MANAGER", "STAFF"].includes(currentRole);

  const franchisesQuery = useQuery({
    queryKey: ["staff-order-franchises"],
    queryFn: () => clientService.getAllFranchises(),
    enabled: hasAccess,
  });

  const effectiveFranchiseId = useMemo(() => {
    if (selectedFranchiseId) return selectedFranchiseId;
    const preferred =
      franchisesQuery.data?.find((item) => item.id === managerFranchiseId) ??
      franchisesQuery.data?.[0];
    return preferred?.id ?? "";
  }, [franchisesQuery.data, managerFranchiseId, selectedFranchiseId]);

  const selectedFranchise = useMemo(
    () => franchisesQuery.data?.find((franchise) => franchise.id === effectiveFranchiseId) ?? null,
    [effectiveFranchiseId, franchisesQuery.data],
  );
  const currentDraftCartItems = useMemo(
    () => (effectiveFranchiseId ? draftCartItemsByFranchise[effectiveFranchiseId] ?? [] : []),
    [draftCartItemsByFranchise, effectiveFranchiseId],
  );

  const clearDraftCartItemsForFranchise = (franchiseId: string) => {
    if (!franchiseId) return;
    setDraftCartItemsByFranchise((current) => {
      if (!(franchiseId in current)) return current;
      const next = { ...current };
      delete next[franchiseId];
      return next;
    });
  };

  const filteredFranchises = useMemo(() => {
    const keyword = normalizeText(franchiseSearchKeyword);
    const list = franchisesQuery.data ?? [];
    if (!keyword) return list;

    return list.filter((franchise) =>
      normalizeText(`${franchise.name} ${franchise.code} ${franchise.id}`).includes(keyword),
    );
  }, [franchiseSearchKeyword, franchisesQuery.data]);

  const categoriesQuery = useQuery({
    queryKey: ["staff-order-categories", effectiveFranchiseId],
    queryFn: () => clientService.getCategoriesByFranchise(effectiveFranchiseId),
    enabled: !!effectiveFranchiseId,
  });

  const productsQuery = useQuery({
    queryKey: ["staff-order-products", effectiveFranchiseId],
    queryFn: () => clientService.getProductsByFranchiseAndCategory(effectiveFranchiseId),
    enabled: !!effectiveFranchiseId,
  });

  const franchiseDetailQuery = useQuery({
    queryKey: ["staff-order-franchise-detail", effectiveFranchiseId],
    queryFn: async () => {
      if (!effectiveFranchiseId) return null;
      return clientService.getFranchiseDetail(effectiveFranchiseId);
    },
    enabled: !!effectiveFranchiseId,
    staleTime: 60_000,
  });

  const franchiseAddressForCreate = String(
    franchiseDetailQuery.data?.address ?? "",
  ).trim();

  const customerSearchQuery = useQuery({
    queryKey: ["staff-order-customer-search", debouncedCustomerKeyword],
    queryFn: () => posService.searchCustomer(debouncedCustomerKeyword),
    enabled: isCustomerSearchOpen && !selectedCustomer,
  });

  useEffect(() => {
    const persisted = getItem<StaffOrderCustomerPersistState>(customerStorageKey);
    const nextKeyword =
      persisted && typeof persisted.keyword === "string" ? persisted.keyword : "";

    setCustomerKeyword(nextKeyword);
    setSelectedCustomer(coercePersistedCustomer(persisted?.selectedCustomer));
    setIsCustomerStateHydrated(true);
  }, [customerStorageKey]);

  useEffect(() => {
    if (!isCustomerStateHydrated) return;

    if (!customerKeyword.trim() && !selectedCustomer) {
      removeItem(customerStorageKey);
      return;
    }

    setItem<StaffOrderCustomerPersistState>(customerStorageKey, {
      keyword: customerKeyword,
      selectedCustomer,
    });
  }, [customerKeyword, customerStorageKey, isCustomerStateHydrated, selectedCustomer]);

  useEffect(() => {
    if (!isCustomerSearchOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!customerSearchWrapperRef.current?.contains(target)) {
        setIsCustomerSearchOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsCustomerSearchOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isCustomerSearchOpen]);

  useEffect(() => {
    if (!isFranchiseSelectOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!franchiseSelectWrapperRef.current?.contains(target)) {
        setIsFranchiseSelectOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsFranchiseSelectOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isFranchiseSelectOpen]);

  useEffect(() => {
    if (!isFranchiseSelectOpen) {
      setFranchiseSearchKeyword("");
    }
  }, [isFranchiseSelectOpen]);

  useEffect(() => {
    if (!pendingFranchiseViewId) return;

    setIsFranchiseLoadingMinElapsed(false);
    const timer = window.setTimeout(() => {
      setIsFranchiseLoadingMinElapsed(true);
    }, FRANCHISE_LOADING_MIN_MS);

    return () => window.clearTimeout(timer);
  }, [pendingFranchiseViewId]);

  useEffect(() => {
    if (!isCategorySelectOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!categorySelectWrapperRef.current?.contains(target)) {
        setIsCategorySelectOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsCategorySelectOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isCategorySelectOpen]);

  useEffect(() => {
    const shell = categoryStickyShellRef.current;
    const sentinel = categoryStickySentinelRef.current;
    if (!shell || !sentinel) return;

    const scrollContainer = shell?.closest(".overflow-y-auto") as HTMLElement | null;
    const stickyTopOffset = 0;

    if (typeof window !== "undefined" && "IntersectionObserver" in window) {
      const observer = new IntersectionObserver(
        ([entry]) => {
          setIsCategoryStickyActive(!entry.isIntersecting);
        },
        {
          root: scrollContainer ?? null,
          threshold: [0, 1],
          rootMargin: `-${stickyTopOffset}px 0px 0px 0px`,
        },
      );

      observer.observe(sentinel);
      return () => observer.disconnect();
    }

    const updateCategoryStickyState = () => {
      const rect = shell.getBoundingClientRect();
      const containerTop = scrollContainer?.getBoundingClientRect().top ?? 0;
      const stickyTop = containerTop + stickyTopOffset;
      const shouldBeStickyActive = rect.top <= stickyTop + 0.5;
      setIsCategoryStickyActive((current) =>
        current === shouldBeStickyActive ? current : shouldBeStickyActive,
      );
    };

    updateCategoryStickyState();
    scrollContainer?.addEventListener("scroll", updateCategoryStickyState, { passive: true });

    return () => {
      scrollContainer?.removeEventListener("scroll", updateCategoryStickyState);
    };
  }, []);

  const selectedCustomerProfileQuery = useQuery({
    queryKey: ["staff-order-customer-profile", selectedCustomer?.id],
    queryFn: async () => {
      if (!selectedCustomer?.id) return null;
      return posService.getCustomerDetail(selectedCustomer.id);
    },
    enabled: !!selectedCustomer?.id,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!selectedCustomerProfileQuery.data) return;

    const syncedCustomer = toCustomerSelection(selectedCustomerProfileQuery.data);
    setSelectedCustomer((current) => {
      if (!current || current.id !== syncedCustomer.id) return current;
      return isSameCustomerSelection(current, syncedCustomer) ? current : syncedCustomer;
    });
  }, [selectedCustomerProfileQuery.data]);

  const activeCartQuery = useQuery({
    queryKey: ["staff-order-active-cart", selectedCustomer?.id, effectiveFranchiseId],
    queryFn: async () => {
      if (!selectedCustomer?.id || !effectiveFranchiseId) return null;
      const carts = await cartClient.getCartsByCustomerId(selectedCustomer.id, { status: "ACTIVE" });
      const matchedCarts = carts.filter((cart) => getCartFranchiseId(cart) === effectiveFranchiseId);
      if (!matchedCarts.length) return null;

      const detailedCarts = await Promise.all(
        matchedCarts.map(async (cart) => {
          const cartId = String(cart._id ?? cart.id ?? "").trim();
          if (!cartId) return cart;
          return (await cartClient.getCartDetail(cartId)) ?? cart;
        }),
      );

      const preferredCart = detailedCarts
        .slice()
        .sort((left, right) => {
          const itemCountDiff = getCartItems(right).length - getCartItems(left).length;
          if (itemCountDiff !== 0) return itemCountDiff;

          const finalAmountDiff =
            getCartPricingSummary(right).finalAmount - getCartPricingSummary(left).finalAmount;
          if (finalAmountDiff !== 0) return finalAmountDiff;

          return String(right._id ?? right.id ?? "").localeCompare(String(left._id ?? left.id ?? ""));
        })[0];

      return preferredCart ?? null;
    },
    enabled: !!selectedCustomer?.id && !!effectiveFranchiseId,
  });

  const isInitialWorkspaceLoading =
    hasAccess &&
    (
      !isCustomerStateHydrated ||
      franchisesQuery.isLoading ||
      (!!effectiveFranchiseId &&
        (
          categoriesQuery.isLoading ||
          productsQuery.isLoading ||
          franchiseDetailQuery.isLoading
        )) ||
      (!!selectedCustomer?.id && selectedCustomerProfileQuery.isLoading) ||
      (!!selectedCustomer?.id && !!effectiveFranchiseId && activeCartQuery.isLoading)
    );

  const isFranchiseWorkspaceFetching =
    !!effectiveFranchiseId &&
    (
      categoriesQuery.isFetching ||
      productsQuery.isFetching ||
      franchiseDetailQuery.isFetching ||
      (!!selectedCustomer?.id && activeCartQuery.isFetching)
    );

  const isFranchiseTransitionLoading =
    !!pendingFranchiseViewId &&
    (
      pendingFranchiseViewId !== effectiveFranchiseId ||
      !isFranchiseLoadingMinElapsed ||
      isFranchiseWorkspaceFetching
    );

  useEffect(() => {
    if (hasInitialWorkspaceLoaded) return;

    if (isInitialWorkspaceLoading) {
      if (!initialWorkspaceLoadingActiveRef.current) {
        initialWorkspaceLoadingActiveRef.current = true;
        showGlobalLoading("Đang tải dữ liệu trang...");
      }
      return;
    }

    setHasInitialWorkspaceLoaded(true);
    if (initialWorkspaceLoadingActiveRef.current) {
      initialWorkspaceLoadingActiveRef.current = false;
      if (!franchiseLoadingActiveRef.current) {
        hideGlobalLoading();
      }
    }
  }, [
    hasInitialWorkspaceLoaded,
    hideGlobalLoading,
    isInitialWorkspaceLoading,
    showGlobalLoading,
  ]);

  useEffect(() => {
    if (!pendingFranchiseViewId) return;
    if (pendingFranchiseViewId !== effectiveFranchiseId) return;
    if (!isFranchiseLoadingMinElapsed) return;
    if (isFranchiseWorkspaceFetching) return;

    setPendingFranchiseViewId(null);
  }, [effectiveFranchiseId, isFranchiseLoadingMinElapsed, isFranchiseWorkspaceFetching, pendingFranchiseViewId]);

  useEffect(() => {
    if (isFranchiseTransitionLoading) {
      franchiseLoadingActiveRef.current = true;
      showGlobalLoading("Đang tải dữ liệu franchise...");
      return;
    }

    if (franchiseLoadingActiveRef.current) {
      franchiseLoadingActiveRef.current = false;
      hideGlobalLoading();
    }
  }, [hideGlobalLoading, isFranchiseTransitionLoading, showGlobalLoading]);

  useEffect(() => {
    return () => {
      if (initialWorkspaceLoadingActiveRef.current) {
        initialWorkspaceLoadingActiveRef.current = false;
      }
      if (franchiseLoadingActiveRef.current) {
        franchiseLoadingActiveRef.current = false;
      }
      hideGlobalLoading();
    };
  }, [hideGlobalLoading]);

  const categories = useMemo(() => {
    const list = categoriesQuery.data ?? [];
    return [...list].sort((left, right) => {
      const leftOrderRaw = Number(left.display_order);
      const rightOrderRaw = Number(right.display_order);
      const leftOrder = Number.isFinite(leftOrderRaw) ? leftOrderRaw : Number.MAX_SAFE_INTEGER;
      const rightOrder = Number.isFinite(rightOrderRaw) ? rightOrderRaw : Number.MAX_SAFE_INTEGER;
      if (leftOrder !== rightOrder) return leftOrder - rightOrder;
      return left.category_name.localeCompare(right.category_name, "vi");
    });
  }, [categoriesQuery.data]);

  const productCategoryOrderMap = useMemo(() => {
    const map = new Map<string, number>();
    (productsQuery.data ?? []).forEach((product) => {
      const order = Number(product.category_display_order);
      const normalizedOrder = Number.isFinite(order) ? order : Number.MAX_SAFE_INTEGER;
      const current = map.get(product.category_id);
      if (current == null || normalizedOrder < current) {
        map.set(product.category_id, normalizedOrder);
      }
    });
    return map;
  }, [productsQuery.data]);

  const categoryOrderMap = useMemo(() => {
    const map = new Map<string, number>();
    categories.forEach((category, index) => {
      const categoryDisplayOrder = Number(category.display_order);
      const fromCategory = Number.isFinite(categoryDisplayOrder) && categoryDisplayOrder > 0
        ? categoryDisplayOrder
        : undefined;
      const fromProduct = productCategoryOrderMap.get(category.category_id);
      map.set(category.category_id, fromCategory ?? fromProduct ?? index + 1_000);
    });

    productCategoryOrderMap.forEach((order, categoryId) => {
      if (!map.has(categoryId)) {
        map.set(categoryId, order);
      }
    });

    return map;
  }, [categories, productCategoryOrderMap]);

  const categoryCountMap = useMemo(() => {
    const map = new Map<string, number>();
    (productsQuery.data ?? []).forEach((product) => {
      map.set(product.category_id, (map.get(product.category_id) ?? 0) + 1);
    });
    return map;
  }, [productsQuery.data]);

  const categoryFilterItems = useMemo(() => {
    const byId = new Map<string, { id: string; name: string; icon: string; count: number; order: number }>();

    categories.forEach((category) => {
      byId.set(category.category_id, {
        id: category.category_id,
        name: category.category_name,
        icon: getCategoryIcon(category.category_name),
        count: categoryCountMap.get(category.category_id) ?? 0,
        order: categoryOrderMap.get(category.category_id) ?? Number.MAX_SAFE_INTEGER,
      });
    });

    (productsQuery.data ?? []).forEach((product) => {
      if (byId.has(product.category_id)) return;
      byId.set(product.category_id, {
        id: product.category_id,
        name: product.category_name,
        icon: getCategoryIcon(product.category_name),
        count: categoryCountMap.get(product.category_id) ?? 0,
        order: categoryOrderMap.get(product.category_id) ?? Number.MAX_SAFE_INTEGER,
      });
    });

    const orderedCategories = Array.from(byId.values()).sort((left, right) => {
      const leftIsTopping = isToppingCategory(left.name);
      const rightIsTopping = isToppingCategory(right.name);
      if (leftIsTopping !== rightIsTopping) return leftIsTopping ? 1 : -1;

      if (left.order !== right.order) return left.order - right.order;
      return left.name.localeCompare(right.name, "vi");
    });

    return [
      {
        id: "ALL",
        name: "Tất cả",
        icon: "🍽️",
        count: (productsQuery.data ?? []).length,
      },
      ...orderedCategories.map(({ id, name, icon, count }) => ({ id, name, icon, count })),
    ];
  }, [categories, productsQuery.data, categoryCountMap, categoryOrderMap]);

  const selectedCategoryMeta = useMemo(
    () => categoryFilterItems.find((item) => item.id === selectedCategoryId) ?? categoryFilterItems[0],
    [categoryFilterItems, selectedCategoryId],
  );

  const visibleProducts = useMemo(() => {
    const list = productsQuery.data ?? [];
    const filtered = selectedCategoryId === "ALL"
      ? list
      : list.filter((product) => product.category_id === selectedCategoryId);

    return [...filtered].sort((left, right) => {
      const leftIsTopping = isToppingCategory(left.category_name);
      const rightIsTopping = isToppingCategory(right.category_name);
      if (leftIsTopping !== rightIsTopping) return leftIsTopping ? 1 : -1;

      const leftOrder = categoryOrderMap.get(left.category_id) ?? Number.MAX_SAFE_INTEGER;
      const rightOrder = categoryOrderMap.get(right.category_id) ?? Number.MAX_SAFE_INTEGER;
      if (leftOrder !== rightOrder) return leftOrder - rightOrder;

      const leftProductOrderRaw = Number(left.product_display_order);
      const rightProductOrderRaw = Number(right.product_display_order);
      const leftProductOrder = Number.isFinite(leftProductOrderRaw) ? leftProductOrderRaw : Number.MAX_SAFE_INTEGER;
      const rightProductOrder = Number.isFinite(rightProductOrderRaw) ? rightProductOrderRaw : Number.MAX_SAFE_INTEGER;
      if (leftProductOrder !== rightProductOrder) return leftProductOrder - rightProductOrder;

      return left.name.localeCompare(right.name, "vi");
    });
  }, [productsQuery.data, selectedCategoryId, categoryOrderMap]);

  const groupedVisibleProducts = useMemo(() => {
    if (selectedCategoryId !== "ALL") return [] as Array<{
      categoryId: string;
      categoryName: string;
      items: ClientProductListItem[];
    }>;

    const groups = new Map<string, { categoryName: string; items: ClientProductListItem[] }>();
    visibleProducts.forEach((product) => {
      const existing = groups.get(product.category_id);
      if (existing) {
        existing.items.push(product);
        return;
      }
      groups.set(product.category_id, {
        categoryName: product.category_name,
        items: [product],
      });
    });

    return Array.from(groups.entries())
      .map(([categoryId, group]) => {
        const categoryMeta = categories.find((category) => category.category_id === categoryId);
        return {
          categoryId,
          categoryName: categoryMeta?.category_name ?? group.categoryName,
          items: group.items,
          categoryOrder: categoryOrderMap.get(categoryId) ?? Number.MAX_SAFE_INTEGER,
        };
      })
      .filter((group): group is { categoryId: string; categoryName: string; items: ClientProductListItem[]; categoryOrder: number } => !!group)
      .sort((left, right) => {
        const leftIsTopping = isToppingCategory(left.categoryName);
        const rightIsTopping = isToppingCategory(right.categoryName);
        if (leftIsTopping !== rightIsTopping) return leftIsTopping ? 1 : -1;

        if (left.categoryOrder !== right.categoryOrder) return left.categoryOrder - right.categoryOrder;
        return left.categoryName.localeCompare(right.categoryName, "vi");
      })
      .map(({ categoryOrder: _categoryOrder, ...group }) => group);
  }, [selectedCategoryId, visibleProducts, categories, categoryOrderMap]);

  const cartItems = useMemo<StaffCartItemView[]>(() => {
    const rawItems = getCartItems(activeCartQuery.data ?? undefined);
    const apiCartItems = rawItems.map((item, index) => {
      const itemNote = getCartItemNote(item);
      const parsed = parseCartSelectionNote(itemNote);
      const options = Array.isArray(item.options)
        ? (item.options as CartItemOption[])
        : [];
      const itemRecord = item as Record<string, unknown>;
      const productRecord =
        itemRecord.product && typeof itemRecord.product === "object"
          ? (itemRecord.product as Record<string, unknown>)
          : null;

      return {
        id: getCartItemId(item) ?? `cart-item-${index}`,
        name: getCartItemName(item),
        image: getCartItemImage(item),
        quantity: item.quantity ?? 1,
        unitPrice: getCartItemUnitPrice(item),
        lineTotal: getCartItemLineTotal(item),
        apiProductId: getCartItemProductId(item),
        apiProductFranchiseId: String(itemRecord.product_franchise_id ?? "").trim() || undefined,
        apiCategoryName: String(itemRecord.category_name ?? productRecord?.category_name ?? "").trim() || undefined,
        apiOptions: options,
        size: getCartItemSize(item),
        sugar: parsed.sugar,
        ice: parsed.ice,
        editToppings: expandToppingsForEdit(parsed.toppings),
        toppingsText:
          formatCartOptionsSummary((options as Array<{ product_franchise_id: string; quantity: number }> | undefined) ?? undefined) ||
          formatToppingsSummary(parsed.toppings),
        note: stripGeneratedCartNote(itemNote),
      };
    });

    return [...apiCartItems, ...currentDraftCartItems];
  }, [activeCartQuery.data, currentDraftCartItems]);

  const activeCartId = useMemo(
    () => String(activeCartQuery.data?._id ?? activeCartQuery.data?.id ?? "").trim(),
    [activeCartQuery.data],
  );
  const appliedVoucherCode = useMemo(
    () => getAppliedVoucherCode(activeCartQuery.data),
    [activeCartQuery.data],
  );

  const productsById = useMemo(() => {
    const map = new Map<string, ClientProductListItem>();
    (productsQuery.data ?? []).forEach((product) => {
      const id = String(product.product_id ?? "").trim();
      if (id) map.set(id, product);
    });
    return map;
  }, [productsQuery.data]);

  const productFranchiseMetaById = useMemo(() => {
    const map = new Map<string, ProductFranchiseMeta>();
    (productsQuery.data ?? []).forEach((product) => {
      (Array.isArray(product.sizes) ? product.sizes : []).forEach((size) => {
        const productFranchiseId = String(size.product_franchise_id ?? "").trim();
        if (!productFranchiseId) return;

        map.set(productFranchiseId, {
          productId: String(product.product_id ?? "").trim(),
          productName: product.name,
          image: product.image_url,
          categoryName: product.category_name,
          size: String(size.size ?? "").trim() || undefined,
          price: Number(size.price ?? 0),
        });
      });
    });
    return map;
  }, [productsQuery.data]);

  const buildDraftSelectionSignature = (payload: StaffDraftCartPayload) => {
    const optionsSignature = [...(payload.options ?? [])]
      .map((option) => ({
        product_franchise_id: String(option.product_franchise_id ?? "").trim(),
        quantity: Math.max(1, Number(option.quantity ?? 1)),
      }))
      .filter((option) => option.product_franchise_id)
      .sort((left, right) => left.product_franchise_id.localeCompare(right.product_franchise_id))
      .map((option) => `${option.product_franchise_id}:${option.quantity}`)
      .join("|");

    return [
      payload.productFranchiseId,
      String(payload.note ?? "").trim(),
      optionsSignature,
    ].join("__");
  };

  const buildDraftCartItemFromSelection = (
    menuProduct: MenuProduct,
    payload: StaffDraftCartPayload,
  ): StaffCartItemView => {
    const baseMeta = productFranchiseMetaById.get(payload.productFranchiseId);
    const parsed = parseCartSelectionNote(String(payload.note ?? ""));
    const hydratedOptions = (payload.options ?? []).reduce<CartItemOption[]>((acc, option) => {
        const optionId = String(option.product_franchise_id ?? "").trim();
        if (!optionId) return acc;
        const optionMeta = productFranchiseMetaById.get(optionId);
        acc.push({
          product_franchise_id: optionId,
          quantity: Math.max(1, Number(option.quantity ?? 1)),
          product_name: optionMeta?.productName,
          price: optionMeta?.price,
        });
        return acc;
      }, []);

    const toppingsText =
      formatCartOptionsSummary(hydratedOptions) || formatToppingsSummary(parsed.toppings);

    const toppingsTotal = hydratedOptions.reduce((sum, option) => {
      const optionPrice = Number(option.price ?? 0);
      return sum + (Number.isFinite(optionPrice) ? optionPrice : 0) * Math.max(1, Number(option.quantity ?? 1));
    }, 0);

    const quantity = Math.max(1, Number(payload.quantity ?? 1));
    const unitPrice = Math.max(0, Number(baseMeta?.price ?? menuProduct.price ?? 0)) + toppingsTotal;
    const signature = buildDraftSelectionSignature(payload);

    return {
      id: `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: menuProduct.name,
      image: menuProduct.image,
      quantity,
      unitPrice,
      lineTotal: unitPrice * quantity,
      apiProductId: String((menuProduct as { _apiProductId?: string })._apiProductId ?? "").trim() || undefined,
      apiProductFranchiseId: payload.productFranchiseId,
      apiCategoryName:
        String((menuProduct as { _apiCategoryName?: string })._apiCategoryName ?? "").trim() ||
        baseMeta?.categoryName ||
        undefined,
      apiOptions: hydratedOptions,
      size: baseMeta?.size,
      sugar: parsed.sugar,
      ice: parsed.ice,
      editToppings: expandToppingsForEdit(parsed.toppings),
      toppingsText,
      note: stripGeneratedCartNote(payload.note ? String(payload.note) : undefined),
      isLocal: true,
      draftPayload: payload,
      draftSignature: signature,
    };
  };

  useEffect(() => {
    if (!editingCartItem) return;
    if (!cartItems.some((item) => !item.isLocal && item.id === editingCartItem.apiItemId)) {
      setEditingCartItem(null);
    }
  }, [cartItems, editingCartItem]);

  const pricingSummary = useMemo(() => {
    const serverCartItems = cartItems.filter((item) => !item.isLocal);
    const draftSubtotal = currentDraftCartItems.reduce((sum, item) => sum + item.lineTotal, 0);
    const serverFallbackSubtotal = serverCartItems.reduce((sum, item) => sum + item.lineTotal, 0);
    const serverSummary = getCartPricingSummary(activeCartQuery.data ?? undefined, serverFallbackSubtotal);

    if (draftSubtotal <= 0) return serverSummary;

    return {
      ...serverSummary,
      subtotalAmount: serverSummary.subtotalAmount + draftSubtotal,
      finalAmount: serverSummary.finalAmount + draftSubtotal,
      totalDiscount: serverSummary.totalDiscount,
    };
  }, [activeCartQuery.data, cartItems, currentDraftCartItems]);
  const totalItemCount = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.quantity, 0),
    [cartItems],
  );

  useEffect(() => {
    setVoucherError("");
    if (appliedVoucherCode) {
      setVoucherCodeInput("");
    }
  }, [activeCartId, appliedVoucherCode, effectiveFranchiseId, selectedCustomer?.id]);

  const syncDraftCartMutation = useMutation({
    mutationFn: async (payload: {
      customerId: string;
      franchiseId: string;
      items: StaffCartItemView[];
    }) => {
      const items = payload.items
        .map((item) => item.draftPayload)
        .filter((item): item is StaffDraftCartPayload => !!item)
        .map((item) => ({
          product_franchise_id: item.productFranchiseId,
          quantity: item.quantity,
          note: item.note,
          options: item.options,
        }));

      if (!items.length) return null;

      return posService.addBulkProductsToCart({
        customer_id: payload.customerId,
        franchise_id: payload.franchiseId,
        items,
      });
    },
    onSuccess: async (_data, variables) => {
      clearDraftCartItemsForFranchise(variables.franchiseId);
      await queryClient.invalidateQueries({
        queryKey: ["staff-order-active-cart", variables.customerId, variables.franchiseId],
      });
    },
    onError: (error) => {
      showError(error instanceof Error ? error.message : "Không thể đồng bộ giỏ tạm vào customer.");
    },
  });

  const applyVoucherMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCustomer) {
        throw new Error("Vui lòng chọn customer trước khi áp voucher.");
      }

      const voucherCode = voucherCodeInput.trim().toUpperCase();
      if (!voucherCode) {
        throw new Error("Vui lòng nhập mã voucher.");
      }

      let cartId = activeCartId;
      if (!cartId && currentDraftCartItems.length > 0) {
        const synced = await syncDraftCartToCustomer(selectedCustomer);
        if (!synced) {
          throw new Error("Không thể đồng bộ giỏ tạm trước khi áp voucher.");
        }

        const refreshedCart = await activeCartQuery.refetch();
        cartId = String(refreshedCart.data?._id ?? refreshedCart.data?.id ?? "").trim();
      }

      if (!cartId) {
        throw new Error("Cart hiện tại chưa sẵn sàng để áp voucher.");
      }

      await cartClient.applyVoucher(cartId, voucherCode);
      return cartId;
    },
    onMutate: () => {
      setVoucherError("");
    },
    onSuccess: async () => {
      setVoucherCodeInput("");
      await queryClient.invalidateQueries({
        queryKey: ["staff-order-active-cart", selectedCustomer?.id, effectiveFranchiseId],
      });
      showSuccess("Áp dụng voucher thành công.");
    },
    onError: (error) => {
      const message = getErrorMessage(error, "Mã voucher không hợp lệ hoặc đã hết hạn.");
      const normalizedMessage = normalizeText(message);
      if (normalizedMessage.includes("voucher not found")) {
        setVoucherError("Không tìm thấy voucher.");
        return;
      }

      setVoucherError(message);
    },
  });

  const removeVoucherMutation = useMutation({
    mutationFn: async () => {
      if (!activeCartId) {
        throw new Error("Không tìm thấy cart để gỡ voucher.");
      }

      await cartClient.removeVoucher(activeCartId);
    },
    onMutate: () => {
      setVoucherError("");
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["staff-order-active-cart", selectedCustomer?.id, effectiveFranchiseId],
      });
      showSuccess("Đã gỡ voucher khỏi cart.");
    },
    onError: (error) => {
      setVoucherError(getErrorMessage(error, "Không thể gỡ voucher khỏi cart."));
    },
  });

  const cancelCartMutation = useMutation({
    mutationFn: async () => {
      if (activeCartId) {
        await cartClient.cancelCart(activeCartId);
      }
    },
    onMutate: () => {
      setVoucherError("");
    },
    onSuccess: async () => {
      clearDraftCartItemsForFranchise(effectiveFranchiseId);
      setVoucherCodeInput("");
      setIsCheckoutDialogOpen(false);
      if (activeCartId) {
        await queryClient.invalidateQueries({
          queryKey: ["staff-order-active-cart", selectedCustomer?.id, effectiveFranchiseId],
        });
      }
      showSuccess("Đã hủy giỏ hiện tại.");
    },
    onError: (error) => {
      showError(getErrorMessage(error, "Không thể hủy giỏ hiện tại."));
    },
  });

  const syncDraftCartToCustomer = async (customer: POSCustomerSearchResult) => {
    if (!effectiveFranchiseId || currentDraftCartItems.length === 0) return true;

    showGlobalLoading("Đang đồng bộ giỏ tạm vào customer...");
    try {
      await syncDraftCartMutation.mutateAsync({
        customerId: customer.id,
        franchiseId: effectiveFranchiseId,
        items: currentDraftCartItems,
      });
      return true;
    } catch {
      return false;
    } finally {
      hideGlobalLoading();
    }
  };

  const applySelectedCustomer = (customer: POSCustomerSearchResult) => {
    setSelectedCustomer(customer);
    setCustomerKeyword(customer.phone || customer.name);
    setShowCreateCustomerForm(false);
    setIsCustomerSearchOpen(false);

    void syncDraftCartToCustomer(customer);
  };

  const createCustomerMutation = useMutation({
    mutationFn: async () => {
      const name = createCustomerForm.name.trim();
      const phone = createCustomerForm.phone.trim();
      const email = createCustomerForm.email.trim();

      if (!name) throw new Error("Vui lòng nhập tên customer.");
      if (!phone) throw new Error("Vui lòng nhập số điện thoại customer.");
      if (!effectiveFranchiseId) {
        throw new Error("Vui lòng chọn franchise trước khi tạo customer.");
      }
      if (!franchiseAddressForCreate) {
        throw new Error("Không lấy được địa chỉ từ franchise hiện tại.");
      }

      return posService.createCustomer({
        name,
        phone,
        email: email || undefined,
        address: franchiseAddressForCreate,
      });
    },
    onSuccess: async (createdCustomer) => {
      const selected = toCustomerSelection(createdCustomer);
      applySelectedCustomer(selected);
      setCreateCustomerForm({ name: "", phone: "", email: "" });
      await queryClient.invalidateQueries({ queryKey: ["staff-order-customer-search"] });
      showSuccess("Đã tạo customer mới tại quầy.");
    },
    onError: (error) => showError(error instanceof Error ? error.message : "Không thể tạo customer mới."),
  });

  const addProductMutation = useMutation({
    mutationFn: async (payload: {
      franchiseId: string;
      productFranchiseId: string;
      quantity: number;
      note?: string;
      options?: Array<{ product_franchise_id: string; quantity: number }>;
      menuProduct?: MenuProduct | null;
    }) => {
      if (!selectedCustomer?.id) {
        if (!payload.menuProduct) {
          throw new Error("Không xác định được sản phẩm để thêm vào giỏ tạm.");
        }

        const draftPayload: StaffDraftCartPayload = {
          productFranchiseId: payload.productFranchiseId,
          quantity: payload.quantity,
          note: payload.note,
          options: payload.options,
        };

        const nextDraftItem = buildDraftCartItemFromSelection(payload.menuProduct, draftPayload);

        setDraftCartItemsByFranchise((current) => {
          const currentItems = current[payload.franchiseId] ?? [];
          const existingIndex = currentItems.findIndex(
            (item) => item.draftSignature === nextDraftItem.draftSignature,
          );

          const nextItems =
            existingIndex >= 0
              ? currentItems.map((item, index) =>
                  index !== existingIndex
                    ? item
                    : {
                        ...item,
                        quantity: item.quantity + payload.quantity,
                        lineTotal: item.unitPrice * (item.quantity + payload.quantity),
                        draftPayload: item.draftPayload
                          ? {
                              ...item.draftPayload,
                              quantity: item.quantity + payload.quantity,
                            }
                          : item.draftPayload,
                      },
                )
              : [...currentItems, nextDraftItem];

          return {
            ...current,
            [payload.franchiseId]: nextItems,
          };
        });

        return null;
      }

      return posService.addProductToCart({
        customer_id: selectedCustomer.id,
        franchise_id: payload.franchiseId,
        product_franchise_id: payload.productFranchiseId,
        quantity: payload.quantity,
        note: payload.note,
        options: payload.options,
      });
    },
    onSuccess: async (_data) => {
      if (!selectedCustomer?.id) return;
      await queryClient.invalidateQueries({ queryKey: ["staff-order-active-cart", selectedCustomer?.id, effectiveFranchiseId] });
      if (checkoutPaymentLoadingActiveRef.current) {
        await Promise.all([
          waitForNextPaint(),
          new Promise((resolve) => window.setTimeout(resolve, 520)),
        ]);
        checkoutPaymentLoadingActiveRef.current = false;
        hideGlobalLoading();
      }
    },
  });

  const cartRemoveMutation = useMutation({
    mutationFn: async (item: StaffCartItemView) => {
      if (item.isLocal) {
        if (!effectiveFranchiseId) return;
        setDraftCartItemsByFranchise((current) => ({
          ...current,
          [effectiveFranchiseId]: (current[effectiveFranchiseId] ?? []).filter((entry) => entry.id !== item.id),
        }));
        return;
      }

      await posService.deleteCartItem(item.id);
    },
    onMutate: (item) => {
      setRemovingCartItemId(item.id);
    },
    onSuccess: async (_data, item) => {
      showSuccess(item.isLocal ? "Đã xóa sản phẩm khỏi giỏ tạm." : "Đã xóa sản phẩm khỏi cart.");
      if (item.isLocal) return;
      await queryClient.invalidateQueries({ queryKey: ["staff-order-active-cart", selectedCustomer?.id, effectiveFranchiseId] });
      await queryClient.invalidateQueries({ queryKey: ["pending-payments-page", effectiveFranchiseId] });
    },
    onError: (error) => showError(error instanceof Error ? error.message : "Không thể xóa sản phẩm."),
    onSettled: () => {
      setRemovingCartItemId(null);
    },
  });

  const checkoutMutation = useMutation({
    mutationFn: async (forcedCartId?: string) => {
      if (!selectedCustomer?.id) throw new Error("Vui lòng chọn khách hàng.");
      const cartId = String(forcedCartId ?? activeCartQuery.data?._id ?? activeCartQuery.data?.id ?? "").trim();
      if (!cartId) throw new Error("Cart hiện tại không hợp lệ.");

      await posService.checkoutCart(cartId, {});
      const order = await posService.getOrderByCartId(cartId);
      if (!order) throw new Error("Checkout thành công nhưng chưa lấy được order.");

      const orderId = resolveRecordId(order);
      if (!orderId) throw new Error("Order vừa tạo không có id.");

      const payment = await posService.getPaymentByOrderId(orderId);
      return { order, payment };
    },
    onSuccess: async ({ order, payment }) => {
      const orderId = resolveRecordId(order);
      const orderCode = resolveOrderCode(order, orderId);
      const paymentId = resolveRecordId(payment);

      setPaymentModal({
        open: true,
        orderId,
        orderCode,
        paymentId,
        amount: pricingSummary.finalAmount,
        method: "CASH",
        providerTxnId: "",
      });
      setIsCheckoutDialogOpen(false);

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["staff-order-active-cart", selectedCustomer?.id, effectiveFranchiseId] }),
        queryClient.invalidateQueries({ queryKey: ["pending-payments-page", effectiveFranchiseId] }),
      ]);
      await queryClient.refetchQueries({
        queryKey: ["pending-payments-page", effectiveFranchiseId],
        type: "active",
      });
      showSuccess("Checkout cart thành công. Mời xác nhận phương thức thanh toán.");
    },
    onError: (error) => {
      if (checkoutPaymentLoadingActiveRef.current) {
        checkoutPaymentLoadingActiveRef.current = false;
        hideGlobalLoading();
      }
      showError(error instanceof Error ? error.message : "Checkout cart thất bại.");
    },
  });

  const confirmPaymentMutation = useMutation({
    mutationFn: async () => {
      if (!paymentModal.paymentId) {
        throw new Error("Không tìm thấy paymentId để xác nhận thanh toán.");
      }

      const paymentMethodForApi = paymentModal.method === "VNPAY" ? "CARD" : "CASH";
      await posService.confirmPayment(paymentModal.paymentId, {
        method: paymentMethodForApi,
        providerTxnId: paymentModal.providerTxnId.trim() || undefined,
      });
    },
    onSuccess: async () => {
      showSuccess("Thanh toán đã được xác nhận.");
      setPaymentModal(EMPTY_PAYMENT_MODAL_STATE);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["staff-order-active-cart", selectedCustomer?.id, effectiveFranchiseId] }),
        queryClient.invalidateQueries({ queryKey: ["pending-payments-page", effectiveFranchiseId] }),
      ]);
      await queryClient.refetchQueries({
        queryKey: ["pending-payments-page", effectiveFranchiseId],
        type: "active",
      });
    },
    onError: (error) => showError(error instanceof Error ? error.message : "Không thể xác nhận thanh toán."),
  });

  const handleSelectCustomer = (customer: POSCustomerSearchResult) => {
    applySelectedCustomer(customer);
  };

  const handleClearSelectedCustomer = () => {
    setSelectedCustomer(null);
    setCustomerKeyword("");
    setIsCustomerSearchOpen(false);
  };

  const handleOpenCreateCustomerForm = () => {
    const trimmedKeyword = customerKeyword.trim();
    const compactKeyword = trimmedKeyword.replace(/\s+/g, "");
    const looksLikePhone = /^[+]?\d{8,15}$/.test(compactKeyword);

    setCreateCustomerForm((current) => ({
      name: current.name || (looksLikePhone ? "" : trimmedKeyword),
      phone: current.phone || (looksLikePhone ? compactKeyword : ""),
      email: current.email,
    }));
    setIsCustomerSearchOpen(false);
    setShowCreateCustomerForm(true);
  };

  const handleOpenProduct = (product: ClientProductListItem) => {
    if (!selectedFranchise) {
      showError("Vui lòng chọn franchise trước.");
      return;
    }

    setProductModal(toMenuProduct(product, selectedFranchise.id, selectedFranchise.name));
  };

  const handleCheckout = async () => {
    if (!selectedCustomer) {
      showError("Vui lòng chọn customer trước khi checkout.");
      return;
    }
    if (!cartItems.length) {
      showError("Cart đang trống.");
      return;
    }
    if (syncDraftCartMutation.isPending) {
      return;
    }

    let cartId = activeCartId;
    if (currentDraftCartItems.length > 0) {
      const synced = await syncDraftCartToCustomer(selectedCustomer);
      if (!synced) return;

      const refreshedCart = await activeCartQuery.refetch();
      cartId = String(refreshedCart.data?._id ?? refreshedCart.data?.id ?? "").trim();
    }

    if (!cartId) {
      showError("Cart hiện tại không hợp lệ.");
      return;
    }

    checkoutPaymentLoadingActiveRef.current = true;
    showGlobalLoading("Đang chuyển sang thanh toán...");
    checkoutMutation.mutate(cartId);
  };

  const handleOpenCartItemEdit = (item: StaffCartItemView) => {
    if (item.isLocal) {
      showError("Hãy chọn customer trước để đồng bộ giỏ tạm rồi mới sửa món.");
      return;
    }
    if (!effectiveFranchiseId) {
      showError("Vui lòng chọn franchise trước khi sửa sản phẩm.");
      return;
    }

    const matchedProduct = item.apiProductId ? productsById.get(item.apiProductId) : undefined;
    const menuProduct = matchedProduct
      ? toMenuProduct(matchedProduct, effectiveFranchiseId, selectedFranchise?.name)
      : Object.assign(
          {
            id: hashStringToInt(`${item.id}-${effectiveFranchiseId}`),
            sku: "",
            name: item.name,
            description: "",
            content: "",
            price: item.unitPrice,
            image: item.image,
            images: [],
            categoryId: 0,
            rating: 0,
            reviewCount: 0,
            isAvailable: true,
            isFeatured: false,
          } as MenuProduct,
          {
            _apiFranchiseId: effectiveFranchiseId,
            _apiFranchiseName: selectedFranchise?.name,
            _apiProductId: item.apiProductId,
            _apiCategoryName: item.apiCategoryName,
            _apiSizes: [],
          },
        );

    setEditingCartItem({
      menuProduct,
      apiItemId: item.id,
      cartId: activeCartId,
      initialQuantity: item.quantity,
      initialApiOptions: item.apiOptions,
      initialSelection: {
        size: item.size,
        productFranchiseId: item.apiProductFranchiseId,
        sugar: item.sugar,
        ice: item.ice,
        toppings: item.editToppings,
        note: item.note ?? undefined,
      },
    });
  };

  const handleSelectFranchise = (franchiseId: string) => {
    if (franchiseId !== effectiveFranchiseId) {
      setIsFranchiseLoadingMinElapsed(false);
      setPendingFranchiseViewId(franchiseId);
    }
    setSelectedFranchiseId(franchiseId);
    setSelectedCategoryId("ALL");
    setIsFranchiseSelectOpen(false);
    setFranchiseSearchKeyword("");
  };

  const canManageVoucher =
    !!selectedCustomer &&
    (!!activeCartId || currentDraftCartItems.length > 0);
  const isVoucherBusy =
    applyVoucherMutation.isPending ||
    removeVoucherMutation.isPending;
  const canCancelCurrentCart =
    cartItems.length > 0 &&
    !cancelCartMutation.isPending &&
    !checkoutMutation.isPending &&
    !syncDraftCartMutation.isPending;
  const canCheckoutCurrentCart =
    !!selectedCustomer &&
    cartItems.length > 0 &&
    !checkoutMutation.isPending &&
    !syncDraftCartMutation.isPending;
  const checkoutHint = !selectedCustomer
    ? "Chọn customer để mở checkout."
    : currentDraftCartItems.length > 0
      ? "Cart sẽ được đồng bộ trước khi checkout."
      : "";
  const footerNotice = !selectedCustomer && cartItems.length > 0
    ? "Giỏ hiện tại đang là giỏ tạm. Chọn customer để hệ thống đồng bộ cart và mở checkout."
    : checkoutHint;

  const handleOpenCheckoutDialog = async () => {
    if (cartItems.length === 0 || checkoutDialogOpeningRef.current) return;

    checkoutDialogOpeningRef.current = true;
    showGlobalLoading("Đang mở checkout...");

    try {
      setIsCheckoutDialogOpen(true);
      await Promise.all([
        waitForNextPaint(),
        new Promise((resolve) => window.setTimeout(resolve, 520)),
      ]);
    } finally {
      checkoutDialogOpeningRef.current = false;
      hideGlobalLoading();
    }
  };

  const handleOpenPendingPayment = (payment: PaymentData) => {
    const paymentId = resolveRecordId(payment);
    const orderId = String(payment.order_id ?? "").trim();

    if (!paymentId) {
      showError("Không tìm thấy dữ liệu thanh toán để mở lại.");
      return;
    }
    if (openingPendingPaymentId === paymentId) return;

    setOpeningPendingPaymentId(paymentId);
    showGlobalLoading("Đang mở thanh toán...");

    void (async () => {
      try {
        const freshPayment = await paymentClient.getPaymentById(paymentId);
        const nextPayment = freshPayment ?? payment;
        if (!isPendingPaymentStatus(nextPayment.status)) {
          await queryClient.invalidateQueries({ queryKey: ["pending-payments-page", effectiveFranchiseId] });
          await queryClient.refetchQueries({
            queryKey: ["pending-payments-page", effectiveFranchiseId],
            type: "active",
          });
          showError("Khoản thanh toán này không còn ở trạng thái chờ.");
          return;
        }
        const nextOrderId = String(nextPayment.order_id ?? orderId).trim();
        if (!nextOrderId) {
          throw new Error("Không tìm thấy mã đơn để mở lại thanh toán.");
        }

        setPaymentModal({
          open: true,
          orderId: nextOrderId,
          orderCode: getPendingPaymentDisplayCode(nextPayment) || nextOrderId,
          paymentId,
          amount: Number(nextPayment.amount ?? payment.amount ?? 0),
          method: toStaffPaymentMethod(nextPayment.method),
          providerTxnId: String(nextPayment.provider_txn_id ?? nextPayment.providerTxnId ?? "").trim(),
        });
        await Promise.all([
          waitForNextPaint(),
          new Promise((resolve) => window.setTimeout(resolve, 520)),
        ]);
      } catch (error) {
        showError(error instanceof Error ? error.message : "Không thể mở lại thanh toán.");
      } finally {
        setOpeningPendingPaymentId(null);
        hideGlobalLoading();
      }
    })();
  };

  const handleOpenPendingPaymentsPage = async () => {
    const nextSearchParams = new URLSearchParams();
    if (effectiveFranchiseId) {
      nextSearchParams.set("franchiseId", effectiveFranchiseId);
    }

    showGlobalLoading("Đang mở trang payment...");

    try {
      if (effectiveFranchiseId) {
        await queryClient.invalidateQueries({ queryKey: ["pending-payments-page", effectiveFranchiseId] });
        await queryClient.fetchQuery({
          queryKey: ["pending-payments-page", effectiveFranchiseId],
          queryFn: () => paymentClient.getPaymentsByFranchiseId(effectiveFranchiseId),
          staleTime: 0,
        });
      }

      navigate(
        `${ROUTER_URL.ADMIN}/${ROUTER_URL.ADMIN_ROUTES.PENDING_PAYMENTS}${nextSearchParams.toString() ? `?${nextSearchParams.toString()}` : ""}`,
      );
    } catch {
      hideGlobalLoading();
      showError("Không thể tải danh sách payment mới nhất.");
    }
  };

  const selectedCustomerName = selectedCustomerProfileQuery.data?.name ?? selectedCustomer?.name ?? "";
  const selectedCustomerPhone = selectedCustomerProfileQuery.data?.phone ?? selectedCustomer?.phone ?? "";
  const resumePaymentId = searchParams.get("resumePaymentId")?.trim() ?? "";
  const resumeOrderId = searchParams.get("resumeOrderId")?.trim() ?? "";
  const resumeFranchiseId = searchParams.get("resumeFranchiseId")?.trim() ?? "";

  useEffect(() => {
    if (cartItems.length > 0) return;
    setIsCheckoutDialogOpen(false);
  }, [cartItems.length]);

  useEffect(() => {
    if (!resumePaymentId) {
      resumePaymentHandledRef.current = "";
      return;
    }

    if (resumeFranchiseId && effectiveFranchiseId !== resumeFranchiseId) {
      if (selectedFranchiseId !== resumeFranchiseId) {
        setSelectedFranchiseId(resumeFranchiseId);
      }
      return;
    }

    if (resumePaymentHandledRef.current === resumePaymentId) return;

    resumePaymentHandledRef.current = resumePaymentId;
    handleOpenPendingPayment({
      id: resumePaymentId,
      order_id: resumeOrderId || undefined,
      franchise_id: resumeFranchiseId || undefined,
    });

    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.delete("resumePaymentId");
    nextSearchParams.delete("resumeOrderId");
    nextSearchParams.delete("resumeFranchiseId");
    setSearchParams(nextSearchParams, { replace: true });
  }, [
    effectiveFranchiseId,
    handleOpenPendingPayment,
    resumeFranchiseId,
    resumeOrderId,
    resumePaymentId,
    searchParams,
    selectedFranchiseId,
    setSearchParams,
  ]);

  if (!hasAccess) {
    return (
      <div className="rounded-[28px] border border-slate-200 bg-white p-10 text-center shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-400">Staff Order</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950">Bạn không có quyền truy cập trang này</h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-500">
          Trang Staff Order chỉ dành cho tài khoản ADMIN, MANAGER hoặc STAFF trong admin panel.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <section className="relative z-[90] rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex flex-col gap-4">
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Staff Order Workspace</h1>

            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="w-full lg:w-[320px]">
                <label className="franchise-picker-kicker mb-2.5 block text-sm font-semibold uppercase tracking-[0.22em]">
                  Payment Hub
                </label>
                <button
                  type="button"
                  onClick={handleOpenPendingPaymentsPage}
                  className="group relative flex w-full overflow-hidden rounded-[22px] border border-amber-200/70 bg-[linear-gradient(135deg,#1f2937_0%,#111827_18%,#f59e0b_100%)] p-[1px] shadow-[0_18px_45px_rgba(245,158,11,0.28)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_55px_rgba(245,158,11,0.34)] focus:outline-none focus:ring-4 focus:ring-amber-200/40"
                >
                  <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.28),transparent_42%),radial-gradient(circle_at_bottom_right,rgba(251,191,36,0.2),transparent_38%)] opacity-90" />
                  <span className="relative flex min-h-[60px] w-full items-center justify-between gap-3 rounded-[21px] bg-[linear-gradient(135deg,rgba(15,23,42,0.94)_0%,rgba(30,41,59,0.86)_55%,rgba(120,53,15,0.82)_100%)] px-4 py-3.5 text-left text-white backdrop-blur-md">
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/12 bg-white/10 text-amber-200 shadow-inner shadow-white/10">
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h18M6 12h12M9 17h6" />
                        </svg>
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[10px] font-semibold uppercase tracking-[0.22em] text-amber-200/90">
                          Trang payment
                        </span>
                        <span className="mt-1 block truncate text-sm font-bold tracking-[0.01em] text-white">
                          Mở ngay
                        </span>
                      </span>
                    </span>
                    <span className="inline-flex shrink-0 items-center justify-center rounded-full border border-amber-200/30 bg-amber-300/14 p-2 text-amber-100">
                      <svg
                        className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </span>
                  </span>
                </button>
              </div>

              <div className="franchise-picker-shell w-full lg:w-[320px]">
                <label className="franchise-picker-kicker mb-2.5 block text-sm font-semibold uppercase tracking-[0.22em]">
                  Franchise
                </label>
                <div className="relative z-[120]" ref={franchiseSelectWrapperRef}>
                  <button
                    type="button"
                    onClick={() => {
                      if (managerFranchiseId) return;
                      setIsFranchiseSelectOpen((prev) => !prev);
                    }}
                    disabled={!!managerFranchiseId}
                    className={cn(
                      "franchise-picker-trigger flex w-full items-center justify-between gap-3 rounded-[22px] border px-4 py-3.5 text-left transition",
                      "focus:border-amber-300 focus:outline-none focus:ring-4 focus:ring-amber-200/35",
                      managerFranchiseId && "cursor-not-allowed opacity-90",
                      isFranchiseSelectOpen && !managerFranchiseId && "franchise-picker-trigger-open",
                    )}
                    aria-haspopup="listbox"
                    aria-expanded={isFranchiseSelectOpen}
                  >
                    <span className="franchise-picker-trigger-copy min-w-0 flex-1">
                      <span className="franchise-picker-title-row flex items-center gap-2">
                        <span className="franchise-picker-title-text truncate">
                          {selectedFranchise?.name ?? "Chọn franchise"}
                        </span>
                      </span>
                      <span className="franchise-picker-trigger-meta mt-1 block truncate text-xs">
                        {managerFranchiseId
                          ? "Franchise được khóa theo tài khoản hiện tại"
                          : selectedFranchise?.code
                            ? `Mã chi nhánh: ${selectedFranchise.code}`
                            : franchisesQuery.isLoading
                              ? "Đang tải danh sách franchise..."
                              : "Chọn chi nhánh để tải menu và cart"}
                      </span>
                    </span>

                    <span className="flex items-center gap-2">
                      <span className="franchise-picker-badge rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]">
                        {managerFranchiseId
                          ? "Locked"
                          : selectedFranchise?.code || `${(franchisesQuery.data ?? []).length} CN`}
                      </span>
                      <span
                        className={cn(
                          "franchise-picker-chevron flex h-8 w-8 items-center justify-center rounded-full transition",
                          isFranchiseSelectOpen && "franchise-picker-chevron-open",
                        )}
                        aria-hidden="true"
                      >
                        <svg viewBox="0 0 20 20" className="h-4 w-4">
                          <path
                            d="m5 7.5 5 5 5-5"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </span>
                    </span>
                  </button>

                  {isFranchiseSelectOpen && !managerFranchiseId && (
                    <div className="franchise-picker-panel absolute left-0 right-0 top-[calc(100%+8px)] z-[140] overflow-hidden rounded-[24px] border p-3 shadow-2xl">
                      <div className="franchise-picker-panel-head mb-3 flex items-center justify-between gap-3 px-1">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-100/80">
                            Danh sách franchise
                          </p>
                          <p className="mt-1 text-sm font-medium text-slate-200/90">
                            Tìm nhanh theo tên hoặc mã chi nhánh
                          </p>
                        </div>
                        <span className="franchise-picker-badge rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]">
                          {(franchisesQuery.data ?? []).length} mục
                        </span>
                      </div>

                      <div className="franchise-picker-search-shell mb-3 flex items-center gap-3 rounded-2xl border px-3 py-2.5">
                        <span className="franchise-picker-search-icon flex h-8 w-8 items-center justify-center rounded-full" aria-hidden="true">
                          <svg viewBox="0 0 20 20" className="h-4 w-4">
                            <circle cx="9" cy="9" r="5.4" fill="none" stroke="currentColor" strokeWidth="1.6" />
                            <path
                              d="M13.2 13.2 17 17"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.6"
                              strokeLinecap="round"
                            />
                          </svg>
                        </span>
                        <input
                          value={franchiseSearchKeyword}
                          onChange={(event) => setFranchiseSearchKeyword(event.target.value)}
                          placeholder="Tìm franchise theo tên hoặc mã..."
                          className="franchise-picker-search min-w-0 flex-1 bg-transparent text-sm outline-none"
                        />
                      </div>

                      <div className="franchise-picker-scroll max-h-[340px] space-y-2 overflow-y-auto overscroll-contain pr-1" role="listbox">
                        {franchisesQuery.isLoading ? (
                          <div className="franchise-picker-empty rounded-2xl border px-4 py-5 text-sm">
                            Đang tải danh sách franchise...
                          </div>
                        ) : filteredFranchises.length === 0 ? (
                          <div className="franchise-picker-empty rounded-2xl border px-4 py-5 text-sm">
                            Không tìm thấy franchise phù hợp với từ khóa hiện tại.
                          </div>
                        ) : (
                          filteredFranchises.map((franchise: ClientFranchiseItem) => {
                            const active = franchise.id === effectiveFranchiseId;
                            return (
                              <button
                                key={franchise.id}
                                type="button"
                                onClick={() => handleSelectFranchise(franchise.id)}
                                className={cn(
                                  "franchise-picker-option flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition",
                                  active && "franchise-picker-option-active",
                                )}
                                role="option"
                                aria-selected={active}
                              >
                                <span className="franchise-picker-option-copy min-w-0 flex-1">
                                  <span className="franchise-picker-option-name block truncate text-sm font-semibold">
                                    {franchise.name}
                                  </span>
                                  <span className="franchise-picker-option-sub mt-1 block truncate text-xs">
                                    Mã chi nhánh: {franchise.code || "N/A"}
                                  </span>
                                </span>
                                <span
                                  className={cn(
                                    "franchise-picker-option-pill rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]",
                                    active && "franchise-picker-option-pill-active",
                                  )}
                                >
                                  {active ? "Đã chọn" : franchise.code || "CN"}
                                </span>
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <p className="text-sm font-medium leading-6 text-slate-500">
              Các payment chưa thanh toán sẽ hiển thị ở đây để bạn mở lại và tiếp tục thanh toán.
            </p>
          </div>
        </section>

        <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_380px]">
            <section className="relative overflow-visible rounded-2xl border border-slate-200 bg-white p-5">
              <div ref={categoryStickySentinelRef} className="pointer-events-none -mb-px h-px w-full" aria-hidden />
              <div
                ref={categoryStickyShellRef}
                className={cn(
                  "category-sticky-shell sticky top-0 z-40 rounded-2xl border border-slate-200 bg-white p-3",
                  isCategoryStickyActive && "category-sticky-shell-active",
                )}
              >
                <div className="w-full max-w-[360px]">
                  <p className="mb-3 px-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Danh mục</p>
                  <div className="relative" ref={categorySelectWrapperRef}>
                    <button
                      type="button"
                      onClick={() => setIsCategorySelectOpen((prev) => !prev)}
                      disabled={!effectiveFranchiseId}
                      className={cn(
                        "category-select-trigger category-select-option-active flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-sm transition",
                        "focus:border-amber-400 focus:ring-4 focus:ring-amber-100",
                        !effectiveFranchiseId && "cursor-not-allowed opacity-60",
                      )}
                      aria-haspopup="listbox"
                      aria-expanded={isCategorySelectOpen}
                    >
                      <span className="flex items-center gap-2 font-semibold">
                        <span>{selectedCategoryMeta?.icon ?? "🍽️"}</span>
                        <span>{selectedCategoryMeta?.name ?? "Tất cả"}</span>
                      </span>
                      <span className="category-select-badge category-select-badge-active rounded-full px-2 py-0.5 text-xs font-bold">
                        {selectedCategoryMeta?.count ?? 0}
                      </span>
                    </button>

                    {isCategorySelectOpen && (
                      <div className="category-select-panel absolute left-0 right-0 top-[calc(100%+8px)] z-[70] max-h-[420px] overflow-y-auto overscroll-contain rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                        <div className="space-y-2" role="listbox">
                          {categoryFilterItems.map((item) => {
                            const active = selectedCategoryId === item.id;
                            return (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => {
                                  setSelectedCategoryId(item.id);
                                  setIsCategorySelectOpen(false);
                                }}
                                className={cn(
                                  "category-select-option flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-sm transition",
                                  active
                                    ? "category-select-option-active border-amber-300 bg-amber-100 text-amber-900"
                                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
                                )}
                              >
                                <span className="flex items-center gap-2 font-semibold">
                                  <span>{item.icon}</span>
                                  <span>{item.name}</span>
                                </span>
                                <span
                                  className={cn(
                                    "category-select-badge rounded-full px-2 py-0.5 text-xs font-bold",
                                    active ? "category-select-badge-active bg-amber-200 text-amber-900" : "bg-slate-100 text-slate-600",
                                  )}
                                >
                                  {item.count}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {!effectiveFranchiseId ? (
                <div className="mt-5 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
                  Vui lòng chọn franchise để tải menu sản phẩm.
                </div>
              ) : productsQuery.isLoading ? (
                <div className="relative z-0 mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div key={index} className="h-72 animate-pulse rounded-xl bg-slate-100" />
                  ))}
                </div>
              ) : visibleProducts.length === 0 ? (
                <div className="mt-5 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
                  Không có sản phẩm phù hợp với category hiện tại.
                </div>
              ) : selectedCategoryId === "ALL" ? (
                <div className="relative z-0 mt-5 space-y-6">
                  {groupedVisibleProducts.map((group) => (
                    <section key={group.categoryId} className="space-y-3">
                      <div className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-200 px-3 py-1 text-xs font-bold text-amber-900 shadow-sm">
                        <span>{getCategoryIcon(group.categoryName)}</span>
                        <span>{group.categoryName}</span>
                        <span className="text-[11px] text-amber-800">({group.items.length})</span>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {group.items.map((product) => (
                          <ProductCard key={`${product.product_id}-${product.SKU}`} product={product} onSelect={handleOpenProduct} />
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              ) : (
                <div className="relative z-0 mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {visibleProducts.map((product) => (
                    <ProductCard key={`${product.product_id}-${product.SKU}`} product={product} onSelect={handleOpenProduct} />
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white px-5 pb-5 pt-1 flex min-h-0 flex-col self-start overflow-hidden lg:sticky lg:top-0 lg:h-[calc(100dvh-8rem)] lg:max-h-[calc(100dvh-8rem)]">
              <div className="hidden mb-4 items-center justify-between gap-3 border-b border-slate-100 pb-4 pt-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Cart</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {totalItemCount > 0 ? `${totalItemCount} món trong giỏ` : "Giỏ hàng hiện tại"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleOpenCheckoutDialog()}
                  disabled={cartItems.length === 0}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition",
                    cartItems.length > 0
                      ? "bg-amber-500 text-white shadow-sm shadow-amber-200 hover:bg-amber-600"
                      : "cursor-not-allowed bg-slate-100 text-slate-400",
                  )}
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Xác nhận
                </button>
              </div>

              <div className="shrink-0">
              {!selectedCustomer && (
                <div className="relative" ref={customerSearchWrapperRef}>
                  <label className="mb-2 block text-sm font-semibold text-slate-800">Search customer theo SĐT / tên</label>
                  <input
                    value={customerKeyword}
                    onClick={() => setIsCustomerSearchOpen(true)}
                    onFocus={() => setIsCustomerSearchOpen(true)}
                    onChange={(event) => {
                      setCustomerKeyword(event.target.value);
                      setIsCustomerSearchOpen(true);
                    }}
                    placeholder="VD: 0909..., Nguyễn Văn A"
                    className="customer-search-input w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
                  />

                  {isCustomerSearchOpen && (
                    <div className="customer-search-panel absolute left-0 right-0 top-full z-30 mt-2 max-h-80 space-y-2 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                      {(customerSearchQuery.data ?? []).map((customer) => (
                        <button
                          key={customer.id}
                          type="button"
                          onClick={() => handleSelectCustomer(customer)}
                          className="customer-search-option w-full rounded-lg border border-slate-200 bg-white p-3 text-left transition hover:border-slate-300 hover:shadow-sm"
                        >
                          <div className="flex items-start gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-slate-900">{customer.name}</p>
                              <p className="mt-1 text-xs text-slate-500">{customer.phone}</p>
                              {customer.email && <p className="mt-1 text-xs text-slate-400">{customer.email}</p>}
                              {customer.address && <p className="mt-1 text-xs text-slate-400">{customer.address}</p>}
                            </div>
                          </div>
                        </button>
                      ))}

                      {customerSearchQuery.data && customerSearchQuery.data.length === 0 && (
                        <div className="customer-search-empty rounded-lg border border-dashed border-slate-200 bg-white p-3 text-sm text-slate-500">
                          <p>Không tìm thấy customer phù hợp với từ khóa hiện tại.</p>
                          <button
                            type="button"
                            onClick={handleOpenCreateCustomerForm}
                            className="customer-search-create mt-3 rounded-lg border border-sky-200 bg-white px-3 py-2 text-xs font-semibold text-sky-700 transition hover:bg-sky-50"
                          >
                            Tạo customer mới với thông tin đang nhập
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {selectedCustomer && (
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Customer</p>
                  <div className="mt-2 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-slate-900">{selectedCustomerName}</p>
                      <p className="mt-1 text-sm text-slate-500">SĐT: {selectedCustomerPhone || "--"}</p>
                      {selectedCustomerProfileQuery.isLoading && (
                        <p className="mt-1 text-xs text-slate-500">Đang đồng bộ profile customer...</p>
                      )}
                      {selectedCustomerProfileQuery.isError && (
                        <p className="mt-1 text-xs text-rose-600">Không thể tải chi tiết profile.</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={handleClearSelectedCustomer}
                      className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
                    >
                      Bỏ chọn
                    </button>
                  </div>
                </div>
              )}
              </div>

              <div className="staff-cart-list-shell relative mt-3 min-h-0 flex-1 overflow-hidden rounded-[20px] border border-white/12 bg-[linear-gradient(180deg,rgba(68,66,69,0.9)_0%,rgba(49,47,50,0.95)_100%)] shadow-[0_18px_42px_rgba(15,23,42,0.28)] backdrop-blur-xl">
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-[radial-gradient(circle_at_bottom,rgba(245,158,11,0.14),transparent_72%)]" />
                <div className="relative z-10 flex h-full flex-col">
                  <div className="shrink-0 border-b border-white/12 px-4 py-3">
                    <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Danh sách món</h3>
                  </div>

                  {activeCartQuery.isLoading ? (
                    <div className="flex flex-1 items-center justify-center px-4 py-8 text-center text-sm text-slate-500">Đang tải cart...</div>
                  ) : cartItems.length === 0 ? (
                    <div className="flex flex-1 items-center justify-center px-4 py-8 text-center text-sm text-slate-500">
                      {selectedCustomer
                        ? "Cart đang trống. Hãy thêm món từ menu bên trái."
                        : "Chưa chọn customer. Bạn vẫn có thể thêm món từ menu bên trái, nhưng chỉ checkout sau khi chọn khách."}
                    </div>
                  ) : (
                    <div className="min-h-0 flex-1 overflow-y-auto p-3 pr-2">
                      <div className="space-y-3 pr-1">
                        {cartItems.map((item) => (
                          <div key={item.id} className="staff-cart-item-card rounded-[18px] border border-white/10 bg-[rgba(69,67,70,0.84)] p-3 shadow-[0_12px_28px_rgba(15,23,42,0.18)] backdrop-blur-lg">
                            <div className="flex gap-2.5">
                              {item.image ? (
                                <img src={item.image} alt={item.name} className="h-10 w-10 rounded-lg object-cover" />
                              ) : (
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-lg">🍽️</div>
                              )}

                              <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <p className="line-clamp-1 text-sm font-semibold leading-tight text-white/95">{item.name}</p>
                                    <p className="mt-0.5 text-xs text-slate-500">🏪 {selectedFranchise?.name ?? "Hylux"}</p>
                                    {item.size && <p className="mt-0.5 text-[11px] font-medium text-sky-200">Size: {item.size}</p>}
                                    {item.isLocal && (
                                      <p className="mt-1 text-[11px] font-medium text-amber-700">Giỏ tạm - chờ gắn vào customer</p>
                                    )}
                                  </div>

                                  <div className="flex shrink-0 items-center gap-0.5">
                                    <button
                                      type="button"
                                      onClick={() => !item.isLocal && handleOpenCartItemEdit(item)}
                                      disabled={item.isLocal}
                                      className="inline-flex h-6 items-center gap-1 rounded-md border border-amber-300/20 bg-amber-300/12 px-2 text-[11px] font-medium text-amber-100 transition hover:bg-amber-300/20"
                                      title={item.isLocal ? "Chọn customer để đồng bộ rồi mới sửa món" : "Sửa món"}
                                    >
                                      <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232 18.768 8.768M7 17h3l8.5-8.5a2.121 2.121 0 0 0-3-3L7 14v3z" />
                                      </svg>
                                      <span>Sửa</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => cartRemoveMutation.mutate(item)}
                                      disabled={cartRemoveMutation.isPending}
                                      className={cn(
                                        "flex h-5 w-5 items-center justify-center rounded transition",
                                        removingCartItemId === item.id
                                          ? "cursor-wait bg-rose-400/10 text-rose-200"
                                          : "text-white/45 hover:bg-rose-400/10 hover:text-rose-200",
                                      )}
                                      aria-label="Xóa sản phẩm"
                                    >
                                      {removingCartItemId === item.id ? (
                                        <svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                        </svg>
                                      ) : (
                                        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7 18.133 19.142A2 2 0 0 1 16.138 21H7.862a2 2 0 0 1-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3M4 7h16" />
                                        </svg>
                                      )}
                                    </button>
                                  </div>
                                </div>

                                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                  {item.sugar && (
                                    <span className="rounded-full border border-white/10 bg-white/8 px-2 py-0.5 text-[11px] font-medium text-slate-200">
                                      Đường: {item.sugar}
                                    </span>
                                  )}
                                  {item.ice && (
                                    <span className="rounded-full border border-cyan-200/10 bg-cyan-300/12 px-2 py-0.5 text-[11px] font-medium text-cyan-100">
                                      Đá: {item.ice}
                                    </span>
                                  )}
                                </div>

                                {item.toppingsText && (
                                  <p className="mt-1 text-[11px] leading-tight text-amber-800">
                                    <span className="font-medium text-amber-700">Topping:</span>{" "}
                                    <span>{item.toppingsText}</span>
                                  </p>
                                )}

                                {item.note && (
                                  <p className="mt-1 text-xs italic text-slate-500"><span className="font-medium">Ghi chú:</span> {item.note}</p>
                                )}

                                <div className="mt-2 flex items-center justify-between">
                                  <span className="inline-flex items-center gap-1 rounded-md border border-amber-300/15 bg-amber-300/12 px-1.5 py-0.5 text-xs font-semibold text-amber-100">
                                    <svg className="h-2.5 w-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 2h12l1 5H5l1-5zm0 5h12l-1 13a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L6 7z" />
                                    </svg>
                                    {item.quantity}
                                  </span>
                                  <span className="text-sm font-bold text-white/95">{fmtCurrency(item.lineTotal)}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-3 flex shrink-0 items-center justify-end gap-3 border-t border-slate-100 pt-3">
                <div className="hidden">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Cart</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {totalItemCount > 0 ? `${totalItemCount} món trong giỏ` : "Giỏ hàng hiện tại"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleOpenCheckoutDialog()}
                  disabled={cartItems.length === 0}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition",
                    cartItems.length > 0
                      ? "bg-amber-500 text-white shadow-sm shadow-amber-200 hover:bg-amber-600"
                      : "cursor-not-allowed bg-slate-100 text-slate-400",
                  )}
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Xác nhận
                </button>
              </div>

            </section>
          </div>
      </div>

      <MenuProductModal
        product={productModal}
        onClose={() => setProductModal(null)}
        onSubmitSelection={async (payload) => {
          await addProductMutation.mutateAsync({
            franchiseId: payload.franchiseId,
            productFranchiseId: payload.productFranchiseId,
            quantity: payload.quantity,
            note: payload.note,
            options: payload.options,
            menuProduct: productModal,
          });
        }}
      />

      {editingCartItem && (
        <CartItemEditDialog
          product={editingCartItem.menuProduct}
          onClose={() => setEditingCartItem(null)}
          initialApiOptions={editingCartItem.initialApiOptions}
          replaceApiItemId={editingCartItem.apiItemId}
          replaceCartId={editingCartItem.cartId}
          initialQuantity={editingCartItem.initialQuantity}
          initialSelection={editingCartItem.initialSelection}
          staffRecreateContext={
            selectedCustomer?.id && effectiveFranchiseId
              ? {
                  customerId: selectedCustomer.id,
                  franchiseId: effectiveFranchiseId,
                }
              : undefined
          }
          onSaved={async () => {
            await queryClient.invalidateQueries({
              queryKey: ["staff-order-active-cart", selectedCustomer?.id, effectiveFranchiseId],
            });
            await queryClient.refetchQueries({
              queryKey: ["staff-order-active-cart", selectedCustomer?.id, effectiveFranchiseId],
              type: "active",
            });
            setEditingCartItem(null);
          }}
        />
      )}

      <CheckoutDialog
        open={isCheckoutDialogOpen}
        onClose={() => setIsCheckoutDialogOpen(false)}
        customerName={selectedCustomerName}
        customerPhone={selectedCustomerPhone}
        franchiseName={selectedFranchise?.name}
        cartItems={cartItems}
        itemCount={totalItemCount}
        pricingSummary={pricingSummary}
        appliedVoucherCode={appliedVoucherCode}
        voucherCodeInput={voucherCodeInput}
        onVoucherCodeChange={(value) => {
          setVoucherCodeInput(value);
          if (voucherError) setVoucherError("");
        }}
        onApplyVoucher={() => applyVoucherMutation.mutate()}
        onRemoveVoucher={() => removeVoucherMutation.mutate()}
        canManageVoucher={canManageVoucher}
        isVoucherBusy={isVoucherBusy}
        voucherError={voucherError}
        notice={footerNotice}
        canCancelCart={canCancelCurrentCart}
        canCheckout={canCheckoutCurrentCart}
        onCancelCart={() => cancelCartMutation.mutate()}
        onCheckout={() => void handleCheckout()}
        isCancellingCart={cancelCartMutation.isPending}
        isSyncingDraftCart={syncDraftCartMutation.isPending}
        isCheckouting={checkoutMutation.isPending}
      />

      {showCreateCustomerForm && !selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
              <div>
                <h3 className="mt-1 text-lg font-bold text-slate-900">Tạo nhanh customer mới</h3>
                <p className="mt-1 text-sm text-slate-500">Nhập thông tin cơ bản để tạo khách và chọn ngay cho đơn hiện tại.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateCustomerForm(false)}
                className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label="Đóng dialog tạo customer"
              >
                <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4 px-5 py-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">Tên customer</label>
                  <input
                    value={createCustomerForm.name}
                    onChange={(event) =>
                      setCreateCustomerForm((current) => ({ ...current, name: event.target.value }))
                    }
                    placeholder="VD: Nguyễn Văn A"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">Số điện thoại</label>
                  <input
                    value={createCustomerForm.phone}
                    onChange={(event) =>
                      setCreateCustomerForm((current) => ({ ...current, phone: event.target.value }))
                    }
                    placeholder="VD: 0909123456"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">Email</label>
                  <input
                    value={createCustomerForm.email}
                    onChange={(event) =>
                      setCreateCustomerForm((current) => ({ ...current, email: event.target.value }))
                    }
                    placeholder="VD: customer@example.com"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">Địa chỉ</label>
                  <input
                    value={franchiseAddressForCreate}
                    readOnly
                    placeholder={
                      franchiseDetailQuery.isLoading
                        ? "Đang tải địa chỉ franchise..."
                        : "Franchise hiện tại chưa có địa chỉ."
                    }
                    className={cn(
                      "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100",
                      !franchiseAddressForCreate && !franchiseDetailQuery.isLoading
                        ? "text-rose-600"
                        : "text-slate-900",
                    )}
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setShowCreateCustomerForm(false)}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => createCustomerMutation.mutate()}
                disabled={
                  createCustomerMutation.isPending ||
                  franchiseDetailQuery.isLoading ||
                  !franchiseAddressForCreate
                }
                className={cn(
                  "rounded-lg px-4 py-2 text-sm font-semibold text-white transition",
                  createCustomerMutation.isPending ||
                    franchiseDetailQuery.isLoading ||
                    !franchiseAddressForCreate
                    ? "bg-slate-400"
                    : "bg-sky-600 hover:bg-sky-700",
                )}
              >
                {createCustomerMutation.isPending ? "Đang tạo..." : "Tạo customer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {paymentModal.open && (
        <PaymentModal
          state={paymentModal}
          onClose={() => setPaymentModal((current) => ({ ...current, open: false }))}
          onChangeMethod={(method) => setPaymentModal((current) => ({ ...current, method, providerTxnId: "" }))}
          onConfirm={() => confirmPaymentMutation.mutate()}
          confirming={confirmPaymentMutation.isPending}
        />
      )}
    </>
  );
}







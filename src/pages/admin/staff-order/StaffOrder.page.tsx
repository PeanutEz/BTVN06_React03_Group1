import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LOCAL_STORAGE_KEY } from "@/const/data.const";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store";
import { useManagerFranchiseId } from "@/hooks/useManagerFranchiseId";
import { clientService } from "@/services/client.service";
import { posService, type POSCustomerSearchResult } from "@/services/pos.service";
import type { ApiCustomer } from "@/services/customer.service";
import { cartClient, formatDiscountTypeText, getCartItemId, getCartItemImage, getCartItemLineTotal, getCartItemName, getCartItemProductId, getCartItemSize, getCartItemUnitPrice, getCartItems, getCartPricingSummary, type CartItemOption } from "@/services/cart.client";
import { buildStaticPaymentQr } from "@/utils/payment-qr.util";
import { formatCartOptionsSummary, formatToppingsSummary, parseCartSelectionNote, stripGeneratedCartNote } from "@/utils/cartSelectionNote.util";
import { getItem, removeItem, setItem, showError, showSuccess } from "@/utils";
import type { IceLevel, MenuProduct, SugarLevel, Topping } from "@/types/menu.types";
import type { ClientFranchiseItem } from "@/models/store.model";
import type { ClientProductListItem } from "@/models/product.model";
import MenuProductModal from "@/components/menu/MenuProductModal";
import CartItemEditDialog from "@/components/menu/CartItemEditDialog";

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

type CreateCustomerFormState = {
  name: string;
  phone: string;
  email: string;
};

type StaffOrderCustomerPersistState = {
  keyword: string;
  selectedCustomer: POSCustomerSearchResult | null;
};

const fmtCurrency = (value: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value);

const normalizeText = (value: unknown) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

const getCategoryIcon = (name: string) => {
  const normalized = normalizeText(name);
  if (normalized.includes("ca phe") || normalized.includes("coffee")) return "☕";
  if (normalized.includes("tra sua") || normalized.includes("milk tea")) return "🧋";
  if (normalized.includes("tra")) return "🍵";
  if (normalized.includes("freeze") || normalized.includes("da xay")) return "🧊";
  if (normalized.includes("topping")) return "🍡";
  if (normalized.includes("banh")) return "🥐";
  return "🥤";
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
      emoji: "🍮",
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

function PaymentMethodCard({
  title,
  hint,
  badge,
  icon,
  active,
  onClick,
}: {
  title: string;
  hint: string;
  badge: string;
  icon: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-3xl border p-4 text-left transition-all",
        active
          ? "border-emerald-300 bg-emerald-50 shadow-sm"
          : "border-slate-200 bg-white hover:border-slate-300",
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-slate-900">{title}</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">{hint}</p>
        </div>
        <span className="inline-flex size-9 items-center justify-center rounded-2xl bg-slate-100 text-lg">
          {icon}
        </span>
      </div>
      <p className="mt-3 inline-flex rounded-full bg-slate-900/5 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-700">
        {badge}
      </p>
    </button>
  );
}

function PaymentModal({
  state,
  onClose,
  onChangeMethod,
  onChangeProviderTxnId,
  onConfirm,
  confirming,
}: {
  state: PaymentModalState;
  onClose: () => void;
  onChangeMethod: (method: StaffPaymentMethod) => void;
  onChangeProviderTxnId: (value: string) => void;
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
  const requiresTxnId = state.method === "VNPAY";
  const isConfirmDisabled = confirming || (requiresTxnId && !state.providerTxnId.trim());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-3xl rounded-[28px] bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Step 7</p>
            <h3 className="text-xl font-bold text-slate-950">Payment modal</h3>
            <p className="text-sm text-slate-500">
              Đơn <span className="font-semibold text-slate-700">{orderReference}</span> đang chờ xác nhận thanh toán.
            </p>
            <p className="inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
              Pending payment
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="grid gap-6 px-6 py-6 lg:grid-cols-[1fr_1.05fr]">
          <div className="space-y-5">
            <div className="rounded-3xl bg-slate-950 p-5 text-white">
              <p className="text-sm text-white/70">Tổng cần thanh toán</p>
              <p className="mt-2 text-3xl font-black tracking-tight">{fmtCurrency(state.amount)}</p>
              <p className="mt-3 text-xs text-white/70">Mã đơn: {orderReference}</p>
            </div>

            <div>
              <p className="mb-3 text-sm font-semibold text-slate-800">Chọn phương thức thanh toán</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <PaymentMethodCard
                  title="Tiền mặt"
                  hint="Thu tiền trực tiếp tại quầy và xác nhận hoàn tất."
                  badge="Cash"
                  icon="💵"
                  active={state.method === "CASH"}
                  onClick={() => onChangeMethod("CASH")}
                />
                <PaymentMethodCard
                  title="VNPay"
                  hint="Khách quét mã VNPay bằng app ngân hàng hoặc ví liên kết."
                  badge="QR e-wallet"
                  icon="📱"
                  active={state.method === "VNPAY"}
                  onClick={() => onChangeMethod("VNPAY")}
                />
              </div>
            </div>
          </div>

          <div className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-5">
            {state.method === "VNPAY" && qrCode ? (
              <>
                <div>
                  <p className="text-sm font-semibold text-slate-900">Quét mã để thanh toán VNPay</p>
                  <p className="mt-1 text-xs leading-5 text-slate-600">
                    Hiển thị mã này cho khách hàng quét, sau đó nhập mã giao dịch VNPay để hoàn tất xác nhận.
                  </p>
                </div>
                <div className="rounded-3xl border border-emerald-100 bg-white p-4">
                  <div className="flex justify-center">
                    <img src={qrCode} alt="VNPay QR" className="size-52 rounded-3xl border border-slate-100 bg-white p-3 shadow-sm" />
                  </div>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-800">Mã giao dịch VNPay</label>
                  <input
                    value={state.providerTxnId}
                    onChange={(event) => onChangeProviderTxnId(event.target.value)}
                    placeholder="VD: VNPAY-20260327-001"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <p className="text-sm font-semibold text-slate-900">Thanh toán tiền mặt</p>
                  <p className="mt-1 text-xs leading-5 text-slate-600">
                    Thu tiền từ khách tại quầy, kiểm tra đúng số tiền và bấm xác nhận để hoàn tất đơn hàng.
                  </p>
                </div>
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                  Gợi ý: đọc lại tổng tiền cho khách trước khi xác nhận để tránh nhầm lẫn.
                </div>
              </>
            )}
            <div className="rounded-2xl bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Trạng thái hiện tại</p>
              <p className="mt-1 text-sm font-semibold text-slate-800">
                {state.method === "VNPAY" ? "Đang chờ giao dịch VNPay" : "Sẵn sàng xác nhận thanh toán tiền mặt"}
              </p>
              <p className="mt-2 text-xs text-slate-500">Hệ thống chỉ hỗ trợ hai phương thức: tiền mặt và VNPay.</p>
            </div>
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
            onClick={onConfirm}
            disabled={isConfirmDisabled}
            className={cn(
              "rounded-2xl px-5 py-3 text-sm font-semibold text-white transition",
              isConfirmDisabled ? "bg-slate-400" : "bg-emerald-600 hover:bg-emerald-700",
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

export default function StaffOrderPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const managerFranchiseId = useManagerFranchiseId();
  const currentRole = resolveRoleName(user);
  const currentUserId = resolveUserId(user);
  const customerStorageKey = getStaffOrderCustomerStorageKey(currentUserId);

  const [selectedFranchiseId, setSelectedFranchiseId] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("ALL");
  const [isCategorySelectOpen, setIsCategorySelectOpen] = useState(false);
  const [isCategoryStickyActive, setIsCategoryStickyActive] = useState(false);
  const categorySelectWrapperRef = useRef<HTMLDivElement | null>(null);
  const categoryStickyShellRef = useRef<HTMLDivElement | null>(null);
  const categoryStickySentinelRef = useRef<HTMLDivElement | null>(null);
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
  const [removingCartItemId, setRemovingCartItemId] = useState<string | null>(null);
  const [paymentModal, setPaymentModal] = useState<PaymentModalState>({
    open: false,
    orderId: "",
    orderCode: "",
    paymentId: "",
    amount: 0,
    method: "CASH",
    providerTxnId: "",
  });

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
    const stickyTopOffset = 16;

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
      const matchedCart = carts.find((cart) => getCartFranchiseId(cart) === effectiveFranchiseId);
      if (!matchedCart) return null;

      const cartId = String(matchedCart._id ?? matchedCart.id ?? "").trim();
      if (!cartId) return matchedCart;
      return (await cartClient.getCartDetail(cartId)) ?? matchedCart;
    },
    enabled: !!selectedCustomer?.id && !!effectiveFranchiseId,
  });

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

    return rawItems.map((item, index) => {
      const parsed = parseCartSelectionNote(String(item.note ?? ""));
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
        note: stripGeneratedCartNote(item.note ? String(item.note) : undefined),
      };
    });
  }, [activeCartQuery.data]);

  const activeCartId = useMemo(
    () => String(activeCartQuery.data?._id ?? activeCartQuery.data?.id ?? "").trim(),
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

  useEffect(() => {
    if (!editingCartItem) return;
    if (!cartItems.some((item) => item.id === editingCartItem.apiItemId)) {
      setEditingCartItem(null);
    }
  }, [cartItems, editingCartItem]);

  const pricingSummary = useMemo(() => {
    const fallbackSubtotal = cartItems.reduce((sum, item) => sum + item.lineTotal, 0);
    return getCartPricingSummary(activeCartQuery.data ?? undefined, fallbackSubtotal);
  }, [activeCartQuery.data, cartItems]);

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
      setSelectedCustomer(selected);
      setCustomerKeyword(selected.phone || selected.name);
      setShowCreateCustomerForm(false);
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
    }) => {
      if (!selectedCustomer?.id) throw new Error("Vui lòng chọn khách hàng trước khi thêm món.");
      return posService.addProductToCart({
        customer_id: selectedCustomer.id,
        franchise_id: payload.franchiseId,
        product_franchise_id: payload.productFranchiseId,
        quantity: payload.quantity,
        note: payload.note,
        options: payload.options,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["staff-order-active-cart", selectedCustomer?.id, effectiveFranchiseId] });
    },
  });

  const cartRemoveMutation = useMutation({
    mutationFn: async (cartItemId: string) => {
      await posService.deleteCartItem(cartItemId);
    },
    onMutate: (cartItemId) => {
      setRemovingCartItemId(cartItemId);
    },
    onSuccess: async () => {
      showSuccess("Đã xóa sản phẩm khỏi cart.");
      await queryClient.invalidateQueries({ queryKey: ["staff-order-active-cart", selectedCustomer?.id, effectiveFranchiseId] });
    },
    onError: (error) => showError(error instanceof Error ? error.message : "Không thể xóa sản phẩm."),
    onSettled: () => {
      setRemovingCartItemId(null);
    },
  });

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCustomer?.id) throw new Error("Vui lòng chọn khách hàng.");
      const cart = activeCartQuery.data;
      const cartId = String(cart?._id ?? cart?.id ?? "").trim();
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

      await queryClient.invalidateQueries({ queryKey: ["staff-order-active-cart", selectedCustomer?.id, effectiveFranchiseId] });
      showSuccess("Checkout cart thành công. Mời xác nhận phương thức thanh toán.");
    },
    onError: (error) => showError(error instanceof Error ? error.message : "Checkout cart thất bại."),
  });

  const confirmPaymentMutation = useMutation({
    mutationFn: async () => {
      if (!paymentModal.paymentId) {
        throw new Error("Không tìm thấy paymentId để xác nhận thanh toán.");
      }

      const providerTxnId = paymentModal.providerTxnId.trim();
      if (paymentModal.method === "VNPAY" && !providerTxnId) {
        throw new Error("Vui lòng nhập mã giao dịch VNPay trước khi xác nhận.");
      }

      const paymentMethodForApi = paymentModal.method === "VNPAY" ? "CARD" : "CASH";
      await posService.confirmPayment(paymentModal.paymentId, {
        method: paymentMethodForApi,
        providerTxnId: providerTxnId || undefined,
      });
    },
    onSuccess: async () => {
      showSuccess("Thanh toán đã được xác nhận.");
      setPaymentModal((current) => ({ ...current, open: false }));
      await queryClient.invalidateQueries({ queryKey: ["staff-order-active-cart", selectedCustomer?.id, effectiveFranchiseId] });
    },
    onError: (error) => showError(error instanceof Error ? error.message : "Không thể xác nhận thanh toán."),
  });

  const handleSelectCustomer = (customer: POSCustomerSearchResult) => {
    setSelectedCustomer(customer);
    setCustomerKeyword(customer.phone || customer.name);
    setShowCreateCustomerForm(false);
    setIsCustomerSearchOpen(false);
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
    if (!selectedCustomer) {
      showError("Vui lòng chọn customer trước khi thêm món.");
      return;
    }

    setProductModal(toMenuProduct(product, selectedFranchise.id, selectedFranchise.name));
  };

  const handleCheckout = () => {
    if (!selectedCustomer) {
      showError("Vui lòng chọn customer trước khi checkout.");
      return;
    }
    if (!cartItems.length) {
      showError("Cart đang trống.");
      return;
    }
    checkoutMutation.mutate();
  };

  const handleOpenCartItemEdit = (item: StaffCartItemView) => {
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

  const selectedCustomerName = selectedCustomerProfileQuery.data?.name ?? selectedCustomer?.name ?? "";
  const selectedCustomerPhone = selectedCustomerProfileQuery.data?.phone ?? selectedCustomer?.phone ?? "";

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
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Staff Order Workspace</h1>
              <p className="mt-2 text-sm text-slate-600">
                Màn hình thao tác tại quầy: chọn khách hàng, lên món, kiểm tra giỏ, checkout và xử lý trạng thái đơn.
              </p>
            </div>

            <div className="w-full lg:w-[320px]">
              <label className="mb-2 block text-sm font-semibold text-slate-800">Franchise</label>
              <select
                value={effectiveFranchiseId}
                onChange={(event) => {
                  setSelectedFranchiseId(event.target.value);
                  setSelectedCategoryId("ALL");
                }}
                disabled={!!managerFranchiseId}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-100 disabled:bg-slate-50"
              >
                <option value="">Chọn franchise</option>
                {(franchisesQuery.data ?? []).map((franchise: ClientFranchiseItem) => (
                  <option key={franchise.id} value={franchise.id}>
                    {franchise.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_380px]">
            <section className="relative overflow-visible rounded-2xl border border-slate-200 bg-white p-5">
              <div ref={categoryStickySentinelRef} className="pointer-events-none -mb-px h-px w-full" aria-hidden />
              <div
                ref={categoryStickyShellRef}
                className={cn(
                  "category-sticky-shell sticky top-4 z-40 rounded-2xl border border-slate-200 bg-white p-3",
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
                        "category-select-trigger flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-sm transition",
                        "border-slate-300 bg-white text-slate-800 hover:border-slate-400",
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
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700">
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

            <section className="rounded-2xl border border-slate-200 bg-white p-5 lg:sticky lg:top-4 lg:self-start">

              {!selectedCustomer && (
                <div className="relative mt-4" ref={customerSearchWrapperRef}>
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
                <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
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

              <div className="mt-4 space-y-3">
                {activeCartQuery.isLoading ? (
                  <div className="rounded-xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">Đang tải cart...</div>
                ) : cartItems.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                    Cart đang trống. Hãy thêm món từ menu bên trái.
                  </div>
                ) : (
                  <div
                    className={cn(
                      "space-y-3 pr-1",
                      cartItems.length > 3 && "max-h-[620px] overflow-y-auto",
                    )}
                  >
                    {cartItems.map((item) => (
                      <div key={item.id} className="rounded-xl border border-slate-200 bg-white p-2.5">
                        <div className="flex gap-2.5">
                          {item.image ? (
                            <img src={item.image} alt={item.name} className="h-10 w-10 rounded-lg object-cover" />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-lg">🥤</div>
                          )}

                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="line-clamp-1 text-sm font-semibold leading-tight text-slate-900">{item.name}</p>
                                <p className="mt-0.5 text-xs text-slate-500">🏪 {selectedFranchise?.name ?? "Hylux"}</p>
                                {item.size && <p className="mt-0.5 text-[11px] font-medium text-blue-700">Size: {item.size}</p>}
                              </div>

                              <div className="flex shrink-0 items-center gap-0.5">
                                <button
                                  type="button"
                                  onClick={() => handleOpenCartItemEdit(item)}
                                  className="inline-flex h-6 items-center gap-1 rounded bg-amber-50 px-2 text-[11px] font-medium text-amber-700 transition hover:bg-amber-100"
                                >
                                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232 18.768 8.768M7 17h3l8.5-8.5a2.121 2.121 0 0 0-3-3L7 14v3z" />
                                  </svg>
                                  <span>Sửa</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => cartRemoveMutation.mutate(item.id)}
                                  disabled={cartRemoveMutation.isPending}
                                  className={cn(
                                    "flex h-5 w-5 items-center justify-center rounded transition",
                                    removingCartItemId === item.id
                                      ? "cursor-wait bg-rose-50 text-rose-400"
                                      : "text-slate-400 hover:bg-rose-50 hover:text-rose-500",
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
                                <span className="rounded-full bg-purple-50 px-2 py-0.5 text-[11px] font-medium text-purple-700">
                                  Đường: {item.sugar}
                                </span>
                              )}
                              {item.ice && (
                                <span className="rounded-full bg-cyan-50 px-2 py-0.5 text-[11px] font-medium text-cyan-700">
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
                              <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-semibold text-amber-800">
                                <svg className="h-2.5 w-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 2h12l1 5H5l1-5zm0 5h12l-1 13a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L6 7z" />
                                </svg>
                                {item.quantity}
                              </span>
                              <span className="text-sm font-bold text-slate-900">{fmtCurrency(item.lineTotal)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="space-y-3 text-sm text-slate-700">
                  <div className="flex items-center justify-between gap-4">
                    <span>Tạm tính</span>
                    <span>{fmtCurrency(pricingSummary.subtotalAmount)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4 text-emerald-700">
                    <span>
                      Promotion tự động
                      {formatDiscountTypeText(pricingSummary.promotionType, pricingSummary.promotionValue)}
                    </span>
                    <span>{pricingSummary.promotionDiscount > 0 ? `-${fmtCurrency(pricingSummary.promotionDiscount)}` : "Chưa áp dụng"}</span>
                  </div>
                  {pricingSummary.voucherDiscount > 0 && (
                    <div className="flex items-center justify-between gap-4 text-sky-700">
                      <span>Voucher</span>
                      <span>-{fmtCurrency(pricingSummary.voucherDiscount)}</span>
                    </div>
                  )}
                  {pricingSummary.loyaltyDiscount > 0 && (
                    <div className="flex items-center justify-between gap-4 text-amber-700">
                      <span>Loyalty discount</span>
                      <span>-{fmtCurrency(pricingSummary.loyaltyDiscount)}</span>
                    </div>
                  )}
                  <div className="border-t border-slate-200 pt-3">
                    <div className="flex items-center justify-between gap-4 text-lg font-bold text-slate-900">
                      <span>Tổng cộng</span>
                      <span>{fmtCurrency(pricingSummary.finalAmount)}</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCheckout}
                  disabled={checkoutMutation.isPending || !selectedCustomer || cartItems.length === 0}
                  className={cn(
                    "mt-4 w-full rounded-lg px-5 py-3 text-sm font-semibold transition",
                    checkoutMutation.isPending || !selectedCustomer || cartItems.length === 0
                      ? "bg-slate-200 text-slate-500"
                      : "bg-slate-900 text-white hover:bg-slate-800",
                  )}
                >
                  {checkoutMutation.isPending ? "Đang checkout..." : "Checkout cart"}
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
          onSaved={() => {
            void queryClient.invalidateQueries({
              queryKey: ["staff-order-active-cart", selectedCustomer?.id, effectiveFranchiseId],
            });
            setEditingCartItem(null);
          }}
        />
      )}

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
          onChangeProviderTxnId={(value) => setPaymentModal((current) => ({ ...current, providerTxnId: value }))}
          onConfirm={() => confirmPaymentMutation.mutate()}
          confirming={confirmPaymentMutation.isPending}
        />
      )}
    </>
  );
}

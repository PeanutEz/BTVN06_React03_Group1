import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store";
import { useManagerFranchiseId } from "@/hooks/useManagerFranchiseId";
import { clientService } from "@/services/client.service";
import { posService, type POSCustomerSearchResult } from "@/services/pos.service";
import { cartClient, formatDiscountTypeText, getCartItemId, getCartItemImage, getCartItemLineTotal, getCartItemName, getCartItemSize, getCartItemUnitPrice, getCartItems, getCartPricingSummary } from "@/services/cart.client";
import { orderClient } from "@/services/order.client";
import { buildStaticPaymentQr } from "@/utils/payment-qr.util";
import { formatCartOptionsSummary, formatToppingsSummary, parseCartSelectionNote, stripGeneratedCartNote } from "@/utils/cartSelectionNote.util";
import { showError, showSuccess } from "@/utils";
import type { MenuProduct } from "@/types/menu.types";
import type { ClientFranchiseItem, ClientCategoryByFranchiseItem } from "@/models/store.model";
import type { ClientProductListItem } from "@/models/product.model";
import type { OrderDisplay, OrderStatus } from "@/models/order.model";
import { ORDER_STATUS_COLORS, ORDER_STATUS_LABELS, ORDER_TYPE_LABELS } from "@/models/order.model";
import MenuProductModal from "@/components/menu/MenuProductModal";

type StaffPaymentMethod = "CASH" | "CARD" | "QR";

type StaffCartItemView = {
  id: string;
  name: string;
  image: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  size?: string;
  sugar?: string;
  ice?: string;
  toppingsText?: string;
  note?: string;
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

const fmtCurrency = (value: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value);

const formatDateTime = (value?: string | null) => {
  if (!value) return "--";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "--";
  return parsed.toLocaleString("vi-VN");
};

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

const hashStringToInt = (input: string) =>
  input.split("").reduce((acc, char) => ((acc * 31 + char.charCodeAt(0)) | 0), 0) >>> 0;

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
  return String(user?.user?.id ?? user?.id ?? "").trim();
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
            <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-700">Hết hàng</span>
          </div>
        )}
      </div>
      <div className="space-y-3 p-4">
        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
              <span>{getCategoryIcon(product.category_name)}</span>
              {product.category_name}
            </span>
            <span className="text-xs font-medium text-slate-400">{sizes.length || 1} size</span>
          </div>
          <h3 className="line-clamp-1 text-sm font-bold text-slate-900">{product.name}</h3>
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{product.description || "Không có mô tả"}</p>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-bold text-slate-900">{fmtCurrency(basePrice)}</span>
          <span
            className={cn(
              "rounded-full px-3 py-1 text-xs font-semibold",
              isAvailable ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-500",
            )}
          >
            Thêm món
          </span>
        </div>
      </div>
    </button>
  );
}

function PaymentMethodCard({
  title,
  hint,
  active,
  onClick,
}: {
  title: string;
  hint: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-2xl border p-4 text-left transition-all",
        active
          ? "border-amber-400 bg-amber-50 shadow-sm"
          : "border-slate-200 bg-white hover:border-slate-300",
      )}
    >
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      <p className="mt-1 text-xs leading-5 text-slate-500">{hint}</p>
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
      state.method === "QR"
        ? buildStaticPaymentQr({
            provider: "BANK",
            amount: state.amount,
            orderRef: state.orderCode || state.orderId,
            bankName: "QR Payment",
          })
        : undefined,
    [state.amount, state.method, state.orderCode, state.orderId],
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-[28px] bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Step 7</p>
            <h3 className="mt-1 text-xl font-bold text-slate-950">Payment modal</h3>
            <p className="mt-1 text-sm text-slate-500">
              Đơn <span className="font-semibold text-slate-700">{state.orderCode || state.orderId}</span> đang chờ xác nhận thanh toán.
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

        <div className="space-y-6 px-6 py-6">
          <div className="rounded-3xl bg-slate-950 p-5 text-white">
            <p className="text-sm text-white/70">Tổng cần thanh toán</p>
            <p className="mt-2 text-3xl font-black tracking-tight">{fmtCurrency(state.amount)}</p>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <PaymentMethodCard title="CASH" hint="Thu tiền mặt tại quầy và xác nhận hoàn tất." active={state.method === "CASH"} onClick={() => onChangeMethod("CASH")} />
            <PaymentMethodCard title="CARD" hint="Quẹt thẻ/POS, nhập mã giao dịch nếu có." active={state.method === "CARD"} onClick={() => onChangeMethod("CARD")} />
            <PaymentMethodCard title="QR" hint="Cho khách quét mã QR và xác nhận đã nhận tiền." active={state.method === "QR"} onClick={() => onChangeMethod("QR")} />
          </div>

          {state.method === "QR" && qrCode && (
            <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
              <p className="text-sm font-semibold text-amber-900">Mã QR thanh toán</p>
              <p className="mt-1 text-xs leading-5 text-amber-700">
                Hiển thị mã này cho khách quét. Sau khi khách thanh toán xong, bấm xác nhận bên dưới.
              </p>
              <div className="mt-4 flex justify-center">
                <img src={qrCode} alt="QR thanh toán" className="size-56 rounded-3xl border border-white bg-white p-3 shadow-sm" />
              </div>
            </div>
          )}

          {state.method !== "CASH" && (
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-800">
                {state.method === "CARD" ? "Mã giao dịch thẻ" : "Mã tham chiếu QR"}
              </label>
              <input
                value={state.providerTxnId}
                onChange={(event) => onChangeProviderTxnId(event.target.value)}
                placeholder={state.method === "CARD" ? "VD: POS-20260326-001" : "VD: QR-20260326-001"}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
              />
            </div>
          )}
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
            disabled={confirming}
            className={cn(
              "rounded-2xl px-5 py-3 text-sm font-semibold text-white transition",
              confirming ? "bg-slate-400" : "bg-emerald-600 hover:bg-emerald-700",
            )}
          >
            {confirming ? "Đang xác nhận..." : "Xác nhận thanh toán"}
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
  const staffId = resolveUserId(user);

  const [activeTab, setActiveTab] = useState<"builder" | "processing">("builder");
  const [selectedFranchiseId, setSelectedFranchiseId] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("ALL");
  const [customerKeyword, setCustomerKeyword] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<POSCustomerSearchResult | null>(null);
  const [productModal, setProductModal] = useState<MenuProduct | null>(null);
  const [paymentModal, setPaymentModal] = useState<PaymentModalState>({
    open: false,
    orderId: "",
    orderCode: "",
    paymentId: "",
    amount: 0,
    method: "CASH",
    providerTxnId: "",
  });
  const [processingStatusFilter, setProcessingStatusFilter] = useState<string>("ALL");

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

  const customerSearchQuery = useQuery({
    queryKey: ["staff-order-customer-search", debouncedCustomerKeyword],
    queryFn: () => posService.searchCustomer(debouncedCustomerKeyword),
    enabled: debouncedCustomerKeyword.trim().length >= 2,
  });

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

  const ordersQuery = useQuery({
    queryKey: ["staff-order-processing-orders", effectiveFranchiseId],
    queryFn: () => orderClient.getOrdersByFranchiseId(effectiveFranchiseId),
    enabled: !!effectiveFranchiseId,
    staleTime: 5_000,
  });

  const categories = useMemo(() => {
    const list = categoriesQuery.data ?? [];
    return [...list].sort((left, right) => left.display_order - right.display_order);
  }, [categoriesQuery.data]);

  const visibleProducts = useMemo(() => {
    const list = productsQuery.data ?? [];
    if (selectedCategoryId === "ALL") return list;
    return list.filter((product) => product.category_id === selectedCategoryId);
  }, [productsQuery.data, selectedCategoryId]);

  const cartItems = useMemo<StaffCartItemView[]>(() => {
    const rawItems = getCartItems(activeCartQuery.data ?? undefined);

    return rawItems.map((item, index) => {
      const parsed = parseCartSelectionNote(String(item.note ?? ""));
      return {
        id: getCartItemId(item) ?? `cart-item-${index}`,
        name: getCartItemName(item),
        image: getCartItemImage(item),
        quantity: item.quantity ?? 1,
        unitPrice: getCartItemUnitPrice(item),
        lineTotal: getCartItemLineTotal(item),
        size: getCartItemSize(item),
        sugar: parsed.sugar,
        ice: parsed.ice,
        toppingsText:
          formatCartOptionsSummary((item.options as Array<{ product_franchise_id: string; quantity: number }> | undefined) ?? undefined) ||
          formatToppingsSummary(parsed.toppings),
        note: stripGeneratedCartNote(item.note ? String(item.note) : undefined),
      };
    });
  }, [activeCartQuery.data]);

  const pricingSummary = useMemo(() => {
    const fallbackSubtotal = cartItems.reduce((sum, item) => sum + item.lineTotal, 0);
    return getCartPricingSummary(activeCartQuery.data ?? undefined, fallbackSubtotal);
  }, [activeCartQuery.data, cartItems]);

  const filteredOrders = useMemo(() => {
    const list = ordersQuery.data ?? [];
    const next = [...list].sort(
      (left, right) =>
        new Date(String(right.created_at ?? "")).getTime() -
        new Date(String(left.created_at ?? "")).getTime(),
    );

    if (processingStatusFilter === "ALL") return next;
    return next.filter((order) => String(order.status) === processingStatusFilter);
  }, [ordersQuery.data, processingStatusFilter]);

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

  const cartQuantityMutation = useMutation({
    mutationFn: async ({ cartItemId, quantity }: { cartItemId: string; quantity: number }) => {
      await posService.updateCartItemQuantity(cartItemId, quantity);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["staff-order-active-cart", selectedCustomer?.id, effectiveFranchiseId] });
    },
    onError: (error) => showError(error instanceof Error ? error.message : "Không thể cập nhật số lượng."),
  });

  const cartRemoveMutation = useMutation({
    mutationFn: async (cartItemId: string) => {
      await posService.deleteCartItem(cartItemId);
    },
    onSuccess: async () => {
      showSuccess("Đã xóa sản phẩm khỏi cart.");
      await queryClient.invalidateQueries({ queryKey: ["staff-order-active-cart", selectedCustomer?.id, effectiveFranchiseId] });
    },
    onError: (error) => showError(error instanceof Error ? error.message : "Không thể xóa sản phẩm."),
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

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["staff-order-active-cart", selectedCustomer?.id, effectiveFranchiseId] }),
        queryClient.invalidateQueries({ queryKey: ["staff-order-processing-orders", effectiveFranchiseId] }),
      ]);
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
      if (paymentModal.method !== "CASH" && !providerTxnId) {
        throw new Error("Vui lòng nhập mã giao dịch trước khi xác nhận.");
      }

      await posService.confirmPayment(paymentModal.paymentId, {
        method: paymentModal.method,
        providerTxnId: providerTxnId || undefined,
      });
    },
    onSuccess: async () => {
      showSuccess("Thanh toán đã được xác nhận.");
      setPaymentModal((current) => ({ ...current, open: false }));
      setActiveTab("processing");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["staff-order-active-cart", selectedCustomer?.id, effectiveFranchiseId] }),
        queryClient.invalidateQueries({ queryKey: ["staff-order-processing-orders", effectiveFranchiseId] }),
      ]);
    },
    onError: (error) => showError(error instanceof Error ? error.message : "Không thể xác nhận thanh toán."),
  });

  const orderActionMutation = useMutation({
    mutationFn: async ({ orderId, action }: { orderId: string; action: "CONFIRM" | "PREPARING" | "READY" | "COMPLETE" }) => {
      switch (action) {
        case "CONFIRM":
          return orderClient.setConfirmed(orderId);
        case "PREPARING":
          return orderClient.setPreparing(orderId);
        case "READY":
          return orderClient.setReadyForPickup(orderId, staffId ? { staff_id: staffId } : undefined);
        case "COMPLETE":
          return orderClient.setCompleted(orderId);
        default:
          return null;
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["staff-order-processing-orders", effectiveFranchiseId] });
    },
    onError: (error) => showError(error instanceof Error ? error.message : "Không thể cập nhật trạng thái order."),
  });

  const handleSelectCustomer = (customer: POSCustomerSearchResult) => {
    setSelectedCustomer(customer);
    setCustomerKeyword(customer.phone || customer.name);
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

  const renderOrderAction = (order: OrderDisplay) => {
    const orderId = String(order._id ?? order.id ?? "").trim();
    if (!orderId) return null;

    if (order.status === "PENDING" || order.status === "DRAFT") {
      return (
        <button
          type="button"
          onClick={() => orderActionMutation.mutate({ orderId, action: "CONFIRM" })}
          className="rounded-2xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
        >
          Xác nhận đơn
        </button>
      );
    }

    if (order.status === "CONFIRMED") {
      return (
        <button
          type="button"
          onClick={() => orderActionMutation.mutate({ orderId, action: "PREPARING" })}
          className="rounded-2xl bg-amber-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-amber-600"
        >
          Chuyển PREPARING
        </button>
      );
    }

    if (order.status === "PREPARING") {
      return (
        <button
          type="button"
          onClick={() => orderActionMutation.mutate({ orderId, action: "READY" })}
          className="rounded-2xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700"
        >
          Ready for pickup
        </button>
      );
    }

    if (order.status === "READY_FOR_PICKUP") {
      return (
        <button
          type="button"
          onClick={() => orderActionMutation.mutate({ orderId, action: "COMPLETE" })}
          className="rounded-2xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-blue-700"
        >
          Hoàn thành
        </button>
      );
    }

    return null;
  };

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
      <div className="space-y-6">
        <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950 p-8 text-white shadow-xl">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-200/80">Admin / Staff Order</p>
              <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Staff Order Workspace</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                Một màn dành riêng cho nhân viên tạo đơn tại quầy: tìm khách hàng, chọn menu theo franchise, review cart,
                checkout, thanh toán và đẩy order sang xử lý.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setActiveTab("builder")}
                className={cn(
                  "rounded-2xl px-5 py-4 text-left transition",
                  activeTab === "builder"
                    ? "bg-white text-slate-950 shadow-lg"
                    : "bg-white/10 text-white hover:bg-white/15",
                )}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-inherit/70">Flow 1-7</p>
                <p className="mt-1 text-lg font-bold">Build Staff Order</p>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("processing")}
                className={cn(
                  "rounded-2xl px-5 py-4 text-left transition",
                  activeTab === "processing"
                    ? "bg-white text-slate-950 shadow-lg"
                    : "bg-white/10 text-white hover:bg-white/15",
                )}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-inherit/70">Flow 8</p>
                <p className="mt-1 text-lg font-bold">Order Processing</p>
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="grid gap-4 md:grid-cols-2 xl:w-[720px]">
              <div>
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

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-800">Search customer theo SĐT / tên</label>
                <input
                  value={customerKeyword}
                  onChange={(event) => setCustomerKeyword(event.target.value)}
                  placeholder="VD: 0909..., Nguyễn Văn A"
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
                />
              </div>
            </div>

            <div className="rounded-3xl bg-slate-50 px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Current context</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">
                Role: <span className="text-amber-600">{currentRole || "UNKNOWN"}</span>
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Franchise scope: {selectedFranchise?.name ?? "Chưa chọn"}
              </p>
            </div>
          </div>

          {debouncedCustomerKeyword.trim().length >= 2 && !selectedCustomer && (
            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {(customerSearchQuery.data ?? []).map((customer) => (
                <button
                  key={customer.id}
                  type="button"
                  onClick={() => handleSelectCustomer(customer)}
                  className="rounded-3xl border border-slate-200 bg-white p-4 text-left transition hover:border-amber-300 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-slate-900">{customer.name}</p>
                      <p className="mt-1 text-xs text-slate-500">{customer.phone}</p>
                      {customer.email && <p className="mt-1 text-xs text-slate-400">{customer.email}</p>}
                    </div>
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                      {customer.loyalty_points ?? 0} điểm
                    </span>
                  </div>
                </button>
              ))}
              {customerSearchQuery.data && customerSearchQuery.data.length === 0 && (
                <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
                  Không tìm thấy customer phù hợp với từ khóa hiện tại.
                </div>
              )}
            </div>
          )}

          {selectedCustomer && (
            <div className="mt-5 flex flex-col gap-4 rounded-[28px] border border-emerald-200 bg-emerald-50 p-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-600">Step 1 complete</p>
                <h2 className="mt-1 text-xl font-bold text-emerald-950">{selectedCustomer.name}</h2>
                <p className="mt-1 text-sm text-emerald-800">
                  {selectedCustomer.phone}
                  {selectedCustomer.email ? ` • ${selectedCustomer.email}` : ""}
                  {selectedCustomer.loyalty_points != null ? ` • ${selectedCustomer.loyalty_points} điểm` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                className="rounded-2xl border border-emerald-300 bg-white px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
              >
                Bỏ chọn customer
              </button>
            </div>
          )}
        </section>

        {activeTab === "builder" ? (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_420px]">
            <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Step 2 + Step 3</p>
                  <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">Menu theo franchise</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Chọn category và bấm vào sản phẩm để mở modal custom, sau đó món sẽ được add thẳng vào cart của customer đã chọn.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedCategoryId("ALL")}
                    className={cn(
                      "rounded-full px-4 py-2 text-sm font-semibold transition",
                      selectedCategoryId === "ALL"
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                    )}
                  >
                    Tất cả
                  </button>
                  {categories.map((category: ClientCategoryByFranchiseItem) => (
                    <button
                      key={category.category_id}
                      type="button"
                      onClick={() => setSelectedCategoryId(category.category_id)}
                      className={cn(
                        "rounded-full px-4 py-2 text-sm font-semibold transition",
                        selectedCategoryId === category.category_id
                          ? "bg-amber-500 text-white"
                          : "bg-amber-50 text-amber-700 hover:bg-amber-100",
                      )}
                    >
                      {getCategoryIcon(category.category_name)} {category.category_name}
                    </button>
                  ))}
                </div>
              </div>

              {!effectiveFranchiseId ? (
                <div className="mt-6 rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center text-sm text-slate-500">
                  Vui lòng chọn franchise để tải menu sản phẩm.
                </div>
              ) : productsQuery.isLoading ? (
                <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div key={index} className="h-72 animate-pulse rounded-3xl bg-slate-100" />
                  ))}
                </div>
              ) : visibleProducts.length === 0 ? (
                <div className="mt-6 rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center text-sm text-slate-500">
                  Không có sản phẩm phù hợp với category hiện tại.
                </div>
              ) : (
                <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {visibleProducts.map((product) => (
                    <ProductCard key={`${product.product_id}-${product.SKU}`} product={product} onSelect={handleOpenProduct} />
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Step 4 + 5 + 6</p>
                <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">Cart review & checkout</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Update quantity, remove item và theo dõi promotion tự động apply trực tiếp từ cart backend.
                </p>
              </div>

              <div className="mt-6 rounded-3xl bg-slate-50 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Customer / Franchise</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  {selectedCustomer?.name ?? "Chưa chọn customer"}
                </p>
                <p className="mt-1 text-sm text-slate-500">{selectedFranchise?.name ?? "Chưa chọn franchise"}</p>
              </div>

              <div className="mt-5 space-y-3">
                {activeCartQuery.isLoading ? (
                  <div className="rounded-3xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">Đang tải cart...</div>
                ) : cartItems.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                    Cart đang trống. Hãy thêm món từ menu bên trái.
                  </div>
                ) : (
                  cartItems.map((item) => (
                    <div key={item.id} className="rounded-3xl border border-slate-200 bg-white p-4">
                      <div className="flex gap-3">
                        {item.image ? (
                          <img src={item.image} alt={item.name} className="size-16 rounded-2xl object-cover" />
                        ) : (
                          <div className="flex size-16 items-center justify-center rounded-2xl bg-slate-100 text-2xl">🥤</div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-bold text-slate-900">{item.name}</p>
                              <p className="mt-1 text-xs text-slate-500">
                                {item.size ? `Size ${item.size}` : "Default size"}
                                {item.sugar ? ` • Đường ${item.sugar}` : ""}
                                {item.ice ? ` • Đá ${item.ice}` : ""}
                              </p>
                              {item.toppingsText && (
                                <p className="mt-1 text-xs text-amber-700">Topping: {item.toppingsText}</p>
                              )}
                              {item.note && (
                                <p className="mt-1 text-xs italic text-slate-500">Ghi chú: {item.note}</p>
                              )}
                            </div>
                            <p className="text-sm font-bold text-slate-900">{fmtCurrency(item.lineTotal)}</p>
                          </div>

                          <div className="mt-4 flex items-center justify-between gap-3">
                            <div className="flex items-center overflow-hidden rounded-2xl border border-slate-200">
                              <button
                                type="button"
                                onClick={() => cartQuantityMutation.mutate({ cartItemId: item.id, quantity: Math.max(1, item.quantity - 1) })}
                                disabled={cartQuantityMutation.isPending || item.quantity <= 1}
                                className="px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
                              >
                                -
                              </button>
                              <span className="border-x border-slate-200 px-3 py-2 text-sm font-semibold text-slate-900">{item.quantity}</span>
                              <button
                                type="button"
                                onClick={() => cartQuantityMutation.mutate({ cartItemId: item.id, quantity: item.quantity + 1 })}
                                disabled={cartQuantityMutation.isPending}
                                className="px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
                              >
                                +
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={() => cartRemoveMutation.mutate(item.id)}
                              disabled={cartRemoveMutation.isPending}
                              className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-100 disabled:opacity-50"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="mt-6 rounded-[28px] bg-slate-950 p-5 text-white">
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between gap-4 text-white/75">
                    <span>Tạm tính</span>
                    <span>{fmtCurrency(pricingSummary.subtotalAmount)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4 text-emerald-300">
                    <span>
                      Promotion tự động
                      {formatDiscountTypeText(pricingSummary.promotionType, pricingSummary.promotionValue)}
                    </span>
                    <span>{pricingSummary.promotionDiscount > 0 ? `-${fmtCurrency(pricingSummary.promotionDiscount)}` : "Chưa áp dụng"}</span>
                  </div>
                  {pricingSummary.voucherDiscount > 0 && (
                    <div className="flex items-center justify-between gap-4 text-sky-300">
                      <span>Voucher</span>
                      <span>-{fmtCurrency(pricingSummary.voucherDiscount)}</span>
                    </div>
                  )}
                  {pricingSummary.loyaltyDiscount > 0 && (
                    <div className="flex items-center justify-between gap-4 text-amber-300">
                      <span>Loyalty discount</span>
                      <span>-{fmtCurrency(pricingSummary.loyaltyDiscount)}</span>
                    </div>
                  )}
                  <div className="border-t border-white/10 pt-3">
                    <div className="flex items-center justify-between gap-4 text-lg font-black">
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
                    "mt-5 w-full rounded-2xl px-5 py-3 text-sm font-semibold transition",
                    checkoutMutation.isPending || !selectedCustomer || cartItems.length === 0
                      ? "bg-white/15 text-white/50"
                      : "bg-amber-500 text-slate-950 hover:bg-amber-400",
                  )}
                >
                  {checkoutMutation.isPending ? "Đang checkout..." : "Checkout cart"}
                </button>
              </div>
            </section>
          </div>
        ) : (
          <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Step 8</p>
                <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">Order processing</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Theo dõi order theo franchise và đẩy trạng thái từ PENDING/CONFIRMED sang PREPARING, READY_FOR_PICKUP và COMPLETED.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {["ALL", "PENDING", "CONFIRMED", "PREPARING", "READY_FOR_PICKUP", "COMPLETED"].map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setProcessingStatusFilter(status)}
                    className={cn(
                      "rounded-full px-4 py-2 text-sm font-semibold transition",
                      processingStatusFilter === status
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                    )}
                  >
                    {status === "ALL" ? "Tất cả" : ORDER_STATUS_LABELS[status as OrderStatus] ?? status}
                  </button>
                ))}
              </div>
            </div>

            {ordersQuery.isLoading ? (
              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="h-56 animate-pulse rounded-3xl bg-slate-100" />
                ))}
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="mt-6 rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center text-sm text-slate-500">
                Chưa có order nào khớp với franchise / status hiện tại.
              </div>
            ) : (
              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                {filteredOrders.map((order) => {
                  const orderId = String(order._id ?? order.id ?? "");
                  const customerName = String(order.customer?.name ?? order.customer_name ?? "Khách lẻ");
                  const customerPhone = String(order.customer?.phone ?? order.phone ?? "");
                  const totalAmount = Number(order.final_amount ?? order.total_amount ?? 0);

                  return (
                    <article key={orderId} className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                            {ORDER_TYPE_LABELS[order.type] ?? order.type}
                          </p>
                          <h3 className="mt-2 text-lg font-bold text-slate-950">{order.code || orderId}</h3>
                          <p className="mt-1 text-sm text-slate-500">{selectedFranchise?.name ?? order.franchise_name ?? "Franchise"}</p>
                        </div>
                        <span className={cn("rounded-full border px-3 py-1 text-xs font-semibold", ORDER_STATUS_COLORS[order.status] ?? "bg-slate-100 text-slate-600 border-slate-200")}>
                          {ORDER_STATUS_LABELS[order.status] ?? order.status}
                        </span>
                      </div>

                      <div className="mt-5 grid gap-3 rounded-3xl bg-slate-50 p-4 text-sm text-slate-600">
                        <div className="flex items-center justify-between gap-4">
                          <span>Khách hàng</span>
                          <span className="font-semibold text-slate-900">{customerName}</span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span>SĐT</span>
                          <span className="font-semibold text-slate-900">{customerPhone || "--"}</span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span>Tổng tiền</span>
                          <span className="font-semibold text-slate-900">{fmtCurrency(totalAmount)}</span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span>Created at</span>
                          <span className="font-semibold text-slate-900">{formatDateTime(order.created_at)}</span>
                        </div>
                      </div>

                      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap gap-2">{renderOrderAction(order)}</div>
                        <p className="text-xs text-slate-400">Order ID: {orderId}</p>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}
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

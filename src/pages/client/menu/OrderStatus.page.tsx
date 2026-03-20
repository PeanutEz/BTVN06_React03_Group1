import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { ROUTER_URL } from "@/routes/router.const";
import { orderClient } from "@/services/order.client";
import { deliveryClient, type DeliveryData } from "@/services/delivery.client";
import { paymentClient, type PaymentData } from "@/services/payment.client";
import type { OrderDisplay } from "@/models/order.model";
import type { OrderStatus as ApiOrderStatus } from "@/models/order.model";
import {
  ORDER_STATUS_CONFIG,
  DELIVERY_STATUS_STEPS,
  type DeliveryOrderStatus,
} from "@/types/delivery.types";

function toNumber(v: unknown): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v === "string") {
    const num = Number(v);
    return Number.isFinite(num) ? num : 0;
  }
  return 0;
}

const fmt = (n: unknown) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(toNumber(n));

function formatItemOptions(options: unknown): string | null {
  if (!options) return null;

  // Backend order_items thường trả về options dạng mảng object: [{ name: "...", ... }, ...]
  if (Array.isArray(options)) {
    const parts = options
      .map((opt: any) => {
        if (!opt) return null;
        if (typeof opt === "string") return opt;
        if (typeof opt === "object") return opt.name ?? opt.option_name ?? opt.label ?? null;
        return null;
      })
      .filter(Boolean) as string[];
    return parts.length ? parts.join(", ") : null;
  }

  // Fallback: cấu trúc giống cart item (Checkout): { size, sugar, ice, toppings: [{ name }] }
  if (typeof options === "object") {
    const obj = options as any;
    const parts: string[] = [];
    if (obj.size) parts.push(`Size ${obj.size}`);
    if (obj.sugar != null) parts.push(`${obj.sugar} đường`);
    if (obj.ice != null) parts.push(String(obj.ice));
    if (Array.isArray(obj.toppings) && obj.toppings.length > 0) {
      const toppingNames = obj.toppings
        .map((t: any) => t?.name ?? t)
        .filter(Boolean)
        .map(String);
      if (toppingNames.length) parts.push(toppingNames.join(", "));
    }
    return parts.length ? parts.join(" · ") : null;
  }

  return null;
}

/** Map API order status to delivery timeline status */
function apiOrderStatusToDeliveryStatus(apiStatus: ApiOrderStatus): DeliveryOrderStatus {
  const map: Record<ApiOrderStatus, DeliveryOrderStatus> = {
    DRAFT: "PENDING",
    CONFIRMED: "CONFIRMED",
    PREPARING: "PREPARING",
    READY_FOR_PICKUP: "READY",
    COMPLETED: "COMPLETED",
    CANCELLED: "CANCELLED",
  };
  return map[apiStatus] ?? "PENDING";
}

type ApiDelivery = DeliveryData;

function deliveryApiStatusToTimelineStatus(delivery: ApiDelivery | null): DeliveryOrderStatus | null {
  const raw = String(delivery?.status ?? "").toUpperCase();
  if (!raw) return null;
  // API delivery endpoints: /pickup, /complete → status thường chứa PICKUP / COMPLETE
  if (raw.includes("COMPLETE") || raw.includes("DELIVERED") || raw === "COMPLETED") return "COMPLETED";
  if (raw.includes("PICKUP") || raw.includes("SHIPPING") || raw.includes("DELIVERING")) return "DELIVERING";
  if (raw.includes("CANCEL")) return "CANCELLED";
  return null;
}

function getDeliveryTimelineStatus(order: OrderDisplay, delivery: ApiDelivery | null): DeliveryOrderStatus {
  if (order.status === "CANCELLED") return "CANCELLED";
  if (order.status === "COMPLETED") return "COMPLETED";

  const fromDelivery = deliveryApiStatusToTimelineStatus(delivery);
  if (fromDelivery) return fromDelivery;

  // Fallback (delivery flow): when order is ready, it transitions to delivering
  if (order.status === "READY_FOR_PICKUP") return "DELIVERING";

  const base = apiOrderStatusToDeliveryStatus(order.status);
  return base === "READY" ? "DELIVERING" : base;
}

function StatusTimeline({
  steps,
  currentStatus,
}: {
  steps: DeliveryOrderStatus[];
  currentStatus: DeliveryOrderStatus;
}) {
  const currentIdx = steps.indexOf(currentStatus);
  const isCancelled = currentStatus === "CANCELLED";

  return (
    <div className="relative">
      {/* Connector line */}
      <div className="absolute left-5 top-5 bottom-5 w-0.5 bg-gray-100" />

      <div className="space-y-6">
        {steps.map((step, idx) => {
          const cfg = ORDER_STATUS_CONFIG[step];
          const isDone = !isCancelled && idx <= currentIdx;
          const isCurrent = !isCancelled && idx === currentIdx;

          return (
            <div key={step} className="relative flex items-start gap-4 pl-0">
              {/* Circle indicator */}
              <div
                className={cn(
                  "relative z-10 w-10 h-10 rounded-full flex items-center justify-center shrink-0 border-2 transition-all duration-500",
                  isCurrent
                    ? "border-amber-500 bg-amber-500 shadow-lg shadow-amber-200 scale-110"
                    : isDone
                    ? "border-emerald-500 bg-emerald-500"
                    : "border-gray-200 bg-white",
                )}
              >
                {isDone ? (
                  isCurrent ? (
                    <span className="text-lg animate-pulse">{cfg.icon}</span>
                  ) : (
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  )
                ) : (
                  <span className="text-gray-300 text-lg">{cfg.icon}</span>
                )}
              </div>

              {/* Text */}
              <div className="flex-1 pb-2">
                <p
                  className={cn(
                    "font-semibold text-sm transition-colors",
                    isCurrent ? "text-amber-700" : isDone ? "text-gray-900" : "text-gray-400",
                  )}
                >
                  {cfg.label}
                </p>
                {isCurrent && (
                  <p className="text-xs text-amber-600 mt-0.5 animate-pulse">{cfg.description}</p>
                )}
              </div>
            </div>
          );
        })}

        {/* Cancelled state */}
        {isCancelled && (
          <div className="relative flex items-start gap-4">
            <div className="relative z-10 w-10 h-10 rounded-full flex items-center justify-center shrink-0 border-2 border-red-500 bg-red-500">
              <span className="text-lg">❌</span>
            </div>
            <div className="flex-1 pb-2">
              <p className="font-semibold text-sm text-red-700">{ORDER_STATUS_CONFIG.CANCELLED.label}</p>
              <p className="text-xs text-red-500 mt-0.5">{ORDER_STATUS_CONFIG.CANCELLED.description}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function OrderStatusFromApi({
  order,
  delivery,
  payment,
  fmt,
}: {
  order: OrderDisplay;
  delivery: ApiDelivery | null;
  payment: PaymentData | null;
  fmt: (n: unknown) => string;
}) {
  const mappedStatus = getDeliveryTimelineStatus(order, delivery);
  const statusCfg = ORDER_STATUS_CONFIG[mappedStatus];
  const steps = DELIVERY_STATUS_STEPS;

  const rawItems = (order as any).items ??
    (order as any).order?.items ??
    (order as any).order?.orderItems ??
    (order as any).order?.order_items ??
    (order as any).order?.items_snapshot ??
    (order as any).order?.order_items_snapshot ??
    (order as any).order_items ??
    (order as any).orderItems ??
    (order as any).items_snapshot ??
    (order as any).order_items_snapshot ??
    (order as any).products ??
    (order as any).product_items ??
    [];

  const sumFromItems = (rawItems as any[]).reduce((acc, it: any) => {
    const qty = toNumber(it.quantity ?? it.qty ?? 0);
    const priceSnapshot = toNumber(it.price_snapshot ?? it.price ?? it.unit_price ?? 0);
    const lineTotal = toNumber(it.line_total ?? it.lineTotal ?? it.total ?? 0) || priceSnapshot * qty;
    return acc + lineTotal;
  }, 0);

  const subtotalAmount = toNumber((order as any).subtotal_amount ?? sumFromItems);
  const promotionDiscount = toNumber((order as any).promotion_discount ?? 0);
  const voucherDiscount = toNumber((order as any).voucher_discount ?? 0);
  const loyaltyDiscount = toNumber((order as any).loyalty_discount ?? 0);

  const finalAmount =
    toNumber((order as any).final_amount ?? (order as any).total_amount) ||
    subtotalAmount -
      promotionDiscount -
      voucherDiscount -
      loyaltyDiscount;

  const customerName =
    order.customer?.name ?? (order as any).customer_name ?? "—";
  const phone = order.phone ?? order.customer?.phone ?? "—";
  const franchiseName = order.franchise?.name ?? (order as any).franchise_name ?? "—";

  return (
    <div className="-mx-4 sm:-mx-6 lg:-mx-8 -my-8 sm:-my-10 lg:-my-12 bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <nav className="flex items-center gap-2 text-sm text-gray-400 mb-5">
          <Link to="/" className="hover:text-gray-600">Trang chủ</Link>
          <span>/</span>
          <Link to="/menu" className="hover:text-gray-600">Menu</Link>
          <span>/</span>
          <span className="text-gray-900 font-medium">Đơn #{order.code}</span>
        </nav>
        <div className={cn("rounded-2xl border px-5 py-4 flex items-center gap-4 mb-6", statusCfg.bg)}>
          <div className="text-3xl shrink-0">{statusCfg.icon}</div>
          <div className="flex-1 min-w-0">
            <h1 className={cn("text-base font-bold leading-tight", statusCfg.color)}>{statusCfg.label}</h1>
            <p className={cn("text-xs mt-0.5", statusCfg.color)}>{statusCfg.description}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_260px] gap-5 items-start">
          <div className="flex flex-col gap-5">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h2 className="font-semibold text-gray-900 text-sm mb-4">Trạng thái đơn hàng</h2>
              <StatusTimeline steps={steps} currentStatus={mappedStatus} />
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h2 className="font-semibold text-gray-900 text-sm mb-4">Thông tin đơn hàng</h2>
              <div className="space-y-2.5 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 w-24 shrink-0">Mã đơn:</span>
                  <span className="font-mono font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-lg">{order.code}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 w-24 shrink-0">Cửa hàng:</span>
                  <span className="font-medium text-gray-900">{franchiseName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 w-24 shrink-0">Khách hàng:</span>
                  <span className="text-gray-900">{customerName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 w-24 shrink-0">SĐT:</span>
                  <span className="text-gray-900">{phone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 w-24 shrink-0">Loại:</span>
                  <span className="text-gray-900">{order.type === "ONLINE" ? "Online" : "Tại quầy"}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900 text-sm">Sản phẩm</h2>
              </div>
              <div className="divide-y divide-gray-50 max-h-72 overflow-y-auto">
                {(rawItems as any[]).map((item, idx) => {
                  const qty = toNumber(item.quantity ?? item.qty ?? 0);
                  const priceSnapshot = toNumber(
                    item.price_snapshot ?? item.price ?? item.unit_price ?? 0
                  );
                  const lineTotal =
                    toNumber(item.line_total ?? item.lineTotal ?? item.total ?? 0) ||
                    priceSnapshot * qty;

                  const name =
                    item.product_name_snapshot ?? item.product_name ?? item.name ?? "Sản phẩm";
                  const imageUrl =
                    item.product_image_url ?? item.product_image ?? item.image_url ?? item.image ?? "";
                  const optionsText = formatItemOptions(item.options);

                  const key = item._id ?? item.id ?? item.order_item_id ?? `item-${idx}`;

                  return (
                    <div key={key} className="px-4 py-3 flex gap-3">
                      {imageUrl ? (
                        <img
                          src={String(imageUrl)}
                          alt={name}
                          className="w-14 h-14 rounded-lg object-cover bg-gray-50 border border-gray-100 shrink-0"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-lg bg-gray-50 border border-gray-100 shrink-0" />
                      )}

                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-900 leading-snug">{name}</p>
                        {optionsText && (
                          <p className="text-[10px] text-gray-500 mt-1 leading-relaxed">
                            {optionsText}
                          </p>
                        )}
                        <div className="flex justify-between mt-1">
                          <span className="text-[10px] text-gray-500">x{qty}</span>
                          <span className="text-xs font-semibold text-gray-900">{fmt(lineTotal)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 space-y-2.5">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Tạm tính</span>
                  <span className="font-semibold text-gray-900">{fmt(subtotalAmount)}</span>
                </div>

                {(promotionDiscount ?? 0) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-green-700">
                      🎉 Khuyến mãi{" "}
                      {(order as any).promotion_type ? `(${(order as any).promotion_type})` : ""}
                    </span>
                    <span className="text-green-700 font-semibold">-{fmt(promotionDiscount)}</span>
                  </div>
                )}

                {(voucherDiscount ?? 0) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-green-700">
                      🎫 Voucher{" "}
                      {(order as any).voucher_type ? `(${(order as any).voucher_type})` : ""}
                    </span>
                    <span className="text-green-700 font-semibold">-{fmt(voucherDiscount)}</span>
                  </div>
                )}

                {(loyaltyDiscount ?? 0) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-green-700">
                      ⭐ Điểm thưởng{" "}
                      {(order as any).loyalty_points_used != null
                        ? `(${(order as any).loyalty_points_used} điểm)`
                        : ""}
                    </span>
                    <span className="text-green-700 font-semibold">-{fmt(loyaltyDiscount)}</span>
                  </div>
                )}

                <div className="h-px bg-gray-100 my-1" />

                <div className="flex justify-between items-baseline">
                  <span className="font-bold text-gray-900">Tổng cộng</span>
                  <span className="text-amber-700 text-lg font-extrabold">{fmt(finalAmount)}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h2 className="font-semibold text-gray-900 text-sm mb-3">Thanh toán</h2>
              {payment ? (
                <div className="space-y-2 text-sm text-gray-700">
                  {payment.provider_txn_id && (
                    <div className="flex justify-between gap-3">
                      <span className="text-gray-500">Mã giao dịch</span>
                      <span className="font-mono font-semibold text-gray-900 truncate">
                        {payment.provider_txn_id}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between gap-3">
                    <span className="text-gray-500">Số tiền</span>
                    <span className="font-semibold text-gray-900">{fmt(payment.amount ?? finalAmount)}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-gray-500">Trạng thái</span>
                    <span className="font-semibold text-gray-900">{payment.status ?? "—"}</span>
                  </div>
                  {payment.method && (
                    <div className="flex justify-between gap-3">
                      <span className="text-gray-500">Phương thức</span>
                      <span className="font-semibold text-gray-900">{payment.method}</span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">Chưa có thông tin thanh toán.</p>
              )}
            </div>

            {order.status === "CONFIRMED" && (
              <Link
                to={ROUTER_URL.PAYMENT_PROCESS.replace(":orderId", String(order._id ?? order.id))}
                className="block text-center w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-sm"
              >
                Thanh toán
              </Link>
            )}
            <Link to="/menu" className="block text-center w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-semibold text-sm">
              Đặt thêm đơn mới
            </Link>
            <Link to={ROUTER_URL.CUSTOMER_ORDER_HISTORY} className="block text-center w-full py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl font-semibold text-sm">
              Xem tất cả đơn hàng
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Trang trạng thái đơn — 100% real API (Get Order by Id). */
export default function OrderStatusPage() {
  const { orderId } = useParams<{ orderId: string }>();

  const orderQuery = useQuery({
    queryKey: ["order-status", orderId],
    queryFn: () => orderClient.getOrderById(orderId!),
    enabled: !!orderId,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const { data: apiPayment } = useQuery({
    queryKey: ["payment-by-order-status", orderId],
    queryFn: async () => {
      try {
        return await paymentClient.getPaymentByOrderId(orderId!);
      } catch {
        return null;
      }
    },
    enabled: !!orderId && !!orderQuery.data,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const { data: apiDelivery } = useQuery({
    queryKey: ["delivery-by-order", orderId],
    queryFn: async () => {
      try {
        return await deliveryClient.getDeliveryByOrderId(orderId!);
      } catch {
        return null;
      }
    },
    enabled: !!orderId && !!orderQuery.data,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const apiOrder = orderQuery.data;

  if (orderQuery.isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center text-gray-500">Đang tải đơn hàng...</div>
      </div>
    );
  }

  if (orderQuery.error) {
    const status = (orderQuery.error as any)?.response?.status;
    const message =
      status === 401
        ? "Phiên đăng nhập đã hết hạn hoặc bạn không có quyền truy cập. Vui lòng đăng nhập lại."
        : String((orderQuery.error as any)?.message ?? orderQuery.error);

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-sm">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Không thể tải đơn hàng</h2>
          <p className="text-gray-500 text-sm mb-6">{message}</p>
          <Link
            to={ROUTER_URL.LOGIN}
            className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-6 py-3 rounded-xl font-semibold transition-all"
          >
            Đăng nhập lại
          </Link>
        </div>
      </div>
    );
  }

  if (apiOrder) {
    return (
      <OrderStatusFromApi
        order={apiOrder}
        delivery={apiDelivery as ApiDelivery | null}
        payment={apiPayment ?? null}
        fmt={fmt}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center max-w-sm">
        <div className="text-6xl mb-4">🔍</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Không tìm thấy đơn hàng</h2>
        <p className="text-gray-500 text-sm mb-6">Mã đơn hàng không tồn tại hoặc đã hết hạn.</p>
        <Link
          to="/menu"
          className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-6 py-3 rounded-xl font-semibold transition-all"
        >
          ← Về Menu
        </Link>
      </div>
    </div>
  );
}

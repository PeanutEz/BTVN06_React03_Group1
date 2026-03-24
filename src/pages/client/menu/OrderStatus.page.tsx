import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import LoadingLayout from "@/layouts/Loading.layout";
import { ROUTER_URL } from "@/routes/router.const";
import { orderClient } from "@/services/order.client";
import { deliveryClient, type DeliveryData } from "@/services/delivery.client";
import { paymentClient, type PaymentData } from "@/services/payment.client";
import { getOrderItemDisplayMeta } from "@/utils/orderItemDisplay.util";
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

function pickFirstText(...values: unknown[]): string {
  for (const value of values) {
    const text = String(value ?? "").trim();
    if (text) return text;
  }
  return "";
}

const fmt = (n: unknown) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(toNumber(n));

const fmtDateTime = (d?: string) => {
  if (!d) return null;
  return new Date(d).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

function isPendingPayment(status?: string): boolean {
  return ["PENDING", "UNPAID"].includes(String(status ?? "").toUpperCase());
}

function isPaidPayment(status?: string): boolean {
  return ["PAID", "CONFIRMED", "COMPLETED"].includes(String(status ?? "").toUpperCase());
}

function fmtPaymentMethod(method?: string): string {
  switch (String(method ?? "").toUpperCase()) {
    case "COD":
    case "CASH":         return "Tiền mặt";
    case "CARD":         return "VNPAY";
    case "BANK":
    case "BANK_TRANSFER":
    case "TRANSFER":     return "VNPAY";
    case "MOMO":         return "MoMo";
    case "VNPAY":        return "VNPAY";
    case "ZALOPAY":      return "ZaloPay";
    default:             return method ?? "—";
  }
}

function resolveOrderMode(order: OrderDisplay, delivery: ApiDelivery | null): "PICKUP" | "DELIVERY" {
  const explicitType = String((order as any)?.type ?? "").trim().toUpperCase();
  if (explicitType === "POS" || explicitType === "PICKUP") return "PICKUP";
  if (explicitType === "ONLINE" || explicitType === "DELIVERY") return "DELIVERY";

  const hasDeliveryObject = !!delivery;
  const hasDeliveryAddress = !!String(
    (delivery as any)?.order_address ??
    (order as any)?.address ??
    (order as any)?.delivery_address ??
    "",
  ).trim();

  return hasDeliveryObject || hasDeliveryAddress ? "DELIVERY" : "PICKUP";
}

/** Map API order status to delivery timeline status */
function toDeliveryOrderStatus(value: unknown): DeliveryOrderStatus | null {
  const raw = String(value ?? "").trim().toUpperCase().replace(/\s+/g, "_");
  if (!raw) return null;

  if (raw === "READY") return "READY_FOR_PICKUP";
  if (raw.includes("CANCEL")) return "CANCELLED";
  if (raw.includes("COMPLETE") || raw.includes("DELIVERED")) return "COMPLETED";
  if (raw.includes("READY")) return "READY_FOR_PICKUP";
  if (raw.includes("DELIVER") || raw.includes("SHIPPING") || raw.includes("PICKUP")) return "DELIVERING";
  if (raw.includes("PREPAR")) return "PREPARING";
  if (raw.includes("CONFIRM")) return "CONFIRMED";
  if (raw.includes("PENDING") || raw.includes("UNPAID") || raw.includes("DRAFT")) return "PENDING";

  if (
    raw === "PENDING" ||
    raw === "CONFIRMED" ||
    raw === "PREPARING" ||
    raw === "READY_FOR_PICKUP" ||
    raw === "DELIVERING" ||
    raw === "COMPLETED" ||
    raw === "CANCELLED"
  ) {
    return raw as DeliveryOrderStatus;
  }

  return null;
}

function apiOrderStatusToDeliveryStatus(apiStatus: ApiOrderStatus): DeliveryOrderStatus {
  return toDeliveryOrderStatus(apiStatus) ?? "PENDING";
}

type ApiDelivery = DeliveryData;

function deliveryApiStatusToTimelineStatus(delivery: ApiDelivery | null): DeliveryOrderStatus | null {
  return toDeliveryOrderStatus(delivery?.status);
}

function getDeliveryTimelineStatus(order: OrderDisplay, delivery: ApiDelivery | null): DeliveryOrderStatus {
  const fromOrder = toDeliveryOrderStatus(order.status) ?? "PENDING";
  if (fromOrder === "CANCELLED") return "CANCELLED";
  if (fromOrder === "COMPLETED") return "COMPLETED";

  const fromDelivery = deliveryApiStatusToTimelineStatus(delivery);
  if (fromDelivery) return fromDelivery;
  return apiOrderStatusToDeliveryStatus(order.status);
}

type TrackingStatus = "PAYMENT_PENDING" | DeliveryOrderStatus;

const PAYMENT_PENDING_CONFIG = {
  label: "Chờ thanh toán",
  color: "text-amber-700",
  bg: "bg-amber-50 border-amber-200",
  icon: "💳",
  description: "Đơn hàng đang chờ xử lý thanh toán",
};

function getTrackingConfig(status: TrackingStatus) {
  if (status === "PAYMENT_PENDING") return PAYMENT_PENDING_CONFIG;
  return ORDER_STATUS_CONFIG[status];
}

function StatusTimeline({
  steps,
  currentStatus,
}: {
  steps: TrackingStatus[];
  currentStatus: TrackingStatus;
}) {
  const currentIdx = steps.indexOf(currentStatus);
  const isCancelled = currentStatus === "CANCELLED";
  return (
    <div className="relative">
      {/* Static background connector line */}
      <div className="absolute left-5 top-5 bottom-5 w-0.5 bg-gray-100" />
      {/* Dynamic green progress fill — covers steps 0..currentIdx-1 */}
      {!isCancelled && currentIdx > 0 && (
        <div
          className="absolute left-5 top-5 w-0.5 bg-emerald-400 transition-all duration-700"
          style={{ height: `calc(${(currentIdx / (steps.length - 1)) * 100}% - 10px)` }}
        />
      )}

      <div className="space-y-6">
        {steps.map((step, idx) => {
          const cfg = getTrackingConfig(step);
          const isPast = !isCancelled && idx < currentIdx;
          const isCurrent = !isCancelled && idx === currentIdx;

          return (
            <div key={step} className="relative flex items-start gap-4 pl-0">
              {/* Circle indicator */}
              <div
                className={cn(
                  "relative z-10 w-10 h-10 rounded-full flex items-center justify-center shrink-0 border-2 transition-all duration-500",
                  isCurrent
                    ? "border-amber-500 bg-amber-500 shadow-lg shadow-amber-200 scale-110"
                    : isPast
                      ? "border-emerald-500 bg-emerald-500"
                      : "border-gray-200 bg-white",
                )}
              >
                {isCurrent ? (
                  // Active step: show its unique icon, pulsing
                  <span className="text-lg animate-pulse">{cfg.icon}</span>
                ) : isPast ? (
                  // Completed past step: checkmark
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  // Future step: dimmed icon
                  <span className="text-gray-300 text-lg">{cfg.icon}</span>
                )}
              </div>

              {/* Text */}
              <div className="flex-1 pb-2">
                <p
                  className={cn(
                    "font-semibold text-sm transition-colors",
                    isCurrent ? "text-amber-700" : isPast ? "text-gray-900" : "text-gray-400",
                  )}
                >
                  {cfg.label}
                </p>
                <p
                  className={cn(
                    "text-xs mt-0.5 transition-colors",
                    isCurrent ? "text-amber-600" : isPast ? "text-gray-500" : "text-gray-400",
                  )}
                >
                  {cfg.description}
                </p>
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
  const orderMode = resolveOrderMode(order, delivery);
  const isPickupFlow = orderMode === "PICKUP";
  const steps: TrackingStatus[] = ["PAYMENT_PENDING", ...DELIVERY_STATUS_STEPS];

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
  const orderCreatedAt = fmtDateTime((order as any).created_at);
  const orderUpdatedAt = fmtDateTime((order as any).updated_at);
  const confirmedAt = fmtDateTime((order as any).confirmed_at);
  const completedAt = fmtDateTime((order as any).completed_at);
  const cancelledAt = fmtDateTime((order as any).cancelled_at);
  const deliveryAssignedTo = pickFirstText(
    (delivery as any)?.assigned_to_name,
    (delivery as any)?.assigned_to,
    (delivery as any)?.shipper_name,
    (delivery as any)?.shipper?.name,
    (delivery as any)?.staff_name,
    (delivery as any)?.staff?.name,
    (delivery as any)?.rider_name,
    (delivery as any)?.rider?.name,
    (order as any)?.shipper_name,
    (order as any)?.shipper?.name,
    (order as any)?.staff_name,
    (order as any)?.staff?.name,
    (order as any)?.rider_name,
    (order as any)?.rider?.name,
    (order as any)?.assigned_to_name,
    (order as any)?.assigned_to,
    (order as any)?.delivery?.assigned_to_name,
    (order as any)?.delivery?.assigned_to,
    (order as any)?.delivery?.shipper_name,
    (order as any)?.delivery?.shipper?.name,
    (order as any)?.delivery?.staff_name,
    (order as any)?.delivery?.staff?.name,
  );
  const deliveryShipperPhone = pickFirstText(
    (delivery as any)?.assigned_to_phone,
    (delivery as any)?.shipper_phone,
    (delivery as any)?.shipper?.phone,
    (delivery as any)?.staff_phone,
    (delivery as any)?.staff?.phone,
    (delivery as any)?.rider_phone,
    (delivery as any)?.rider?.phone,
    (order as any)?.shipper_phone,
    (order as any)?.shipper?.phone,
    (order as any)?.staff_phone,
    (order as any)?.staff?.phone,
    (order as any)?.rider_phone,
    (order as any)?.rider?.phone,
    (order as any)?.assigned_to_phone,
    (order as any)?.delivery?.assigned_to_phone,
    (order as any)?.delivery?.shipper_phone,
    (order as any)?.delivery?.shipper?.phone,
    (order as any)?.delivery?.staff_phone,
    (order as any)?.delivery?.staff?.phone,
  );
  const deliveryStatusRaw = pickFirstText(
    (delivery as any)?.status,
    (order as any)?.delivery_status,
    (order as any)?.delivery?.status,
  );
  const deliveryAddress = pickFirstText(
    (delivery as any)?.order_address,
    (order as any)?.address,
    (order as any)?.delivery_address,
    (order as any)?.delivery?.order_address,
  );
  const hasAnyDeliveryInfo = Boolean(
    delivery || deliveryAssignedTo || deliveryShipperPhone || deliveryStatusRaw || deliveryAddress,
  );
  const paymentCreatedAt = fmtDateTime((payment as any)?.created_at);
  const paymentUpdatedAt = fmtDateTime((payment as any)?.updated_at);
  const paymentMethodRaw = String(
    payment?.method ??
    (order as any)?.payment_method ??
    (order as any)?.method ??
    "",
  ).toUpperCase();
  const isCashMethod = paymentMethodRaw === "CASH" || paymentMethodRaw === "COD";
  const timelineCurrentStatus: TrackingStatus =
    mappedStatus === "CANCELLED" || isCashMethod || isPaidPayment(payment?.status)
      ? mappedStatus
      : "PAYMENT_PENDING";
  const itemCount = (rawItems as any[]).reduce((sum, item) => sum + toNumber(item.quantity ?? item.qty ?? 0), 0);
  const promotionTypeText = String((order as any).promotion_type ?? "").toUpperCase();
  const voucherTypeText = String((order as any).voucher_type ?? "").toUpperCase();
  const promotionPercentText = promotionTypeText.includes("PERCENT") && toNumber((order as any).promotion_value) > 0
    ? `${toNumber((order as any).promotion_value)}%`
    : null;
  const voucherPercentText = voucherTypeText.includes("PERCENT") && toNumber((order as any).voucher_value) > 0
    ? `${toNumber((order as any).voucher_value)}%`
    : null;
  return (
    <div className="bg-[#faf8f4] min-h-screen text-[#3d2b1f]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => window.history.back()}
            className="px-3 py-2 rounded-lg border border-[#3d2b1f]/15 bg-white text-[#6b4c3b] hover:bg-[#f2ede4] text-xs font-medium"
          >
            ← Quay lại
          </button>
          <Link
            to={ROUTER_URL.CUSTOMER_ORDER_HISTORY}
            className="px-3 py-2 rounded-lg border border-[#3d2b1f]/15 bg-white text-[#6b4c3b] hover:bg-[#f2ede4] text-xs font-medium"
          >
            Xem đơn hàng
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5 items-start">
          <div className="space-y-4">
            <div className="bg-white rounded-[14px] border border-[#3d2b1f]/10 overflow-hidden shadow-sm">
              <div className="px-5 py-4">
                <h2 className="font-semibold text-sm mb-4">Trạng thái đơn hàng</h2>
                <StatusTimeline steps={steps} currentStatus={timelineCurrentStatus} />
              </div>
            </div>

            <div className="bg-white rounded-[14px] border border-[#3d2b1f]/10 overflow-hidden shadow-sm">
              <div className="px-5 py-4 border-b border-[#3d2b1f]/10 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-[#8a8070]">Sản phẩm</span>
                <span className="text-xs text-[#8a8070]">{itemCount} món</span>
              </div>
              <div className="px-5 py-3 divide-y divide-[#3d2b1f]/10">
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
                  const itemMeta = getOrderItemDisplayMeta(item as Record<string, unknown>);

                  const key = item._id ?? item.id ?? item.order_item_id ?? `item-${idx}`;

                  return (
                    <div key={key} className="py-3 flex gap-3">
                      {imageUrl ? (
                        <img
                          src={String(imageUrl)}
                          alt={name}
                          className="w-14 h-14 rounded-lg object-cover bg-[#f2ede4] border border-[#3d2b1f]/10 shrink-0"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-lg bg-[#f2ede4] border border-[#3d2b1f]/10 shrink-0 flex items-center justify-center text-xl">
                          ☕
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-[#3d2b1f] leading-snug">{name}</p>
                        {itemMeta.inlineMeta && (
                          <p className="text-[10px] text-[#8a8070] mt-1">{itemMeta.inlineMeta}</p>
                        )}
                        {itemMeta.toppings.length > 0 && (
                          <div className="mt-1">
                            <p className="text-[10px] text-[#6b4c3b]">Topping:</p>
                            <div className="flex flex-wrap gap-1 mt-0.5">
                              {itemMeta.toppings.map((entry) => (
                                <span
                                  key={`${key}-top-${entry.name}-${entry.quantity}`}
                                  className="text-[9px] leading-none px-1 py-[3px] rounded bg-[#f6ede1] text-[#6b4c3b] border border-[#e5d6c3]"
                                >
                                  {entry.name} x{entry.quantity}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {itemMeta.noteText && (
                          <p className="text-[11px] text-[#8a8070] italic mt-1">Ghi chú: {itemMeta.noteText}</p>
                        )}
                        <div className="flex justify-between items-center mt-1.5">
                          <span className="inline-flex min-w-[24px] h-[20px] items-center justify-center rounded-md bg-[#efe6d8] border border-[#e0d0bc] text-[10px] font-semibold text-[#6b4c3b]">
                            x{qty}
                          </span>
                          <span className="text-[13px] font-semibold text-[#3d2b1f]">{fmt(lineTotal)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="px-5 py-3 bg-white border-t border-[#3d2b1f]/10">
                <div className="space-y-1 text-sm">
                  <div className="flex items-center justify-between text-[#6b4c3b]">
                    <span>Tạm tính</span>
                    <span className="font-semibold text-[#3d2b1f]">{fmt(subtotalAmount)}</span>
                  </div>
                {(promotionDiscount ?? 0) > 0 && (
                  <div className="flex items-center justify-between text-[#2e7d52]">
                    <span>
                      Giảm khuyến mãi
                      {promotionPercentText ? ` (${promotionPercentText})` : ""}
                    </span>
                    <span className="font-semibold">-{fmt(promotionDiscount)}</span>
                  </div>
                )}
                {(voucherDiscount ?? 0) > 0 && (
                  <div className="flex items-center justify-between text-[#2e7d52]">
                    <span>
                      Giảm voucher
                      {voucherPercentText ? ` (${voucherPercentText})` : ""}
                    </span>
                    <span className="font-semibold">-{fmt(voucherDiscount)}</span>
                  </div>
                )}
                {(loyaltyDiscount ?? 0) > 0 && (
                  <div className="flex items-center justify-between text-[#2e7d52]">
                    <span>⭐ Điểm thưởng</span>
                    <span className="font-semibold">-{fmt(loyaltyDiscount)}</span>
                  </div>
                )}
                </div>
              </div>
              <div className="px-5 py-3.5 bg-white border-t border-[#3d2b1f]/10 flex items-center justify-between">
                <span className="text-[#6b4c3b] font-medium">Tổng cộng</span>
                <span className="text-[#a05e10] text-xl font-semibold">{fmt(finalAmount)}</span>
              </div>
            </div>

          </div>
          <div className="flex flex-col gap-4">
            <div className="bg-white rounded-[14px] border border-[#3d2b1f]/10 shadow-sm p-5">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-[#8a8070] mb-4">Thông tin đơn hàng</h2>
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
                  <span className="text-gray-900">{isPickupFlow ? "Tại quầy" : "Online"}</span>
                </div>
                {orderCreatedAt && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400 w-24 shrink-0">Tạo lúc:</span>
                    <span className="text-gray-900">{orderCreatedAt}</span>
                  </div>
                )}
                {orderUpdatedAt && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400 w-24 shrink-0">Cập nhật:</span>
                    <span className="text-gray-900">{orderUpdatedAt}</span>
                  </div>
                )}
                {confirmedAt && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400 w-24 shrink-0">Xác nhận:</span>
                    <span className="text-gray-900">{confirmedAt}</span>
                  </div>
                )}
                {completedAt && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400 w-24 shrink-0">Hoàn thành:</span>
                    <span className="text-gray-900">{completedAt}</span>
                  </div>
                )}
                {cancelledAt && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400 w-24 shrink-0">Hủy lúc:</span>
                    <span className="text-gray-900">{cancelledAt}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-[14px] border border-[#3d2b1f]/10 shadow-sm p-5">
              <h2 className="font-semibold text-gray-900 text-sm mb-3">Giao hàng</h2>
              {hasAnyDeliveryInfo ? (
                <div className="space-y-2 text-sm text-gray-700 mb-4">
                  {deliveryStatusRaw && (
                    <div className="flex justify-between gap-3">
                      <span className="text-gray-500">Trạng thái</span>
                      <span className="font-semibold text-gray-900">{deliveryStatusRaw}</span>
                    </div>
                  )}
                  {deliveryAssignedTo && (
                    <div className="flex justify-between gap-3">
                      <span className="text-gray-500">Người giao</span>
                      <span className="font-semibold text-gray-900 text-right">{deliveryAssignedTo}</span>
                    </div>
                  )}
                  {deliveryShipperPhone && (
                    <div className="flex justify-between gap-3">
                      <span className="text-gray-500">SĐT shipper</span>
                      <span className="font-semibold text-gray-900 text-right">{deliveryShipperPhone}</span>
                    </div>
                  )}
                  {deliveryAddress && (
                    <div className="flex justify-between gap-3">
                      <span className="text-gray-500">Địa chỉ</span>
                      <span className="font-semibold text-gray-900 text-right">{deliveryAddress}</span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-500 text-sm mb-4">Chưa có thông tin giao hàng.</p>
              )}

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
                  {payment.method && (
                    <div className="flex justify-between gap-3">
                      <span className="text-gray-500">Phương thức</span>
                      <span className="font-semibold text-gray-900">{fmtPaymentMethod(payment.method)}</span>
                    </div>
                  )}
                  {paymentCreatedAt && (
                    <div className="flex justify-between gap-3">
                      <span className="text-gray-500">Tạo lúc</span>
                      <span className="font-semibold text-gray-900">{paymentCreatedAt}</span>
                    </div>
                  )}
                  {paymentUpdatedAt && (
                    <div className="flex justify-between gap-3">
                      <span className="text-gray-500">Cập nhật</span>
                      <span className="font-semibold text-gray-900">{paymentUpdatedAt}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2 text-sm text-gray-700">
                  <p className="text-gray-500 text-xs">Chưa có bản ghi payment chi tiết từ API.</p>
                </div>
              )}

              <div className="mt-4 flex flex-col gap-2">
                {payment &&
              isPendingPayment(payment.status) &&
              !isCashMethod ? (
                  <Link
                    to={ROUTER_URL.PAYMENT_PROCESS.replace(":orderId", String(order._id ?? order.id))}
                    className="block text-center w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-sm"
                  >
                    Thanh toán
                  </Link>
                ) : null}
                <Link to="/menu" className="block text-center w-full py-3 bg-[#d4832a] hover:bg-[#a05e10] text-white rounded-xl font-semibold text-sm">
                  Đặt thêm đơn mới
                </Link>
              </div>
            </div>
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
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
  });

  const paymentQuery = useQuery({
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
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
  });
  const apiPayment = paymentQuery.data;

  const deliveryQuery = useQuery({
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
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
  });
  const apiDelivery = deliveryQuery.data;

  const apiOrder = orderQuery.data;
  if (orderQuery.isLoading || orderQuery.isFetching) return <LoadingLayout />;

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

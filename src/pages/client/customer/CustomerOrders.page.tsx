import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { orderClient } from "@/services/order.client";
import { paymentClient, type PaymentData } from "@/services/payment.client";
import { useAuthStore } from "@/store/auth.store";
import type { OrderDisplay, OrderStatus } from "@/models/order.model";
import { ROUTER_URL } from "@/routes/router.const";
import { getOrderItemDisplayMeta } from "@/utils/orderItemDisplay.util";

const fmt = (n: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n ?? 0);

const toNumber = (value: unknown) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

function formatDiscountType(type?: string, value?: number) {
  const rawType = String(type ?? "").trim().toUpperCase();
  if (!rawType) return "";
  const parsedValue = toNumber(value);

  if (rawType.includes("PERCENT") || rawType.includes("%")) {
    if (parsedValue > 0) {
      return ` (${parsedValue}%)`;
    }
    return " (%)";
  }

  if (rawType.includes("FIXED") || rawType.includes("AMOUNT")) {
    if (parsedValue > 0) {
      return ` (${fmt(parsedValue)})`;
    }
    return "";
  }

  return "";
}

type CustomerOrderUiStatus =
  | "PAYMENT_PENDING"
  | "PENDING"
  | "CONFIRMED"
  | "PREPARING"
  | "READY_FOR_PICKUP"
  | "DELIVERING"
  | "COMPLETED"
  | "CANCELLED";

const FILTER_OPTIONS: { key: "ALL" | CustomerOrderUiStatus; label: string }[] = [
  { key: "ALL", label: "Tất cả" },
  { key: "PAYMENT_PENDING", label: "Chờ thanh toán" },
  { key: "PENDING", label: "Chờ xác nhận" },
  { key: "CONFIRMED", label: "Đã xác nhận" },
  { key: "PREPARING", label: "Đang pha chế" },
  { key: "READY_FOR_PICKUP", label: "Sẵn sàng lấy" },
  { key: "DELIVERING", label: "Đang giao" },
  { key: "COMPLETED", label: "Hoàn thành" },
];

const UI_STATUS_META: Record<CustomerOrderUiStatus, { label: string; color: string }> = {
  PAYMENT_PENDING: { label: "Chờ thanh toán", color: "bg-amber-50 text-amber-700 border-amber-200" },
  PENDING: { label: "Chờ xác nhận", color: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  CONFIRMED: { label: "Đã xác nhận", color: "bg-blue-50 text-blue-700 border-blue-200" },
  PREPARING: { label: "Đang pha chế", color: "bg-orange-50 text-orange-700 border-orange-200" },
  READY_FOR_PICKUP: { label: "Sẵn sàng lấy", color: "bg-amber-50 text-amber-700 border-amber-200" },
  DELIVERING: { label: "Đang giao", color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  COMPLETED: { label: "Hoàn thành", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  CANCELLED: { label: "Đã hủy", color: "bg-red-50 text-red-700 border-red-200" },
};

function normalizeCustomerOrderStatus(status: unknown): OrderStatus {
  const raw = String(status ?? "").trim().toUpperCase();
  if (!raw) return "DRAFT";

  if (["CANCELLED", "CANCELED", "VOIDED"].includes(raw)) return "CANCELLED";
  if (["COMPLETED", "DELIVERED", "DONE", "SUCCESS"].includes(raw)) return "COMPLETED";
  if (["DELIVERING", "SHIPPING", "OUT_FOR_DELIVERY", "IN_TRANSIT"].includes(raw)) {
    return "DELIVERING";
  }
  if (["READY", "READY_FOR_PICKUP"].includes(raw)) {
    return "READY_FOR_PICKUP";
  }
  if (["PREPARING", "PROCESSING", "COOKING", "BREWING"].includes(raw)) return "PREPARING";
  if (["CONFIRMED", "ACCEPTED", "APPROVED"].includes(raw)) return "CONFIRMED";
  if (["PENDING", "DRAFT", "CREATED", "NEW", "UNPAID"].includes(raw)) return "DRAFT";

  return "DRAFT";
}

function isPendingPaymentStatus(status?: string): boolean {
  const raw = String(status ?? "").toUpperCase();
  return raw === "PENDING" || raw === "UNPAID";
}

function getOrderUiStatus(orderStatus: OrderStatus | undefined, paymentStatus?: string): CustomerOrderUiStatus {
  const status = normalizeCustomerOrderStatus(orderStatus);
  if (status === "CANCELLED") return "CANCELLED";
  if (status === "COMPLETED") return "COMPLETED";
  if (status === "DELIVERING") return "DELIVERING";
  if (status === "READY_FOR_PICKUP") return "READY_FOR_PICKUP";
  if (status === "PREPARING") return "PREPARING";
  if (status === "CONFIRMED") return "CONFIRMED";

  // DRAFT/PENDING phase: split into payment waiting vs store confirmation waiting.
  return isPendingPaymentStatus(paymentStatus) ? "PAYMENT_PENDING" : "PENDING";
}

function getPaymentStatusLabel(status?: string) {
  switch (String(status ?? "").toUpperCase()) {
    case "PAID":
    case "CONFIRMED":
    case "COMPLETED":
      return { label: "Đã thanh toán", color: "bg-emerald-50 text-emerald-700" };
    case "FAILED":
      return { label: "Thất bại", color: "bg-red-50 text-red-700" };
    case "REFUNDED":
      return { label: "Đã hoàn tiền", color: "bg-blue-50 text-blue-700" };
    case "CANCELLED":
      return { label: "Đã huỷ", color: "bg-gray-100 text-gray-700" };
    default:
      return { label: "Chờ thanh toán", color: "bg-amber-50 text-amber-700" };
  }
}

function getPaymentMethodLabel(method?: string) {
  switch (String(method ?? "").toUpperCase()) {
    case "COD":
    case "CASH":
      return "COD";
    case "CARD":
    case "VNPAY":
    case "BANK":
    case "BANK_TRANSFER":
    case "TRANSFER":
      return "VNPAY";
    case "MOMO":
      return "MoMo";
    default:
      return method ?? "COD";
  }
}

export default function CustomerOrdersPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const customerId = String(
    (user as any)?.user?.id ?? (user as any)?.user?._id ?? (user as any)?.id ?? (user as any)?._id ?? ""
  );
  const [filter, setFilter] = useState<"ALL" | CustomerOrderUiStatus>("ALL");
  const [expanded, setExpanded] = useState<string | number | null>(null);

  const { data: rawData, isLoading, error } = useQuery({
    queryKey: ["customer-orders-account", customerId, filter],
    queryFn: async () => {
      // Always fetch full order list and normalize/filter on client to avoid backend status mismatch.
      const result = await orderClient.getOrdersByCustomerId(customerId);
      console.log("🔍 [CustomerOrders] API Response:", result);
      return result;
    },
    enabled: !!customerId,
  });

  const { data: payments = [] } = useQuery({
    queryKey: ["customer-payments-account", customerId],
    queryFn: () => paymentClient.getPaymentsByCustomerId(customerId),
    enabled: !!customerId,
  });

  const paymentByOrderId = new Map<string, PaymentData>();
  for (const payment of payments) {
    const orderId = String(payment.order_id ?? "").trim();
    if (!orderId || paymentByOrderId.has(orderId)) continue;
    paymentByOrderId.set(orderId, payment);
  }

  // API may return array directly or nested — normalize
  let displayOrders: OrderDisplay[] = Array.isArray(rawData) ? rawData : [];

  // Fix: Use final_amount or subtotal_amount as fallback for total_amount
  displayOrders = displayOrders.map((order) => {
    // Backend stores price in final_amount, not total_amount
    const finalAmount = order.final_amount ?? 0;
    const subtotalAmount = order.subtotal_amount ?? 0;
    let calculatedTotal = order.total_amount ?? finalAmount ?? subtotalAmount ?? 0;

    // Backend returns order_items instead of items - normalize it
    const items = order.order_items ?? order.items ?? [];

    // If still 0 but has items, calculate from items
    if (calculatedTotal === 0 && items.length > 0) {
      calculatedTotal = items.reduce(
        (sum, item) => sum + (item.line_total ?? (item.price_snapshot * item.quantity)),
        0
      );
    }

    console.log(
      `💰 [CustomerOrders] ${order.code}: total=${order.total_amount}, final=${finalAmount}, subtotal=${subtotalAmount}, used=${calculatedTotal}, items=${items.length}`
    );

    // Normalize order structure
    return {
      ...order,
      status: normalizeCustomerOrderStatus(order.status),
      total_amount: calculatedTotal,
      items, // Ensure items is available for UI
      customer: order.customer ?? {
        name: order.customer_name ?? "N/A",
        phone: order.phone,
      },
      franchise: order.franchise ?? {
        name: order.franchise_name ?? "N/A",
      },
    };
  });

  if (filter !== "ALL") {
    displayOrders = displayOrders.filter((order, orderIdx) => {
      const ordId = order._id ?? order.id ?? `order-${orderIdx}`;
      const payment = paymentByOrderId.get(String(ordId));
      return getOrderUiStatus(order.status, payment?.status) === filter;
    });
  }

  console.log("📊 [CustomerOrders] Display Orders:", displayOrders);
  if (displayOrders.length > 0) {
    console.log("📊 [CustomerOrders] First Order:", displayOrders[0]);
    console.log("📦 [CustomerOrders] First Order Items:", displayOrders[0].items);
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-green-700 mb-6">Đơn hàng của bạn</h2>

      <div className="flex flex-wrap gap-2 mb-6">
        {FILTER_OPTIONS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              filter === f.key
                ? "bg-green-700 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 py-16">
          <p className="text-gray-500">Đang tải đơn hàng...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-red-200 bg-red-50 py-16">
          <span className="mb-3 text-4xl">⚠️</span>
          <p className="text-red-600 font-medium">Không thể tải đơn hàng</p>
          <p className="text-sm text-red-400 mt-1">Vui lòng thử lại sau</p>
        </div>
      ) : displayOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 py-16">
          <span className="mb-3 text-4xl">📭</span>
          <p className="text-gray-500">Chưa có đơn hàng nào</p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayOrders.map((order, orderIdx) => {
            const ordId = order._id ?? order.id ?? `order-${orderIdx}`;
            const orderIdKey = String(ordId);
            const payment = paymentByOrderId.get(orderIdKey);
            const paymentMeta = getPaymentStatusLabel(payment?.status);
            const isOpen = expanded === ordId;
            const uiStatus = getOrderUiStatus(order.status, payment?.status);
            const statusMeta = UI_STATUS_META[uiStatus];

            return (
              <div
                key={ordId}
                className="rounded-lg border border-gray-200 overflow-hidden hover:shadow-sm transition-shadow"
              >
                <button
                  onClick={() => setExpanded(isOpen ? null : ordId)}
                  className="flex w-full items-center justify-between px-4 py-4 text-left"
                >
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-gray-900">
                        #{order.code ?? "—"}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusMeta.color}`}
                      >
                        {statusMeta.label}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-500">
                      {order.franchise?.name || order.franchise_name || "—"}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${paymentMeta.color}`}>
                        {paymentMeta.label}
                      </span>
                      <span className="text-[11px] text-gray-500">
                        {getPaymentMethodLabel(payment?.method)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-gray-900">
                      {fmt(order.final_amount ?? order.total_amount ?? 0)}
                    </span>
                    <span
                      role="link"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(
                          ROUTER_URL.MENU_ORDER_STATUS.replace(":orderId", String(ordId))
                        );
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.stopPropagation();
                          navigate(
                            ROUTER_URL.MENU_ORDER_STATUS.replace(":orderId", String(ordId))
                          );
                        }
                      }}
                      className="text-sm text-green-700 hover:underline cursor-pointer"
                    >
                      Chi tiết
                    </span>
                    <svg
                      className={`h-5 w-5 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </button>
                {isOpen && (
                  <div className="border-t border-gray-100 bg-gray-50 px-4 py-4">
                    {/* Order Items */}
                    <h3 className="text-xs font-semibold text-gray-700 uppercase mb-3">Chi tiết đơn hàng</h3>
                    <table className="w-full text-sm mb-4">
                      <thead>
                        <tr className="text-left text-xs font-medium uppercase text-gray-500">
                          <th className="pb-2">Sản phẩm</th>
                          <th className="pb-2 text-center">SL</th>
                          <th className="pb-2 text-right">Giá</th>
                          <th className="pb-2 text-right">Tổng</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {(order.items ?? []).map((item, itemIdx) => {
                          // Normalize item fields - backend might use different field names
                          const productName = item.product_name_snapshot ?? item.product_name ?? "Sản phẩm";
                          const price = item.price_snapshot ?? item.price ?? 0;
                          const qty = item.quantity ?? 0;
                          const lineTotal = item.line_total ?? item.subtotal ?? (price * qty);
                          const itemMeta = getOrderItemDisplayMeta(item as Record<string, unknown>);

                          return (
                            <tr key={item._id ?? item.id ?? `item-${itemIdx}`}>
                              <td className="py-2 text-gray-800">
                                <p className="font-medium text-gray-900">{productName}</p>
                                {itemMeta.inlineMeta && (
                                  <p className="text-[11px] text-gray-500 mt-0.5">{itemMeta.inlineMeta}</p>
                                )}
                                {itemMeta.toppings.length > 0 && (
                                  <div className="mt-0.5">
                                    <p className="text-[11px] text-gray-600">Topping:</p>
                                    <div className="flex flex-wrap gap-1 mt-0.5">
                                      {itemMeta.toppings.map((entry) => (
                                        <span
                                          key={`cust-order-item-${itemIdx}-top-${entry.name}-${entry.quantity}`}
                                          className="text-[9px] leading-none px-1 py-[3px] rounded bg-amber-50 text-amber-800 border border-amber-100"
                                        >
                                          {entry.name} x{entry.quantity}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {itemMeta.noteText && (
                                  <p className="text-xs text-gray-500 italic mt-0.5">Ghi chú: {itemMeta.noteText}</p>
                                )}
                              </td>
                              <td className="py-2 text-center text-gray-600">
                                <span className="inline-flex min-w-[22px] h-[18px] items-center justify-center rounded bg-gray-100 border border-gray-200 text-[10px] font-semibold text-gray-700">
                                  x{qty}
                                </span>
                              </td>
                              <td className="py-2 text-right text-gray-600">{fmt(price)}</td>
                              <td className="py-2 text-right font-medium text-gray-800">{fmt(lineTotal)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>

                    {/* Order Summary with Discounts */}
                    <div className="border-t border-gray-300 pt-3 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Tạm tính:</span>
                        <span className="text-gray-900">{fmt(order.subtotal_amount ?? 0)}</span>
                      </div>

                      {/* Promotion Discount */}
                      {(order.promotion_discount ?? 0) > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-green-600">
                            🎉 Khuyến mãi
                            {formatDiscountType(order.promotion_type, order.promotion_value)}
                          </span>
                          <span className="text-green-600">-{fmt(order.promotion_discount ?? 0)}</span>
                        </div>
                      )}

                      {/* Voucher Discount */}
                      {(order.voucher_discount ?? 0) > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-green-600">
                            🎫 Voucher
                            {formatDiscountType(order.voucher_type, order.voucher_value)}
                          </span>
                          <span className="text-green-600">-{fmt(order.voucher_discount ?? 0)}</span>
                        </div>
                      )}

                      {/* Loyalty Discount */}
                      {(order.loyalty_discount ?? 0) > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-green-600">
                            ⭐ Điểm thưởng ({order.loyalty_points_used ?? 0} điểm)
                          </span>
                          <span className="text-green-600">-{fmt(order.loyalty_discount ?? 0)}</span>
                        </div>
                      )}

                      {/* Final Total */}
                      <div className="border-t border-gray-300 pt-2 flex justify-between">
                        <span className="font-semibold text-gray-900">Tổng cộng:</span>
                        <span className="text-lg font-bold text-green-700">
                          {fmt(order.final_amount ?? order.total_amount ?? 0)}
                        </span>
                      </div>
                    </div>

                    {/* Additional Info */}
                    <div className="mt-4 pt-3 border-t border-gray-200 space-y-1 text-xs text-gray-600">
                      {payment && (
                        <>
                          <div className="flex justify-between">
                            <span>Thanh toán:</span>
                            <span className="font-medium text-gray-800">{getPaymentMethodLabel(payment.method)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Trạng thái payment:</span>
                            <span className="font-medium text-gray-800">{paymentMeta.label}</span>
                          </div>
                          {payment.provider_txn_id && (
                            <div className="flex justify-between gap-2">
                              <span>Mã giao dịch:</span>
                              <span className="font-mono font-medium text-gray-800 truncate">{payment.provider_txn_id}</span>
                            </div>
                          )}
                        </>
                      )}
                      {order.franchise_name && (
                        <div className="flex justify-between">
                          <span>Cửa hàng:</span>
                          <span className="font-medium text-gray-800">{order.franchise_name}</span>
                        </div>
                      )}
                      {order.phone && (
                        <div className="flex justify-between">
                          <span>Số điện thoại:</span>
                          <span className="font-medium text-gray-800">{order.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { orderClient } from "@/services/order.client";
import { useAuthStore } from "@/store/auth.store";
import type { OrderDisplay, OrderStatus } from "@/models/order.model";
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from "@/models/order.model";
import { ROUTER_URL } from "@/routes/router.const";

const fmt = (n: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n ?? 0);

const FILTER_OPTIONS: { key: "ALL" | OrderStatus; label: string }[] = [
  { key: "ALL", label: "Tất cả" },
  { key: "DRAFT", label: ORDER_STATUS_LABELS.DRAFT },
  { key: "CONFIRMED", label: ORDER_STATUS_LABELS.CONFIRMED },
  { key: "PREPARING", label: ORDER_STATUS_LABELS.PREPARING },
  { key: "READY_FOR_PICKUP", label: ORDER_STATUS_LABELS.READY_FOR_PICKUP },
  { key: "COMPLETED", label: ORDER_STATUS_LABELS.COMPLETED },
  { key: "CANCELLED", label: ORDER_STATUS_LABELS.CANCELLED },
];

export default function CustomerOrdersPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const customerId = String(
    (user as any)?.user?.id ?? (user as any)?.user?._id ?? (user as any)?.id ?? (user as any)?._id ?? ""
  );
  const [filter, setFilter] = useState<"ALL" | OrderStatus>("ALL");
  const [expanded, setExpanded] = useState<string | number | null>(null);

  const { data: rawData, isLoading, error } = useQuery({
    queryKey: ["customer-orders-account", customerId, filter],
    queryFn: async () => {
      const result = await orderClient.getOrdersByCustomerId(customerId, {
        status: filter === "ALL" ? undefined : filter,
      });
      console.log("🔍 [CustomerOrders] API Response:", result);
      return result;
    },
    enabled: !!customerId,
  });

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
            const isOpen = expanded === ordId;
            const status = order.status ?? "DRAFT";
            const statusLabel = ORDER_STATUS_LABELS[status] ?? status;
            const statusColor = ORDER_STATUS_COLORS[status] ?? "bg-gray-50 text-gray-700";

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
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusColor}`}
                      >
                        {statusLabel}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-500">
                      {order.franchise?.name || order.franchise_name || "—"}
                    </p>
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

                          return (
                            <tr key={item._id ?? item.id ?? `item-${itemIdx}`}>
                              <td className="py-2 text-gray-800">{productName}</td>
                              <td className="py-2 text-center text-gray-600">{qty}</td>
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
                            {order.promotion_type && ` (${order.promotion_type})`}
                          </span>
                          <span className="text-green-600">-{fmt(order.promotion_discount ?? 0)}</span>
                        </div>
                      )}

                      {/* Voucher Discount */}
                      {(order.voucher_discount ?? 0) > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-green-600">
                            🎫 Voucher
                            {order.voucher_type && ` (${order.voucher_type})`}
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

import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useDeliveryStore } from "@/store/delivery.store";
import {
  ORDER_STATUS_CONFIG,
  DELIVERY_STATUS_STEPS,
  PICKUP_STATUS_STEPS,
  type DeliveryOrderStatus,
  type PlacedOrder,
} from "@/types/delivery.types";

const fmt = (n: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n);

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

export default function OrderStatusPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const { placedOrders, advanceOrderStatus, hydrate } = useDeliveryStore();
  const [autoAdvance, setAutoAdvance] = useState(true);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const order: PlacedOrder | undefined = placedOrders.find((o) => o.id === orderId);

  // Auto-advance order status for demo purposes (simulates real status updates)
  useEffect(() => {
    if (!order || !autoAdvance) return;
    const terminal: DeliveryOrderStatus[] = ["COMPLETED", "CANCELLED"];
    if (terminal.includes(order.status)) return;

    const delay =
      order.status === "PENDING" ? 3000
      : order.status === "CONFIRMED" ? 5000
      : order.status === "PREPARING" ? 8000
      : 6000;

    const t = setTimeout(() => {
      advanceOrderStatus(order.id);
    }, delay);
    return () => clearTimeout(t);
  }, [order, advanceOrderStatus, autoAdvance]);

  if (!order) {
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

  const statusCfg = ORDER_STATUS_CONFIG[order.status];
  const steps = order.mode === "DELIVERY" ? DELIVERY_STATUS_STEPS : PICKUP_STATUS_STEPS;
  const isCompleted = order.status === "COMPLETED";
  const isCancelled = order.status === "CANCELLED";

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-400 mb-6">
          <Link to="/" className="hover:text-gray-600 transition-colors">Trang chủ</Link>
          <span>/</span>
          <Link to="/menu" className="hover:text-gray-600 transition-colors">Menu</Link>
          <span>/</span>
          <span className="text-gray-900 font-medium">Đơn #{order.code}</span>
        </nav>

        {/* Status hero */}
        <div
          className={cn(
            "rounded-3xl border p-6 mb-6 text-center transition-all duration-500",
            statusCfg.bg,
          )}
        >
          <div className="text-5xl mb-3 animate-bounce">{statusCfg.icon}</div>
          <h1 className={cn("text-2xl font-bold mb-1", statusCfg.color)}>{statusCfg.label}</h1>
          <p className={cn("text-sm", statusCfg.color)}>{statusCfg.description}</p>

          {/* Time estimate for active orders */}
          {!isCompleted && !isCancelled && (
            <div className="mt-4 inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm border border-white rounded-xl px-4 py-2">
              <span className="text-xl">⏱</span>
              <div>
                <p className="text-xs text-gray-500">Ước tính hoàn thành</p>
                <p className="text-sm font-bold text-gray-900">
                  ~{order.prepTimeMins + order.deliveryTimeMins} phút
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-6">
          {/* Left col */}
          <div className="space-y-5">
            {/* Order timeline */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h2 className="font-semibold text-gray-900 mb-5">Trạng thái đơn hàng</h2>
              <StatusTimeline steps={steps} currentStatus={order.status} />

              {/* Demo control */}
              {!isCompleted && !isCancelled && (
                <div className="mt-5 pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-400">
                      {autoAdvance ? "⚡ Tự động cập nhật (demo)" : "Cập nhật thủ công"}
                    </p>
                    <button
                      onClick={() => { setAutoAdvance(false); advanceOrderStatus(order.id); }}
                      className="text-xs text-amber-600 hover:text-amber-700 font-semibold border border-amber-200 px-3 py-1 rounded-lg hover:bg-amber-50 transition-all"
                    >
                      Tiếp theo →
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Branch info */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h2 className="font-semibold text-gray-900 mb-3">Thông tin đơn hàng</h2>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 w-24 shrink-0">Mã đơn:</span>
                  <span className="font-mono font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-lg">{order.code}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 w-24 shrink-0">Cửa hàng:</span>
                  <span className="font-medium text-gray-900">{order.branchName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 w-24 shrink-0">Phương thức:</span>
                  <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", order.mode === "DELIVERY" ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-700")}>
                    {order.mode === "DELIVERY" ? "🛵 Giao hàng" : "🏪 Lấy tại quán"}
                  </span>
                </div>
                {order.deliveryAddress && (
                  <div className="flex items-start gap-2">
                    <span className="text-gray-400 w-24 shrink-0">Địa chỉ:</span>
                    <span className="text-gray-900">{order.deliveryAddress}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 w-24 shrink-0">Thanh toán:</span>
                  <span className="text-gray-900">{order.paymentMethod === "CASH" ? "💵 Tiền mặt" : "🏦 Chuyển khoản"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 w-24 shrink-0">Khách hàng:</span>
                  <span className="text-gray-900">{order.customerName} · {order.customerPhone}</span>
                </div>
                {order.note && (
                  <div className="flex items-start gap-2">
                    <span className="text-gray-400 w-24 shrink-0">Ghi chú:</span>
                    <span className="text-gray-700 italic">{order.note}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right col: order items */}
          <div className="sm:w-64 space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-50">
                <h2 className="font-semibold text-gray-900 text-sm">Sản phẩm</h2>
              </div>
              <div className="divide-y divide-gray-50">
                {order.items.map((item) => (
                  <div key={item.cartKey} className="px-4 py-3 flex gap-3">
                    <img src={item.image} alt={item.name} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-900 truncate">{item.name}</p>
                      <p className="text-[10px] text-gray-400">
                        {item.options.size} · {item.options.sugar} đường · {item.options.ice}
                      </p>
                      {item.options.toppings.length > 0 && (
                        <p className="text-[10px] text-gray-400">{item.options.toppings.map((t) => t.name).join(", ")}</p>
                      )}
                      <div className="flex justify-between mt-1">
                        <span className="text-[10px] text-gray-500">x{item.quantity}</span>
                        <span className="text-xs font-semibold text-gray-900">{fmt(item.unitPrice * item.quantity)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="px-4 py-3 bg-gray-50 space-y-1.5 text-xs border-t border-gray-100">
                <div className="flex justify-between text-gray-600">
                  <span>Tạm tính</span>
                  <span>{fmt(order.subtotal)}</span>
                </div>
                {order.mode === "DELIVERY" && (
                  <div className="flex justify-between text-gray-600">
                    <span>Phí giao hàng</span>
                    {order.deliveryFee === 0 ? (
                      <span className="text-emerald-600 font-medium">Miễn phí</span>
                    ) : (
                      <span>{fmt(order.deliveryFee)}</span>
                    )}
                  </div>
                )}
                <div className="flex justify-between font-bold text-sm text-gray-900 pt-1 border-t border-gray-200">
                  <span>Tổng cộng</span>
                  <span className="text-amber-600">{fmt(order.total)}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2">
              {isCompleted && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center">
                  <p className="text-2xl mb-2">🎉</p>
                  <p className="text-sm font-semibold text-emerald-800">Cảm ơn bạn đã đến với Hylux!</p>
                  <p className="text-xs text-emerald-600 mt-1">Hẹn gặp lại bạn lần sau!</p>
                </div>
              )}
              <Link
                to="/menu"
                className="block text-center w-full py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-semibold text-sm transition-all"
              >
                Đặt thêm đơn mới
              </Link>
              <Link
                to="/"
                className="block text-center w-full py-3 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl font-semibold text-sm transition-all"
              >
                Về trang chủ
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

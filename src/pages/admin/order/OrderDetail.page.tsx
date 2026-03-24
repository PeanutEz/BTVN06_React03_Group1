import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "../../../components";
import type { OrderDisplay, OrderStatus } from "../../../models/order.model";
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
  ORDER_TYPE_LABELS,
} from "../../../models/order.model";
import { fetchOrderById, updateOrderStatus } from "../../../services/order.service";
import { ROUTER_URL } from "../../../routes/router.const";
import { showSuccess, showError } from "../../../utils";
import { useAuthStore } from "../../../store";

// ─── Shared detail content (dùng cho cả page và modal) ──────────────────────
interface OrderDetailContentProps {
  orderId: string;
  onClose?: () => void;
  onStatusChange?: (orderId: string, newStatus: OrderStatus) => void;
}

export function OrderDetailContent({ orderId, onClose, onStatusChange }: OrderDetailContentProps) {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [order, setOrder] = useState<OrderDisplay | null>(null);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const lastId = useRef<string | undefined>(undefined);

  const loadOrder = async () => {
    if (!orderId) return;
    setLoading(true);
    try {
      const data = await fetchOrderById(orderId);
      if (!data) {
        showError("Không tìm thấy đơn hàng");
        if (onClose) onClose();
        else navigate(`${ROUTER_URL.ADMIN}/${ROUTER_URL.ADMIN_ROUTES.ORDERS}`);
        return;
      }
      setOrder(data);
    } catch (error) {
      console.error("Lỗi tải chi tiết đơn hàng:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (orderId === lastId.current) return;
    lastId.current = orderId;
    loadOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  const handlePreparing = async () => {
    if (!order || !orderId || order.status === "PREPARING") return;
    setUpdating(true);
    try {
      const adminId = user?.user?.id || user?.id || "1";
      const updated = await updateOrderStatus(orderId, "PREPARING", adminId);
      setOrder(prev => prev ? { ...prev, status: "PREPARING", ...(updated ?? {}) } : prev);
      showSuccess("Đã chuyển sang Đang chuẩn bị");
      onStatusChange?.(orderId, "PREPARING");
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Có lỗi xảy ra khi cập nhật trạng thái";
      showError(msg);
    } finally {
      setUpdating(false);
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-slate-400">Không tìm thấy đơn hàng</p>
      </div>
    );
  }

  const canPrepare =
    order.status !== "PREPARING" &&
    order.status !== "READY_FOR_PICKUP" &&
    order.status !== "DELIVERING" &&
    order.status !== "COMPLETED" &&
    order.status !== "CANCELLED";
  return (
    <div className="space-y-5 text-white">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">Chi tiết đơn hàng {order.code}</h1>
          <div className="flex flex-wrap items-center gap-2 mt-1 text-xs sm:text-sm text-white/50">
            <span>Tạo ngày {new Date(order.created_at).toLocaleString("vi-VN")}</span>
            <span>•</span>
            <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${ORDER_STATUS_COLORS[order.status]}`}>
              {ORDER_STATUS_LABELS[order.status]}
            </span>
            <span>•</span>
            <span className="text-white/70">{ORDER_TYPE_LABELS[order.type]}</span>
          </div>
        </div>
        {canPrepare && (
          <Button onClick={handlePreparing} loading={updating} disabled={updating} className="shrink-0">
            🍳 Chuyển sang Đang chuẩn bị
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-4">

          {/* Store Info */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-white/50">Thông tin chi nhánh & Nhân viên</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-white/50">Mã chi nhánh</span>
                <span className="font-semibold text-white/90">{String(order.franchise?.code || (order as any).franchise_code || "N/A")}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-white/50">Tên chi nhánh</span>
                <span className="font-semibold text-white/90">{order.franchise?.name || (order as any).franchise_name || "N/A"}</span>
              </div>
              {order.created_by_user && (
                <div className="flex justify-between gap-4">
                  <span className="text-white/50">Nhân viên tạo</span>
                  <span className="font-semibold text-white/90">{order.created_by_user.name}</span>
                </div>
              )}
            </div>
          </div>

          {/* Customer Info */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-white/50">Thông tin khách hàng</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-white/50">Tên</span>
                <span className="font-semibold text-white/90">{order.customer?.name || (order as any).customer_name || "N/A"}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-white/50">Email</span>
                <span className="font-semibold text-white/90">{String(order.customer?.email || (order as any).email || "N/A")}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-white/50">Số điện thoại</span>
                <span className="font-semibold text-white/90">{order.customer?.phone || (order as any).phone || "N/A"}</span>
              </div>
            </div>
          </div>

          {/* Timestamps */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-white/50">Thời gian</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-white/50">Ngày tạo</span>
                <span className="font-semibold text-white/90">{new Date(order.created_at).toLocaleString("vi-VN")}</span>
              </div>
              {order.confirmed_at && (
                <div className="flex justify-between gap-4">
                  <span className="text-white/50">Ngày xác nhận</span>
                  <span className="font-semibold text-white/90">{new Date(order.confirmed_at).toLocaleString("vi-VN")}</span>
                </div>
              )}
              {order.completed_at && (
                <div className="flex justify-between gap-4">
                  <span className="text-white/50">Ngày hoàn thành</span>
                  <span className="font-semibold text-emerald-400">{new Date(order.completed_at).toLocaleString("vi-VN")}</span>
                </div>
              )}
              {order.cancelled_at && (
                <div className="flex justify-between gap-4">
                  <span className="text-white/50">Ngày hủy</span>
                  <span className="font-semibold text-red-400">{new Date(order.cancelled_at).toLocaleString("vi-VN")}</span>
                </div>
              )}
            </div>
          </div>

          {/* Products */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-white/50">Sản phẩm</h2>
            <div className="space-y-3">
              {(order.items ?? []).length === 0 && <p className="text-sm text-white/40">Chưa có sản phẩm</p>}
              {(order.items ?? []).map((item, idx) => {
                const productName = item.product_name_snapshot ?? item.product_name ?? "Sản phẩm";
                const price = item.price_snapshot ?? item.price ?? 0;
                const qty = item.quantity ?? 0;
                const lineTotal = item.line_total ?? item.subtotal ?? (price * qty);
                return (
                  <div key={item._id ?? item.id ?? `item-${idx}`} className="flex gap-4 border-b border-white/10 pb-3 last:border-b-0 last:pb-0">
                    <div className="flex-1">
                      <p className="font-semibold text-white/90">{productName}</p>
                      <p className="text-xs text-white/50 mt-0.5">{formatCurrency(price)} × {qty}</p>
                    </div>
                    <p className="font-semibold text-white/90 whitespace-nowrap">{formatCurrency(lineTotal)}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Status History */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-white/50">Lịch sử trạng thái</h2>
            <div className="space-y-4">
              {(order.status_history ?? []).length === 0 && (
                <p className="text-xs text-white/40">Chưa có lịch sử</p>
              )}
              {order.status_history?.map((history, index) => (
                <div key={history.id} className="relative pl-5">
                  {index < order.status_history!.length - 1 && (
                    <div className="absolute left-[7px] top-5 h-full w-px bg-white/10" />
                  )}
                  <div className="absolute left-0 top-1 size-3.5 rounded-full border-2 border-primary-400 bg-slate-900" />
                  <div>
                    <span className={`inline-block rounded-full border px-2 py-0.5 text-xs font-semibold ${ORDER_STATUS_COLORS[history.to_status]}`}>
                      {ORDER_STATUS_LABELS[history.to_status]}
                    </span>
                    <p className="mt-1 text-xs text-white/40">
                      {history.created_at ? new Date(history.created_at).toLocaleString("vi-VN") : "N/A"}
                    </p>
                    {history.note && <p className="mt-0.5 text-xs text-white/60">{history.note}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Payment */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-white/50">Thanh toán</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-white/50">Loại đơn</span>
                <span className="font-semibold text-white/90">{ORDER_TYPE_LABELS[order.type]}</span>
              </div>
              {order.subtotal_amount && (
                <div className="flex justify-between gap-4">
                  <span className="text-white/50">Tạm tính</span>
                  <span className="text-white/80">{formatCurrency(order.subtotal_amount)}</span>
                </div>
              )}
              {(order.promotion_discount ?? 0) > 0 && (
                <div className="flex justify-between gap-4">
                  <span className="text-emerald-400">Khuyến mãi</span>
                  <span className="text-emerald-400">-{formatCurrency(order.promotion_discount ?? 0)}</span>
                </div>
              )}
              {(order.voucher_discount ?? 0) > 0 && (
                <div className="flex justify-between gap-4">
                  <span className="text-emerald-400">Voucher</span>
                  <span className="text-emerald-400">-{formatCurrency(order.voucher_discount ?? 0)}</span>
                </div>
              )}
              {(order.loyalty_discount ?? 0) > 0 && (
                <div className="flex justify-between gap-4">
                  <span className="text-emerald-400">Điểm thưởng</span>
                  <span className="text-emerald-400">-{formatCurrency(order.loyalty_discount ?? 0)}</span>
                </div>
              )}
              <div className="border-t border-white/10 pt-3 flex justify-between gap-4">
                <span className="font-semibold text-white/80">Tổng cộng</span>
                <span className="text-lg font-bold text-primary-400">{formatCurrency(order.final_amount ?? order.total_amount)}</span>
              </div>
            </div>
          </div>
        </div>      </div>
    </div>
  );
}

// ─── Popup Modal wrapper(dùng từ OrderList) ─────────────────────────────────
interface OrderDetailModalProps {
  orderId: string | null;
  onClose: () => void;
  onStatusChange?: (orderId: string, newStatus: OrderStatus) => void;
}

export function OrderDetailModal({ orderId, onClose, onStatusChange }: OrderDetailModalProps) {
  if (!orderId) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-5xl my-6 rounded-2xl shadow-2xl"
        style={{
          background: "rgba(15, 23, 42, 0.82)",
          backdropFilter: "blur(24px) saturate(160%)",
          WebkitBackdropFilter: "blur(24px) saturate(160%)",
          border: "1px solid rgba(255,255,255,0.10)",
          boxShadow: "0 25px 60px rgba(0,0,0,0.5)",
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-full p-1.5 text-white/50 hover:bg-white/10 hover:text-white transition-colors"
        >
          <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <div className="p-6 sm:p-8">
          <OrderDetailContent orderId={orderId} onClose={onClose} onStatusChange={onStatusChange} />
        </div>
      </div>
    </div>
  );
}

// ─── Page (giữ lại để route cũ vẫn hoạt động) ────────────────────────────────
const OrderDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  if (!id) return null;
  return <OrderDetailContent orderId={id} />;
};

export default OrderDetailPage;

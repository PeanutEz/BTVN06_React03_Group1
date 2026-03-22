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
  onClose?: () => void; // nếu có → đang dùng ở chế độ modal
}

export function OrderDetailContent({ orderId, onClose }: OrderDetailContentProps) {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [order, setOrder] = useState<OrderDisplay | null>(null);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState<OrderStatus>("DRAFT");
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
      setNewStatus(data.status);
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
  const handleUpdateStatus = async () => {
    if (!order || !orderId) return;
    if (newStatus === order.status) { setShowStatusModal(false); return; }
    setUpdating(true);
    try {
      const adminId = user?.user?.id || user?.id || "1";
      const updated = await updateOrderStatus(orderId, newStatus, adminId);
      if (updated) {
        setOrder(updated);
        showSuccess("Cập nhật trạng thái thành công");
        setShowStatusModal(false);
      } else {
        showError("Không thể cập nhật trạng thái");
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Có lỗi xảy ra khi cập nhật trạng thái";
      showError(msg);
    } finally { setUpdating(false); }
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
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Chi tiết đơn hàng {order.code}</h1>
        <div className="flex flex-wrap items-center gap-2 mt-1 text-xs sm:text-sm text-slate-500">
          <span>Tạo ngày {new Date(order.created_at).toLocaleString("vi-VN")}</span>
          <span>•</span>
          <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${ORDER_STATUS_COLORS[order.status]}`}>
            {ORDER_STATUS_LABELS[order.status]}
          </span>
          <span>•</span>
          <span className="font-medium text-slate-600">{ORDER_TYPE_LABELS[order.type]}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Store Info */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">Thông tin chi nhánh & Nhân viên</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Mã chi nhánh:</span>
                <span className="font-semibold text-primary-600">{String(order.franchise?.code || (order as any).franchise_code || "N/A")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Tên chi nhánh:</span>
                <span className="font-semibold text-slate-900">{order.franchise?.name || (order as any).franchise_name || "N/A"}</span>
              </div>
              {order.created_by_user && (
                <div className="flex justify-between">
                  <span className="text-slate-600">Nhân viên tạo:</span>
                  <span className="font-semibold text-slate-900">{order.created_by_user.name}</span>
                </div>
              )}
            </div>
          </div>

          {/* Customer Info */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">Thông tin khách hàng</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Tên:</span>
                <span className="font-semibold text-slate-900">{order.customer?.name || (order as any).customer_name || "N/A"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Email:</span>
                <span className="font-semibold text-slate-900">{String(order.customer?.email || (order as any).email || "N/A")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Số điện thoại:</span>
                <span className="font-semibold text-slate-900">{order.customer?.phone || (order as any).phone || "N/A"}</span>
              </div>
            </div>
          </div>

          {/* Timestamps */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">Thời gian</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Ngày tạo:</span>
                <span className="font-semibold text-slate-900">{new Date(order.created_at).toLocaleString("vi-VN")}</span>
              </div>
              {order.confirmed_at && (
                <div className="flex justify-between">
                  <span className="text-slate-600">Ngày xác nhận:</span>
                  <span className="font-semibold text-slate-900">{new Date(order.confirmed_at).toLocaleString("vi-VN")}</span>
                </div>
              )}
              {order.completed_at && (
                <div className="flex justify-between">
                  <span className="text-slate-600">Ngày hoàn thành:</span>
                  <span className="font-semibold text-green-600">{new Date(order.completed_at).toLocaleString("vi-VN")}</span>
                </div>
              )}
              {order.cancelled_at && (
                <div className="flex justify-between">
                  <span className="text-slate-600">Ngày hủy:</span>
                  <span className="font-semibold text-red-600">{new Date(order.cancelled_at).toLocaleString("vi-VN")}</span>
                </div>
              )}
            </div>
          </div>

          {/* Products */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">Sản phẩm</h2>
            <div className="space-y-4">
              {(order.items ?? []).length === 0 && <p className="text-sm text-slate-500">Chưa có sản phẩm</p>}
              {(order.items ?? []).map((item, idx) => {
                const productName = item.product_name_snapshot ?? item.product_name ?? "Sản phẩm";
                const price = item.price_snapshot ?? item.price ?? 0;
                const qty = item.quantity ?? 0;
                const lineTotal = item.line_total ?? item.subtotal ?? (price * qty);
                return (
                  <div key={item._id ?? item.id ?? `item-${idx}`} className="flex gap-4 border-b border-slate-100 pb-4 last:border-b-0">
                    <div className="flex-1">
                      <p className="font-semibold text-slate-900">{productName}</p>
                      <p className="text-sm text-slate-600">{formatCurrency(price)} x {qty}</p>
                    </div>
                    <p className="font-semibold text-slate-900">{formatCurrency(lineTotal)}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Status History */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">Lịch sử trạng thái</h2>
            <div className="space-y-4">
              {order.status_history?.map((history, index) => (
                <div key={history.id} className="relative pl-6">
                  {index < order.status_history!.length - 1 && (
                    <div className="absolute left-2 top-6 h-full w-0.5 bg-slate-200" />
                  )}
                  <div className="absolute left-0 top-1.5 size-4 rounded-full border-2 border-primary-500 bg-white" />
                  <div>
                    <span className={`inline-block rounded-full border px-2 py-0.5 text-xs font-semibold ${ORDER_STATUS_COLORS[history.to_status]}`}>
                      {ORDER_STATUS_LABELS[history.to_status]}
                    </span>
                    <p className="mt-1 text-xs text-slate-500">
                      {history.created_at ? new Date(history.created_at).toLocaleString("vi-VN") : "N/A"}
                    </p>
                    {history.note && <p className="mt-1 text-sm text-slate-600">{history.note}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Payment */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">Thanh toán</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Loại đơn:</span>
                <span className="font-semibold text-slate-900">{ORDER_TYPE_LABELS[order.type]}</span>
              </div>
              {order.subtotal_amount && (
                <div className="flex justify-between">
                  <span className="text-slate-600">Tạm tính:</span>
                  <span className="text-slate-900">{formatCurrency(order.subtotal_amount)}</span>
                </div>
              )}
              {(order.promotion_discount ?? 0) > 0 && (
                <div className="flex justify-between">
                  <span className="text-green-600">Khuyến mãi</span>
                  <span className="text-green-600">-{formatCurrency(order.promotion_discount ?? 0)}</span>
                </div>
              )}
              {(order.voucher_discount ?? 0) > 0 && (
                <div className="flex justify-between">
                  <span className="text-green-600">Voucher</span>
                  <span className="text-green-600">-{formatCurrency(order.voucher_discount ?? 0)}</span>
                </div>
              )}
              {(order.loyalty_discount ?? 0) > 0 && (
                <div className="flex justify-between">
                  <span className="text-green-600">Điểm thưởng</span>
                  <span className="text-green-600">-{formatCurrency(order.loyalty_discount ?? 0)}</span>
                </div>
              )}
              <div className="border-t border-slate-200 pt-3 flex justify-between">
                <span className="font-semibold text-slate-900">Tổng cộng:</span>
                <span className="text-lg font-bold text-primary-600">{formatCurrency(order.final_amount ?? order.total_amount)}</span>
              </div>
            </div>
          </div>          {/* Current Status */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Trạng thái hiện tại</h2>
            <div className="flex items-center justify-between gap-3">
              <span className={`rounded-full border px-3 py-1 text-sm font-semibold ${ORDER_STATUS_COLORS[order.status]}`}>
                {ORDER_STATUS_LABELS[order.status]}
              </span>
              <button
                onClick={() => setShowStatusModal(true)}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700"
              >
                <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Cập nhật
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Status Update Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/25" onClick={() => setShowStatusModal(false)} />
          <div className="relative w-full max-w-md rounded-2xl p-6 shadow-2xl"
            style={{
              background: "rgba(255,255,255,0.12)",
              backdropFilter: "blur(40px) saturate(200%)",
              WebkitBackdropFilter: "blur(40px) saturate(200%)",
              border: "1px solid rgba(255,255,255,0.25)",
              boxShadow: "0 25px 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.2)",
            }}
          >
            <h2 className="mb-4 text-xl font-bold text-white/95">Cập nhật trạng thái</h2>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-white/80">Chọn trạng thái mới</label>                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as OrderStatus)}
                  className="w-full rounded-lg border border-white/[0.15] bg-white/[0.08] px-4 py-2 text-sm text-white/90 outline-none [&>option]:bg-slate-900 [&>option]:text-white"
                >
                  <option value="DRAFT">Nháp</option>
                  <option value="CONFIRMED">Đã xác nhận</option>
                  <option value="PREPARING">Đang chuẩn bị</option>
                  <option value="READY_FOR_PICKUP">Sẵn sàng lấy hàng</option>
                  <option value="DELIVERING">Đang giao</option>
                  <option value="COMPLETED">Hoàn thành</option>
                  <option value="CANCELLED">Đã hủy</option>
                </select>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleUpdateStatus} loading={updating} disabled={updating} className="flex-1">Xác nhận</Button>
                <Button onClick={() => setShowStatusModal(false)} variant="outline" disabled={updating}
                  className="flex-1 border border-white/[0.15] text-white/70 hover:bg-white/[0.1] hover:text-white">
                  Hủy
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Popup Modal wrapper (dùng từ OrderList) ─────────────────────────────────
interface OrderDetailModalProps {
  orderId: string | null;
  onClose: () => void;
}

export function OrderDetailModal({ orderId, onClose }: OrderDetailModalProps) {
  if (!orderId) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-5xl my-6 rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
        >
          <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <div className="p-6 sm:p-8">
          <OrderDetailContent orderId={orderId} onClose={onClose} />
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

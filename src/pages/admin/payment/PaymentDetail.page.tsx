import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button } from "../../../components";
import type { Payment, PaymentStatus } from "../../../models/payment.model";
import {
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_COLORS,
  PAYMENT_METHOD_TYPE_LABELS,
} from "../../../models/payment.model";
import { fetchPaymentById, updatePaymentStatus } from "../../../services/payment.service";
import { fetchOrderById } from "../../../services/order.service";
import type { OrderDisplay } from "../../../models/order.model";
import { ROUTER_URL } from "../../../routes/router.const";
import { showSuccess, showError } from "../../../utils";

const PaymentDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [payment, setPayment] = useState<Payment | null>(null);
  const [order, setOrder] = useState<OrderDisplay | null>(null);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState<PaymentStatus>("DRAFT");
  const lastId = useRef<string | undefined>(undefined);

  const loadPayment = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const paymentId = Number(id);
      const data = await fetchPaymentById(paymentId);
      if (!data) {
        showError("Không tìm thấy thanh toán");
        navigate(`${ROUTER_URL.ADMIN}/${ROUTER_URL.ADMIN_ROUTES.PAYMENTS}`);
        return;
      }
      setPayment(data);
      setNewStatus(data.status);

      // Load related order
      const orderData = await fetchOrderById(data.order_id);
      setOrder(orderData);
    } catch (error) {
      console.error("Lỗi tải chi tiết thanh toán:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id === lastId.current) return;
    lastId.current = id;
    loadPayment();
  }, [id]);

  const handleUpdateStatus = async () => {
    if (!payment || !id) return;

    if (newStatus === payment.status) {
      setShowStatusModal(false);
      return;
    }

    setUpdating(true);
    try {
      const paymentId = Number(id);
      const updated = await updatePaymentStatus(paymentId, newStatus);
      if (updated) {
        setPayment(updated);
        showSuccess("Cập nhật trạng thái thành công");
        setShowStatusModal(false);
      } else {
        showError("Không thể cập nhật trạng thái");
      }
    } catch (error) {
      showError("Có lỗi xảy ra");
    } finally {
      setUpdating(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-slate-500">Đang tải...</p>
      </div>
    );
  }

  if (!payment) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-slate-500">Không tìm thấy thanh toán</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <Link to={`${ROUTER_URL.ADMIN}/${ROUTER_URL.ADMIN_ROUTES.PAYMENTS}`}>
            <Button variant="outline" size="sm">
              ← Quay lại
            </Button>
          </Link>
          <div>
            <h1 className="text-lg sm:text-2xl font-bold text-slate-900">Chi tiết thanh toán PT-{String(payment.id).padStart(4, '0')}</h1>
            <p className="text-xs sm:text-sm text-slate-600">
              Tạo ngày {new Date(payment.created_at).toLocaleString("vi-VN")}
            </p>
          </div>
        </div>
        <Button onClick={() => setShowStatusModal(true)}>Cập nhật trạng thái</Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Payment Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Main Info */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">Thông tin thanh toán</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Mã thanh toán:</span>
                <span className="font-semibold text-primary-600">PT-{String(payment.id).padStart(4, '0')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Cửa hàng:</span>
                <div className="text-right">
                  <p className="font-semibold text-slate-900">{payment.franchise_code || 'N/A'}</p>
                  <p className="text-xs text-slate-500">{payment.franchise_name || 'N/A'}</p>
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Mã đơn hàng:</span>
                <Link
                  to={`${ROUTER_URL.ADMIN}/${ROUTER_URL.ADMIN_ROUTES.ORDERS}/${payment.order_id}`}
                  className="font-semibold text-blue-600 hover:underline"
                >
                  {payment.order_code}
                </Link>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Khách hàng:</span>
                <span className="font-semibold text-slate-900">{payment.customer_name || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Phương thức:</span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  {PAYMENT_METHOD_TYPE_LABELS[payment.method]}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Số tiền:</span>
                <span className="text-xl font-bold text-primary-600">
                  {formatCurrency(payment.amount)}
                </span>
              </div>
              {payment.transaction_id && (
                <div className="flex justify-between">
                  <span className="text-slate-600">Mã giao dịch:</span>
                  <span className="font-mono text-xs font-semibold text-slate-900">
                    {payment.transaction_id}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-600">Trạng thái:</span>
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${PAYMENT_STATUS_COLORS[payment.status]}`}
                >
                  {PAYMENT_STATUS_LABELS[payment.status]}
                </span>
              </div>
            </div>
          </div>

          {/* Related Order */}
          {order && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-slate-900">Thông tin đơn hàng</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Mã đơn:</span>
                  <span className="font-semibold text-primary-600">{order.code}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Khách hàng:</span>
                  <div className="text-right">
                    <p className="font-semibold text-slate-900">{order.customer?.name || 'N/A'}</p>
                    <p className="text-xs text-slate-500">{order.customer?.email || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Tổng giá trị:</span>
                  <span className="font-semibold text-slate-900">{formatCurrency(order.total_amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Số sản phẩm:</span>
                  <span className="font-semibold text-slate-900">{order.items?.length || 0} sản phẩm</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="space-y-6">
          {/* Current Status */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">Trạng thái hiện tại</h2>
            <div className="text-center">
              <span
                className={`inline-block rounded-full border px-4 py-2 text-sm font-semibold ${PAYMENT_STATUS_COLORS[payment.status]}`}
              >
                {PAYMENT_STATUS_LABELS[payment.status]}
              </span>
              <p className="mt-4 text-xs text-slate-500">
                Cập nhật lần cuối: {new Date(payment.updated_at).toLocaleString("vi-VN")}
              </p>
            </div>
          </div>

          {/* Amount Summary */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">Tổng quan</h2>
            <div className="space-y-3">
              <div className="rounded-lg bg-primary-50 p-4 text-center">
                <p className="text-sm text-slate-600">Số tiền thanh toán</p>
                <p className="mt-1 text-2xl font-bold text-primary-600">
                  {formatCurrency(payment.amount)}
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-sm text-slate-600">Phương thức</p>
                <p className="mt-1 font-semibold text-slate-900">
                  {PAYMENT_METHOD_TYPE_LABELS[payment.method]}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Status Update Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60"
            style={{ backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }}
            onClick={() => setShowStatusModal(false)}
          />
          <div
            className="relative w-full max-w-md rounded-2xl p-6 shadow-2xl"
            style={{
              background: "rgba(255,255,255,0.13)",
              backdropFilter: "blur(40px) saturate(180%)",
              WebkitBackdropFilter: "blur(40px) saturate(180%)",
              border: "1px solid rgba(255,255,255,0.22)",
              boxShadow: "0 30px 70px rgba(0,0,0,0.4), 0 0 1px rgba(255,255,255,0.3), inset 0 1px 0 rgba(255,255,255,0.2)",
            }}
          >
            <h2 className="mb-4 text-xl font-bold text-white/95">Cập nhật trạng thái</h2>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-white/80">
                  Chọn trạng thái mới
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as PaymentStatus)}
                  className="w-full rounded-lg border border-white/[0.15] bg-white/[0.08] px-4 py-2 text-sm text-white/90 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 [&>option]:bg-slate-900 [&>option]:text-white"
                >
                  <option value="PENDING">Chờ thanh toán</option>
                  <option value="DRAFT">Chưa thanh toán</option>
                  <option value="CONFIRMED">Đã xác nhận</option>
                  <option value="PREPARING">Đang xử lý</option>
                  <option value="READY_FOR_PICKUP">Sẵn sàng lấy hàng</option>
                  <option value="DELIVERING">Đang giao hàng</option>
                  <option value="COMPLETED">Thành công</option>
                  <option value="CANCELLED">Đã hủy</option>
                </select>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleUpdateStatus}
                  loading={updating}
                  disabled={updating}
                  className="flex-1"
                >
                  Xác nhận
                </Button>
                <Button
                  onClick={() => setShowStatusModal(false)}
                  variant="outline"
                  disabled={updating}
                  className="flex-1 border border-white/[0.15] text-white/70 hover:bg-white/[0.1] hover:text-white"
                >
                  Hủy
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentDetailPage;

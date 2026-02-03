import { useEffect, useState } from "react";
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
import type { Order } from "../../../models/order.model";
import { ROUTER_URL } from "../../../routes/router.const";
import { showSuccess, showError } from "../../../utils";

const PaymentDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [payment, setPayment] = useState<Payment | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState<PaymentStatus>("PENDING");

  const loadPayment = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await fetchPaymentById(id);
      if (!data) {
        showError("Không tìm thấy thanh toán");
        navigate(`${ROUTER_URL.ADMIN}/${ROUTER_URL.ADMIN_ROUTES.PAYMENTS}`);
        return;
      }
      setPayment(data);
      setNewStatus(data.status);

      // Load related order
      const orderData = await fetchOrderById(data.orderId);
      setOrder(orderData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
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
      const updated = await updatePaymentStatus(id, newStatus);
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to={`${ROUTER_URL.ADMIN}/${ROUTER_URL.ADMIN_ROUTES.PAYMENTS}`}>
            <Button variant="outline" size="sm">
              ← Quay lại
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Chi tiết thanh toán #{payment.id}</h1>
            <p className="text-sm text-slate-600">
              Tạo ngày {new Date(payment.createDate).toLocaleString("vi-VN")}
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
                <span className="font-semibold text-primary-600">{payment.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Cửa hàng:</span>
                <div className="text-right">
                  <p className="font-semibold text-slate-900">{payment.storeCode}</p>
                  <p className="text-xs text-slate-500">{payment.storeName}</p>
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Mã đơn hàng:</span>
                <Link
                  to={`${ROUTER_URL.ADMIN}/${ROUTER_URL.ADMIN_ROUTES.ORDERS}/${payment.orderId}`}
                  className="font-semibold text-blue-600 hover:underline"
                >
                  {payment.orderId}
                </Link>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Khách hàng:</span>
                <span className="font-semibold text-slate-900">{payment.customerName}</span>
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
              {payment.transactionId && (
                <div className="flex justify-between">
                  <span className="text-slate-600">Mã giao dịch:</span>
                  <span className="font-mono text-xs font-semibold text-slate-900">
                    {payment.transactionId}
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
                  <span className="font-semibold text-primary-600">{order.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Khách hàng:</span>
                  <div className="text-right">
                    <p className="font-semibold text-slate-900">{order.customerName}</p>
                    <p className="text-xs text-slate-500">{order.customerEmail}</p>
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Tổng giá trị:</span>
                  <span className="font-semibold text-slate-900">{formatCurrency(order.total)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Số sản phẩm:</span>
                  <span className="font-semibold text-slate-900">{order.items.length} sản phẩm</span>
                </div>
              </div>
            </div>
          )}

          {/* Payment Logs */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">Lịch sử giao dịch</h2>
            <div className="space-y-4">
              {payment.logs.map((log, index) => (
                <div key={log.id} className="relative pl-6">
                  {index < payment.logs.length - 1 && (
                    <div className="absolute left-2 top-6 h-full w-0.5 bg-slate-200" />
                  )}
                  <div className="absolute left-0 top-1.5 size-4 rounded-full border-2 border-primary-500 bg-white" />
                  <div>
                    <span
                      className={`inline-block rounded-full border px-2 py-0.5 text-xs font-semibold ${PAYMENT_STATUS_COLORS[log.status]}`}
                    >
                      {PAYMENT_STATUS_LABELS[log.status]}
                    </span>
                    <p className="mt-1 text-sm text-slate-900">{log.message}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {new Date(log.timestamp).toLocaleString("vi-VN")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
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
                Cập nhật lần cuối: {new Date(payment.updateDate).toLocaleString("vi-VN")}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <h2 className="mb-4 text-xl font-bold text-slate-900">Cập nhật trạng thái</h2>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Chọn trạng thái mới
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as PaymentStatus)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                >
                  <option value="PENDING">Đang chờ</option>
                  <option value="SUCCESS">Thành công</option>
                  <option value="FAILED">Thất bại</option>
                  <option value="REFUNDED">Đã hoàn tiền</option>
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
                  className="flex-1"
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

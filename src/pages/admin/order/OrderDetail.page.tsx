import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button } from "../../../components";
import type { Order, OrderStatus } from "../../../models/order.model";
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
  PAYMENT_METHOD_LABELS,
} from "../../../models/order.model";
import { fetchOrderById, updateOrderStatus } from "../../../services/order.service";
import { ROUTER_URL } from "../../../routes/router.const";
import { showSuccess, showError } from "../../../utils";

const OrderDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState<OrderStatus>("CREATED");

  const loadOrder = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await fetchOrderById(id);
      if (!data) {
        showError("Không tìm thấy đơn hàng");
        navigate(`${ROUTER_URL.ADMIN}/${ROUTER_URL.ADMIN_ROUTES.ORDERS}`);
        return;
      }
      setOrder(data);
      setNewStatus(data.status);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrder();
  }, [id]);

  const handleUpdateStatus = async () => {
    if (!order || !id) return;

    if (newStatus === order.status) {
      setShowStatusModal(false);
      return;
    }

    setUpdating(true);
    try {
      const updated = await updateOrderStatus(id, newStatus);
      if (updated) {
        setOrder(updated);
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

  if (!order) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-slate-500">Không tìm thấy đơn hàng</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to={`${ROUTER_URL.ADMIN}/${ROUTER_URL.ADMIN_ROUTES.ORDERS}`}>
            <Button variant="outline" size="sm">
              ← Quay lại
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Chi tiết đơn hàng #{order.id}</h1>
            <p className="text-sm text-slate-600">
              Tạo ngày {new Date(order.createDate).toLocaleString("vi-VN")}
            </p>
          </div>
        </div>
        <Button onClick={() => setShowStatusModal(true)}>Cập nhật trạng thái</Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Order Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Store Info */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">Thông tin cửa hàng</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Mã cửa hàng:</span>
                <span className="font-semibold text-primary-600">{order.storeCode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Tên cửa hàng:</span>
                <span className="font-semibold text-slate-900">{order.storeName}</span>
              </div>
            </div>
          </div>

          {/* Customer Info */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">Thông tin khách hàng</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Tên:</span>
                <span className="font-semibold text-slate-900">{order.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Email:</span>
                <span className="font-semibold text-slate-900">{order.customerEmail}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Số điện thoại:</span>
                <span className="font-semibold text-slate-900">{order.customerPhone}</span>
              </div>
            </div>
          </div>

          {/* Products */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">Sản phẩm</h2>
            <div className="space-y-4">
              {order.items.map((item) => (
                <div key={item.id} className="flex gap-4 border-b border-slate-100 pb-4 last:border-b-0">
                  <img
                    src={item.productImage}
                    alt={item.productName}
                    className="size-16 rounded-lg object-cover"
                  />
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900">{item.productName}</p>
                    <p className="text-sm text-slate-600">
                      {formatCurrency(item.price)} x {item.quantity}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-slate-900">{formatCurrency(item.subtotal)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Order Summary */}
        <div className="space-y-6">
          {/* Status Timeline */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">Lịch sử trạng thái</h2>
            <div className="space-y-4">
              {order.statusHistory.map((history, index) => (
                <div key={index} className="relative pl-6">
                  {index < order.statusHistory.length - 1 && (
                    <div className="absolute left-2 top-6 h-full w-0.5 bg-slate-200" />
                  )}
                  <div className="absolute left-0 top-1.5 size-4 rounded-full border-2 border-primary-500 bg-white" />
                  <div>
                    <span
                      className={`inline-block rounded-full border px-2 py-0.5 text-xs font-semibold ${ORDER_STATUS_COLORS[history.status]}`}
                    >
                      {ORDER_STATUS_LABELS[history.status]}
                    </span>
                    <p className="mt-1 text-xs text-slate-500">
                      {new Date(history.date).toLocaleString("vi-VN")}
                    </p>
                    {history.note && <p className="mt-1 text-sm text-slate-600">{history.note}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Payment & Summary */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">Thanh toán</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Phương thức:</span>
                <span className="font-semibold text-slate-900">
                  {PAYMENT_METHOD_LABELS[order.paymentMethod]}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Tạm tính:</span>
                <span className="text-slate-900">{formatCurrency(order.subtotal)}</span>
              </div>
              <div className="border-t border-slate-200 pt-3">
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-900">Tổng cộng:</span>
                  <span className="text-lg font-bold text-primary-600">
                    {formatCurrency(order.total)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Current Status */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">Trạng thái hiện tại</h2>
            <span
              className={`inline-block rounded-full border px-4 py-2 text-sm font-semibold ${ORDER_STATUS_COLORS[order.status]}`}
            >
              {ORDER_STATUS_LABELS[order.status]}
            </span>
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
                  onChange={(e) => setNewStatus(e.target.value as OrderStatus)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                >
                  <option value="CREATED">Đã tạo</option>
                  <option value="PAID">Đã thanh toán</option>
                  <option value="COMPLETED">Hoàn thành</option>
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

export default OrderDetailPage;

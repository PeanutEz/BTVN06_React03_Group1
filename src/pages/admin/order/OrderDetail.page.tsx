import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
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

const OrderDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<OrderDisplay | null>(null);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState<OrderStatus>("DRAFT");

  const loadOrder = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await fetchOrderById(Number(id));
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
      const updated = await updateOrderStatus(Number(id), newStatus, 1); // 1 = admin user id
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
            <h1 className="text-2xl font-bold text-slate-900">Chi tiết đơn hàng {order.code}</h1>
            <div className="flex gap-4 text-sm text-slate-600">
              <span>Tạo ngày {new Date(order.created_at).toLocaleString("vi-VN")}</span>
              <span>•</span>
              <span className="font-semibold">{ORDER_TYPE_LABELS[order.type]}</span>
            </div>
          </div>
        </div>
        <Button onClick={() => setShowStatusModal(true)}>Cập nhật trạng thái</Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Order Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Store Info */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">Thông tin cửa hàng & Nhân viên</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Mã cửa hàng:</span>
                <span className="font-semibold text-primary-600">{order.franchise?.code || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Tên cửa hàng:</span>
                <span className="font-semibold text-slate-900">{order.franchise?.name || 'N/A'}</span>
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
                <span className="font-semibold text-slate-900">{order.customer?.name || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Email:</span>
                <span className="font-semibold text-slate-900">{order.customer?.email || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Số điện thoại:</span>
                <span className="font-semibold text-slate-900">{order.customer?.phone || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Timestamps */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">Thời gian</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Ngày tạo:</span>
                <span className="font-semibold text-slate-900">
                  {new Date(order.created_at).toLocaleString("vi-VN")}
                </span>
              </div>
              {order.confirmed_at && (
                <div className="flex justify-between">
                  <span className="text-slate-600">Ngày xác nhận:</span>
                  <span className="font-semibold text-slate-900">
                    {new Date(order.confirmed_at).toLocaleString("vi-VN")}
                  </span>
                </div>
              )}
              {order.completed_at && (
                <div className="flex justify-between">
                  <span className="text-slate-600">Ngày hoàn thành:</span>
                  <span className="font-semibold text-green-600">
                    {new Date(order.completed_at).toLocaleString("vi-VN")}
                  </span>
                </div>
              )}
              {order.cancelled_at && (
                <div className="flex justify-between">
                  <span className="text-slate-600">Ngày hủy:</span>
                  <span className="font-semibold text-red-600">
                    {new Date(order.cancelled_at).toLocaleString("vi-VN")}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Products */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">Sản phẩm</h2>
            <div className="space-y-4">
              {order.items && order.items.map((item) => (
                <div key={item.id} className="flex gap-4 border-b border-slate-100 pb-4 last:border-b-0">
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900">{item.product_name_snapshot}</p>
                    <p className="text-sm text-slate-600">
                      {formatCurrency(item.price_snapshot)} x {item.quantity}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-slate-900">{formatCurrency(item.line_total)}</p>
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
              {order.status_history && order.status_history.map((history, index) => (
                <div key={history.id} className="relative pl-6">
                  {index < order.status_history!.length - 1 && (
                    <div className="absolute left-2 top-6 h-full w-0.5 bg-slate-200" />
                  )}
                  <div className="absolute left-0 top-1.5 size-4 rounded-full border-2 border-primary-500 bg-white" />
                  <div>
                    <span
                      className={`inline-block rounded-full border px-2 py-0.5 text-xs font-semibold ${ORDER_STATUS_COLORS[history.to_status]}`}
                    >
                      {ORDER_STATUS_LABELS[history.to_status]}
                    </span>
                    <p className="mt-1 text-xs text-slate-500">
                      {new Date(history.created_at).toLocaleString("vi-VN")}
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
                  {ORDER_TYPE_LABELS[order.type]}
                </span>
              </div>
              <div className="border-t border-slate-200 pt-3">
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-900">Tổng cộng:</span>
                  <span className="text-lg font-bold text-primary-600">
                    {formatCurrency(order.total_amount)}
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
                  <option value="DRAFT">Nháp</option>
                  <option value="CONFIRMED">Đã xác nhận</option>
                  <option value="PREPARING">Đang chuẩn bị</option>
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

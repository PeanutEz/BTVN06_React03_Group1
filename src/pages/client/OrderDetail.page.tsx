import { useParams, useNavigate } from "react-router-dom";
import type { Order, OrderItem } from "../../models/order.model";
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, ORDER_TYPE_LABELS } from "../../models/order.model";
import { mockOrders } from "../../mock/orders.mock";
import { mockOrderItems } from "../../mock/orders.mock";
import { mockCustomers } from "../../mock/customers.mock";
import { mockCustomerFranchises } from "../../mock/customers.mock";
import { ROUTER_URL } from "../../routes/router.const";
import { Button } from "../../components";
import { LOYALTY_TIER_LABELS, LOYALTY_TIER_COLORS } from "../../models/customer.model";

const OrderDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Find order
  const order = mockOrders.find((o) => o.id === id);
  if (!order) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-16">
            <p className="text-slate-500 mb-4">Không tìm thấy đơn hàng</p>
            <Button onClick={() => navigate(ROUTER_URL.ORDERS)}>Quay lại danh sách</Button>
          </div>
        </div>
      </div>
    );
  }

  // Find customer
  const customer = mockCustomers.find((c) => c.id === order.customer_id);
  
  // Find customer franchise data
  const customerFranchise = mockCustomerFranchises.find(
    (cf) => cf.customer_id === order.customer_id && cf.franchise_id === order.franchise_id
  );

  // Find order items
  const orderItems = mockOrderItems.filter((item) => item.order_id === order.id);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("vi-VN");
  };

  // Build status timeline
  const statusTimeline = [];
  if (order.created_at) {
    statusTimeline.push({ status: "DRAFT" as const, date: order.created_at, label: "Tạo đơn" });
  }
  if (order.confirmed_at) {
    statusTimeline.push({ status: "CONFIRMED" as const, date: order.confirmed_at, label: "Xác nhận" });
  }
  if (order.completed_at) {
    statusTimeline.push({ status: "COMPLETED" as const, date: order.completed_at, label: "Hoàn thành" });
  }
  if (order.cancelled_at) {
    statusTimeline.push({ status: "CANCELLED" as const, date: order.cancelled_at, label: "Hủy" });
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={() => navigate(ROUTER_URL.ORDERS)}>
              ← Quay lại
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Chi tiết đơn hàng</h1>
              <p className="text-sm text-slate-600 mt-1">Mã đơn: {order.code}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Order Info */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Thông tin đơn hàng</h2>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-600">Mã đơn:</span>
                    <span className="ml-2 font-semibold text-slate-900">{order.code}</span>
                  </div>
                  <div>
                    <span className="text-slate-600">Trạng thái:</span>
                    <span className={`ml-2 inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${ORDER_STATUS_COLORS[order.status]}`}>
                      {ORDER_STATUS_LABELS[order.status]}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-600">Loại đơn:</span>
                    <span className="ml-2 font-semibold text-slate-900">{ORDER_TYPE_LABELS[order.type]}</span>
                  </div>
                  <div>
                    <span className="text-slate-600">Tổng tiền:</span>
                    <span className="ml-2 font-semibold text-primary-600">{formatCurrency(order.total_amount)}</span>
                  </div>
                  {order.confirmed_at && (
                    <div>
                      <span className="text-slate-600">Xác nhận lúc:</span>
                      <span className="ml-2 text-slate-900">{formatDate(order.confirmed_at)}</span>
                    </div>
                  )}
                  {order.completed_at && (
                    <div>
                      <span className="text-slate-600">Hoàn thành lúc:</span>
                      <span className="ml-2 text-slate-900">{formatDate(order.completed_at)}</span>
                    </div>
                  )}
                  {order.cancelled_at && (
                    <div>
                      <span className="text-slate-600">Hủy lúc:</span>
                      <span className="ml-2 text-slate-900">{formatDate(order.cancelled_at)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Customer Info */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Thông tin khách hàng</h2>
                {customer && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-4">
                      {customer.avatar && (
                        <img
                          src={customer.avatar}
                          alt={customer.name}
                          className="w-16 h-16 rounded-full object-cover"
                        />
                      )}
                      <div>
                        <p className="font-semibold text-slate-900">{customer.name}</p>
                        <p className="text-sm text-slate-600">{customer.phone}</p>
                      </div>
                    </div>
                    {customerFranchise && (
                      <div className="pt-3 border-t border-slate-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-600">Hạng tích điểm:</span>
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${LOYALTY_TIER_COLORS[customerFranchise.loyalty_tier]}`}
                          >
                            {LOYALTY_TIER_LABELS[customerFranchise.loyalty_tier]}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-600">Điểm tích lũy:</span>
                          <span className="font-semibold text-slate-900">{customerFranchise.loyalty_point} điểm</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Order Items */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Sản phẩm</h2>
                <div className="space-y-4">
                  {orderItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between border-b border-slate-100 pb-4 last:border-b-0">
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
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-semibold text-slate-900">Tổng cộng:</span>
                    <span className="text-2xl font-bold text-primary-600">
                      {formatCurrency(order.total_amount)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Status Timeline */}
              {statusTimeline.length > 0 && (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-semibold text-slate-900 mb-4">Lịch sử trạng thái</h2>
                  <div className="space-y-4">
                    {statusTimeline.map((timeline, index) => (
                      <div key={index} className="relative pl-6">
                        {index < statusTimeline.length - 1 && (
                          <div className="absolute left-2 top-6 h-full w-0.5 bg-slate-200" />
                        )}
                        <div className="absolute left-0 top-1.5 size-4 rounded-full border-2 border-primary-500 bg-white" />
                        <div>
                          <span
                            className={`inline-block rounded-full border px-2 py-0.5 text-xs font-semibold ${ORDER_STATUS_COLORS[timeline.status]}`}
                          >
                            {timeline.label}
                          </span>
                          <p className="mt-1 text-xs text-slate-500">{formatDate(timeline.date)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetailPage;

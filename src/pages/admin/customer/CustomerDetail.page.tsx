import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button } from "../../../components";
import type { Customer } from "../../../models/customer.model";
import {
  LOYALTY_TIER_LABELS,
  LOYALTY_TIER_COLORS,
  CUSTOMER_STATUS_LABELS,
  CUSTOMER_STATUS_COLORS,
} from "../../../models/customer.model";
import { fetchCustomerById } from "../../../services/customer.service";
import { fetchOrders } from "../../../services/order.service";
import type { Order } from "../../../models/order.model";
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from "../../../models/order.model";
import { ROUTER_URL } from "../../../routes/router.const";
import { showError } from "../../../utils";

const CustomerDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);

  const loadCustomer = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await fetchCustomerById(id);
      if (!data) {
        showError("Không tìm thấy khách hàng");
        navigate(`${ROUTER_URL.ADMIN}/${ROUTER_URL.ADMIN_ROUTES.CUSTOMERS}`);
        return;
      }
      setCustomer(data);

      // Load customer orders
      const allOrders = await fetchOrders();
      const customerOrders = allOrders.filter((order) => order.customerId === id);
      setOrders(customerOrders);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomer();
  }, [id]);

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

  if (!customer) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-slate-500">Không tìm thấy khách hàng</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to={`${ROUTER_URL.ADMIN}/${ROUTER_URL.ADMIN_ROUTES.CUSTOMERS}`}>
          <Button variant="outline" size="sm">
            ← Quay lại
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Chi tiết khách hàng</h1>
          <p className="text-sm text-slate-600">Thông tin chi tiết và lịch sử mua hàng</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Customer Info */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-center">
              {customer.avatar && (
                <img
                  src={customer.avatar}
                  alt={customer.name}
                  className="size-24 rounded-full object-cover"
                />
              )}
            </div>
            <h2 className="mb-4 text-center text-xl font-bold text-slate-900">{customer.name}</h2>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-slate-600">Email</p>
                <p className="font-semibold text-slate-900">{customer.email}</p>
              </div>
              <div>
                <p className="text-slate-600">Số điện thoại</p>
                <p className="font-semibold text-slate-900">{customer.phone}</p>
              </div>
              <div>
                <p className="text-slate-600">Mã khách hàng</p>
                <p className="font-semibold text-slate-900">{customer.id}</p>
              </div>
              <div>
                <p className="text-slate-600">Ngày tham gia</p>
                <p className="font-semibold text-slate-900">
                  {new Date(customer.createDate).toLocaleDateString("vi-VN")}
                </p>
              </div>
            </div>
          </div>

          {/* Loyalty Info */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-semibold text-slate-900">Thông tin thành viên</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Hạng:</span>
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${LOYALTY_TIER_COLORS[customer.tier]}`}
                >
                  {LOYALTY_TIER_LABELS[customer.tier]}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Điểm thưởng:</span>
                <span className="text-lg font-bold text-primary-600">
                  {customer.loyaltyPoints.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Trạng thái:</span>
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${CUSTOMER_STATUS_COLORS[customer.status]}`}
                >
                  {CUSTOMER_STATUS_LABELS[customer.status]}
                </span>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-semibold text-slate-900">Thống kê</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Số đơn hàng:</span>
                <span className="text-lg font-bold text-slate-900">{orders.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Tổng chi tiêu:</span>
                <span className="text-lg font-bold text-green-600">
                  {formatCurrency(customer.totalSpent || 0)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Order History */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-semibold text-slate-900">Lịch sử đơn hàng</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                  <tr>
                    <th className="px-4 py-3">Mã đơn</th>
                    <th className="px-4 py-3">Ngày tạo</th>
                    <th className="px-4 py-3">Tổng tiền</th>
                    <th className="px-4 py-3">Trạng thái</th>
                    <th className="px-4 py-3">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <span className="font-semibold text-primary-600">{order.id}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {new Date(order.createDate).toLocaleDateString("vi-VN")}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {formatCurrency(order.total)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-semibold ${ORDER_STATUS_COLORS[order.status]}`}
                        >
                          {ORDER_STATUS_LABELS[order.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          to={`${ROUTER_URL.ADMIN}/${ROUTER_URL.ADMIN_ROUTES.ORDERS}/${order.id}`}
                        >
                          <Button size="sm" variant="outline">
                            Xem
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {orders.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500">
                        Chưa có đơn hàng
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerDetailPage;

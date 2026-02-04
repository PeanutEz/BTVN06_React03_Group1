import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { fetchOrders } from "../../../services/order.service";
import { fetchPayments } from "../../../services/payment.service";
import { fetchCustomers } from "../../../services/customer.service";
import { fetchStores } from "../../../services/store.service";
import { fetchLoyaltyOverview } from "../../../services/loyalty.service";
import type { Order } from "../../../models/order.model";
import type { LoyaltyOverview } from "../../../models/loyalty.model";
import { ROUTER_URL } from "../../../routes/router.const";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, } from "recharts";

const topProducts = [
  {
    id: 1,
    name: "Cà phê sữa đá",
    sold: 320,
    revenue: 12800000,
  },
  {
    id: 2,
    name: "Trà đào cam sả",
    sold: 280,
    revenue: 11200000,
  },
  {
    id: 3,
    name: "Bạc xỉu",
    sold: 210,
    revenue: 9450000,
  },
  {
    id: 4,
    name: "Latte nóng",
    sold: 180,
    revenue: 8100000,
  },
];

const DashboardPage = () => {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    totalCustomers: 0,
    totalStores: 0,
    pendingOrders: 0,
    completedOrders: 0,
  });
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loyaltyOverview, setLoyaltyOverview] = useState<LoyaltyOverview | null>(null);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const [orders, payments, customers, stores, loyalty] = await Promise.all([
        fetchOrders(),
        fetchPayments(),
        fetchCustomers(),
        fetchStores(),
        fetchLoyaltyOverview(),
      ]);

      const totalRevenue = payments
        .filter((p) => p.status === "SUCCESS")
        .reduce((sum, p) => sum + p.amount, 0);

      const pendingOrders = orders.filter((o) => o.status === "CREATED").length;
      const completedOrders = orders.filter((o) => o.status === "COMPLETED").length;

      setStats({
        totalOrders: orders.length,
        totalRevenue,
        totalCustomers: customers.length,
        totalStores: stores.length,
        pendingOrders,
        completedOrders,
      });

      setRecentOrders(orders.slice(0, 5));
      setLoyaltyOverview(loyalty);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const revenueChartData = useMemo(() => [{ date: "01/01", revenue: 12000000 }, { date: "02/01", revenue: 18000000 }, { date: "03/01", revenue: 15000000 }, { date: "04/01", revenue: 22000000 }, { date: "05/01", revenue: 26000000 }, { date: "06/01", revenue: 21000000 },], []);

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">WBS Coffee - Dashboard</h1>
        <p className="text-sm text-slate-600">Tổng quan hệ thống quản lý chuỗi cửa hàng</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-blue-50 to-blue-100 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-blue-700">Tổng đơn hàng</p>
              <p className="mt-2 text-3xl font-bold text-blue-900">{stats.totalOrders}</p>
            </div>
            <svg
              className="size-12 text-blue-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
              />
            </svg>
          </div>
          <div className="mt-4 flex gap-4 text-xs">
            <span className="text-yellow-700">
              ⏳ Chờ xử lý: <strong>{stats.pendingOrders}</strong>
            </span>
            <span className="text-green-700">
              ✓ Hoàn thành: <strong>{stats.completedOrders}</strong>
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-green-50 to-green-100 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-green-700">Doanh thu</p>
              <p className="mt-2 text-2xl font-bold text-green-900">
                {formatCurrency(stats.totalRevenue)}
              </p>
            </div>
            <svg
              className="size-12 text-green-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-purple-50 to-purple-100 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-purple-700">Khách hàng</p>
              <p className="mt-2 text-3xl font-bold text-purple-900">{stats.totalCustomers}</p>
            </div>
            <svg
              className="size-12 text-purple-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-orange-50 to-orange-100 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-orange-700">Cửa hàng</p>
              <p className="mt-2 text-3xl font-bold text-orange-900">{stats.totalStores}</p>
            </div>
            <svg
              className="size-12 text-orange-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Loyalty Overview */}
      {loyaltyOverview && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Chương trình thành viên</h2>
            <Link
              to={`${ROUTER_URL.ADMIN}/${ROUTER_URL.ADMIN_ROUTES.LOYALTY}`}
              className="text-sm font-semibold text-primary-600 hover:text-primary-700"
            >
              Xem chi tiết →
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="rounded-lg bg-slate-50 p-4 text-center">
              <p className="text-sm text-slate-600">Tổng thành viên</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {loyaltyOverview.totalCustomers}
              </p>
            </div>
            <div className="rounded-lg bg-orange-50 p-4 text-center">
              <p className="text-sm text-orange-700">Hạng Đồng</p>
              <p className="mt-1 text-2xl font-bold text-orange-900">
                {loyaltyOverview.customersByTier.BRONZE}
              </p>
            </div>
            <div className="rounded-lg bg-gray-50 p-4 text-center">
              <p className="text-sm text-gray-700">Hạng Bạc</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                {loyaltyOverview.customersByTier.SILVER}
              </p>
            </div>
            <div className="rounded-lg bg-yellow-50 p-4 text-center">
              <p className="text-sm text-yellow-700">Hạng Vàng</p>
              <p className="mt-1 text-2xl font-bold text-yellow-900">
                {loyaltyOverview.customersByTier.GOLD}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ================= CHART + TOP PRODUCT ================= */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 rounded-2xl border bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-slate-900">
            Doanh thu theo ngày
          </h3>

          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={revenueChartData}>
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#2563eb"
                strokeWidth={3}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Top Products */}
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-slate-900">
            Top sản phẩm bán chạy
          </h3>

          <div className="space-y-4">
            {topProducts.map((product, index) => (
              <div
                key={product.id}
                className="flex items-center justify-between rounded-lg bg-slate-50 p-3"
              >
                <div className="flex items-center gap-3">
                  <span className="flex size-8 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700">
                    {index + 1}
                  </span>
                  <div>
                    <p className="font-semibold text-slate-800">
                      {product.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      Đã bán: {product.sold} ly
                    </p>
                  </div>
                </div>

                <p className="font-semibold text-green-700">
                  {formatCurrency(product.revenue)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>


      {/* Recent Orders */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Đơn hàng gần đây</h2>
          <Link
            to={`${ROUTER_URL.ADMIN}/${ROUTER_URL.ADMIN_ROUTES.ORDERS}`}
            className="text-sm font-semibold text-primary-600 hover:text-primary-700"
          >
            Xem tất cả →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">
                  Mã đơn
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">
                  Cửa hàng
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">
                  Khách hàng
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">
                  Tổng tiền
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">
                  Trạng thái
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {recentOrders.map((order) => (
                <tr key={order.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link
                      to={`${ROUTER_URL.ADMIN}/${ROUTER_URL.ADMIN_ROUTES.ORDERS}/${order.id}`}
                      className="font-semibold text-primary-600 hover:underline"
                    >
                      {order.id}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{order.storeCode}</td>
                  <td className="px-4 py-3 text-slate-700">{order.customerName}</td>
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    {formatCurrency(order.total)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${order.status === "COMPLETED"
                        ? "bg-green-100 text-green-700"
                        : order.status === "PAID"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-yellow-100 text-yellow-700"
                        }`}
                    >
                      {order.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
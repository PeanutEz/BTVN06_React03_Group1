import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchOrders } from "../../../services/order.service";
import { fetchPayments } from "../../../services/payment.service";
import { fetchCustomers } from "../../../services/customer.service";
import { fetchStores } from "../../../services/store.service";
import { fetchLoyaltyOverview } from "../../../services/loyalty.service";
import { adminInventoryService } from "../../../services/inventory.service";
import type { OrderDisplay } from "../../../models/order.model";
import type { LoyaltyOverview } from "../../../models/loyalty.model";
import { ROUTER_URL } from "../../../routes/router.const";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, } from "recharts";

type RevenueChart = {
  date: string;
  revenue: number;
};

type TopProduct = {
  name: string;
  sold: number;
  revenue: number;
};

type LowStockItem = {
  _id: string;
  product_franchise_id: string;
  quantity: number;
  alert_threshold: number;
  franchise_id: string;
  store_name?: string;
};

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
  const [recentOrders, setRecentOrders] = useState<OrderDisplay[]>([]);
  const [loyaltyOverview, setLoyaltyOverview] = useState<LoyaltyOverview | null>(null);
  const [revenueChartData, setRevenueChartData] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [lowStocks, setLowStocks] = useState<LowStockItem[]>([]);

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
      console.log("STORES:", stores);

      const completedPayments = payments.filter(
        (p) => p.status === "COMPLETED"
      );

      const totalRevenue = completedPayments.reduce(
        (sum, p) => sum + p.amount,
        0
      );

      const revenueByDate: Record<string, number> = {};

      completedPayments.forEach((p) => {
        const dateKey = p.created_at.split("T")[0];

        if (!revenueByDate[dateKey]) {
          revenueByDate[dateKey] = 0;
        }

        revenueByDate[dateKey] += p.amount;
      });

      const chartData: RevenueChart[] = Object.entries(revenueByDate)
        .map(([date, revenue]) => ({
          date,
          revenue,
        }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .map((item) => ({
          ...item,
          date: new Date(item.date).toLocaleDateString("vi-VN"),
        }));

      setRevenueChartData(chartData);

      const pendingOrders = orders.filter((o) => o.status === "DRAFT" || o.status === "CONFIRMED").length;
      const completedOrders = orders.filter((o) => o.status === "COMPLETED").length;
      console.log("ORDERS DATA:", orders);
      console.log("ORDER ITEMS:", orders[0]?.items);
      const productMap: Record<string, TopProduct> = {};

      orders
        .filter((order) => order.status === "COMPLETED")
        .forEach((order: any) => {
          order.items?.forEach((item: any) => {
            const name = item.product_name_snapshot;
            const quantity = item.quantity;
            const price = item.price_snapshot;

            if (!productMap[name]) {
              productMap[name] = {
                name,
                sold: 0,
                revenue: 0,
              };
            }

            productMap[name].sold += quantity;
            productMap[name].revenue += quantity * price;
          });
        });

      const top = Object.values(productMap)
        .sort((a, b) => b.sold - a.sold)
        .slice(0, 5);

      setTopProducts(top);

      const lowStockResults = await Promise.all(
        stores.map(async (store: any) => {
          try {
            if (!store?.id) return [];

            const items = await adminInventoryService.getLowStockByFranchise(store.id);

            return items.map((item: any) => ({
              ...item,
              franchise_id: store.id,
              store_name: store.name,
            }));
          } catch (err) {
            console.error("Low stock error:", store.id, err);
            return [];
          }
        })
      );

      const mergedLowStocks = lowStockResults.flat();
      setLowStocks(mergedLowStocks);

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
                {loyaltyOverview.total_customers}
              </p>
            </div>
            <div className="rounded-lg bg-gray-50 p-4 text-center">
              <p className="text-sm text-gray-700">Hạng Bạc</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                {loyaltyOverview.customers_by_tier.SILVER}
              </p>
            </div>
            <div className="rounded-lg bg-yellow-50 p-4 text-center">
              <p className="text-sm text-yellow-700">Hạng Vàng</p>
              <p className="mt-1 text-2xl font-bold text-yellow-900">
                {loyaltyOverview.customers_by_tier.GOLD}
              </p>
            </div>
            <div className="rounded-lg bg-purple-50 p-4 text-center">
              <p className="text-sm text-purple-700">Hạng Bạch Kim</p>
              <p className="mt-1 text-2xl font-bold text-purple-900">
                {loyaltyOverview.customers_by_tier.PLATINUM}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* CHART + TOP PRODUCT */}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* REVENUE CHART */}

        <div className="lg:col-span-2 rounded-2xl border bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold">
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

        {/* TOP PRODUCTS */}
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold">
            Top sản phẩm bán chạy
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-slate-500">
                  <th className="pb-3">#</th>
                  <th className="pb-3">Sản phẩm</th>
                  <th className="pb-3">Đã bán</th>
                  <th className="pb-3">Doanh thu</th>
                </tr>
              </thead>

              <tbody>
                {topProducts.map((product: any, index: number) => (
                  <tr
                    key={index}
                    className="border-b last:border-none hover:bg-slate-50"
                  >
                    <td className="py-3">{index + 1}</td>

                    <td className="py-3 font-medium">
                      {product.name}
                    </td>

                    <td className="py-3">
                      {product.sold}
                    </td>

                    <td className="py-3 font-semibold text-green-700">
                      {formatCurrency(product.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Low Stock Alert */}
      <div className="rounded-2xl border border-red-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-red-700">
          ⚠️ Cảnh báo tồn kho thấp
        </h2>

        {lowStocks.length === 0 ? (
          <p className="text-sm text-slate-500">
            Không có sản phẩm nào sắp hết hàng
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-slate-500">
                  <th className="pb-3">#</th>
                  <th className="pb-3">Store</th>
                  <th className="pb-3">Product Franchise ID</th>
                  <th className="pb-3">Tồn kho</th>
                  <th className="pb-3">Ngưỡng cảnh báo</th>
                </tr>
              </thead>

              <tbody>
                {lowStocks.map((item, index) => (
                  <tr key={item._id} className="border-b hover:bg-red-50">
                    <td className="py-3">{index + 1}</td>

                    <td className="py-3 font-medium">
                      {item.store_name}
                    </td>

                    <td className="py-3">
                      {item.product_franchise_id}
                    </td>

                    <td className="py-3 text-red-600 font-semibold">
                      {item.quantity}
                    </td>

                    <td className="py-3">
                      {item.alert_threshold}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
                      {order.code}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{order.franchise?.code || 'N/A'}</td>
                  <td className="px-4 py-3 text-slate-700">{order.customer?.name || 'N/A'}</td>
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    {formatCurrency(order.total_amount)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${order.status === "COMPLETED"
                        ? "bg-green-100 text-green-700"
                        : order.status === "CONFIRMED"
                          ? "bg-blue-100 text-blue-700"
                          : order.status === "PREPARING"
                            ? "bg-yellow-100 text-yellow-700"
                            : order.status === "CANCELLED"
                              ? "bg-red-100 text-red-700"
                              : "bg-gray-100 text-gray-700"
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
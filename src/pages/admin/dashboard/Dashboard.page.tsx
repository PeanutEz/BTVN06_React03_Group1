import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchOrdersByFranchise, fetchOrderById } from "../../../services/order.service";
import { fetchCustomers } from "../../../services/customer.service";
import { fetchStores } from "../../../services/store.service";
import { fetchLoyaltyOverview } from "../../../services/loyalty.service";
import { adminInventoryService } from "../../../services/inventory.service";
import type { OrderDisplay, OrderStatus } from "../../../models/order.model";
import { ORDER_STATUS_LABELS } from "../../../models/order.model";
import type { LoyaltyOverview } from "../../../models/loyalty.model";
import { ROUTER_URL } from "../../../routes/router.const";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, } from "recharts";

type RevenueChart = {
  date: string;
  revenue: number;
};

type TopProduct = {
  product_id: string;
  name: string;
  sold: number;
  revenue: number;
  orderCount: number;
};

type LowStockItem = {
  _id: string;
  product_franchise_id: string;
  quantity: number;
  alert_threshold: number;
  franchise_id: string;
  store_name?: string;
};

const glassCard: React.CSSProperties = {
  background: "rgba(255, 255, 255, 0.06)",
  backdropFilter: "blur(16px) saturate(140%)",
  WebkitBackdropFilter: "blur(16px) saturate(140%)",
  border: "1px solid rgba(255, 255, 255, 0.12)",
  borderRadius: "16px",
  boxShadow: "0 4px 20px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.06)",
};

const glassCardInner: React.CSSProperties = {
  background: "rgba(255, 255, 255, 0.05)",
  border: "1px solid rgba(255, 255, 255, 0.08)",
  borderRadius: "10px",
};

const DashboardPage = () => {
  const [loading, setLoading] = useState(false);
  const params = useParams();
  const franchiseId = params.franchiseId || params.id;
  const isGlobal = !franchiseId;
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    totalCustomers: 0,
    totalStores: 0,
    pendingOrders: 0,
    deliveringOrders: 0,
    completedOrders: 0,
    canceledOrders: 0,
  });
  const PENDING_STATUSES = [
    "DRAFT",
    "CONFIRMED",
    "PREPARING",
    "READY_FOR_PICKUP",
  ];
  const [recentOrders, setRecentOrders] = useState<OrderDisplay[]>([]);
  const [loyaltyOverview, setLoyaltyOverview] = useState<LoyaltyOverview | null>(null);
  const [revenueChartData, setRevenueChartData] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [lowStocks, setLowStocks] = useState<LowStockItem[]>([]);


  const loadDashboard = async () => {
    setLoading(true);
    try {
      const [customers, loyalty] = await Promise.all([
        fetchCustomers(),
        fetchLoyaltyOverview(),
      ]);

      let allOrders: any[] = [];
      let stores: any[] = [];

      if (isGlobal) {
        stores = await fetchStores();

        const orderResults = await Promise.all(
          stores.map(async (store: any) => {
            if (!store?.id) return [];

            const orders = await fetchOrdersByFranchise(store.id);

            return orders.map((o: any) => ({
              ...o,
              status: o.status as OrderStatus,
              franchise_id: store.id,
              franchise: {
                id: store.id,
                name: store.name,
              },
            }));
          })
        );

        allOrders = orderResults.flat();
      } else {
        // 🔥 chỉ 1 franchise
        const orders = await fetchOrdersByFranchise(franchiseId);

        allOrders = orders.map((o: any) => ({
          ...o,
          status: o.status as OrderStatus,
          franchise_id: franchiseId,
        }));

        stores = [{ id: franchiseId }];
      }

      // 🔥 SORT
      const sortedOrders = allOrders.sort(
        (a, b) =>
          new Date(b.created_at).getTime() -
          new Date(a.created_at).getTime()
      );

      setRecentOrders(sortedOrders.slice(0, 5));


      const safeOrders = allOrders;

      // 💰 Revenue = tổng đơn COMPLETED
      const completedOrdersList = safeOrders.filter(
        (o) => o?.status === "COMPLETED"
      );

      const canceledOrders = allOrders.filter(
        o => o.status === "CANCELED"
      ).length;

      const totalRevenue = completedOrdersList.reduce(
        (sum, o) => sum + (o?.final_amount || 0),
        0
      );

      const revenueByDate: Record<string, number> = {};

      completedOrdersList.forEach((o) => {
        if (!o?.created_at) return;

        const dateKey = new Date(o.created_at)
          .toISOString()
          .split("T")[0];

        revenueByDate[dateKey] =
          (revenueByDate[dateKey] || 0) + (o.final_amount || 0);
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

      const pendingOrders = allOrders.filter((o) =>
        PENDING_STATUSES.includes(o.status)
      ).length;
      const deliveringOrders = allOrders.filter(
        (o) => o.status === "OUT_FOR_DELIVERY"
      ).length;
      const completedOrders = allOrders.filter((o) => o.status === "COMPLETED").length;

      const productMap: Record<string, TopProduct> = {};

      const completedOrdersA = allOrders.filter(
        (o) => o.status === "COMPLETED"
      );
      // 🔥 gọi detail từng order
      const detailedOrders = await Promise.all(
        completedOrdersA.map((o) => fetchOrderById(o._id))
      );

      detailedOrders.forEach((order: any) => {
        const items = order.items || [];

        items.forEach((item: any) => {
          const productId =
            item.product_id || item.product_franchise_id;

          if (!productId) return;

          const name = item.product_name || "Unknown";
          const quantity = item.quantity || 0;
          const price = item.price_snapshot || 0;

          if (!productMap[productId]) {
            productMap[productId] = {
              product_id: productId,
              name,
              sold: 0,
              revenue: 0,
              orderCount: 0,
            };
          }

          productMap[productId].sold += quantity;
          productMap[productId].revenue += quantity * price;
          productMap[productId].orderCount += 1;
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
        totalOrders: allOrders.length,
        totalRevenue,
        totalCustomers: customers.length,
        totalStores: stores.length,
        pendingOrders,
        deliveringOrders,
        completedOrders,
        canceledOrders,
      });

      setLoyaltyOverview(loyalty);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, [franchiseId]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-white/60 text-lg">Đang tải...</p>
      </div>
    );
  }

  const statusColor = (s: string) =>
    s === "COMPLETED" ? { bg: "rgba(74,222,128,0.15)", text: "text-green-300" }
      : s === "CONFIRMED" ? { bg: "rgba(96,165,250,0.15)", text: "text-blue-300" }
        : s === "PREPARING" ? { bg: "rgba(250,204,21,0.15)", text: "text-yellow-300" }
          : s === "CANCELED" ? { bg: "rgba(248,113,113,0.15)", text: "text-red-300" }
            : { bg: "rgba(255,255,255,0.08)", text: "text-white/60" };

  return (
    <div className="h-full flex flex-col gap-3 overflow-hidden">
      {/* Row 1: Title + 4 Stats */}
      <div className="shrink-0 flex items-center gap-3">
        <div className="shrink-0 mr-2">
          <h1 className="text-lg font-bold text-white leading-tight">Dashboard</h1>
          <p className="text-[11px] text-white/50">Tổng quan hệ thống</p>
        </div>
        {/* Stat cards */}
        <div className="flex-1 grid grid-cols-4 gap-2.5">
          <div className="px-3 py-2.5" style={glassCard}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-blue-300">Đơn hàng</p>
                <p className="text-xl font-bold text-white leading-tight">{stats.totalOrders}</p>
              </div>
              <div className="flex items-center justify-center w-9 h-9 rounded-xl" style={{ background: "rgba(96, 165, 250, 0.15)" }}>
                <svg className="size-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
            </div>
            <div className="mt-1 flex gap-2 text-[10px]">
              <span className="text-yellow-300/80">Chờ: <strong>{stats.pendingOrders}</strong></span>
              <span className="text-blue-300/80">
                Giao: <strong>{stats.deliveringOrders}</strong>
              </span>
              <span className="text-green-300/80">Xong: <strong>{stats.completedOrders}</strong></span>
              <span className="text-red-300/80">
                Hủy: <strong>{stats.canceledOrders}</strong>
              </span>
            </div>
          </div>
          <div className="px-3 py-2.5" style={glassCard}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-green-300">Doanh thu</p>
                <p className="text-lg font-bold text-white leading-tight">{formatCurrency(stats.totalRevenue)}</p>
              </div>
              <div className="flex items-center justify-center w-9 h-9 rounded-xl" style={{ background: "rgba(74, 222, 128, 0.15)" }}>
                <svg className="size-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
          <div className="px-3 py-2.5" style={glassCard}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-purple-300">Khách hàng</p>
                <p className="text-xl font-bold text-white leading-tight">{stats.totalCustomers}</p>
              </div>
              <div className="flex items-center justify-center w-9 h-9 rounded-xl" style={{ background: "rgba(168, 85, 247, 0.15)" }}>
                <svg className="size-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
          </div>
          <div className="px-3 py-2.5" style={glassCard}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-orange-300">Cửa hàng</p>
                <p className="text-xl font-bold text-white leading-tight">{stats.totalStores}</p>
              </div>
              <div className="flex items-center justify-center w-9 h-9 rounded-xl" style={{ background: "rgba(251, 146, 60, 0.15)" }}>
                <svg className="size-5 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Chart + Top Products — takes ~50% */}
      <div className="flex gap-3 min-h-0" style={{ flex: "1 1 50%" }}>
        {/* Revenue Chart */}
        <div className="flex-[2] min-w-0 p-4 flex flex-col" style={glassCard}>
          <h3 className="text-sm font-semibold text-white mb-2 shrink-0">Doanh thu theo ngày</h3>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueChartData}>
                <XAxis dataKey="date" stroke="rgba(255,255,255,0.3)" tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 10 }} />
                <YAxis stroke="rgba(255,255,255,0.3)" tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 10 }} width={50} />
                <Tooltip
                  contentStyle={{
                    background: "rgba(15, 23, 42, 0.85)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    borderRadius: "10px",
                    color: "#fff",
                    fontSize: 12,
                  }}
                />
                <Line type="monotone" dataKey="revenue" stroke="#60a5fa" strokeWidth={2.5} dot={{ fill: "#60a5fa", stroke: "#1e3a5f", strokeWidth: 2, r: 3 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Products */}
        <div className="flex-[1] min-w-0 p-4 flex flex-col" style={glassCard}>
          <h3 className="text-sm font-semibold text-white mb-2 shrink-0">Top sản phẩm bán chạy</h3>
          <div className="flex-1 min-h-0 overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-white/40" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                  <th className="pb-1.5">#</th>
                  <th className="pb-1.5">Sản phẩm</th>
                  <th className="pb-1.5">Bán</th>
                  <th className="pb-1.5">Doanh thu</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-3 text-white/40">
                      Không có dữ liệu
                    </td>
                  </tr>
                ) : (
                  topProducts.map((p: TopProduct, i: number) => (
                    <tr key={p.product_id} style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>

                      {/* STT */}
                      <td className="py-1.5 text-white/50">{i + 1}</td>

                      {/* TÊN SẢN PHẨM */}
                      <td className="py-1.5 font-medium text-white truncate max-w-[140px]" title={p.name}>
                        {p.name}
                      </td>

                      {/* SỐ LƯỢNG */}
                      <td className="py-1.5 text-white/70 font-semibold">
                        {p.sold}
                      </td>

                      {/* DOANH THU */}
                      <td className="py-1.5 font-semibold text-green-400">
                        {formatCurrency(p.revenue)}
                      </td>

                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Row 3: Loyalty + Low Stock + Recent Orders — takes ~50% */}
      <div className="flex gap-3 min-h-0" style={{ flex: "1 1 50%" }}>
        {/* Loyalty */}
        <div className="flex-[1] min-w-0 p-4 flex flex-col" style={glassCard}>
          <div className="flex items-center justify-between mb-2 shrink-0">
            <h3 className="text-sm font-semibold text-white">Thành viên</h3>
            <Link to={`${ROUTER_URL.ADMIN}/${ROUTER_URL.ADMIN_ROUTES.LOYALTY}`} className="text-[10px] font-semibold text-primary-400 hover:text-primary-300">
              Chi tiết →
            </Link>
          </div>
          {loyaltyOverview ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 flex-1 min-h-0">
              <div className="p-2 text-center flex flex-col justify-center" style={glassCardInner}>
                <p className="text-[10px] text-white/50">Tổng</p>
                <p className="text-lg font-bold text-white leading-tight">{loyaltyOverview.total_customers}</p>
              </div>
              <div className="p-2 text-center flex flex-col justify-center" style={{ ...glassCardInner, background: "rgba(249, 115, 22, 0.1)", borderColor: "rgba(249, 115, 22, 0.2)" }}>
                <p className="text-[10px] text-orange-300">Đồng</p>
                <p className="text-lg font-bold text-white leading-tight">{loyaltyOverview.customers_by_tier.BRONZE}</p>
              </div>
              <div className="p-2 text-center flex flex-col justify-center" style={{ ...glassCardInner, background: "rgba(148, 163, 184, 0.1)", borderColor: "rgba(148, 163, 184, 0.2)" }}>
                <p className="text-[10px] text-slate-300">Bạc</p>
                <p className="text-lg font-bold text-white leading-tight">{loyaltyOverview.customers_by_tier.SILVER}</p>
              </div>
              <div className="p-2 text-center flex flex-col justify-center" style={{ ...glassCardInner, background: "rgba(234, 179, 8, 0.1)", borderColor: "rgba(234, 179, 8, 0.2)" }}>
                <p className="text-[10px] text-yellow-300">Vàng</p>
                <p className="text-lg font-bold text-white leading-tight">{loyaltyOverview.customers_by_tier.GOLD}</p>
              </div>
              <div className="p-2 text-center flex flex-col justify-center" style={{ ...glassCardInner, background: "rgba(168, 85, 247, 0.1)", borderColor: "rgba(168, 85, 247, 0.2)" }}>
                <p className="text-[10px] text-purple-300">Bạch Kim</p>
                <p className="text-lg font-bold text-white leading-tight">{loyaltyOverview.customers_by_tier.PLATINUM}</p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-white/40">Không có dữ liệu</p>
          )}
        </div>

        {/* Low Stock */}
        <div className="flex-[1] min-w-0 p-4 flex flex-col" style={{ ...glassCard, borderColor: "rgba(248, 113, 113, 0.2)", background: "rgba(239, 68, 68, 0.04)" }}>
          <h3 className="text-sm font-semibold text-red-300 mb-2 shrink-0">Tồn kho thấp</h3>
          {lowStocks.length === 0 ? (
            <p className="text-xs text-white/40">Không có cảnh báo</p>
          ) : (
            <div className="flex-1 min-h-0 overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-white/40" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                    <th className="pb-1.5">Store</th>
                    <th className="pb-1.5">SP</th>
                    <th className="pb-1.5">SL</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStocks.slice(0, 5).map((item) => (
                    <tr key={item._id} style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                      <td className="py-1.5 font-medium text-white truncate max-w-[80px]">{item.store_name}</td>
                      <td className="py-1.5 text-white/60 truncate max-w-[80px]" title={item.product_franchise_id}>{item.product_franchise_id?.slice(0, 8) || "N/A"}</td>
                      <td className="py-1.5 text-red-400 font-semibold">{item.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent Orders */}
        <div className="flex-[2] min-w-0 p-4 flex flex-col" style={glassCard}>
          <div className="flex items-center justify-between mb-2 shrink-0">
            <h3 className="text-sm font-semibold text-white">Đơn hàng gần đây</h3>
            <Link to={`${ROUTER_URL.ADMIN}/${ROUTER_URL.ADMIN_ROUTES.ORDERS}`} className="text-[10px] font-semibold text-primary-400 hover:text-primary-300">
              Xem tất cả →
            </Link>
          </div>
          <div className="flex-1 min-h-0 overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-white/40" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                  <th className="pb-1.5">Mã đơn</th>
                  <th className="pb-1.5">Cửa hàng</th>
                  <th className="pb-1.5">Khách</th>
                  <th className="pb-1.5">Tổng tiền</th>
                  <th className="pb-1.5">TT</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order: OrderDisplay) => {
                  const sc = statusColor(order.status);

                  return (
                    <tr key={order._id}>
                      {/* CODE */}
                      <td className="py-1.5">
                        <Link
                          to={`${ROUTER_URL.ADMIN}/${ROUTER_URL.ADMIN_ROUTES.ORDERS}/${order._id}`}
                          className="font-semibold text-primary-400 hover:underline"
                        >
                          {order.code}
                        </Link>
                      </td>

                      {/* STORE */}
                      <td className="py-1.5 text-white/60 truncate max-w-[80px]">
                        {order.franchise?.name || "N/A"}
                      </td>

                      {/* CUSTOMER */}
                      <td className="py-1.5 text-white/60 truncate max-w-[80px]">
                        {order.customer?.name || "N/A"}
                      </td>

                      {/* AMOUNT */}
                      <td className="py-1.5 font-semibold text-white">
                        {formatCurrency(order.final_amount ?? 0)}
                      </td>

                      {/* STATUS */}
                      <td className="py-1.5">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${sc.text}`}
                          style={{ background: sc.bg }}
                        >
                          {ORDER_STATUS_LABELS[order.status] || order.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
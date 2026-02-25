import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button, Pagination } from "../../../components";

const PAGE_SIZE = 10;
import type { OrderDisplay, OrderStatus } from "../../../models/order.model";
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, ORDER_TYPE_LABELS } from "../../../models/order.model";
import { fetchOrders, filterOrders, searchOrders } from "../../../services/order.service";
import { fetchActiveStores } from "../../../services/store.service";
import type { Store } from "../../../models/store.model";
import { ROUTER_URL } from "../../../routes/router.const";

const OrderListPage = () => {
  const [orders, setOrders] = useState<OrderDisplay[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "">("");
  const [storeFilter, setStoreFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const loadOrders = async () => {
    setLoading(true);
    try {
      const data = await fetchOrders();
      setOrders(data);
    } finally {
      setLoading(false);
    }
  };

  const loadStores = async () => {
    try {
      const data = await fetchActiveStores();
      setStores(data);
    } catch (error) {
      console.error("Error loading stores", error);
    }
  };

  useEffect(() => {
    loadOrders();
    loadStores();
  }, []);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      loadOrders();
      return;
    }
    setLoading(true);
    try {
      const data = await searchOrders(searchQuery);
      setOrders(data);
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = async () => {
    setLoading(true);
    try {
      let data = await filterOrders(
        statusFilter || undefined,
        undefined, // type filter
        storeFilter ? Number(storeFilter) : undefined,
        startDate || undefined,
        endDate || undefined
      );
      setOrders(data);
    } finally {
      setLoading(false);
    }
  };

  const handleResetFilter = () => {
    setStatusFilter("");
    setStoreFilter("");
    setStartDate("");
    setEndDate("");
    setSearchQuery("");
    loadOrders();
  };
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  const pagedOrders = orders.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Quản lý đơn hàng</h1>
          <p className="text-sm text-slate-600">Quản lý tất cả đơn hàng của khách hàng</p>
        </div>
        <Button variant="outline" onClick={loadOrders} loading={loading}>
          Làm mới
        </Button>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Tìm kiếm</label>
            <input
              type="text"
              placeholder="Mã đơn hoặc tên khách hàng"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Cửa hàng</label>
            <select
              value={storeFilter}
              onChange={(e) => setStoreFilter(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
            >
              <option value="">Tất cả</option>
              {stores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.code} - {store.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Trạng thái</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as OrderStatus | "")}
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
            >
              <option value="">Tất cả</option>
              <option value="DRAFT">Nháp</option>
              <option value="CONFIRMED">Đã xác nhận</option>
              <option value="PREPARING">Đang chuẩn bị</option>
              <option value="COMPLETED">Hoàn thành</option>
              <option value="CANCELLED">Đã hủy</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Từ ngày</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Đến ngày</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
            />
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <Button onClick={handleSearch} size="sm">
            Tìm kiếm
          </Button>
          <Button onClick={handleFilter} size="sm" variant="outline">
            Lọc
          </Button>
          <Button onClick={handleResetFilter} size="sm" variant="outline">
            Đặt lại
          </Button>
        </div>
      </div>

      {/* Orders Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-4 py-3">Mã đơn</th>
                <th className="px-4 py-3">Cửa hàng</th>
                <th className="px-4 py-3">Khách hàng</th>
                <th className="px-4 py-3">Tổng tiền</th>
                <th className="px-4 py-3">PT Thanh toán</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3">Ngày tạo</th>
                <th className="px-4 py-3">Thao tác</th>
              </tr>
            </thead>            <tbody className="divide-y divide-slate-200">
              {pagedOrders.map((order) => (
                <tr key={order.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <span className="font-semibold text-primary-600">{order.code}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="leading-tight">
                      <p className="font-semibold text-slate-900">{order.franchise?.code || 'N/A'}</p>
                      <p className="text-xs text-slate-500">{order.franchise?.name || 'N/A'}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="leading-tight">
                      <p className="font-semibold text-slate-900">{order.customer?.name || 'N/A'}</p>
                      <p className="text-xs text-slate-500">{order.customer?.email || 'N/A'}</p>
                      <p className="text-xs text-slate-500">{order.customer?.phone || 'N/A'}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    {formatCurrency(order.total_amount)}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {ORDER_TYPE_LABELS[order.type]}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${ORDER_STATUS_COLORS[order.status]}`}
                    >
                      {ORDER_STATUS_LABELS[order.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {new Date(order.created_at).toLocaleString("vi-VN")}
                  </td>
                  <td className="px-4 py-3">
                    <Link to={`${ROUTER_URL.ADMIN}/${ROUTER_URL.ADMIN_ROUTES.ORDERS}/${order.id}`}>
                      <Button size="sm" variant="outline">
                        Chi tiết
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}              {orders.length === 0 && !loading && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-sm text-slate-500">
                    Không có đơn hàng
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-sm text-slate-500">
                    Đang tải...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={currentPage}
          totalItems={orders.length}
          pageSize={PAGE_SIZE}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  );
};

export default OrderListPage;

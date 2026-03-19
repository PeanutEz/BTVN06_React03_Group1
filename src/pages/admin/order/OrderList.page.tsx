import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button, GlassSelect } from "../../../components";
import type { OrderDisplay, OrderStatus } from "../../../models/order.model";
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, ORDER_TYPE_LABELS } from "../../../models/order.model";
import { fetchOrdersByFranchise, filterOrders, searchOrders } from "../../../services/order.service";
import { fetchActiveStores } from "../../../services/store.service";
import type { Store } from "../../../models/store.model";
import { ROUTER_URL } from "../../../routes/router.const";
import Pagination from "../../../components/ui/Pagination";
import { useAuthStore } from "../../../store/auth.store";

const ITEMS_PER_PAGE = 10;

const OrderListPage = () => {
  const { user } = useAuthStore();
  const [orders, setOrders] = useState<OrderDisplay[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "">("");
  const [storeFilter, setStoreFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Get franchise ID from user
  const franchiseId = user?.roles?.[0]?.franchise_id;

  const loadOrders = async () => {
    if (!franchiseId) {
      console.warn("No franchise ID found for current user");
      setOrders([]);
      return;
    }

    setLoading(true);
    setCurrentPage(1);
    try {
      const data = await fetchOrdersByFranchise(franchiseId);
      setOrders(data);
    } catch (error) {
      console.error("Lỗi tải danh sách đơn hàng:", error);
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
    // Load stores once (không phụ thuộc franchiseId)
    loadStores();
  }, []);

  useEffect(() => {
    // Load orders whenever franchiseId is available/changed.
    // Fix: auth store hydrate async → franchiseId có thể null ở lần render đầu.
    if (!franchiseId) {
      setOrders([]);
      return;
    }
    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [franchiseId]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      loadOrders();
      return;
    }
    if (!franchiseId) {
      console.warn("No franchise ID found for current user");
      return;
    }
    setLoading(true);
    try {
      const data = await searchOrders(searchQuery, franchiseId);
      setOrders(data);
    } catch (error) {
      console.error("Lỗi tìm kiếm đơn hàng:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = async () => {
    if (!franchiseId) {
      console.warn("No franchise ID found for current user");
      return;
    }
    setLoading(true);
    try {
      let data = await filterOrders(
        statusFilter || undefined,
        undefined, // type filter
        storeFilter || franchiseId, // Use selected store or default to user's franchise
        startDate || undefined,
        endDate || undefined
      );
      setOrders(data);
    } catch (error) {
      console.error("Lỗi lọc đơn hàng:", error);
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

  const getDiscountSummary = (order: OrderDisplay) => {
    const promotion = order.promotion_discount ?? 0;
    const voucher = order.voucher_discount ?? 0;
    const loyalty = order.loyalty_discount ?? 0;
    const discountTotal = promotion + voucher + loyalty;

    const parts: string[] = [];
    if (promotion > 0) parts.push(`KM${order.promotion_type ? `(${order.promotion_type})` : ""}`);
    if (voucher > 0) parts.push(`Voucher${order.voucher_type ? `(${order.voucher_type})` : ""}`);
    if (loyalty > 0) parts.push(`Điểm${order.loyalty_points_used != null ? `(${order.loyalty_points_used})` : ""}`);

    return { discountTotal, parts };
  };

  const totalPages = Math.ceil(orders.length / ITEMS_PER_PAGE);
  const paginatedOrders = orders.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Quản lý đơn hàng</h1>
          <p className="text-xs sm:text-sm text-slate-600">Quản lý tất cả đơn hàng của khách hàng</p>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
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
            <GlassSelect
              value={storeFilter}
              onChange={(v) => setStoreFilter(v)}
              className="w-full"
              options={[
                { value: "", label: "Tất cả" },
                ...stores.map((store) => ({ value: store.id, label: `${store.code} - ${store.name}` })),
              ]}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Trạng thái</label>
            <GlassSelect
              value={statusFilter}
              onChange={(v) => setStatusFilter(v as OrderStatus | "")}
              className="w-full"
              options={[
                { value: "", label: "Tất cả" },
                { value: "DRAFT", label: "Nháp" },
                { value: "CONFIRMED", label: "Đã xác nhận" },
                { value: "PREPARING", label: "Đang chuẩn bị" },
                { value: "COMPLETED", label: "Hoàn thành" },
                { value: "CANCELLED", label: "Đã hủy" },
              ]}
            />
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

        <div className="mt-4 flex flex-wrap gap-2">
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
                <th className="px-4 py-3">Giảm giá</th>
                <th className="px-4 py-3">Loại đơn</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3">Ngày tạo</th>
                <th className="px-4 py-3">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {paginatedOrders.map((order) => (
                <tr key={order._id ?? order.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <span className="font-semibold text-primary-600">{order.code}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="leading-tight">
                      <p className="font-semibold text-slate-900">
                        {String(order.franchise?.code || order.franchise_code || 'N/A')}
                      </p>
                      <p className="text-xs text-slate-500">
                        {order.franchise?.name || order.franchise_name || 'N/A'}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="leading-tight">
                      <p className="font-semibold text-slate-900">
                        {order.customer?.name || order.customer_name || 'N/A'}
                      </p>
                      <p className="text-xs text-slate-500">
                        {String(order.customer?.email || order.email || 'N/A')}
                      </p>
                      <p className="text-xs text-slate-500">
                        {order.customer?.phone || order.phone || 'N/A'}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    {formatCurrency(order.final_amount ?? order.total_amount ?? 0)}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {(() => {
                      const { discountTotal, parts } = getDiscountSummary(order);
                      if (discountTotal <= 0) return <span className="text-slate-400">—</span>;
                      return (
                        <div className="leading-tight">
                          <p className="font-semibold text-green-600">-{formatCurrency(discountTotal)}</p>
                          <p className="text-[11px] text-slate-500">{parts.join(", ")}</p>
                        </div>
                      );
                    })()}
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
                    <Link to={`${ROUTER_URL.ADMIN}/${ROUTER_URL.ADMIN_ROUTES.ORDERS}/${order._id ?? order.id}`}>
                      <Button size="sm" variant="outline">
                        Chi tiết
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
              {orders.length === 0 && !loading && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-sm text-slate-500">
                    Không có đơn hàng
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td colSpan={9}>
                    <div className="flex justify-center items-center py-20">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={orders.length}
            itemsPerPage={ITEMS_PER_PAGE}
          />
        </div>
      </div>
    </div>
  );
};

export default OrderListPage;

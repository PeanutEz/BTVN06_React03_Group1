import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../../../components";
import { GlassSearchSelect } from "../../../components/ui";
import type { OrderDisplay } from "../../../models/order.model";
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, ORDER_TYPE_LABELS } from "../../../models/order.model";
import { orderClient } from "../../../services/order.client";
import { fetchFranchiseSelect } from "../../../services/store.service";
import type { FranchiseSelectItem } from "../../../services/store.service";
import { searchCustomers } from "../../../services/customer.service";
import type { CustomerDisplay } from "../../../models/customer.model";
import { ROUTER_URL } from "../../../routes/router.const";
import Pagination from "../../../components/ui/Pagination";
import { useManagerFranchiseId } from "../../../hooks/useManagerFranchiseId";

const ITEMS_PER_PAGE = 10;

const STATUS_OPTIONS = [
  { value: "DRAFT",            label: "Nháp" },
  { value: "CONFIRMED",        label: "Đã xác nhận" },
  { value: "PREPARING",        label: "Đang chuẩn bị" },
  { value: "READY_FOR_PICKUP", label: "Sẵn sàng lấy hàng" },
  { value: "COMPLETED",        label: "Hoàn thành" },
  { value: "CANCELLED",        label: "Đã hủy" },
];

const OrderListPage = () => {
  const managerFranchiseId = useManagerFranchiseId();

  const [orders, setOrders] = useState<OrderDisplay[]>([]);
  const [franchises, setFranchises] = useState<FranchiseSelectItem[]>([]);
  const [selectedFranchiseId, setSelectedFranchiseId] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  // Customer combobox state
  const [customerFilter, setCustomerFilter] = useState("");
  const [customerOptions, setCustomerOptions] = useState<CustomerDisplay[]>([]);
  const [customerLoading, setCustomerLoading] = useState(false);
  const customerDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasRun = useRef(false);
  const activeFranchiseId = managerFranchiseId ?? selectedFranchiseId;

  // ─── Load orders ────────────────────────────────────────────────────────────
  const loadOrders = async (franchiseId: string) => {
    if (!franchiseId) { setOrders([]); return; }
    setLoading(true);
    setCurrentPage(1);
    try {
      const data = await orderClient.getOrdersByFranchiseId(franchiseId);
      setOrders(data);
    } catch (err) {
      console.error("Lỗi tải đơn hàng:", err);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  // Init
  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;
    const initFranchise = managerFranchiseId ?? "";
    if (initFranchise) { setSelectedFranchiseId(initFranchise); loadOrders(initFranchise); }
    fetchFranchiseSelect().then(setFranchises).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!managerFranchiseId) return;
    setSelectedFranchiseId(managerFranchiseId);
    loadOrders(managerFranchiseId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [managerFranchiseId]);

  // Load all customers on mount for the dropdown
  useEffect(() => {
    searchCustomers("").then(setCustomerOptions).catch(() => {});
  }, []);

  // ─── Customer search (debounced, triggered by GlassSearchSelect) ───────────
  const handleCustomerSearch = (keyword: string) => {
    if (customerDebounceRef.current) clearTimeout(customerDebounceRef.current);
    setCustomerLoading(true);
    customerDebounceRef.current = setTimeout(async () => {
      try {
        const res = await searchCustomers(keyword.trim());
        setCustomerOptions(res);
      } catch { setCustomerOptions([]); }
      finally { setCustomerLoading(false); }
    }, 350);
  };
  const handleResetFilter = () => {
    setStatusFilter("");
    setCustomerFilter("");
    setCurrentPage(1);
  };

  // ─── Filter ─────────────────────────────────────────────────────────────────
  const filteredOrders = orders.filter((order) => {
    const matchStatus = !statusFilter || order.status === statusFilter;
    if (!customerFilter) return matchStatus;
    const cf = String(customerFilter);
    const ordCustId = String(
      order.customer_id ?? order.customer?._id ?? order.customer?.id ?? ""
    );
    return ordCustId !== "" && ordCustId === cf && matchStatus;
  });

  const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  const franchiseMap = Object.fromEntries(franchises.map(f => [f.value, f.name]));

  // Options for GlassSearchSelect
  const franchiseSelectOptions = franchises.map(f => ({
    value: f.value,
    label: `${f.name} (${f.code})`,
  }));

  const customerSelectOptions = customerOptions.map(c => ({
    value: String(c.id),
    label: c.name,
    sub: [c.phone, c.email].filter(Boolean).join(" · "),
  }));

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);

  const getDiscountSummary = (order: OrderDisplay) => {
    const promotion = order.promotion_discount ?? 0;
    const voucher = order.voucher_discount ?? 0;
    const loyalty = order.loyalty_discount ?? 0;
    const discountTotal = promotion + voucher + loyalty;
    const parts: string[] = [];
    if (promotion > 0) parts.push("KM");
    if (voucher > 0) parts.push("Voucher");
    if (loyalty > 0) parts.push("Điểm");
    return { discountTotal, parts };
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Quản lý đơn hàng</h1>
          <p className="text-xs sm:text-sm text-slate-600">Quản lý tất cả đơn hàng của khách hàng</p>
        </div>
      </div>

      {/* FILTERS */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">

          {/* Chi nhánh */}
          <div className="min-w-[220px] space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Chi nhánh</label>
            {managerFranchiseId ? (
              <div className="flex items-center gap-2 rounded-lg border border-primary-500/40 bg-primary-50 px-3 py-2 text-sm text-primary-700">
                <svg className="size-4 shrink-0 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span className="font-medium truncate">{franchiseMap[managerFranchiseId] || managerFranchiseId}</span>
              </div>
            ) : (
              <GlassSearchSelect
                value={selectedFranchiseId}
                onChange={(v) => { setSelectedFranchiseId(v); loadOrders(v); }}
                options={franchiseSelectOptions}
                placeholder="-- Chọn chi nhánh --"
                searchPlaceholder="Tìm theo tên hoặc mã..."
                allLabel="-- Tất cả franchise --"
              />
            )}
          </div>

          {/* Khách hàng */}
          <div className="flex-1 min-w-[220px] space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Khách hàng</label>
            <GlassSearchSelect
              value={customerFilter}              onChange={(v) => {
                setCustomerFilter(v);
                setCurrentPage(1);
              }}
              options={customerSelectOptions}
              placeholder="-- Tất cả khách hàng --"
              searchPlaceholder="Tìm theo tên, SĐT hoặc email..."
              allLabel="-- Tất cả khách hàng --"
              loading={customerLoading}
              onSearch={handleCustomerSearch}
            />
          </div>

          {/* Trạng thái */}
          <div className="min-w-[180px] space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Trạng thái</label>
            <GlassSearchSelect
              value={statusFilter}
              onChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}
              options={STATUS_OPTIONS}
              placeholder="-- Tất cả --"
              searchPlaceholder="Tìm trạng thái..."
              allLabel="-- Tất cả --"
            />
          </div>

          {/* Đặt lại */}
          <div className="space-y-1.5">
            <label className="invisible block text-xs">&nbsp;</label>
            <Button onClick={handleResetFilter} variant="outline">Đặt lại</Button>
          </div>
        </div>

        {activeFranchiseId && (
          <p className="mt-3 text-xs text-slate-400">
            Hiển thị <span className="font-semibold text-slate-600">{filteredOrders.length}</span> đơn hàng
            {orders.length !== filteredOrders.length && ` (lọc từ ${orders.length})`}
          </p>
        )}
      </div>

      {/* No franchise selected */}
      {!activeFranchiseId && !loading && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-slate-400">
          <svg className="mb-3 size-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" />
          </svg>
          <p className="text-sm font-medium">Vui lòng chọn chi nhánh để xem đơn hàng</p>
        </div>
      )}

      {/* TABLE */}
      {(activeFranchiseId || loading) && (
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
                {loading ? (
                  <tr><td colSpan={9}>
                    <div className="flex justify-center items-center py-16">
                      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500" />
                    </div>
                  </td></tr>
                ) : paginatedOrders.length === 0 ? (
                  <tr><td colSpan={9} className="px-4 py-12 text-center text-sm text-slate-500">Không có đơn hàng nào</td></tr>
                ) : (
                  paginatedOrders.map((order) => {
                    const { discountTotal, parts } = getDiscountSummary(order);
                    const statusColor = ORDER_STATUS_COLORS[order.status] ?? "bg-slate-100 text-slate-600 border-slate-200";
                    return (
                      <tr key={order._id ?? order.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 font-semibold text-primary-600">{order.code}</td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-slate-900">{String(order.franchise?.code || (order as any).franchise_code || "—")}</p>
                          <p className="text-xs text-slate-500">{String(order.franchise?.name || (order as any).franchise_name || "—")}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-slate-900">{order.customer?.name || order.customer_name || "—"}</p>
                          <p className="text-xs text-slate-500">{order.customer?.phone || order.phone || "—"}</p>
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">
                          {formatCurrency(order.final_amount ?? order.total_amount ?? 0)}
                        </td>
                        <td className="px-4 py-3">
                          {discountTotal > 0 ? (
                            <div>
                              <p className="font-semibold text-green-600 whitespace-nowrap">-{formatCurrency(discountTotal)}</p>
                              <p className="text-[11px] text-slate-500">{parts.join(", ")}</p>
                            </div>
                          ) : <span className="text-slate-400">—</span>}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{ORDER_TYPE_LABELS[order.type] ?? order.type ?? "—"}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusColor}`}>
                            {ORDER_STATUS_LABELS[order.status] ?? order.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                          {order.created_at ? new Date(order.created_at).toLocaleString("vi-VN") : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <Link to={`${ROUTER_URL.ADMIN}/${ROUTER_URL.ADMIN_ROUTES.ORDERS}/${order._id ?? order.id}`}>
                            <Button size="sm" variant="outline">Chi tiết</Button>
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <div className="px-4">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              totalItems={filteredOrders.length}
              itemsPerPage={ITEMS_PER_PAGE}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderListPage;

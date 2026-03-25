import { useEffect, useRef, useState } from "react";
import { Button } from "../../../components";
import { OrderDetailModal } from "./OrderDetail.page";
import { GlassSearchSelect } from "../../../components/ui";
import type { OrderDisplay, OrderStatus } from "../../../models/order.model";
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, ORDER_TYPE_LABELS } from "../../../models/order.model";
import { orderClient } from "../../../services/order.client";
import { updateOrderStatus } from "../../../services/order.service";
import { fetchFranchiseSelect } from "../../../services/store.service";
import type { FranchiseSelectItem } from "../../../services/store.service";
import { searchUserFranchiseRoles } from "../../../services/user-franchise-role.service";
import type { UserFranchiseRole } from "../../../services/user-franchise-role.service";
import Pagination from "../../../components/ui/Pagination";
import { useManagerFranchiseId } from "../../../hooks/useManagerFranchiseId";
import { showSuccess, showError } from "../../../utils";
import { useAuthStore } from "../../../store";

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
  const { user } = useAuthStore();
  const isShipper = ((user?.active_context as { role?: string } | null)?.role ?? user?.role ?? "").toUpperCase() === "SHIPPER";

  const [orders, setOrders] = useState<OrderDisplay[]>([]);
  const [franchises, setFranchises] = useState<FranchiseSelectItem[]>([]);
  const [selectedFranchiseId, setSelectedFranchiseId] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");  const [currentPage, setCurrentPage] = useState(1);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  // inline status popover
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [staffList, setStaffList] = useState<UserFranchiseRole[]>([]);
  const [assignPopoverId, setAssignPopoverId] = useState<string | null>(null);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [assignSearch, setAssignSearch] = useState("");
  const assignPopoverRef = useRef<HTMLDivElement | null>(null);
  const loadedFranchiseRef = useRef<string | null>(null);
  const activeFranchiseId = managerFranchiseId ?? selectedFranchiseId;
  // close popover on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (assignPopoverRef.current && !assignPopoverRef.current.contains(e.target as Node)) {
        setAssignPopoverId(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ─── Quick status update ──────────────────────────────────────────────────────
  const handleQuickStatus = async (orderId: string, newStatus: OrderStatus) => {
    setUpdatingId(orderId);
    try {
      const adminId = user?.user?.id || user?.id || "1";
      const updated = await updateOrderStatus(orderId, newStatus, adminId);
      setOrders(prev => prev.map(o =>
        String(o._id ?? o.id) === orderId
          ? { ...o, status: newStatus, ...(updated ?? {}) }
          : o
      ));
      showSuccess("Cập nhật trạng thái thành công");
    } catch (err: any) {
      showError(err?.response?.data?.message || err?.message || "Có lỗi xảy ra");
    } finally {
      setUpdatingId(null);
    }
  };  // ─── Load orders ─────────────────────────────────────────────────────────────
  const loadOrders = async (franchiseId: string) => {
    if (!franchiseId) { setOrders([]); return; }
    // skip nếu đã load franchise này rồi
    if (loadedFranchiseRef.current === franchiseId) return;
    loadedFranchiseRef.current = franchiseId;
    setLoading(true);
    setCurrentPage(1);
    try {
      const [ordersData, staffData] = await Promise.all([
        orderClient.getOrdersByFranchiseId(franchiseId),
        searchUserFranchiseRoles({
          searchCondition: { franchise_id: franchiseId, is_deleted: false },
          pageInfo: { pageNum: 1, pageSize: 100 },
        }).then(r => r.data).catch(() => [] as UserFranchiseRole[]),
      ]);
      setOrders(ordersData);
      setStaffList(staffData);
    } catch (err) {
      console.error("Lỗi tải đơn hàng:", err);
      loadedFranchiseRef.current = null;
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  // ─── Assign staff (ready-for-pickup) ─────────────────────────────────────────
  const handleAssign = async (orderId: string, staffId: string) => {
    setAssigningId(orderId);
    setAssignPopoverId(null);
    try {
      const result = await orderClient.setReadyForPickup(orderId, { staff_id: staffId });
      if (result.success) {
        setOrders(prev => prev.map(o =>
          String(o._id ?? o.id) === orderId
            ? { ...o, status: "READY_FOR_PICKUP" as OrderStatus, ...(result.data ?? {}) }
            : o
        ));
        showSuccess("Đã giao việc & cập nhật trạng thái Sẵn sàng lấy hàng");
      } else {
        showError("Không thể assign nhân viên");
      }
    } catch (err: any) {
      showError(err?.response?.data?.message || err?.message || "Có lỗi xảy ra");
    } finally {
      setAssigningId(null);
    }
  };

  // Init — fetch franchises 1 lần
  useEffect(() => {
    fetchFranchiseSelect().then(setFranchises).catch(() => {});
  }, []);

  useEffect(() => {
    if (!managerFranchiseId) return;
    setSelectedFranchiseId(managerFranchiseId);
    loadOrders(managerFranchiseId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [managerFranchiseId]);
  const handleResetFilter = () => {
    setStatusFilter("");
    setCurrentPage(1);
  };

  // ─── Filter ──────────────────────────────────────────────────────────────────
  const filteredOrders = orders
    .filter((order) => !statusFilter || order.status === statusFilter)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  const franchiseMap = Object.fromEntries(franchises.map(f => [f.value, f.name]));
  const franchiseSelectOptions = franchises.map(f => ({
    value: f.value,
    label: `${f.name} (${f.code})`,
  }));

  const formatCurrency= (amount: number) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);

  const getDiscountSummary = (order: OrderDisplay) => {
    const promotion = order.promotion_discount ?? 0;
    const voucher   = order.voucher_discount   ?? 0;
    const loyalty   = order.loyalty_discount   ?? 0;
    const discountTotal = promotion + voucher + loyalty;
    const parts: string[] = [];
    if (promotion > 0) parts.push("KM");
    if (voucher   > 0) parts.push("Voucher");
    if (loyalty   > 0) parts.push("Điểm");
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
          {!isShipper && (
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
                onChange={(v) => { loadedFranchiseRef.current = null; setSelectedFranchiseId(v); loadOrders(v); }}
                options={franchiseSelectOptions}
                placeholder="-- Chọn chi nhánh --"
                searchPlaceholder="Tìm theo tên hoặc mã..."
                allLabel="-- Tất cả franchise --"
              />
            )}
          </div>
          )}          {/* Trạng thái */}
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
          {!isShipper && (
          <div className="space-y-1.5">
            <label className="invisible block text-xs">&nbsp;</label>
            <Button onClick={handleResetFilter} variant="outline">Đặt lại</Button>
          </div>
          )}
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
                  <th className="px-4 py-3">Chi nhánh</th>
                  <th className="px-4 py-3">Khách hàng</th>
                  <th className="px-4 py-3">Tổng tiền</th>
                  <th className="px-4 py-3">Giảm giá</th>
                  <th className="px-4 py-3">Loại đơn</th>                  <th className="px-4 py-3">Trạng thái</th>                  <th className="px-4 py-3">Ngày tạo</th>
                  <th className="px-4 py-3">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">                {loading ? (                  <tr><td colSpan={9}>
                    <div className="flex justify-center items-center py-16">
                      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500" />
                    </div>
                  </td></tr>
                ) : paginatedOrders.length === 0 ? (
                  <tr><td colSpan={9} className="px-4 py-12 text-center text-sm text-slate-500">Không có đơn hàng nào</td></tr>
                ) : (
                  paginatedOrders.map((order) => {
                    const { discountTotal, parts } = getDiscountSummary(order);
                    const statusColor = ORDER_STATUS_COLORS[order.status] ?? "bg-slate-100 text-slate-600 border-slate-200";                    const custPhone = order.customer?.phone || (order as any).phone || "—";
                    const custName  = order.customer_name || order.customer?.name || "—";
                    return (
                      <tr key={order._id ?? order.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 font-semibold text-primary-600">{order.code}</td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-slate-900">{String(order.franchise?.name || (order as any).franchise_name || "—")}</p>
                          <p className="text-xs text-slate-500">{String(order.franchise?.code || (order as any).franchise_code || "")}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-slate-900">{custName}</p>
                          <p className="text-xs text-slate-500">{custPhone}</p>
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
                        <td className="px-4 py-3 text-slate-600">{ORDER_TYPE_LABELS[order.type] ?? order.type ?? "—"}</td>                        <td className="px-4 py-3">
                          <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusColor}`}>
                            {updatingId === String(order._id ?? order.id)
                              ? "Đang cập nhật..."
                              : ORDER_STATUS_LABELS[order.status] ?? ORDER_STATUS_LABELS[order.status.replace("CANCELED", "CANCELLED") as OrderStatus] ?? order.status}
                          </span>
                        </td>                        <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                          {order.created_at ? new Date(order.created_at).toLocaleString("vi-VN") : "—"}                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            {/* Chuẩn bị — chỉ hiện khi CONFIRMED */}
                            {order.status === "CONFIRMED" && (
                              <button
                                onClick={() => handleQuickStatus(String(order._id ?? order.id), "PREPARING")}
                                disabled={updatingId === String(order._id ?? order.id)}
                                className="flex items-center gap-1 rounded-lg border border-orange-200 bg-orange-50 px-2 py-1 text-xs font-semibold text-orange-600 transition-colors hover:border-orange-400 hover:bg-orange-100 disabled:opacity-50"
                                title="Chuyển sang Đang chuẩn bị"
                              >
                                <svg className="size-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" />
                                  <circle cx="12" cy="12" r="9" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                Chuẩn bị
                              </button>
                            )}
                            {/* Assign — chỉ hiện khi PREPARING */}
                            {order.status === "PREPARING" && (
                              <div className="relative inline-block" ref={assignPopoverId === String(order._id ?? order.id) ? assignPopoverRef : null}>
                                <button
                                  onClick={() => setAssignPopoverId(prev => prev === String(order._id ?? order.id) ? null : String(order._id ?? order.id))}
                                  disabled={assigningId === String(order._id ?? order.id)}
                                  className="flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-600 transition-colors hover:border-blue-400 hover:bg-blue-100 disabled:opacity-50"
                                  title="Giao việc cho nhân viên (Ready for Pickup)"
                                >
                                  {assigningId === String(order._id ?? order.id) ? (
                                    <span>Đang giao...</span>
                                  ) : (
                                    <>
                                      <svg className="size-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                      </svg>
                                      Assign
                                    </>
                                  )}
                                </button>                                {assignPopoverId === String(order._id ?? order.id) && (
                                  <div className="absolute right-0 top-full z-50 mt-1 w-56 rounded-lg border border-slate-600 bg-slate-800 shadow-2xl shadow-black/60">
                                    {/* Header */}
                                    <p className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400 border-b border-slate-700">Chọn nhân viên</p>
                                    {/* Search */}
                                    <div className="p-2 border-b border-slate-700">
                                      <div className="relative">
                                        <svg className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                        </svg>
                                        <input
                                          type="text"
                                          value={assignSearch}
                                          onChange={e => setAssignSearch(e.target.value)}
                                          placeholder="Tìm theo tên..."
                                          autoFocus
                                          className="w-full rounded-md border border-slate-600 bg-slate-700 py-1.5 pl-8 pr-3 text-xs text-slate-100 placeholder-slate-400 outline-none focus:border-red-400/50 focus:ring-1 focus:ring-red-400/20"
                                        />
                                      </div>
                                    </div>
                                    {/* List */}
                                    <div className="max-h-52 overflow-y-auto">
                                      {(() => {
                                        const filtered = staffList
                                          .filter(s => s.role_code === "STAFF" || s.role_code === "SHIPPER")
                                          .filter(s => !assignSearch.trim() || s.user_name.toLowerCase().includes(assignSearch.toLowerCase()));
                                        return filtered.length === 0 ? (
                                          <p className="px-3 py-3 text-xs text-slate-400 text-center">Không có nhân viên</p>
                                        ) : (
                                          filtered.map(s => (
                                            <button
                                              key={s.id}
                                              onClick={() => { handleAssign(String(order._id ?? order.id), s.user_id); setAssignSearch(""); }}
                                              className="w-full px-3 py-2 text-left transition-colors hover:bg-slate-700"
                                            >
                                              <p className="text-xs font-semibold text-slate-100">{s.user_name}</p>
                                              <p className="text-[10px] text-slate-400">{s.role_name}</p>
                                            </button>
                                          ))
                                        );
                                      })()}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                            {/* Xem chi tiết */}
                            <button
                              onClick={() => setSelectedOrderId(String(order._id ?? order.id))}
                              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-primary-50 hover:text-primary-600"
                              title="Xem chi tiết"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 3.487a2.25 2.25 0 013.182 3.182L7.5 19.213l-4 1 1-4L16.862 3.487z" />
                              </svg>
                            </button>
                          </div>
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
        </div>      )}

      <OrderDetailModal
        orderId={selectedOrderId}
        onClose={() => setSelectedOrderId(null)}
        onStatusChange={(orderId, newStatus) => {
          setOrders(prev => prev.map(o =>
            String(o._id ?? o.id) === orderId ? { ...o, status: newStatus } : o
          ));
        }}
      />
    </div>
  );
};

export default OrderListPage;

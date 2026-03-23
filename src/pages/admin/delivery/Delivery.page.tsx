import { useCallback, useEffect, useRef, useState } from "react";
import { Button, GlassSelect, useConfirm } from "../../../components";
import { GlassSearchSelect } from "../../../components/ui";
import Pagination from "../../../components/ui/Pagination";
import { useManagerFranchiseId } from "../../../hooks/useManagerFranchiseId";
import type { CustomerDisplay } from "../../../models/customer.model";
import { deliveryClient, type DeliveryData } from "../../../services/delivery.client";
import { fetchFranchiseSelect, type FranchiseSelectItem } from "../../../services/store.service";
import { searchCustomers } from "../../../services/customer.service";
import { showError, showSuccess } from "../../../utils";

const ITEMS_PER_PAGE = 10;

const STATUS_OPTIONS = [
  { value: "", label: "-- Tất cả --" },
  { value: "PENDING",          label: "Chờ xử lý" },
  { value: "CONFIRMED",        label: "Đã xác nhận" },
  { value: "PREPARING",        label: "Đang chuẩn bị" },
  { value: "READY_FOR_PICKUP", label: "Sẵn sàng lấy hàng" },
  { value: "DELIVERING",       label: "Đang giao" },
  { value: "COMPLETED",        label: "Hoàn thành" },
  { value: "CANCELLED",        label: "Đã hủy" },
];

function deliveryIdOf(d: DeliveryData): string {
  return String(d.id ?? d._id ?? "");
}
function safeStr(v: unknown): string {
  if (v === null || v === undefined) return "—";
  return String(v);
}
function getStatusBadgeClass(statusRaw: unknown): string {
  const s = String(statusRaw ?? "").toUpperCase();
  if (s.includes("COMPLET")) return "bg-emerald-50 text-emerald-800 border-emerald-200";
  if (s.includes("CANCEL"))  return "bg-rose-50 text-rose-800 border-rose-200";
  if (s.includes("DELIVER") || s.includes("READY")) return "bg-purple-50 text-purple-800 border-purple-200";
  if (s.includes("PREPAR"))  return "bg-yellow-50 text-yellow-800 border-yellow-200";
  if (s.includes("CONFIRM")) return "bg-blue-50 text-blue-800 border-blue-200";
  if (s.includes("PENDING")) return "bg-amber-50 text-amber-800 border-amber-200";
  return "bg-slate-50 text-slate-700 border-slate-200";
}

export default function DeliveryPage() {
  const showConfirm = useConfirm();
  const managerFranchiseId = useManagerFranchiseId();
  const [franchises, setFranchises] = useState<FranchiseSelectItem[]>([]);
  const [selectedFranchiseId, setSelectedFranchiseId] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [customerFilter, setCustomerFilter] = useState("");
  const [customerOptions, setCustomerOptions] = useState<CustomerDisplay[]>([]);
  const [customerLoading, setCustomerLoading] = useState(false);
  const customerDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [deliveries, setDeliveries] = useState<DeliveryData[]>([]);
  const [loading, setLoading] = useState(false);
  const [mutating, setMutating] = useState<null | { deliveryId: string; action: "pickup" | "complete" }>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const hasRun = useRef(false);
  const activeFranchiseId = managerFranchiseId ?? selectedFranchiseId;

  // ─── Load deliveries ──────────────────────────────────────────────────────
  const loadDeliveries = useCallback(async (franchiseId: string, status?: string) => {
    if (!franchiseId) { setDeliveries([]); return; }
    setLoading(true);
    setCurrentPage(1);
    try {
      const result = await deliveryClient.searchDeliveries({
        franchise_id: franchiseId,
        status: status || undefined,
      });
      setDeliveries(result);
    } catch (err) {
      console.error(err);
      showError("Tải danh sách giao hàng thất bại");
      setDeliveries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Init
  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;
    fetchFranchiseSelect().then(setFranchises).catch(() => {});
  }, []);

  // Sync khi managerFranchiseId hydrate muộn
  useEffect(() => {
    if (!managerFranchiseId) return;
    setSelectedFranchiseId(managerFranchiseId);
    loadDeliveries(managerFranchiseId, statusFilter);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [managerFranchiseId]);

  // Load all customers on mount
  useEffect(() => {
    searchCustomers("").then(setCustomerOptions).catch(() => {});
  }, []);

  // ─── Customer search (debounced) ──────────────────────────────────────────
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

  // ─── Đổi trạng thái ───────────────────────────────────────────────────────
  const upsertDelivery = (next: DeliveryData) => {
    const id = deliveryIdOf(next);
    if (!id) return;
    setDeliveries((prev) => {
      const exists = prev.find((d) => deliveryIdOf(d) === id);
      if (!exists) return [next, ...prev];
      return prev.map((d) => (deliveryIdOf(d) === id ? next : d));
    });
  };

  const handlePickup = async (item: DeliveryData) => {
    const id = deliveryIdOf(item);
    if (!id) return;
    if (String(item.status ?? "").toUpperCase().includes("COMPLET")) {
      showError("Delivery đã hoàn thành"); return;
    }
    const ok = await showConfirm({
      title: "Xác nhận Pickup",
      message: `Chuyển trạng thái giao hàng #${id} sang PICKUP?`,
      confirmText: "Pickup",
      variant: "info",
    });
    if (!ok) return;
    setMutating({ deliveryId: id, action: "pickup" });
    try {
      const result = await deliveryClient.changeStatusPickup(id);
      if (result) { upsertDelivery(result); showSuccess("Đã chuyển sang Pickup"); }
      else showError("Cập nhật Pickup thất bại");
    } catch (e) { console.error(e); showError("API Pickup thất bại"); }
    finally { setMutating(null); }
  };

  const handleComplete = async (item: DeliveryData) => {
    const id = deliveryIdOf(item);
    if (!id) return;
    if (String(item.status ?? "").toUpperCase().includes("COMPLET")) {
      showError("Delivery đã hoàn thành"); return;
    }
    const ok = await showConfirm({
      title: "Xác nhận hoàn thành",
      message: `Chuyển trạng thái giao hàng #${id} sang COMPLETED?`,
      confirmText: "Hoàn thành",
      variant: "info",
    });
    if (!ok) return;
    setMutating({ deliveryId: id, action: "complete" });
    try {
      const result = await deliveryClient.changeStatusComplete(id);
      if (result) { upsertDelivery(result); showSuccess("Đã hoàn thành giao hàng"); }
      else showError("Cập nhật Complete thất bại");
    } catch (e) { console.error(e); showError("API Complete thất bại"); }
    finally { setMutating(null); }
  };
  // ─── Filter client-side ───────────────────────────────────────────────────
  const franchiseMap = Object.fromEntries(franchises.map((f) => [f.value, f.name]));

  const customerSelectOptions = customerOptions.map(c => ({
    value: String(c.id),
    label: c.name,
    sub: [c.phone, c.email].filter(Boolean).join(" · "),
  }));

  const filteredDeliveries = deliveries.filter((d) => {
    if (!customerFilter) return true;
    const custId = String(
      d.customer_id ?? ""
    );
    return custId !== "" && custId === customerFilter;
  });

  const totalPages = Math.ceil(filteredDeliveries.length / ITEMS_PER_PAGE);
  const paginatedDeliveries = filteredDeliveries.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Quản lý Giao hàng</h1>
          <p className="text-xs sm:text-sm text-slate-600">Tra cứu và cập nhật trạng thái giao hàng</p>
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
              <GlassSelect
                value={selectedFranchiseId}
                onChange={(v) => {
                  setSelectedFranchiseId(v);
                  loadDeliveries(v, statusFilter);
                }}
                options={[
                  { value: "", label: "-- Chọn chi nhánh --" },
                  ...franchises.map((f) => ({ value: f.value, label: `${f.name} (${f.code})` })),
                ]}
              />
            )}
          </div>          {/* Trạng thái */}
          <div className="min-w-[180px] space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Trạng thái</label>
            <GlassSelect
              value={statusFilter}
              onChange={(v) => {
                setStatusFilter(v);
                if (activeFranchiseId) loadDeliveries(activeFranchiseId, v);
              }}
              options={STATUS_OPTIONS}
            />
          </div>

          {/* Khách hàng */}
          <div className="flex-1 min-w-[220px] space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Khách hàng</label>
            <GlassSearchSelect
              value={customerFilter}
              onChange={(v) => { setCustomerFilter(v); setCurrentPage(1); }}
              options={customerSelectOptions}
              placeholder="-- Tất cả khách hàng --"
              searchPlaceholder="Tìm theo tên, SĐT hoặc email..."
              allLabel="-- Tất cả khách hàng --"
              loading={customerLoading}
              onSearch={handleCustomerSearch}
            />
          </div>

          {/* Đặt lại */}
          <div className="space-y-1.5">
            <label className="invisible block text-xs">&nbsp;</label>
            <Button
              variant="outline"
              onClick={() => {
                setStatusFilter("");
                setCustomerFilter("");
                setCurrentPage(1);
                if (activeFranchiseId) loadDeliveries(activeFranchiseId, "");
              }}
            >
              Đặt lại
            </Button>
          </div>
        </div>

        {activeFranchiseId && (
          <p className="mt-3 text-xs text-slate-400">
            Hiển thị <span className="font-semibold text-slate-600">{filteredDeliveries.length}</span> giao hàng
            {deliveries.length !== filteredDeliveries.length && ` (lọc từ ${deliveries.length})`}
          </p>
        )}
      </div>

      {/* Empty state */}
      {!activeFranchiseId && !loading && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-slate-400">
          <svg className="mb-3 size-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" />
          </svg>
          <p className="text-sm font-medium">Vui lòng chọn chi nhánh để xem danh sách giao hàng</p>
        </div>
      )}

      {/* TABLE */}
      {(activeFranchiseId || loading) && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-4 py-3">Mã đơn</th>
                  <th className="px-4 py-3">Chi nhánh</th>
                  <th className="px-4 py-3">Khách hàng</th>
                  <th className="px-4 py-3">Địa chỉ giao</th>
                  <th className="px-4 py-3">Shipper</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3">Giao lúc</th>
                  <th className="px-4 py-3">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {loading ? (
                  <tr>
                    <td colSpan={8}>
                      <div className="flex justify-center items-center py-16">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500" />
                      </div>
                    </td>
                  </tr>
                ) : paginatedDeliveries.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-sm text-slate-500">
                      Không có dữ liệu giao hàng
                    </td>
                  </tr>
                ) : (
                  paginatedDeliveries.map((item) => {
                    const id = deliveryIdOf(item);
                    const isRunning = mutating?.deliveryId === id;
                    const statusStr = String(item.status ?? "").toUpperCase();
                    const isDone = statusStr.includes("COMPLET") || statusStr.includes("CANCEL") || statusStr === "DELIVERED";
                    return (
                      <tr key={id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-primary-600">{item.order_code || safeStr(item.order_id)}</p>
                          <p className="text-xs text-slate-400">{id}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-800">{item.franchise_name || safeStr(item.franchise_id)}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-800">{item.customer_name || safeStr(item.customer_id)}</p>
                          <p className="text-xs text-slate-400">{item.customer_phone || ""}</p>
                        </td>
                        <td className="px-4 py-3 max-w-[160px]">
                          <p className="text-sm text-slate-700 truncate">{item.order_address || "—"}</p>
                          {item.order_message && (
                            <p className="text-xs text-slate-400 truncate italic">"{item.order_message}"</p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-800">{item.assigned_to_name || safeStr(item.assigned_to)}</p>
                          <p className="text-xs text-slate-400">{item.assigned_by_name ? `Bởi: ${item.assigned_by_name}` : ""}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getStatusBadgeClass(item.status)}`}>
                            {safeStr(item.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                          {item.delivered_at
                            ? new Date(item.delivered_at).toLocaleString("vi-VN")
                            : item.picked_up_at
                            ? <span className="text-purple-600">Đã lấy: {new Date(item.picked_up_at).toLocaleString("vi-VN")}</span>
                            : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={isDone}
                              loading={isRunning && mutating?.action === "pickup"}
                              onClick={(e) => { e.stopPropagation(); handlePickup(item); }}
                            >
                              Pickup
                            </Button>
                            <Button
                              size="sm"
                              variant="primary"
                              disabled={isDone}
                              loading={isRunning && mutating?.action === "complete"}
                              onClick={(e) => { e.stopPropagation(); handleComplete(item); }}
                            >
                              Hoàn thành
                            </Button>
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
              totalItems={filteredDeliveries.length}
              itemsPerPage={ITEMS_PER_PAGE}
            />
          </div>
        </div>
      )}
    </div>
  );
}

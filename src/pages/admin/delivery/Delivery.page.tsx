import { useMemo, useState, useEffect } from "react";
import { Button, GlassSelect, useConfirm } from "../../../components";
import { useAuthStore } from "../../../store";
import { deliveryClient, type DeliveryData, type DeliverySearchParams } from "../../../services/delivery.client";
import { fetchFranchiseSelect, type FranchiseSelectItem } from "../../../services/store.service";
import { showError, showSuccess } from "../../../utils";

const ITEMS_PER_PAGE = 10;

function deliveryIdOf(d: DeliveryData): string {
  return String(d.id ?? d._id ?? "");
}

function safeStr(v: unknown): string {
  if (v === null || v === undefined) return "—";
  return String(v);
}

function normalizeOptional(s: string): string | undefined {
  const t = s.trim();
  return t ? t : undefined;
}

function getStatusBadgeClass(statusRaw: unknown): string {
  const status = String(statusRaw ?? "").toUpperCase();
  if (!status) return "bg-slate-50 text-slate-700 border-slate-200";
  if (status.includes("COMPLETE") || status.includes("COMPLETED"))
    return "bg-emerald-50 text-emerald-800 border-emerald-200";
  if (status.includes("CANCEL"))
    return "bg-rose-50 text-rose-800 border-rose-200";
  if (status.includes("DELIVER") || status.includes("DELIVERING") || status.includes("READY"))
    return "bg-purple-50 text-purple-800 border-purple-200";
  if (status.includes("PENDING"))
    return "bg-amber-50 text-amber-800 border-amber-200";
  return "bg-slate-50 text-slate-700 border-slate-200";
}

const STATUS_OPTIONS = [
  "PENDING",
  "CONFIRMED",
  "PREPARING",
  "READY",
  "DELIVERING",
  "COMPLETED",
  "CANCELLED",
] as const;

export default function DeliveryPage() {
  const showConfirm = useConfirm();
  const { user } = useAuthStore();

  const defaultFranchiseId = user?.roles?.[0]?.franchise_id ?? "";

  const [orderIdQuery, setOrderIdQuery] = useState("");
  const [deliveryIdQuery, setDeliveryIdQuery] = useState("");
  const [franchiseId, setFranchiseId] = useState<string>("");
  const [staffId, setStaffId] = useState<string>("");
  const [customerId, setCustomerId] = useState<string>("");
  const [status, setStatus] = useState<string>("");

  const [franchiseOptions, setFranchiseOptions] = useState<FranchiseSelectItem[]>([]);

  const canEditConditionFilters = Boolean(franchiseId.trim());

  const [deliveries, setDeliveries] = useState<DeliveryData[]>([]);
  const [selected, setSelected] = useState<DeliveryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [mutating, setMutating] = useState<null | { deliveryId: string; action: "pickup" | "complete" }>(null);

  useEffect(() => {
    setFranchiseId(defaultFranchiseId ?? "");
  }, [defaultFranchiseId]);

  useEffect(() => {
    const fetchFranchises = async () => {
      try {
        const data = await fetchFranchiseSelect();
        setFranchiseOptions(data);
      } catch (error) {
        console.error("Lỗi lấy danh sách franchise", error);
      }
    };
    fetchFranchises();
  }, []);

  const searchParams: DeliverySearchParams = useMemo(
    () => ({
      franchise_id: normalizeOptional(franchiseId),
      staff_id: normalizeOptional(staffId),
      customer_id: normalizeOptional(customerId),
      status: normalizeOptional(status),
    }),
    [customerId, franchiseId, staffId, status],
  );

  const upsertDelivery = (next: DeliveryData) => {
    const id = deliveryIdOf(next);
    if (!id) return;
    setDeliveries((prev) => {
      const existing = prev.find((d) => deliveryIdOf(d) === id);
      if (!existing) return [next, ...prev];
      return prev.map((d) => (deliveryIdOf(d) === id ? next : d));
    });
    setSelected(next);
  };

  const handleGetByOrderId = async () => {
    const orderId = orderIdQuery.trim();
    if (!orderId) { showError("Vui lòng nhập Order ID"); return; }

    setLoading(true);
    try {
      const result = await deliveryClient.getDeliveryByOrderId(orderId);
      if (!result) {
        setDeliveries([]);
        setSelected(null);
        showError("Không tìm thấy giao hàng theo Order ID");
        return;
      }
      setDeliveries([result]);
      setSelected(result);
      showSuccess("Đã tải thông tin giao hàng theo Order ID");
    } catch (error) {
      console.error(error);
      showError("Lấy Delivery theo Order ID thất bại");
      setDeliveries([]);
      setSelected(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!canEditConditionFilters) {
      showError("Vui lòng chọn Franchise ID trước khi tìm kiếm");
      return;
    }

    setLoading(true);
    try {
      const result = await deliveryClient.searchDeliveries(searchParams);
      setDeliveries(result);
      // Không auto chọn first item, giữ trải nghiệm giống các list page khác
      setSelected(null);
      if (result.length === 0) {
        showError("Không có giao hàng nào phù hợp điều kiện");
      } else {
        showSuccess(`Tìm thấy ${result.length} giao hàng`);
      }
    } catch (error) {
      console.error(error);
      showError("Tìm kiếm giao hàng thất bại");
    } finally {
      setLoading(false);
    }
  };

  const handleGetByDeliveryId = async () => {
    const deliveryId = deliveryIdQuery.trim();
    if (!deliveryId) { showError("Vui lòng nhập Delivery ID"); return; }

    setLoading(true);
    try {
      const result = await deliveryClient.getDeliveryById(deliveryId);
      if (!result) { setDeliveries([]); setSelected(null); showError("Không tìm thấy Delivery theo ID"); return; }
      setDeliveries([result]);
      setSelected(result);
      showSuccess("Đã tải thông tin Delivery theo ID");
    } catch (error) {
      console.error(error);
      showError("Lấy Delivery theo ID thất bại");
    } finally {
      setLoading(false);
    }
  };

  const handlePickup = async (item: DeliveryData) => {
    const id = deliveryIdOf(item);
    if (!id) { showError("Delivery ID không hợp lệ"); return; }

    if (String(item.status ?? "").toUpperCase().includes("COMPLETE")) {
      showError("Delivery đã hoàn thành, không thể chuyển sang Pickup");
      return;
    }

    const confirm = await showConfirm({
      title: "Xác nhận Pickup",
      message: `Bạn có chắc muốn chuyển trạng thái giao hàng ${id} sang PICKUP?`,
      confirmText: "Pickup",
      variant: "info",
    });
    if (!confirm) return;

    setMutating({ deliveryId: id, action: "pickup" });
    try {
      const result = await deliveryClient.changeStatusPickup(id);
      if (result) {
        upsertDelivery(result);
        showSuccess("Đã chuyển trạng thái giao hàng sang Pickup");
      } else {
        showError("Cập nhật trạng thái Pickup thất bại");
      }
    } catch (error) {
      console.error(error);
      showError("API Pickup thất bại");
    } finally {
      setMutating(null);
    }
  };

  const handleComplete = async (item: DeliveryData) => {
    const id = deliveryIdOf(item);
    if (!id) { showError("Delivery ID không hợp lệ"); return; }

    if (String(item.status ?? "").toUpperCase().includes("COMPLET")) {
      showError("Delivery đã hoàn thành");
      return;
    }

    const confirm = await showConfirm({
      title: "Xác nhận hoàn thành",
      message: `Bạn có chắc muốn chuyển trạng thái giao hàng ${id} sang COMPLETED?`,
      confirmText: "Hoàn thành",
      variant: "info",
    });
    if (!confirm) return;

    setMutating({ deliveryId: id, action: "complete" });
    try {
      const result = await deliveryClient.changeStatusComplete(id);
      if (result) {
        upsertDelivery(result);
        showSuccess("Đã hoàn thành giao hàng");
      } else {
        showError("Cập nhật trạng thái Complete thất bại");
      }
    } catch (error) {
      console.error(error);
      showError("API Complete thất bại");
    } finally {
      setMutating(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(deliveries.length / ITEMS_PER_PAGE));
  const [page, setPage] = useState(1);
  const paginatedDeliveries = deliveries.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Quản lý Delivery</h1>
          <p className="text-xs sm:text-sm text-slate-600">Sử dụng các API Delivery để tra cứu và cập nhật trạng thái.</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700">Order ID</label>
            <input
              value={orderIdQuery}
              onChange={(e) => setOrderIdQuery(e.target.value)}
              placeholder="Nhập order ID"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-primary-500/20"
            />
          </div>
          <div className="flex items-end">
            <Button onClick={handleGetByOrderId} loading={loading} size="sm">
              API: Get by OrderId
            </Button>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700">Delivery ID</label>
            <input
              value={deliveryIdQuery}
              onChange={(e) => setDeliveryIdQuery(e.target.value)}
              placeholder="Nhập delivery ID"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-primary-500/20"
            />
          </div>
          <div className="flex items-end">
            <Button onClick={handleGetByDeliveryId} loading={loading} size="sm">
              API: Get by DeliveryId
            </Button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700">Franchise</label>
            <GlassSelect
              value={franchiseId}
              onChange={(value) => setFranchiseId(value)}
              options={[
                { value: "", label: "-- Tất cả franchise --" },
                ...franchiseOptions.map((f) => ({ value: f.value, label: `${f.name} (${f.code})` })),
              ]}
              className="mt-1"
            />
            <p className="mt-1 text-xs text-slate-500">Chọn franchise trước khi lọc Staff/Customer/Status</p>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700">Staff ID</label>
            <input
              value={staffId}
              onChange={(e) => setStaffId(e.target.value)}
              placeholder="staff_id"
              disabled={!canEditConditionFilters}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-primary-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700">Customer ID</label>
            <input
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              placeholder="customer_id"
              disabled={!canEditConditionFilters}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-primary-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700">Status</label>
            <GlassSelect
              value={status}
              onChange={(v) => setStatus(v)}
              options={[{ value: "", label: "Tất cả" }, ...STATUS_OPTIONS.map((s) => ({ value: s, label: s }))]}
              className="mt-1"
              disabled={!canEditConditionFilters}
            />
          </div>
          <div className="flex items-end">
            <Button onClick={handleSearch} loading={loading} size="sm" style={{ whiteSpace: "nowrap" }} disabled={!canEditConditionFilters}>
              API: Search Deliveries
            </Button>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-4 py-3">Delivery ID</th>
                <th className="px-4 py-3">Order ID</th>
                <th className="px-4 py-3">Franchise</th>
                <th className="px-4 py-3">Staff</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Updated At</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {paginatedDeliveries.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-slate-500">
                    {loading ? "Đang tải..." : "Chưa có dữ liệu"}
                  </td>
                </tr>
              ) : (
                paginatedDeliveries.map((item) => {
                  const id = deliveryIdOf(item);
                  const isRunning = mutating?.deliveryId === id;
                  return (
                    <tr key={id} className="hover:bg-slate-50 cursor-pointer" onClick={() => setSelected(item)}>
                      <td className="px-4 py-3 font-medium text-primary-600">{id || "—"}</td>
                      <td className="px-4 py-3">{safeStr(item.order_id)}</td>
                      <td className="px-4 py-3">{safeStr(item.franchise_id)}</td>
                      <td className="px-4 py-3">{safeStr(item.staff_id)}</td>
                      <td className="px-4 py-3">{safeStr(item.customer_id)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full border px-2 py-1 text-xs font-semibold ${getStatusBadgeClass(item.status)}`}>
                          {safeStr(item.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3">{item.updated_at ? new Date(item.updated_at).toLocaleString() : "—"}</td>
                      <td className="px-4 py-3 space-x-1">
                        <Button
                          size="sm"
                          variant="outline"
                          loading={isRunning && mutating?.action === "pickup"}
                          onClick={() => handlePickup(item)}
                        >
                          Pickup
                        </Button>
                        <Button
                          size="sm"
                          variant="primary"
                          loading={isRunning && mutating?.action === "complete"}
                          onClick={() => handleComplete(item)}
                        >
                          Complete
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">Trang {page} / {totalPages}</p>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
            Trước
          </Button>
          <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
            Sau
          </Button>
        </div>
      </div>

      {selected && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-800">Delivery chi tiết</h3>
          <pre className="mt-2 overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
            {JSON.stringify(selected, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

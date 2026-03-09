import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "../../../components";
import Pagination from "../../../components/ui/Pagination";
import { adminInventoryService } from "../../../services/inventory.service";
import { fetchFranchiseSelect } from "../../../services/store.service";
import type { FranchiseSelectItem } from "../../../services/store.service";
import type { InventoryApiResponse, AdjustInventoryDto } from "../../../models/inventory.model";
import { showSuccess, showError } from "../../../utils";

const ITEMS_PER_PAGE = 10;

export default function InventoryListPage() {
  const [items, setItems] = useState<InventoryApiResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Filters
  const [searchFranchise, setSearchFranchise] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [isDeletedFilter, setIsDeletedFilter] = useState(false);

  // Franchise options
  const [franchiseOptions, setFranchiseOptions] = useState<FranchiseSelectItem[]>([]);

  // Adjust modal
  const [adjustTarget, setAdjustTarget] = useState<InventoryApiResponse | null>(null);
  const [adjustForm, setAdjustForm] = useState<{ change: string; reason: string }>({ change: "", reason: "" });
  const [adjusting, setAdjusting] = useState(false);

  // Detail modal
  const [viewingItem, setViewingItem] = useState<InventoryApiResponse | null>(null);
  const hasRun = useRef(false);

  const loadFranchises = async () => {
    try {
      const data = await fetchFranchiseSelect();
      setFranchiseOptions(data);
    } catch {
      // silent
    }
  };

  const load = useCallback(
    async (
      franchiseId = searchFranchise,
      page = currentPage,
      status = statusFilter,
      isDeleted = isDeletedFilter,
    ) => {
      setLoading(true);
      try {
        const isActive = status === "true" ? true : status === "false" ? false : "";
        const result = await adminInventoryService.searchInventories({
          searchCondition: {
            franchise_id: franchiseId || undefined,
            is_active: isActive === "" ? undefined : isActive,
            is_deleted: isDeleted,
          },
          pageInfo: { pageNum: page, pageSize: ITEMS_PER_PAGE },
        });
        setItems(result.data);
        setTotalPages(result.pageInfo.totalPages);
        setTotalItems(result.pageInfo.totalItems);
        setCurrentPage(result.pageInfo.pageNum);
      } catch {
        showError("Lấy danh sách tồn kho thất bại");
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;
    load("", 1, "", false);
    loadFranchises();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleSearch = () => {
    setCurrentPage(1);
    load(searchFranchise, 1, statusFilter, isDeletedFilter);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    load(searchFranchise, page, statusFilter, isDeletedFilter);
  };

  const handleResetFilters = () => {
    setSearchFranchise("");
    setStatusFilter("");
    setIsDeletedFilter(false);
    setCurrentPage(1);
    load("", 1, "", false);
  };

  const handleOpenAdjust = (item: InventoryApiResponse) => {
    setAdjustTarget(item);
    setAdjustForm({ change: "", reason: "" });
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustTarget) return;
    const changeNum = Number(adjustForm.change);
    if (isNaN(changeNum) || changeNum === 0) {
      showError("Vui lòng nhập số thay đổi hợp lệ (khác 0)");
      return;
    }
    setAdjusting(true);
    try {
      const dto: AdjustInventoryDto = {
        product_franchise_id: adjustTarget.product_franchise_id,
        change: changeNum,
        reason: adjustForm.reason || "Manual adjustment",
      };
      await adminInventoryService.adjustInventory(dto);
      showSuccess("Điều chỉnh tồn kho thành công");
      setAdjustTarget(null);
      await load(searchFranchise, currentPage, statusFilter, isDeletedFilter);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err instanceof Error ? err.message : null) ||
        "Điều chỉnh thất bại";
      showError(msg);
    } finally {
      setAdjusting(false);
    }
  };

  const handleDelete = async (item: InventoryApiResponse) => {
    if (!confirm(`Bạn có chắc muốn xóa inventory của "${item.product_name ?? item.product_id}"?`)) return;
    try {
      await adminInventoryService.deleteInventory(item.id);
      showSuccess("Đã xóa inventory");
      await load(searchFranchise, currentPage, statusFilter, isDeletedFilter);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err instanceof Error ? err.message : null) ||
        "Xóa thất bại";
      showError(msg);
    }
  };

  const handleRestore = async (item: InventoryApiResponse) => {
    if (!confirm(`Bạn có chắc muốn khôi phục inventory của "${item.product_name ?? item.product_id}"?`)) return;
    try {
      await adminInventoryService.restoreInventory(item.id);
      showSuccess("Đã khôi phục inventory");
      await load(searchFranchise, currentPage, statusFilter, isDeletedFilter);
    } catch {
      showError("Khôi phục thất bại");
    }
  };

  const isLow = (item: InventoryApiResponse) => item.quantity <= item.alert_threshold;

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Inventory Management</h1>
          <p className="text-xs sm:text-sm text-slate-600">
            Quản lý tồn kho toàn hệ thống
            {totalItems > 0 && (
              <span className="ml-2 inline-flex items-center rounded-full bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-700">
                {totalItems} bản ghi
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap gap-3">
          {/* Franchise filter */}
          <select
            value={searchFranchise}
            onChange={(e) => setSearchFranchise(e.target.value)}
            className="min-w-[180px] flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
          >
            <option value="">Tất cả franchise</option>
            {franchiseOptions.map((f) => (
              <option key={f.value} value={f.value}>{f.name}</option>
            ))}
          </select>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>

          {/* Is deleted filter */}
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50">
            <input
              type="checkbox"
              checked={isDeletedFilter}
              onChange={(e) => setIsDeletedFilter(e.target.checked)}
              className="accent-primary-500"
            />
            <span className="text-slate-700">Đã xóa</span>
          </label>

          <Button onClick={handleSearch} loading={loading}>
            Tìm kiếm
          </Button>
          <button
            onClick={handleResetFilters}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 transition hover:bg-slate-100"
          >
            Đặt lại
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-4 py-3">Sản phẩm</th>
                <th className="px-4 py-3">Franchise</th>
                <th className="px-4 py-3 text-right">Tồn kho</th>
                <th className="px-4 py-3 text-right">Ngưỡng cảnh báo</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3">Cập nhật</th>
                <th className="px-4 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {items.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-sm text-slate-500">
                    Không có dữ liệu tồn kho
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td colSpan={7}>
                    <div className="flex justify-center items-center py-20">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
                    </div>
                  </td>
                </tr>
              )}
              {!loading && items.map((item) => {
                const low = isLow(item);
                return (
                  <tr
                    key={item.id}
                    className={`transition-colors ${item.is_deleted ? "opacity-60" : ""} ${low && !item.is_deleted ? "bg-amber-50/50 hover:bg-amber-50" : "hover:bg-slate-50"}`}
                  >
                    <td className="px-4 py-3">
                      <div className="leading-tight">
                        <p className="font-semibold text-slate-900">{item.product_name ?? "—"}</p>
                        <p className="text-xs text-slate-400 font-mono">{item.product_id}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                        {item.franchise_name ?? item.franchise_id}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-semibold tabular-nums ${low && !item.is_deleted ? "text-amber-600" : "text-slate-800"}`}>
                        {item.quantity.toLocaleString()}
                      </span>
                      {low && !item.is_deleted && (
                        <span className="ml-1.5 inline-flex items-center rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                          ⚠ Thấp
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-600">
                      {item.alert_threshold.toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      {item.is_deleted ? (
                        <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">Đã xóa</span>
                      ) : item.is_active ? (
                        <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">Active</span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-700">Inactive</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {new Date(item.updated_at).toLocaleString("vi-VN")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {/* View */}
                        <button
                          onClick={() => setViewingItem(item)}
                          className="inline-flex items-center justify-center size-8 rounded-lg border border-slate-200 bg-white text-slate-500 hover:border-primary-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                          title="Xem chi tiết"
                        >
                          <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        {/* Adjust */}
                        {!item.is_deleted && (
                          <button
                            onClick={() => handleOpenAdjust(item)}
                            className="inline-flex items-center justify-center size-8 rounded-lg border border-blue-200 bg-white text-blue-500 hover:border-blue-400 hover:bg-blue-50 transition-colors"
                            title="Điều chỉnh tồn kho"
                          >
                            <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                          </button>
                        )}
                        {/* Delete / Restore */}
                        {item.is_deleted ? (
                          <button
                            onClick={() => handleRestore(item)}
                            className="inline-flex items-center justify-center size-8 rounded-lg border border-green-200 bg-white text-green-500 hover:border-green-400 hover:bg-green-50 transition-colors"
                            title="Khôi phục"
                          >
                            <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleDelete(item)}
                            className="inline-flex items-center justify-center size-8 rounded-lg border border-red-200 bg-white text-red-500 hover:border-red-400 hover:bg-red-50 transition-colors disabled:opacity-50"
                            title="Xóa"
                          >
                            <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-4">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            totalItems={totalItems}
            itemsPerPage={ITEMS_PER_PAGE}
          />
        </div>
      </div>

      {/* ─── Adjust Modal ────────────────────────────────────────────────────── */}
      {adjustTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-slate-900">Điều chỉnh tồn kho</h2>
              <button
                onClick={() => setAdjustTarget(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleAdjustSubmit} className="space-y-4 px-6 py-5">
              {/* Info */}
              <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm">
                <p className="font-semibold text-slate-800">{adjustTarget.product_name ?? adjustTarget.product_id}</p>
                <p className="text-xs text-slate-500 mt-0.5">{adjustTarget.franchise_name ?? adjustTarget.franchise_id}</p>
                <p className="mt-1.5 text-slate-700">
                  Tồn hiện tại: <span className="font-bold text-slate-900">{adjustTarget.quantity.toLocaleString()}</span>
                </p>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Số thay đổi <span className="text-red-500">*</span>
                  <span className="ml-1 text-xs font-normal text-slate-400">(dương = nhập thêm, âm = xuất bớt)</span>
                </label>
                <input
                  type="number"
                  placeholder="VD: 50 hoặc -10"
                  value={adjustForm.change}
                  onChange={(e) => setAdjustForm((f) => ({ ...f, change: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                  required
                />
                {adjustForm.change !== "" && !isNaN(Number(adjustForm.change)) && (
                  <p className="mt-1 text-xs text-slate-500">
                    Sau điều chỉnh:{" "}
                    <span className="font-semibold text-slate-800">
                      {(adjustTarget.quantity + Number(adjustForm.change)).toLocaleString()}
                    </span>
                  </p>
                )}
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Lý do</label>
                <input
                  type="text"
                  placeholder="VD: Nhập hàng, kiểm kê..."
                  value={adjustForm.reason}
                  onChange={(e) => setAdjustForm((f) => ({ ...f, reason: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setAdjustTarget(null)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Hủy
                </button>
                <Button type="submit" loading={adjusting}>
                  Xác nhận
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── View Detail Modal ───────────────────────────────────────────────── */}
      {viewingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-slate-900">Chi tiết tồn kho</h2>
              <button
                onClick={() => setViewingItem(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-4 px-6 py-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Sản phẩm</p>
                  <p className="mt-1 font-semibold text-slate-800">{viewingItem.product_name ?? "—"}</p>
                  <p className="text-xs font-mono text-slate-400">{viewingItem.product_id}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Franchise</p>
                  <p className="mt-1 text-slate-800">{viewingItem.franchise_name ?? viewingItem.franchise_id}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Tồn kho</p>
                  <p className={`mt-1 text-2xl font-bold tabular-nums ${isLow(viewingItem) && !viewingItem.is_deleted ? "text-amber-600" : "text-slate-900"}`}>
                    {viewingItem.quantity.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Ngưỡng cảnh báo</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-slate-500">
                    {viewingItem.alert_threshold.toLocaleString()}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Trạng thái</p>
                <div className="mt-1">
                  {viewingItem.is_deleted ? (
                    <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">Đã xóa</span>
                  ) : viewingItem.is_active ? (
                    <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">Active</span>
                  ) : (
                    <span className="rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-700">Inactive</span>
                  )}
                  {isLow(viewingItem) && !viewingItem.is_deleted && (
                    <span className="ml-2 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">⚠ Tồn thấp</span>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Ngày tạo</p>
                  <p className="mt-1 text-sm text-slate-700">{new Date(viewingItem.created_at).toLocaleString("vi-VN")}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Cập nhật lúc</p>
                  <p className="mt-1 text-sm text-slate-700">{new Date(viewingItem.updated_at).toLocaleString("vi-VN")}</p>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                {!viewingItem.is_deleted && (
                  <button
                    onClick={() => { setViewingItem(null); handleOpenAdjust(viewingItem); }}
                    className="rounded-lg border border-blue-300 px-4 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-50"
                  >
                    Điều chỉnh
                  </button>
                )}
                <button
                  onClick={() => setViewingItem(null)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

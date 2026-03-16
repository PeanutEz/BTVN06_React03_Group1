import { useEffect, useRef, useState, useCallback } from "react";
import { Button, GlassSelect, useConfirm } from "../../../components";
import Pagination from "../../../components/ui/Pagination";
import { adminInventoryService } from "../../../services/inventory.service";
import { adminProductFranchiseService } from "../../../services/product-franchise.service";
import { adminProductService } from "../../../services/product.service";
import { fetchFranchiseSelect } from "../../../services/store.service";
import type { FranchiseSelectItem } from "../../../services/store.service";
import type {
  InventoryApiResponse,
  AdjustInventoryDto,
  CreateInventoryDto,
  InventoryLog,
} from "../../../models/inventory.model";
import type { ProductFranchiseApiResponse } from "../../../models/product.model";
import { showSuccess, showError } from "../../../utils";

const ITEMS_PER_PAGE = 10;

export default function InventoryListPage() {
  const showConfirm = useConfirm();
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
  const [franchiseOptions, setFranchiseOptions] = useState<
    FranchiseSelectItem[]
  >([]);

  // Adjust modal
  const [adjustTarget, setAdjustTarget] = useState<InventoryApiResponse | null>(
    null,
  );
  const [adjustForm, setAdjustForm] = useState<{
    change: string;
    reason: string;
  }>({ change: "", reason: "" });
  const [adjusting, setAdjusting] = useState(false);  // ─── Batch inline edit (quantity + alert_threshold) ──────────────────────
  // pendingEdits: { [inventoryId]: { quantity?: string; alert_threshold?: string } }
  const [pendingEdits, setPendingEdits] = useState<
    Record<string, { quantity?: string; alert_threshold?: string }>
  >({});
  const [batchSaving, setBatchSaving] = useState(false);

  // Detail modal
  const [viewingItem, setViewingItem] = useState<InventoryApiResponse | null>(
    null,
  );

  // ─── Create modal (INVENTORY-01) ──────────────────────────────────────────
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<{
    product_franchise_id: string;
    quantity: string;
    alert_threshold: string;
  }>({ product_franchise_id: "", quantity: "", alert_threshold: "" });
  const [creating, setCreating] = useState(false);
  const [pfOptions, setPfOptions] = useState<ProductFranchiseApiResponse[]>([]);
  const [productNameMap, setProductNameMap] = useState<Record<string, string>>(
    {},
  );

  // ─── Logs modal (INVENTORY-08) ────────────────────────────────────────────
  const [logsItem, setLogsItem] = useState<InventoryApiResponse | null>(null);
  const [logs, setLogs] = useState<InventoryLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // ─── Combobox — franchise filter bar ─────────────────────────────────────
  const [franchiseKeyword, setFranchiseKeyword] = useState("");
  const [franchiseComboOpen, setFranchiseComboOpen] = useState(false);
  const franchiseComboRef = useRef<HTMLDivElement>(null);

  // ─── Combobox — product franchise in Create modal ─────────────────────────
  const [pfKeyword, setPfKeyword] = useState("");
  const [pfComboOpen, setPfComboOpen] = useState(false);
  const pfComboRef = useRef<HTMLDivElement>(null);

  const hasRun = useRef(false);
  const isInitialized = useRef(false);

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
        const isActive =
          status === "true" ? true : status === "false" ? false : "";
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
    load("", 1, "", false).finally(() => {
      isInitialized.current = true;
    });
    loadFranchises();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isInitialized.current) return;
    setCurrentPage(1);
    load(searchFranchise, 1, statusFilter, isDeletedFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchFranchise, statusFilter, isDeletedFilter]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        franchiseComboRef.current &&
        !franchiseComboRef.current.contains(e.target as Node)
      ) {
        setFranchiseComboOpen(false);
      }
      if (
        pfComboRef.current &&
        !pfComboRef.current.contains(e.target as Node)
      ) {
        setPfComboOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handlePageChange = (page: number) => {
    setPendingEdits({});
    setCurrentPage(page);
    load(searchFranchise, page, statusFilter, isDeletedFilter);
  };

  const handleResetFilters = () => {
    setPendingEdits({});
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

  // ─── Batch edit handlers ──────────────────────────────────────────────────
  const handlePendingChange = (
    id: string,
    field: "quantity" | "alert_threshold",
    value: string,
  ) => {
    setPendingEdits((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  };

  const handleDiscardEdits = () => {
    setPendingEdits({});
  };

  const handleBatchSave = async () => {
    const entries = Object.entries(pendingEdits);
    if (entries.length === 0) return;

    setBatchSaving(true);
    let successCount = 0;
    let errorCount = 0;

    await Promise.allSettled(
      entries.map(async ([id, edit]) => {
        const original = items.find((i) => i.id === id);
        if (!original) return;

        const newQty =
          edit.quantity !== undefined
            ? Number(edit.quantity)
            : original.quantity;
        const newThreshold =
          edit.alert_threshold !== undefined
            ? Number(edit.alert_threshold)
            : original.alert_threshold;

        if (isNaN(newQty) || newQty < 0 || isNaN(newThreshold) || newThreshold < 0) {
          errorCount++;
          return;
        }

        const change = newQty - original.quantity;
        const thresholdChanged = newThreshold !== original.alert_threshold;

        if (change === 0 && !thresholdChanged) return;

        try {
          const freshItem = await adminInventoryService.getInventoryById(id);
          const dto: AdjustInventoryDto = {
            product_franchise_id: freshItem.product_franchise_id,
            change,
            alert_threshold: newThreshold,
            reason: "",
          };
          await adminInventoryService.adjustInventory(dto);
          successCount++;
        } catch {
          errorCount++;
        }
      }),
    );

    setBatchSaving(false);
    setPendingEdits({});

    if (successCount > 0)
      showSuccess(`Đã lưu ${successCount} thay đổi thành công`);
    if (errorCount > 0) showError(`${errorCount} thay đổi thất bại`);

    await load(searchFranchise, currentPage, statusFilter, isDeletedFilter);
  };

  const hasPendingEdits = Object.keys(pendingEdits).length > 0;

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
      // Fetch fresh item to get product_franchise_id (search endpoint may not include it)
      const freshItem = await adminInventoryService.getInventoryById(
        adjustTarget.id,
      );
      const dto: AdjustInventoryDto = {
        product_franchise_id: freshItem.product_franchise_id,
        change: changeNum,
        alert_threshold: freshItem.alert_threshold,
        reason: adjustForm.reason || "",
      };
      await adminInventoryService.adjustInventory(dto);
      showSuccess("Điều chỉnh tồn kho thành công");
      setAdjustTarget(null);
      await load(searchFranchise, currentPage, statusFilter, isDeletedFilter);
    } catch (err: unknown) {
      const errData = (err as { response?: { data?: Record<string, unknown> } })
        ?.response?.data;
      console.error("[Adjust] API error:", errData);
      const msg =
        (errData as { message?: string })?.message ||
        (err instanceof Error ? err.message : null) ||
        "Điều chỉnh thất bại";
      showError(msg);
    } finally {
      setAdjusting(false);
    }
  };

  const handleDelete = async (item: InventoryApiResponse) => {
    if (
      !await showConfirm({ message: `Bạn có chắc muốn xóa inventory của "${item.product_name ?? item.product_id}"?`, variant: "danger" })
    )
      return;
    try {
      await adminInventoryService.deleteInventory(item.id);
      showSuccess("Đã xóa inventory");
      const nextPage = items.length <= 1 && currentPage > 1 ? currentPage - 1 : currentPage;
      setCurrentPage(nextPage);
      await load(searchFranchise, nextPage, statusFilter, isDeletedFilter);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ||
        (err instanceof Error ? err.message : null) ||
        "Xóa thất bại";
      showError(msg);
    }
  };

  const handleRestore = async (item: InventoryApiResponse) => {
    if (
      !await showConfirm({ message: `Bạn có chắc muốn khôi phục inventory của "${item.product_name ?? item.product_id}"?`, variant: "warning" })
    )
      return;
    try {
      await adminInventoryService.restoreInventory(item.id);
      showSuccess("Đã khôi phục inventory");
      await load(searchFranchise, currentPage, statusFilter, isDeletedFilter);
    } catch {
      showError("Khôi phục thất bại");
    }
  };

  // ─── Create handlers (INVENTORY-01) ───────────────────────────────────────
  const handleOpenCreate = async () => {
    setCreateForm({
      product_franchise_id: "",
      quantity: "",
      alert_threshold: "",
    });
    setCreateOpen(true);
    try {
      const [pfResult, productResult] = await Promise.all([
        adminProductFranchiseService.searchProductFranchises({
          searchCondition: { is_deleted: false, is_active: true },
          pageInfo: { pageNum: 1, pageSize: 200 },
        }),
        adminProductService.searchProducts({
          searchCondition: { is_deleted: false },
          pageInfo: { pageNum: 1, pageSize: 200 },
        }),
      ]);
      setPfOptions(pfResult.data);
      // Build map: product_id → product name
      const nameMap: Record<string, string> = {};
      for (const p of productResult.data) {
        nameMap[p.id] = p.name;
      }
      setProductNameMap(nameMap);
    } catch {
      setPfOptions([]);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = Number(createForm.quantity);
    const thresh = Number(createForm.alert_threshold);
    if (
      !createForm.product_franchise_id ||
      isNaN(qty) ||
      qty < 0 ||
      isNaN(thresh) ||
      thresh < 0
    ) {
      showError("Vui lòng điền đầy đủ thông tin hợp lệ");
      return;
    }
    setCreating(true);
    try {
      const dto: CreateInventoryDto = {
        product_franchise_id: createForm.product_franchise_id,
        quantity: qty,
        alert_threshold: thresh,
      };
      await adminInventoryService.createInventory(dto);
      showSuccess("Tạo inventory thành công");
      setCreateOpen(false);
      load(searchFranchise, 1, statusFilter, isDeletedFilter);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ||
        (err instanceof Error ? err.message : null) ||
        "Tạo thất bại";
      showError(msg);
    } finally {
      setCreating(false);
    }
  };

  // ─── Logs handler (INVENTORY-08) ──────────────────────────────────────────
  const handleOpenLogs = async (item: InventoryApiResponse) => {
    setLogsItem(item);
    setLogs([]);
    setLogsLoading(true);
    try {
      const data = await adminInventoryService.getInventoryLogs(item.id);
      setLogs(data);
    } catch {
      showError("Lấy lịch sử thất bại");
    } finally {
      setLogsLoading(false);
    }
  };

  const isLow = (item: InventoryApiResponse) =>
    item.quantity <= item.alert_threshold;

  const filteredFranchiseOptions = franchiseOptions.filter((f) =>
    f.name.toLowerCase().includes(franchiseKeyword.toLowerCase()),
  );

  const filteredPfOptions = pfOptions.filter((pf) =>
    `${productNameMap[pf.product_id] ?? ""} ${pf.size}`
      .toLowerCase()
      .includes(pfKeyword.toLowerCase()),
  );

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
            Inventory Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-600">
            Quản lý tồn kho toàn hệ thống
            {totalItems > 0 && (
              <span className="ml-2 inline-flex items-center rounded-full bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-700">
                {totalItems} bản ghi
              </span>
            )}
          </p>
        </div>
        <Button onClick={handleOpenCreate}>+ Thêm mới</Button>
      </div>

      {/* Filter Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap gap-3">
          <div
            ref={franchiseComboRef}
            className="relative min-w-[180px] flex-1"
          >
            <input
              type="text"
              placeholder="Tìm franchise..."
              value={franchiseKeyword}
              onChange={(e) => {
                setFranchiseKeyword(e.target.value);
                setSearchFranchise("");
                setFranchiseComboOpen(true);
              }}
              onFocus={() => setFranchiseComboOpen(true)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
            />
            {searchFranchise && (
              <span className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 rounded-full bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-700">
                {
                  franchiseOptions.find((f) => f.value === searchFranchise)
                    ?.name
                }
                <button
                  type="button"
                  onClick={() => {
                    setSearchFranchise("");
                    setFranchiseKeyword("");
                  }}
                  className="ml-0.5 text-primary-500 hover:text-primary-800"
                >
                  ✕
                </button>
              </span>
            )}
            {franchiseComboOpen && (
              <div className="absolute z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                <div
                  className="cursor-pointer px-3 py-2 text-sm text-slate-400 hover:bg-slate-50"
                  onMouseDown={() => {
                    setSearchFranchise("");
                    setFranchiseKeyword("");
                    setFranchiseComboOpen(false);
                  }}
                >
                  Tất cả franchise
                </div>
                {filteredFranchiseOptions.length === 0 && (
                  <p className="px-3 py-2 text-sm text-slate-400">
                    Không tìm thấy
                  </p>
                )}
                {filteredFranchiseOptions.map((f) => (
                  <div
                    key={f.value}
                    onMouseDown={() => {
                      setSearchFranchise(f.value);
                      setFranchiseKeyword(f.name);
                      setFranchiseComboOpen(false);
                    }}
                    className={`cursor-pointer px-3 py-2 text-sm hover:bg-primary-50 hover:text-primary-700 ${
                      searchFranchise === f.value
                        ? "bg-primary-50 font-medium text-primary-700"
                        : "text-slate-700"
                    }`}
                  >
                    {f.name}
                  </div>
                ))}
              </div>
            )}
          </div>
          <GlassSelect
            value={statusFilter}
            onChange={(v) => setStatusFilter(v)}
            options={[
              { value: "", label: "Tất cả trạng thái" },
              { value: "true", label: "Active" },
              { value: "false", label: "Inactive" },
            ]}
          />
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50">
            <input
              type="checkbox"
              checked={isDeletedFilter}
              onChange={(e) => setIsDeletedFilter(e.target.checked)}
              className="accent-primary-500"
            />
            <span className="text-slate-700">Đã xóa</span>
          </label>
          <button
            onClick={handleResetFilters}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 transition hover:bg-slate-100"
          >
            Đặt lại
          </button>
        </div>
      </div>

      {/* ─── Batch Save Bar ─── */}
      {hasPendingEdits && (
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-primary-200 bg-primary-50 px-5 py-3 shadow-sm animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2 text-sm text-primary-800">
            <svg className="size-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <span className="font-medium">
              {Object.keys(pendingEdits).length} dòng có thay đổi chưa lưu
            </span>
            <span className="text-primary-600 text-xs">— Nhấn Lưu để áp dụng tất cả</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDiscardEdits}
              disabled={batchSaving}
              className="rounded-lg border border-slate-300 bg-white px-4 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              onClick={handleBatchSave}
              disabled={batchSaving}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700 disabled:opacity-60"
            >
              {batchSaving ? (
                <>
                  <svg className="animate-spin size-3.5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Đang lưu...
                </>
              ) : (
                <>
                  <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  Lưu tất cả
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-4 py-3">Sản phẩm</th>
                <th className="px-4 py-3">Franchise</th>                <th className="px-3 py-3 text-right">Tồn kho</th>
                <th className="px-3 py-3 text-right">Ngưỡng cảnh báo</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3">Cập nhật</th>
                <th className="px-4 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {items.length === 0 && !loading && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-6 text-center text-sm text-slate-500"
                  >
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
              {!loading &&
                items.map((item) => {
                  const low = isLow(item);
                  return (
                    <tr
                      key={item.id}
                      className={`transition-colors ${item.is_deleted ? "opacity-60" : ""} ${low && !item.is_deleted ? "bg-amber-50/50 hover:bg-amber-50" : "hover:bg-slate-50"}`}
                    >
                      <td className="px-4 py-3">
                        <div className="leading-tight">
                          <p className="font-semibold text-slate-900">
                            {item.product_name ?? "—"}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                          {item.franchise_name ?? "N/A"}
                        </span>                      </td>                      {/* ── Cột Tồn kho — batch inline input ── */}
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-end gap-1.5">
                          {low && !item.is_deleted && (
                            <span className="inline-flex items-center rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 whitespace-nowrap">
                              ⚠ Thấp
                            </span>
                          )}
                          <input
                            type="number"
                            min={0}
                            disabled={item.is_deleted || batchSaving}
                            value={
                              pendingEdits[item.id]?.quantity !== undefined
                                ? pendingEdits[item.id].quantity
                                : item.quantity
                            }
                            onChange={(e) =>
                              handlePendingChange(item.id, "quantity", e.target.value)
                            }
                            className={`w-20 rounded-lg border px-2 py-1.5 text-right text-sm tabular-nums font-semibold outline-none transition-all
                              ${item.is_deleted
                                ? "cursor-not-allowed bg-slate-50 text-slate-400 border-slate-200"
                                : pendingEdits[item.id]?.quantity !== undefined
                                  ? "border-primary-500 bg-primary-50 text-primary-800 ring-2 ring-primary-500/20 shadow-sm"
                                  : low
                                    ? "border-amber-300 bg-amber-50 text-amber-700 hover:border-primary-400"
                                    : "border-slate-300 bg-white text-slate-800 hover:border-primary-400"
                              }
                            `}
                          />
                        </div>
                      </td>
                      {/* ── Cột Ngưỡng cảnh báo — batch inline input ── */}
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-end">
                          <input
                            type="number"
                            min={0}
                            disabled={item.is_deleted || batchSaving}
                            value={
                              pendingEdits[item.id]?.alert_threshold !== undefined
                                ? pendingEdits[item.id].alert_threshold
                                : item.alert_threshold
                            }
                            onChange={(e) =>
                              handlePendingChange(item.id, "alert_threshold", e.target.value)
                            }
                            className={`w-20 rounded-lg border px-2 py-1.5 text-right text-sm tabular-nums outline-none transition-all
                              ${item.is_deleted
                                ? "cursor-not-allowed bg-slate-50 text-slate-400 border-slate-200"
                                : pendingEdits[item.id]?.alert_threshold !== undefined
                                  ? "border-orange-500 bg-orange-50 text-orange-800 ring-2 ring-orange-500/20 shadow-sm"
                                  : "border-slate-300 bg-white text-slate-600 hover:border-orange-400"
                              }
                            `}
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {item.is_deleted ? (
                          <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
                            Đã xóa
                          </span>
                        ) : item.is_active ? (
                          <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-700">
                            Inactive
                          </span>
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
                            <svg
                              className="size-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                              />
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                              />
                            </svg>
                          </button>
                          {/* Logs (INVENTORY-08) */}
                          <button
                            onClick={() => handleOpenLogs(item)}
                            className="inline-flex items-center justify-center size-8 rounded-lg border border-purple-200 bg-white text-purple-500 hover:border-purple-400 hover:bg-purple-50 transition-colors"
                            title="Xem lịch sử"
                          >
                            <svg
                              className="size-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                              />
                            </svg>
                          </button>

                          {/* Delete / Restore */}
                          {item.is_deleted ? (
                            <button
                              onClick={() => handleRestore(item)}
                              className="inline-flex items-center justify-center size-8 rounded-lg border border-green-200 bg-white text-green-500 hover:border-green-400 hover:bg-green-50 transition-colors"
                              title="Khôi phục"
                            >
                              <svg
                                className="size-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                />
                              </svg>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleDelete(item)}
                              className="inline-flex items-center justify-center size-8 rounded-lg border border-red-200 bg-white text-red-500 hover:border-red-400 hover:bg-red-50 transition-colors"
                              title="Xóa"
                            >
                              <svg
                                className="size-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
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

      {/* ─── Create Modal (INVENTORY-01) ─────────────────────────────────────── */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/25" />
          <div className="relative w-full max-w-md rounded-2xl shadow-2xl" style={{
            background: "rgba(255, 255, 255, 0.12)",
            backdropFilter: "blur(40px) saturate(200%)",
            WebkitBackdropFilter: "blur(40px) saturate(200%)",
            border: "1px solid rgba(255, 255, 255, 0.25)",
            boxShadow: "0 25px 60px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)",
          }}>
            <div className="flex items-center justify-between border-b border-white/[0.12] px-6 py-4">
              <h2 className="text-lg font-semibold text-white/95">
                Thêm inventory mới
              </h2>
              <button
                onClick={() => setCreateOpen(false)}
                className="rounded-lg p-1.5 text-white/40 hover:bg-white/[0.1] hover:text-white transition-colors"
              >
                <svg
                  className="size-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <form onSubmit={handleCreateSubmit} className="space-y-4 px-6 py-5">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-white/80">
                  Product Franchise <span className="text-red-500">*</span>
                </label>
                <div ref={pfComboRef} className="relative">
                  <input
                    type="text"
                    placeholder="Tìm tên sản phẩm, size..."
                    value={pfKeyword}
                    onChange={(e) => {
                      setPfKeyword(e.target.value);
                      setCreateForm((f) => ({
                        ...f,
                        product_franchise_id: "",
                      }));
                      setPfComboOpen(true);
                    }}
                    onFocus={() => setPfComboOpen(true)}
                    className="w-full rounded-lg border border-white/[0.15] bg-white/[0.08] text-white/90 placeholder-white/30 px-3 py-2 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                  />
                  {createForm.product_franchise_id &&
                    (() => {
                      const selected = pfOptions.find(
                        (p) => p.id === createForm.product_franchise_id,
                      );
                      return selected ? (
                        <div className="mt-1.5 flex items-center gap-2 rounded-lg bg-white/[0.06] px-3 py-1.5 text-xs text-primary-300">
                          <span className="font-medium">
                            {productNameMap[selected.product_id] ??
                              "N/A"}{" "}
                            | Size: {selected.size} |{" "}
                            {selected.price_base.toLocaleString()}đ
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setCreateForm((f) => ({
                                ...f,
                                product_franchise_id: "",
                              }));
                              setPfKeyword("");
                            }}
                            className="ml-auto text-primary-400 hover:text-primary-700"
                          >
                            ✕
                          </button>
                        </div>
                      ) : null;
                    })()}
                  {pfComboOpen && (
                    <div className="absolute z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-white/[0.12] bg-white/[0.08] shadow-lg" style={{ backdropFilter: "blur(40px)", WebkitBackdropFilter: "blur(40px)" }}>
                      {filteredPfOptions.length === 0 && (
                        <p className="px-3 py-2 text-sm text-white/40">
                          Không tìm thấy
                        </p>
                      )}
                      {filteredPfOptions.map((pf) => (
                        <div
                          key={pf.id}
                          onMouseDown={() => {
                            setCreateForm((f) => ({
                              ...f,
                              product_franchise_id: pf.id,
                            }));
                            setPfKeyword("");
                            setPfComboOpen(false);
                          }}
                          className={`cursor-pointer px-3 py-2 text-sm hover:bg-white/[0.1] hover:text-white ${
                            createForm.product_franchise_id === pf.id
                              ? "bg-white/[0.1] font-medium text-white"
                              : "text-white/80"
                          }`}
                        >
                          {productNameMap[pf.product_id] ?? "N/A"} |
                          Size: {pf.size} | {pf.price_base.toLocaleString()}đ
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-white/80">
                  Số lượng ban đầu <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min={0}
                  placeholder="VD: 100"
                  value={createForm.quantity}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, quantity: e.target.value }))
                  }
                  className="w-full rounded-lg border border-white/[0.15] bg-white/[0.08] text-white/90 placeholder-white/30 px-3 py-2 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                  required
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-white/80">
                  Ngưỡng cảnh báo <span className="text-red-500">*</span>
                  <span className="ml-1 text-xs font-normal text-white/40">
                    (cảnh báo khi tồn kho xuống dưới ngưỡng này)
                  </span>
                </label>
                <input
                  type="number"
                  min={0}
                  placeholder="VD: 10"
                  value={createForm.alert_threshold}
                  onChange={(e) =>
                    setCreateForm((f) => ({
                      ...f,
                      alert_threshold: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-white/[0.15] bg-white/[0.08] text-white/90 placeholder-white/30 px-3 py-2 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                  required
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  className="rounded-lg border border-white/[0.15] px-4 py-2 text-sm font-medium text-white/70 transition hover:bg-white/[0.1] hover:text-white"
                >
                  Hủy
                </button>
                <Button type="submit" loading={creating}>
                  Tạo mới
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Adjust Modal ────────────────────────────────────────────────────── */}
      {adjustTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/25" />
          <div className="relative w-full max-w-md rounded-2xl shadow-2xl" style={{
            background: "rgba(255, 255, 255, 0.12)",
            backdropFilter: "blur(40px) saturate(200%)",
            WebkitBackdropFilter: "blur(40px) saturate(200%)",
            border: "1px solid rgba(255, 255, 255, 0.25)",
            boxShadow: "0 25px 60px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)",
          }}>
            <div className="flex items-center justify-between border-b border-white/[0.12] px-6 py-4">
              <h2 className="text-lg font-semibold text-white/95">
                Điều chỉnh tồn kho
              </h2>
              <button
                onClick={() => setAdjustTarget(null)}
                className="rounded-lg p-1.5 text-white/40 hover:bg-white/[0.1] hover:text-white transition-colors"
              >
                <svg
                  className="size-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <form onSubmit={handleAdjustSubmit} className="space-y-4 px-6 py-5">
              <div className="rounded-xl bg-white/[0.06] px-4 py-3 text-sm">
                <p className="font-semibold text-white/95">
                  {adjustTarget.product_name ?? adjustTarget.product_id}
                </p>
                <p className="text-xs text-white/50 mt-0.5">
                  {adjustTarget.franchise_name ?? adjustTarget.franchise_id}
                </p>
                <p className="mt-1.5 text-white/80">
                  Tồn hiện tại:{" "}
                  <span className="font-bold text-white/95">
                    {adjustTarget.quantity.toLocaleString()}
                  </span>
                </p>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-white/80">
                  Số thay đổi <span className="text-red-500">*</span>
                  <span className="ml-1 text-xs font-normal text-white/40">
                    (dương = nhập thêm, âm = xuất bớt)
                  </span>
                </label>
                <input
                  type="number"
                  placeholder="VD: 50 hoặc -10"
                  value={adjustForm.change}
                  onChange={(e) =>
                    setAdjustForm((f) => ({ ...f, change: e.target.value }))
                  }
                  className="w-full rounded-lg border border-white/[0.15] bg-white/[0.08] text-white/90 placeholder-white/30 px-3 py-2 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                  required
                />
                {adjustForm.change !== "" &&
                  !isNaN(Number(adjustForm.change)) && (
                    <p className="mt-1 text-xs text-white/50">
                      Sau điều chỉnh:{" "}
                      <span className="font-semibold text-white/95">
                        {(
                          adjustTarget.quantity + Number(adjustForm.change)
                        ).toLocaleString()}
                      </span>
                    </p>
                  )}
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-white/80">
                  Lý do
                </label>
                <input
                  type="text"
                  placeholder="VD: Nhập hàng, kiểm kê..."
                  value={adjustForm.reason}
                  onChange={(e) =>
                    setAdjustForm((f) => ({ ...f, reason: e.target.value }))
                  }
                  className="w-full rounded-lg border border-white/[0.15] bg-white/[0.08] text-white/90 placeholder-white/30 px-3 py-2 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setAdjustTarget(null)}
                  className="rounded-lg border border-white/[0.15] px-4 py-2 text-sm font-medium text-white/70 transition hover:bg-white/[0.1] hover:text-white"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/25" />
          <div className="relative w-full max-w-md rounded-2xl shadow-2xl" style={{
            background: "rgba(255, 255, 255, 0.12)",
            backdropFilter: "blur(40px) saturate(200%)",
            WebkitBackdropFilter: "blur(40px) saturate(200%)",
            border: "1px solid rgba(255, 255, 255, 0.25)",
            boxShadow: "0 25px 60px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)",
          }}>
            <div className="flex items-center justify-between border-b border-white/[0.12] px-6 py-4">
              <h2 className="text-lg font-semibold text-white/95">
                Chi tiết tồn kho
              </h2>
              <button
                onClick={() => setViewingItem(null)}
                className="rounded-lg p-1.5 text-white/40 hover:bg-white/[0.1] hover:text-white transition-colors"
              >
                <svg
                  className="size-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="space-y-4 px-6 py-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-white/50">
                    Sản phẩm
                  </p>
                  <p className="mt-1 font-semibold text-white/95">
                    {viewingItem.product_name ?? "—"}
                  </p>
                  <p className="text-xs font-mono text-white/40">
                    {viewingItem.product_id}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-white/50">
                    Franchise
                  </p>
                  <p className="mt-1 text-white/95">
                    {viewingItem.franchise_name ?? viewingItem.franchise_id}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-white/50">
                    Tồn kho
                  </p>
                  <p
                    className={`mt-1 text-2xl font-bold tabular-nums ${isLow(viewingItem) && !viewingItem.is_deleted ? "text-amber-400" : "text-white/95"}`}
                  >
                    {viewingItem.quantity.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-white/50">
                    Ngưỡng cảnh báo
                  </p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-white/50">
                    {viewingItem.alert_threshold.toLocaleString()}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-white/50">
                  Trạng thái
                </p>
                <div className="mt-1">
                  {viewingItem.is_deleted ? (
                    <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
                      Đã xóa
                    </span>
                  ) : viewingItem.is_active ? (
                    <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                      Active
                    </span>
                  ) : (
                    <span className="rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-700">
                      Inactive
                    </span>
                  )}
                  {isLow(viewingItem) && !viewingItem.is_deleted && (
                    <span className="ml-2 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                      ⚠ Tồn thấp
                    </span>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 border-t border-white/[0.08] pt-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-white/50">
                    Ngày tạo
                  </p>
                  <p className="mt-1 text-sm text-white/80">
                    {new Date(viewingItem.created_at).toLocaleString("vi-VN")}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-white/50">
                    Cập nhật lúc
                  </p>
                  <p className="mt-1 text-sm text-white/80">
                    {new Date(viewingItem.updated_at).toLocaleString("vi-VN")}
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                {!viewingItem.is_deleted && (
                  <button
                    onClick={() => {
                      setViewingItem(null);
                      handleOpenAdjust(viewingItem);
                    }}
                    className="rounded-lg border border-blue-300 px-4 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-50"
                  >
                    Điều chỉnh
                  </button>
                )}
                <button
                  onClick={() => setViewingItem(null)}
                  className="rounded-lg border border-white/[0.15] px-4 py-2 text-sm font-medium text-white/70 transition hover:bg-white/[0.1] hover:text-white"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Logs Modal (INVENTORY-08) ────────────────────────────────────────── */}
      {logsItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/25" />
          <div className="relative w-full max-w-xl rounded-2xl shadow-2xl" style={{
            background: "rgba(255, 255, 255, 0.12)",
            backdropFilter: "blur(40px) saturate(200%)",
            WebkitBackdropFilter: "blur(40px) saturate(200%)",
            border: "1px solid rgba(255, 255, 255, 0.25)",
            boxShadow: "0 25px 60px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)",
          }}>
            <div className="flex items-center justify-between border-b border-white/[0.12] px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-white/95">
                  Lịch sử điều chỉnh
                </h2>
                <p className="text-xs text-white/50 mt-0.5">
                  {logsItem.product_name ?? logsItem.product_id}
                </p>
              </div>
              <button
                onClick={() => setLogsItem(null)}
                className="rounded-lg p-1.5 text-white/40 hover:bg-white/[0.1] hover:text-white transition-colors"
              >
                <svg
                  className="size-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">
              {logsLoading && (
                <div className="flex justify-center py-10">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
                </div>
              )}
              {!logsLoading && logs.length === 0 && (
                <p className="py-8 text-center text-sm text-white/50">
                  Không có lịch sử điều chỉnh
                </p>
              )}
              {!logsLoading && logs.length > 0 && (
                <div className="space-y-2">
                  {logs.map((log) => (
                    <div
                      key={log._id}
                      className="rounded-xl border border-white/[0.08] bg-white/[0.06] px-4 py-3 text-sm"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${log.change > 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
                          >
                            {log.change > 0 ? "+" : ""}
                            {log.change.toLocaleString()}
                          </span>
                          <span className="rounded-full bg-white/[0.1] px-2 py-0.5 text-xs text-white/70">
                            {{ ADJUST: "Điều chỉnh", SALE: "Bán hàng", RECEIVE: "Nhập kho" }[log.type] ?? log.type}
                          </span>
                          <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-xs text-white/50">
                            {{ MANUAL: "Thủ công", ORDER: "Đơn hàng" }[log.reference_type] ?? log.reference_type}
                          </span>
                        </div>
                        <span className="text-xs text-white/40 whitespace-nowrap">
                          {new Date(log.created_at).toLocaleString("vi-VN")}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex justify-end border-t border-white/[0.08] px-6 py-4">
              <button
                onClick={() => setLogsItem(null)}
                className="rounded-lg border border-white/[0.15] px-4 py-2 text-sm font-medium text-white/70 transition hover:bg-white/[0.1] hover:text-white"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

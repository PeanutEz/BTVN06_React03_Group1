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
import * as XLSX from "xlsx";

const ITEMS_PER_PAGE = 10;

// ─── Import validation error type ──────────────────────────────────────────
interface ImportRowError {
  row: number; // 1-based row index (relative to data rows)
  field: "quantity" | "alert_threshold";
  message: string;
}

interface ImportPreviewRow {
  id: string;
  product_name: string;
  franchise_name: string;
  old_quantity: number;
  new_quantity: number;
  old_threshold: number;
  new_threshold: number;
  matched: boolean;
}

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

  // Checkbox selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Import errors
  const [importErrors, setImportErrors] = useState<ImportRowError[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Batch update (selected rows)
  const [batchUpdating, setBatchUpdating] = useState(false);

  // Export by franchise modal
  const [exportFranchiseOpen, setExportFranchiseOpen] = useState(false);
  const [exportMode, setExportMode] = useState<"all" | "franchise">("all");
  const [exportFranchiseId, setExportFranchiseId] = useState("");
  const [exportFranchiseKeyword, setExportFranchiseKeyword] = useState("");
  const [exportFranchiseComboOpen, setExportFranchiseComboOpen] = useState(false);
  const [exportFranchiseLoading, setExportFranchiseLoading] = useState(false);
  const exportFranchiseComboRef = useRef<HTMLDivElement>(null);

  // Import preview modal
  const [importPreviewOpen, setImportPreviewOpen] = useState(false);
  const [importPreviewRows, setImportPreviewRows] = useState<ImportPreviewRow[]>([]);

  // Import modal (select franchise first)
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importFranchiseId, setImportFranchiseId] = useState("");
  const [importFranchiseKeyword, setImportFranchiseKeyword] = useState("");
  const [importFranchiseComboOpen, setImportFranchiseComboOpen] = useState(false);
  const [importFranchiseLoading, setImportFranchiseLoading] = useState(false);
  const [importItems, setImportItems] = useState<InventoryApiResponse[]>([]);
  const importFranchiseComboRef = useRef<HTMLDivElement>(null);

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
      if (
        exportFranchiseComboRef.current &&
        !exportFranchiseComboRef.current.contains(e.target as Node)
      ) {
        setExportFranchiseComboOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handlePageChange = (page: number) => {
    setPendingEdits({});
    setSelectedIds(new Set());
    setImportErrors([]);
    setCurrentPage(page);
    load(searchFranchise, page, statusFilter, isDeletedFilter);
  };

  const handleResetFilters = () => {
    setPendingEdits({});
    setSelectedIds(new Set());
    setImportErrors([]);
    setSearchFranchise("");
    setStatusFilter("");
    setIsDeletedFilter(false);
    setCurrentPage(1);
    load("", 1, "", false);
  };

  // ─── Checkbox handlers ────────────────────────────────────────────────────
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((i) => i.id)));
    }
  };

  // ─── Export ───────────────────────────────────────────────────────────────
  const buildExcelFromItems = (dataToExport: InventoryApiResponse[], filename: string) => {
    const rows = dataToExport.map((item, idx) => ({
      STT: idx + 1,
      product_name: item.product_name ?? "",
      franchise_name: item.franchise_name ?? "",
      quantity: item.quantity,
      alert_threshold: item.alert_threshold,
      is_active: item.is_active ? "Active" : "Inactive",
      updated_at: new Date(item.updated_at).toLocaleString("vi-VN"),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const colWidths = Object.keys(rows[0]).map((key) => ({
      wch: Math.max(key.length, ...rows.map((r) => String(r[key as keyof typeof r]).length)) + 2,
    }));
    ws["!cols"] = colWidths;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventory");
    XLSX.writeFile(wb, filename);
  };

  const handleExportAll = () => {
    if (items.length === 0) { showError("Không có dữ liệu để export"); return; }
    buildExcelFromItems(items, `inventory_all_${Date.now()}.xlsx`);
    showSuccess(`Đã export ${items.length} dòng`);
  };

  const handleExportAllInventory = async () => {
    setExportFranchiseLoading(true);
    try {
      const PAGE_SIZE = 100;
      let page = 1;
      let allData: InventoryApiResponse[] = [];
      while (true) {
        const result = await adminInventoryService.searchInventories({
          searchCondition: { is_deleted: false },
          pageInfo: { pageNum: page, pageSize: PAGE_SIZE },
        });
        allData = allData.concat(result.data);
        if (page >= result.pageInfo.totalPages) break;
        page++;
      }
      if (allData.length === 0) { showError("Không có dữ liệu tồn kho"); return; }
      buildExcelFromItems(allData, `inventory_all_franchises_${Date.now()}.xlsx`);
      showSuccess(`Đã export ${allData.length} dòng (tất cả franchise)`);
      setExportFranchiseOpen(false);
    } catch {
      showError("Export thất bại");
    } finally {
      setExportFranchiseLoading(false);
    }
  };

  const handleExportByFranchise = async () => {
    if (!exportFranchiseId) { showError("Vui lòng chọn franchise"); return; }
    setExportFranchiseLoading(true);
    try {
      // Fetch all pages for the franchise
      const PAGE_SIZE = 100;
      let page = 1;
      let allData: InventoryApiResponse[] = [];
      while (true) {
        const result = await adminInventoryService.searchInventories({
          searchCondition: { franchise_id: exportFranchiseId, is_deleted: false },
          pageInfo: { pageNum: page, pageSize: PAGE_SIZE },
        });
        allData = allData.concat(result.data);
        if (page >= result.pageInfo.totalPages) break;
        page++;
      }
      if (allData.length === 0) { showError("Không có dữ liệu tồn kho cho franchise này"); return; }
      const franchiseName = franchiseOptions.find((f) => f.value === exportFranchiseId)?.name ?? exportFranchiseId;
      buildExcelFromItems(allData, `inventory_${franchiseName}_${Date.now()}.xlsx`);
      showSuccess(`Đã export ${allData.length} dòng cho franchise "${franchiseName}"`);
      setExportFranchiseOpen(false);
      setExportFranchiseId("");
      setExportFranchiseKeyword("");
    } catch {
      showError("Export thất bại");
    } finally {
      setExportFranchiseLoading(false);
    }
  };

  // ─── Download import template ─────────────────────────────────────────────
  const handleImportConfirm = async () => {
    if (!importFranchiseId) { showError("Vui lòng chọn franchise"); return; }
    setImportFranchiseLoading(true);
    try {
      const PAGE_SIZE = 100;
      let page = 1;
      let allData: InventoryApiResponse[] = [];
      while (true) {
        const result = await adminInventoryService.searchInventories({
          searchCondition: { franchise_id: importFranchiseId, is_deleted: false },
          pageInfo: { pageNum: page, pageSize: PAGE_SIZE },
        });
        allData = allData.concat(result.data);
        if (page >= result.pageInfo.totalPages) break;
        page++;
      }
      setImportItems(allData);
      setImportModalOpen(false);
      fileInputRef.current?.click();
    } catch {
      showError("Lấy dữ liệu tồn kho thất bại");
    } finally {
      setImportFranchiseLoading(false);
    }
  };

  // ─── Download import template ─────────────────────────────────────────────
  const handleDownloadTemplate = () => {
    // Use current table rows as reference data (read-only product/franchise info)
    // User only needs to fill in quantity and alert_threshold
    const templateRows =
      items.length > 0
        ? items.map((item, idx) => ({
            STT: idx + 1,
            product_name: item.product_name ?? "",
            franchise_name: item.franchise_name ?? "",
            quantity: item.quantity,          // ← chỉnh sửa cột này
            alert_threshold: item.alert_threshold, // ← chỉnh sửa cột này
          }))
        : [
            {
              STT: 1,
              product_name: "Tên sản phẩm (chỉ tham khảo)",
              franchise_name: "Tên franchise (chỉ tham khảo)",
              quantity: 100,
              alert_threshold: 10,
            },
            {
              STT: 2,
              product_name: "Tên sản phẩm (chỉ tham khảo)",
              franchise_name: "Tên franchise (chỉ tham khảo)",
              quantity: 50,
              alert_threshold: 5,
            },
          ];

    const ws = XLSX.utils.json_to_sheet(templateRows);

    // Style column widths
    ws["!cols"] = [
      { wch: 6 },  // STT
      { wch: 28 }, // product_name
      { wch: 24 }, // franchise_name
      { wch: 14 }, // quantity
      { wch: 18 }, // alert_threshold
    ];

    // Add a note row at the top to guide user
    XLSX.utils.sheet_add_aoa(
      ws,
      [[
        "// Ghi chú: Chỉ chỉnh sửa 2 cột 'quantity' và 'alert_threshold'. Khớp sản phẩm theo 'product_name'.",
      ]],
      { origin: { r: 0, c: 0 }, sheetRows: 1 },
    );

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventory_Template");
    XLSX.writeFile(wb, "inventory_import_template.xlsx");
  };

  // ─── Import with validation ───────────────────────────────────────────────
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const jsonRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);

        if (jsonRows.length === 0) {
          showError("File import không có dữ liệu");
          return;
        }

        // Validate each row — check quantity first then alert_threshold (left to right)
        const errors: ImportRowError[] = [];
        const validRows: { product_name: string; quantity: number; alert_threshold: number }[] = [];

        for (let i = 0; i < jsonRows.length; i++) {
          const row = jsonRows[i];
          const rowNum = i + 1;
          const rowProductName = String(row["product_name"] ?? "").trim();
          let rowHasError = false;

          // Validate quantity (left to right — check quantity first)
          const rawQty = row["quantity"];
          const qty = Number(rawQty);
          if (rawQty === undefined || rawQty === null || rawQty === "" || isNaN(qty)) {
            errors.push({
              row: rowNum,
              field: "quantity",
              message: `Row ${String(rowNum).padStart(2, "0")}, lỗi chỉ được nhập data số ở field quantity`,
            });
            rowHasError = true;
          } else if (qty < 0) {
            errors.push({
              row: rowNum,
              field: "quantity",
              message: `Row ${String(rowNum).padStart(2, "0")}, lỗi data ở field quantity phải >= 0`,
            });
            rowHasError = true;
          }

          // Validate alert_threshold
          const rawThreshold = row["alert_threshold"];
          const threshold = Number(rawThreshold);
          if (rawThreshold === undefined || rawThreshold === null || rawThreshold === "" || isNaN(threshold)) {
            errors.push({
              row: rowNum,
              field: "alert_threshold",
              message: `Row ${String(rowNum).padStart(2, "0")}, lỗi chỉ được nhập data số ở field alert_threshold`,
            });
            rowHasError = true;
          } else if (threshold < 0) {
            errors.push({
              row: rowNum,
              field: "alert_threshold",
              message: `Row ${String(rowNum).padStart(2, "0")}, lỗi data ở field alert_threshold phải >= 0`,
            });
            rowHasError = true;
          }

          if (!rowHasError) {
            validRows.push({ product_name: rowProductName, quantity: qty, alert_threshold: threshold });
          }
        }

        // 4.4: If any error → don't import, keep original data
        if (errors.length > 0) {
          setImportErrors(errors);
          showError(`Import thất bại: ${errors.length} lỗi`);
        } else {
          // 4.5: All rows OK → build preview
          setImportErrors([]);
          const previewRows: ImportPreviewRow[] = validRows.map((vr) => {
            const match = importItems.find(
              (item) => (item.product_name ?? "").trim() === vr.product_name,
            );
            return {
              id: match?.id ?? "",
              product_name: vr.product_name,
              franchise_name: match?.franchise_name ?? "",
              old_quantity: match?.quantity ?? 0,
              new_quantity: vr.quantity,
              old_threshold: match?.alert_threshold ?? 0,
              new_threshold: vr.alert_threshold,
              matched: !!match,
            };
          });
          setImportPreviewRows(previewRows);
          setImportPreviewOpen(true);
        }
      } catch {
        showError("Không thể đọc file. Vui lòng kiểm tra định dạng Excel/CSV.");
      }
    };
    reader.readAsArrayBuffer(file);

    // Reset input so same file can be re-imported
    e.target.value = "";
  };

  // ─── Update selected rows ─────────────────────────────────────────────────
  const handleUpdateSelected = async () => {
    const idsToUpdate = Array.from(selectedIds);
    if (idsToUpdate.length === 0) {
      showError("Vui lòng chọn ít nhất 1 dòng để cập nhật");
      return;
    }

    setBatchUpdating(true);
    let successCount = 0;
    let errorCount = 0;

    await Promise.allSettled(
      idsToUpdate.map(async (id) => {
        const original = items.find((i) => i.id === id);
        if (!original) return;

        const edit = pendingEdits[id];
        const newQty = edit?.quantity !== undefined ? Number(edit.quantity) : original.quantity;
        const newThreshold = edit?.alert_threshold !== undefined ? Number(edit.alert_threshold) : original.alert_threshold;

        if (isNaN(newQty) || newQty < 0 || isNaN(newThreshold) || newThreshold < 0) {
          errorCount++;
          return;
        }

        const change = newQty - original.quantity;
        const thresholdChanged = newThreshold !== original.alert_threshold;

        if (change === 0 && !thresholdChanged) {
          successCount++;
          return;
        }

        try {
          const freshItem = await adminInventoryService.getInventoryById(id);
          const dto: AdjustInventoryDto = {
            product_franchise_id: freshItem.product_franchise_id,
            change,
            alert_threshold: newThreshold,
            reason: "Batch update from import/selection",
          };
          await adminInventoryService.adjustInventory(dto);
          successCount++;
        } catch {
          errorCount++;
        }
      }),
    );

    setBatchUpdating(false);

    // Clear selection & edits for updated items
    const updatedSet = new Set(idsToUpdate);
    setPendingEdits((prev) => {
      const next = { ...prev };
      for (const id of idsToUpdate) delete next[id];
      return next;
    });
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const id of updatedSet) next.delete(id);
      return next;
    });

    if (successCount > 0) showSuccess(`Đã cập nhật ${successCount} dòng thành công`);
    if (errorCount > 0) showError(`${errorCount} dòng cập nhật thất bại`);

    await load(searchFranchise, currentPage, statusFilter, isDeletedFilter);
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
    setImportErrors([]);
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
        <div className="flex flex-wrap items-center gap-2">
          {/* Import */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleImportFile}
            className="hidden"
          />
          {/* Download template */}
          <button
            onClick={handleDownloadTemplate}
            title="Tải file mẫu Excel để import"
            className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700 transition hover:bg-indigo-100"
          >
            <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Tải mẫu
          </button>
          {/* Import */}
          <button
            onClick={() => { setImportModalOpen(true); setImportFranchiseId(""); setImportFranchiseKeyword(""); }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Import
          </button>
          {/* Export */}
          <button
            onClick={() => { setExportFranchiseOpen(true); setExportMode("all"); setExportFranchiseId(""); setExportFranchiseKeyword(""); }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export
          </button>
          <Button onClick={handleOpenCreate}>+ Thêm mới</Button>
        </div>
      </div>

      {/* ─── Import Errors ─── */}
      {importErrors.length > 0 && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2">
              <svg className="size-5 text-red-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-sm font-semibold text-red-800 mb-2">
                  Import thất bại — {importErrors.length} lỗi được phát hiện:
                </p>
                <div className="space-y-1">
                  {importErrors.map((err, idx) => (
                    <p key={idx} className="text-sm text-red-700">
                      {err.message}
                    </p>
                  ))}
                </div>
              </div>
            </div>
            <button
              onClick={() => setImportErrors([])}
              className="rounded-lg p-1 text-red-400 hover:bg-red-100 hover:text-red-600 transition-colors shrink-0"
            >
              <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="relative z-20 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
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
              <div className="absolute z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
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
                          {item.franchise_name ?? item.franchise_id}
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

      {/* ─── Import Preview Modal ──────────────────────────────────────────────── */}
      {importPreviewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 shrink-0">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Preview Import</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {importPreviewRows.filter((r) => r.matched).length} / {importPreviewRows.length} dòng khớp — xem lại trước khi áp dụng
                </p>
              </div>
              <button
                onClick={() => setImportPreviewOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="overflow-auto flex-1 px-6 py-4">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">
                    <th className="px-3 py-2 rounded-tl-lg">Sản phẩm</th>
                    <th className="px-3 py-2">Franchise</th>
                    <th className="px-3 py-2 text-center">Số lượng cũ</th>
                    <th className="px-3 py-2 text-center">Số lượng mới</th>
                    <th className="px-3 py-2 text-center">Ngưỡng cũ</th>
                    <th className="px-3 py-2 text-center rounded-tr-lg">Ngưỡng mới</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {importPreviewRows.map((row, idx) => (
                    <tr
                      key={idx}
                      className={row.matched ? "hover:bg-slate-50" : "bg-red-50"}
                    >
                      <td className="px-3 py-2 font-medium text-slate-800">
                        {row.product_name || <span className="italic text-slate-400">—</span>}
                        {!row.matched && (
                          <span className="ml-2 text-xs text-red-500 font-normal">không khớp</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-slate-600">{row.franchise_name || "—"}</td>
                      <td className="px-3 py-2 text-center text-slate-500">{row.matched ? row.old_quantity : "—"}</td>
                      <td className={`px-3 py-2 text-center font-semibold ${
                        row.matched && row.new_quantity !== row.old_quantity
                          ? "text-primary-700"
                          : "text-slate-700"
                      }`}>
                        {row.new_quantity}
                      </td>
                      <td className="px-3 py-2 text-center text-slate-500">{row.matched ? row.old_threshold : "—"}</td>
                      <td className={`px-3 py-2 text-center font-semibold ${
                        row.matched && row.new_threshold !== row.old_threshold
                          ? "text-primary-700"
                          : "text-slate-700"
                      }`}>
                        {row.new_threshold}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4 shrink-0">
              <button
                type="button"
                onClick={() => setImportPreviewOpen(false)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                onClick={() => {
                  const newPending: Record<string, { quantity?: string; alert_threshold?: string }> = {};
                  const newSelected = new Set<string>();
                  for (const row of importPreviewRows) {
                    if (row.matched && row.id) {
                      newPending[row.id] = {
                        quantity: String(row.new_quantity),
                        alert_threshold: String(row.new_threshold),
                      };
                      newSelected.add(row.id);
                    }
                  }
                  setPendingEdits(newPending);
                  setSelectedIds(newSelected);
                  setImportPreviewOpen(false);
                  showSuccess(`Đã áp dụng ${newSelected.size} dòng — kiểm tra lại và nhấn Cập nhật`);
                }}
                disabled={importPreviewRows.filter((r) => r.matched).length === 0}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Áp dụng ({importPreviewRows.filter((r) => r.matched).length} dòng)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Import Modal ─────────────────────────────────────────────────────── */}
      {importModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Import tồn kho</h2>
                <p className="text-xs text-slate-500 mt-0.5">Chọn franchise trước khi import file</p>
              </div>
              <button
                onClick={() => setImportModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Franchise <span className="text-red-500">*</span>
                </label>
                <div ref={importFranchiseComboRef} className="relative">
                  <input
                    type="text"
                    placeholder="Tìm franchise..."
                    value={importFranchiseKeyword}
                    onChange={(e) => {
                      setImportFranchiseKeyword(e.target.value);
                      setImportFranchiseId("");
                      setImportFranchiseComboOpen(true);
                    }}
                    onFocus={() => setImportFranchiseComboOpen(true)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                  />
                  {importFranchiseId && (
                    <div className="mt-1.5 flex items-center gap-2 rounded-lg bg-primary-50 px-3 py-1.5 text-xs text-primary-700">
                      <span className="font-medium">
                        {franchiseOptions.find((f) => f.value === importFranchiseId)?.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => { setImportFranchiseId(""); setImportFranchiseKeyword(""); }}
                        className="ml-auto text-primary-400 hover:text-primary-700"
                      >✕</button>
                    </div>
                  )}
                  {importFranchiseComboOpen && (
                    <div className="absolute z-30 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                      {franchiseOptions
                        .filter((f) => f.name.toLowerCase().includes(importFranchiseKeyword.toLowerCase()))
                        .length === 0 && (
                        <p className="px-3 py-2 text-sm text-slate-400">Không tìm thấy</p>
                      )}
                      {franchiseOptions
                        .filter((f) => f.name.toLowerCase().includes(importFranchiseKeyword.toLowerCase()))
                        .map((f) => (
                          <div
                            key={f.value}
                            onMouseDown={() => {
                              setImportFranchiseId(f.value);
                              setImportFranchiseKeyword(f.name);
                              setImportFranchiseComboOpen(false);
                            }}
                            className={`cursor-pointer px-3 py-2 text-sm hover:bg-primary-50 hover:text-primary-700 ${
                              importFranchiseId === f.value ? "bg-primary-50 font-medium text-primary-700" : "text-slate-700"
                            }`}
                          >
                            {f.name}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setImportModalOpen(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  onClick={handleImportConfirm}
                  disabled={!importFranchiseId || importFranchiseLoading}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {importFranchiseLoading ? (
                    <>
                      <svg className="animate-spin size-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                      Đang tải...
                    </>
                  ) : (
                    <>
                      <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      Chọn file Import
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Export Modal ─────────────────────────────────────────────────────── */}
      {exportFranchiseOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Export tồn kho</h2>
                <p className="text-xs text-slate-500 mt-0.5">Chọn phạm vi dữ liệu muốn export</p>
              </div>
              <button
                onClick={() => setExportFranchiseOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {/* Mode cards */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setExportMode("all")}
                  className={`rounded-xl border-2 p-4 text-left transition-all ${
                    exportMode === "all"
                      ? "border-primary-500 bg-primary-50"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className={`mb-1.5 inline-flex size-8 items-center justify-center rounded-lg ${
                    exportMode === "all" ? "bg-primary-100" : "bg-slate-100"
                  }`}>
                    <svg className={`size-4 ${exportMode === "all" ? "text-primary-600" : "text-slate-500"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <p className={`text-sm font-semibold ${exportMode === "all" ? "text-primary-800" : "text-slate-700"}`}>
                    Tất cả
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">Toàn bộ franchise</p>
                </button>
                <button
                  type="button"
                  onClick={() => setExportMode("franchise")}
                  className={`rounded-xl border-2 p-4 text-left transition-all ${
                    exportMode === "franchise"
                      ? "border-primary-500 bg-primary-50"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className={`mb-1.5 inline-flex size-8 items-center justify-center rounded-lg ${
                    exportMode === "franchise" ? "bg-primary-100" : "bg-slate-100"
                  }`}>
                    <svg className={`size-4 ${exportMode === "franchise" ? "text-primary-600" : "text-slate-500"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
                    </svg>
                  </div>
                  <p className={`text-sm font-semibold ${exportMode === "franchise" ? "text-primary-800" : "text-slate-700"}`}>
                    Theo franchise
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">Chọn 1 franchise</p>
                </button>
              </div>

              {/* Franchise picker — only when mode = franchise */}
              {exportMode === "franchise" && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Franchise <span className="text-red-500">*</span>
                  </label>
                  <div ref={exportFranchiseComboRef} className="relative">
                    <input
                      type="text"
                      placeholder="Tìm franchise..."
                      value={exportFranchiseKeyword}
                      onChange={(e) => {
                        setExportFranchiseKeyword(e.target.value);
                        setExportFranchiseId("");
                        setExportFranchiseComboOpen(true);
                      }}
                      onFocus={() => setExportFranchiseComboOpen(true)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                    />
                    {exportFranchiseId && (
                      <div className="mt-1.5 flex items-center gap-2 rounded-lg bg-primary-50 px-3 py-1.5 text-xs text-primary-700">
                        <span className="font-medium">
                          {franchiseOptions.find((f) => f.value === exportFranchiseId)?.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => { setExportFranchiseId(""); setExportFranchiseKeyword(""); }}
                          className="ml-auto text-primary-400 hover:text-primary-700"
                        >✕</button>
                      </div>
                    )}
                    {exportFranchiseComboOpen && (
                      <div className="absolute z-30 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                        {franchiseOptions
                          .filter((f) => f.name.toLowerCase().includes(exportFranchiseKeyword.toLowerCase()))
                          .length === 0 && (
                          <p className="px-3 py-2 text-sm text-slate-400">Không tìm thấy</p>
                        )}
                        {franchiseOptions
                          .filter((f) => f.name.toLowerCase().includes(exportFranchiseKeyword.toLowerCase()))
                          .map((f) => (
                            <div
                              key={f.value}
                              onMouseDown={() => {
                                setExportFranchiseId(f.value);
                                setExportFranchiseKeyword(f.name);
                                setExportFranchiseComboOpen(false);
                              }}
                              className={`cursor-pointer px-3 py-2 text-sm hover:bg-primary-50 hover:text-primary-700 ${
                                exportFranchiseId === f.value ? "bg-primary-50 font-medium text-primary-700" : "text-slate-700"
                              }`}
                            >
                              {f.name}
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setExportFranchiseOpen(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  onClick={exportMode === "all" ? handleExportAllInventory : handleExportByFranchise}
                  disabled={(exportMode === "franchise" && !exportFranchiseId) || exportFranchiseLoading}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {exportFranchiseLoading ? (
                    <>
                      <svg className="animate-spin size-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                      Đang tải...
                    </>
                  ) : (
                    <>
                      <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Export
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

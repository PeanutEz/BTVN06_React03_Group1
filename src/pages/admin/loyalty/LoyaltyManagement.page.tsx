import { useEffect, useMemo, useRef, useState } from "react";
import { Button, useConfirm } from "../../../components";
import Pagination from "../../../components/ui/Pagination";
import { fetchFranchiseSelect } from "../../../services/store.service";
import type { FranchiseSelectItem } from "../../../services/store.service";
import type { LoyaltyRule, TierRule } from "../../../models/loyalty.model";
import { DEFAULT_LOYALTY_RULE } from "../../../models/loyalty.model";
import {
  searchLoyaltyRules,
  getLoyaltyRuleById,
  createLoyaltyRule,
  updateLoyaltyRule,
  changeLoyaltyRuleStatus,
  deleteLoyaltyRule,
  restoreLoyaltyRule,
} from "../../../services/loyalty.service";
import { showError, showSuccess } from "../../../utils";
import { useManagerFranchiseId } from "../../../hooks/useManagerFranchiseId";

const ITEMS_PER_PAGE = 10;

export default function LoyaltyManagementPage() {
  const showConfirm = useConfirm();
  const managerFranchiseId = useManagerFranchiseId();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<LoyaltyRule[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const [franchises, setFranchises] = useState<FranchiseSelectItem[]>([]);

  // Filters
  const [filters, setFilters] = useState<{
    franchise_id: string;
    is_active: string;
    is_deleted: boolean;
  }>({
    franchise_id: managerFranchiseId ?? "",
    is_active: "",
    is_deleted: false,
  });

  const [franchiseOpen, setFranchiseOpen] = useState(false);
  const [franchiseKeyword, setFranchiseKeyword] = useState("");

  // Modal (Create/Edit)
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [editingRule, setEditingRule] = useState<LoyaltyRule | null>(null);
  const [saving, setSaving] = useState(false);

  // Franchise maps
  const franchiseNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    franchises.forEach((f) => { map[f.value] = `${f.name} (${f.code})`; });
    return map;
  }, [franchises]);

  const franchiseOptions = useMemo(() => {
    if (!franchiseKeyword.trim()) return franchises;
    const k = franchiseKeyword.trim().toLowerCase();
    return franchises.filter((f) => (f.name || "").toLowerCase().includes(k) || (f.code || "").toLowerCase().includes(k));
  }, [franchises, franchiseKeyword]);

  const hasRun = useRef(false);
  const isInitialized = useRef(false);

  const getApiErrorMessage = (err: unknown, fallback: string) => {
    const data = (err as any)?.response?.data;
    if (data?.message) return String(data.message);
    return fallback;
  };

  const loadSelects = async () => {
    try {
      const frs = await fetchFranchiseSelect();
      setFranchises(frs);
    } catch (err) {
      console.error("[Loyalty] loadSelects error:", err);
    }
  };

  const load = async (pageNum = currentPage) => {
    setLoading(true);
    try {
      const payload = {
        searchCondition: {
          franchise_id: filters.franchise_id || "",
          earn_amount_per_point: "",
          redeem_value_per_point: "",
          tier: "",
          is_active: filters.is_active === "true" ? true : filters.is_active === "false" ? false : "",
          is_deleted: filters.is_deleted === true ? true : "",
        },
        pageInfo: { pageNum, pageSize: ITEMS_PER_PAGE },
      };
      const result = await searchLoyaltyRules(payload);
      setItems(result.items);
      setCurrentPage(result.pageInfo.pageNum || 1);
      setTotalPages(result.pageInfo.totalPages || 1);
      setTotalItems(result.pageInfo.totalItems || 0);
    } catch (err) {
      console.error("[Loyalty] load error:", err);
      showError("Lấy danh sách quy tắc tích điểm thất bại");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;
    loadSelects();    load(1).finally(() => {
      isInitialized.current = true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync khi managerFranchiseId thay đổi (store hydrate muộn)
  useEffect(() => {
    if (!managerFranchiseId) return;
    setFilters(prev => ({ ...prev, franchise_id: managerFranchiseId }));
  }, [managerFranchiseId]);

  // Sync franchiseKeyword khi franchises load xong và đang là manager
  useEffect(() => {
    if (!managerFranchiseId || !franchises.length) return;
    const found = franchises.find(f => f.value === managerFranchiseId);
    if (found) setFranchiseKeyword(`${found.name} (${found.code})`);
  }, [managerFranchiseId, franchises]);

  useEffect(() => {
    if (!isInitialized.current) return;
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  // Modal Actions
  const handleOpenCreate = () => {
    setEditingRule({ ...DEFAULT_LOYALTY_RULE });
    setShowRuleModal(true);
  };

  const handleOpenEdit = async (rule: LoyaltyRule) => {
    const ruleId = rule._id || rule.id;
    if (!ruleId) {
      setEditingRule({ ...rule });
      setShowRuleModal(true);
      return;
    }
    
    // Fetch full detail API (including tier_rules) before opening modal
    try {
      const fullRule = await getLoyaltyRuleById(ruleId);
      
      // Fallback arrays if backend omits them
      if (!fullRule.tier_rules || fullRule.tier_rules.length === 0) {
        fullRule.tier_rules = DEFAULT_LOYALTY_RULE.tier_rules;
      }
      
      setEditingRule(fullRule);
      setShowRuleModal(true);
    } catch (err) {
      showError("Không thể lấy chi tiết phân hạng. Vui lòng thử lại.");
      // Fallback to row data
      setEditingRule({ ...rule });
      setShowRuleModal(true);
    }
  };

  const handleSaveRule = async () => {
    if (!editingRule) return;

    if (!editingRule.franchise_id) {
      showError("Vui lòng chọn Franchise áp dụng.");
      return;
    }

    if (!await showConfirm({
      title: "Xác nhận lưu",
      message: "Bạn có chắc muốn lưu quy tắc này? Nó sẽ ảnh hưởng đến khách hàng của Franchise được chọn.",
      variant: "info",
      confirmText: "Lưu cài đặt"
    })) {
      return;
    }

    setSaving(true);
    try {
      if (editingRule._id || editingRule.id) {
        // Edit mode
        const ruleId = editingRule._id || editingRule.id || "";
        const { _id, id, franchise_id, created_at, updated_at, is_deleted, ...updatePayload } = editingRule;
        await updateLoyaltyRule(ruleId, updatePayload as Partial<LoyaltyRule>);
        showSuccess("Cập nhật quy tắc thành công");
      } else {
        // Create mode
        await createLoyaltyRule(editingRule);
        showSuccess("Tạo mới quy tắc thành công");
      }
      setShowRuleModal(false);
      await load(currentPage);
    } catch (error) {
      showError(getApiErrorMessage(error, "Lưu thông tin thất bại"));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (it: LoyaltyRule) => {
    const next = !it.is_active;
    const action = next ? "Kích hoạt" : "Hủy kích hoạt";
    if (!await showConfirm({
      message: `Bạn có chắc muốn ${action.toLowerCase()} quy tắc này?`,
      title: action,
      variant: next ? "info" : "warning",
      confirmText: action,
    })) return;
    
    const ruleId = it._id || it.id;
    if (!ruleId) return;

    try {
      await changeLoyaltyRuleStatus(ruleId, next, it);
      showSuccess(`Đã ${action.toLowerCase()} quy tắc`);
      await load(currentPage);
    } catch (err: unknown) {
      showError(getApiErrorMessage(err, "Đổi trạng thái thất bại"));
    }
  };

  const handleDelete = async (it: LoyaltyRule) => {
    if (!await showConfirm({ message: "Bạn có chắc muốn xóa quy tắc này?", variant: "danger" })) return;
    const ruleId = it._id || it.id;
    if (!ruleId) return;
    try {
      await deleteLoyaltyRule(ruleId, it);
      showSuccess("Đã xóa quy tắc");
      await load(currentPage);
    } catch (err: unknown) {
      showError(getApiErrorMessage(err, "Xóa thất bại"));
    }
  };

  const handleRestore = async (it: LoyaltyRule) => {
    if (!await showConfirm({ message: "Khôi phục quy tắc này?", variant: "warning" })) return;
    const ruleId = it._id || it.id;
    if (!ruleId) return;
    try {
      await restoreLoyaltyRule(ruleId, it);
      showSuccess("Đã khôi phục");
      await load(currentPage);
    } catch (err: unknown) {
      showError(getApiErrorMessage(err, "Khôi phục thất bại"));
    }
  };

  // UI Helpers
  const handleUpdateTierBenefit = (tierIndex: number, field: keyof TierRule['benefit'], value: number | boolean) => {
    if (!editingRule) return;
    const newTierRules = [...editingRule.tier_rules];
    newTierRules[tierIndex] = {
      ...newTierRules[tierIndex],
      benefit: {
        ...newTierRules[tierIndex].benefit,
        [field]: value
      }
    };
    setEditingRule({ ...editingRule, tier_rules: newTierRules });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Chương trình thành viên (Loyalty Rules)</h1>
          <p className="text-xs text-slate-600 sm:text-sm">Quản lý quy tắc tích điểm và hạng thành viên theo từng Franchise</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={handleOpenCreate}>+ Thêm quy tắc mới</Button>
        </div>
      </div>

      {/* Filters */}
      <div className="relative z-30 overflow-visible rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="relative overflow-visible flex flex-wrap items-end gap-3">
          {/* Franchise combobox */}
          <div className="space-y-1.5 min-w-[220px] flex-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Franchise</label>            <div className="relative">
              {managerFranchiseId ? (
                <div className="flex w-full items-center justify-between rounded-lg border border-primary-500/50 bg-primary-50 px-3 py-2 text-sm text-slate-800 cursor-not-allowed">
                  <span className="truncate font-medium text-primary-700">
                    {filters.franchise_id ? (franchiseNameMap[filters.franchise_id] || filters.franchise_id) : "-- Tất cả franchise --"}
                  </span>
                  <svg className="ml-2 size-4 flex-shrink-0 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setFranchiseOpen((o) => !o)}
                  className="flex w-full items-center justify-between rounded-lg border border-slate-300 bg-white px-3 py-2 text-left text-sm text-slate-800 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                >
                  <span className="truncate">
                    {filters.franchise_id ? (franchiseNameMap[filters.franchise_id] || filters.franchise_id) : "-- Tất cả franchise --"}
                  </span>
                  <svg className="ml-2 size-4 flex-shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              )}
              {franchiseOpen && (
                <div className="absolute left-0 right-0 z-50 mt-1 rounded-lg border border-slate-200 bg-white shadow-lg">
                  <div className="border-b border-slate-100 px-3 py-2">
                    <input
                      autoFocus
                      value={franchiseKeyword}
                      onChange={(e) => setFranchiseKeyword(e.target.value)}
                      placeholder="Tìm theo tên hoặc mã..."
                      className="w-full rounded-md border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 px-2.5 py-1.5 text-xs outline-none transition focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30"
                    />
                  </div>
                  <div className="max-h-64 overflow-y-auto py-1 text-sm">
                    <button
                      type="button"
                      onClick={() => {
                        setFilters((f) => ({ ...f, franchise_id: "" }));
                        setCurrentPage(1);
                        setFranchiseOpen(false);
                        setFranchiseKeyword("");
                      }}
                      className={`flex w-full items-center px-3 py-2 text-left text-xs font-semibold ${
                        !filters.franchise_id ? "bg-primary-50 text-primary-700" : "text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      -- Tất cả franchise --
                    </button>
                    {franchiseOptions.map((fr) => {
                      const active = filters.franchise_id === fr.value;
                      return (
                        <button
                          key={fr.value}
                          type="button"
                          onClick={() => {
                            setFilters((f) => ({ ...f, franchise_id: fr.value }));
                            setCurrentPage(1);
                            setFranchiseOpen(false);
                            setFranchiseKeyword("");
                          }}
                          className={`flex w-full items-center px-3 py-2 text-left text-xs ${
                            active ? "bg-primary-50 text-primary-700" : "text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          <span className="truncate">{fr.name} ({fr.code})</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="min-w-[130px] space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Trạng thái</label>
            <select
              value={filters.is_active}
              onChange={(e) => { setFilters((f) => ({ ...f, is_active: e.target.value })); setCurrentPage(1); }}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
            >
              <option value="">Tất cả</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Khác</label>
            <label className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer transition-colors select-none ${
              filters.is_deleted
                ? "border-red-400 bg-red-50 text-red-700"
                : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
            }`}>
              <input
                type="checkbox"
                checked={filters.is_deleted}
                onChange={(e) => { setFilters((f) => ({ ...f, is_deleted: e.target.checked })); setCurrentPage(1); }}
                className="accent-red-500"
              />
              <span className="font-medium">Đã xóa</span>
            </label>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="relative z-10 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-4 py-3">Franchise</th>
                <th className="px-4 py-3">Tỷ lệ tích điểm</th>
                <th className="px-4 py-3">Giới hạn đổi</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {items.map((it) => {
                const franchiseName = it.franchise_id ? (franchiseNameMap[it.franchise_id] || it.franchise_id) : "N/A";
                return (
                  <tr key={it.id || it._id} className={`${it.is_deleted ? "bg-red-50" : "hover:bg-slate-50"}`}>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-900">{franchiseName}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {it.earn_amount_per_point.toLocaleString("vi-VN")}đ = 1đ
                      <br/>
                      <span className="text-xs text-slate-500">1đ = {it.redeem_value_per_point.toLocaleString("vi-VN")}đ</span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      Từ {it.min_redeem_points}đ đến {it.max_redeem_points}đ
                    </td>
                    <td className="px-4 py-3">
                      {it.is_deleted ? (
                        <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">Đã xóa</span>
                      ) : it.is_active ? (
                        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">Active</span>
                      ) : (
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">Inactive</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          title="Chỉnh sửa"
                          onClick={() => handleOpenEdit(it)}
                          className="inline-flex items-center justify-center size-8 rounded-lg border border-slate-200 bg-white text-slate-500 hover:border-primary-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        {!it.is_deleted && (
                          <button
                            title={it.is_active ? "Hủy kích hoạt" : "Kích hoạt"}
                            onClick={() => handleToggleStatus(it)}
                            className={`inline-flex items-center justify-center size-8 rounded-lg border transition-colors ${
                              it.is_active
                                ? "border-amber-200 bg-white text-amber-500 hover:border-amber-400 hover:bg-amber-50"
                                : "border-emerald-200 bg-white text-emerald-500 hover:border-emerald-400 hover:bg-emerald-50"
                            }`}
                          >
                            {it.is_active ? (
                              <svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                              </svg>
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            )}
                          </button>
                        )}
                        {!it.is_deleted ? (
                          <button
                            title="Xóa"
                            onClick={() => handleDelete(it)}
                            className="inline-flex items-center justify-center size-8 rounded-lg border border-red-200 bg-white text-red-500 hover:border-red-400 hover:bg-red-50 transition-colors"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        ) : (
                          <button
                            title="Khôi phục"
                            onClick={() => handleRestore(it)}
                            className="inline-flex items-center justify-center size-8 rounded-lg border border-emerald-200 bg-white text-emerald-500 hover:border-emerald-400 hover:bg-emerald-50 transition-colors"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {items.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">
                    Không có dữ liệu
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td colSpan={6}>
                    <div className="flex items-center justify-center py-16">
                      <div className="size-10 animate-spin rounded-full border-4 border-primary-200 border-t-primary-500" />
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
            totalItems={totalItems}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={(page) => { setCurrentPage(page); load(page); }}
          />
        </div>
      </div>

      {/* Editor Modal */}
      {showRuleModal && editingRule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => !saving && setShowRuleModal(false)} />
          <div className="relative flex flex-col w-full max-w-4xl max-h-[90vh] rounded-2xl bg-white shadow-2xl overflow-hidden">
            
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 bg-white z-10">
              <h2 className="text-xl font-bold text-slate-900">
                {(editingRule._id || editingRule.id) ? "Chỉnh sửa Quy tắc Tích điểm" : "Thêm mới Quy tắc Tích điểm"}
              </h2>
            </div>
            
            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left Column: Rules */}
                <div className="space-y-6">
                  <div className="space-y-2 border-b pb-4">
                    <h3 className="font-semibold text-slate-800 text-sm uppercase tracking-wide">Chi nhánh áp dụng</h3>
                    <select
                      value={editingRule.franchise_id || ""}
                      onChange={(e) => setEditingRule({ ...editingRule, franchise_id: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                    >
                      <option value="" disabled>-- Chọn Franchise --</option>
                      {franchises.map(f => (
                        <option key={f.value} value={f.value}>{f.name} ({f.code})</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-semibold text-slate-800 text-sm uppercase tracking-wide">Quy đổi điểm</h3>
                    
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">Giá trị đơn hàng để được 1 điểm</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="1000"
                          step="1000"
                          value={editingRule.earn_amount_per_point}
                          onChange={(e) => setEditingRule({ ...editingRule, earn_amount_per_point: Number(e.target.value) })}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                        />
                        <span className="text-slate-500 text-sm">VNĐ = 1 điểm</span>
                      </div>
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">Giá trị thực tế của 1 điểm</label>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 text-sm">1 điểm =</span>
                        <input
                          type="number"
                          min="100"
                          step="100"
                          value={editingRule.redeem_value_per_point}
                          onChange={(e) => setEditingRule({ ...editingRule, redeem_value_per_point: Number(e.target.value) })}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                        />
                        <span className="text-slate-500 text-sm">VNĐ</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-semibold text-slate-800 text-sm uppercase tracking-wide">Giới hạn đổi điểm mỗi đơn</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-500">Tối thiểu (điểm)</label>
                        <input
                          type="number"
                          min="1"
                          value={editingRule.min_redeem_points}
                          onChange={(e) => setEditingRule({ ...editingRule, min_redeem_points: Number(e.target.value) })}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-500">Tối đa (điểm)</label>
                        <input
                          type="number"
                          min="1"
                          value={editingRule.max_redeem_points}
                          onChange={(e) => setEditingRule({ ...editingRule, max_redeem_points: Number(e.target.value) })}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: Tiers */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-slate-800 md:col-span-2 text-sm uppercase tracking-wide">Quyền lợi theo thứ hạng</h3>
                  <div className="space-y-3">
                    {editingRule.tier_rules?.map((tierRule, index) => (
                      <div key={index} className="rounded-xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-bold text-primary-600">{tierRule.tier}</h4>
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-slate-500 font-medium">Lên hạng:</span>
                            <input
                              type="number"
                              value={tierRule.min_points}
                              onChange={(e) => {
                                const newTierRules = [...editingRule.tier_rules];
                                newTierRules[index].min_points = Number(e.target.value);
                                setEditingRule({ ...editingRule, tier_rules: newTierRules });
                              }}
                              className="w-16 rounded border border-slate-300 px-1 py-0.5 text-center outline-none"
                            />
                            <span className="text-slate-500">điểm</span>
                          </div>
                        </div>
                        
                        {/* Cấu hình lợi ích hạng */}
                        <div className="space-y-2 mt-2">
                          <div className="flex items-center justify-between">
                            <label className="text-xs text-slate-600">Giảm giá đơn hàng (%)</label>
                            <input 
                              type="number" 
                              min="0" 
                              max="100"
                              className="w-16 rounded border px-2 py-0.5 text-sm"
                              value={tierRule.benefit?.order_discount_percent || 0}
                              onChange={(e) => handleUpdateTierBenefit(index, 'order_discount_percent', Number(e.target.value))}
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <label className="text-xs text-slate-600">Hệ số nhân tích điểm (x)</label>
                            <input 
                              type="number" 
                              min="1" 
                              step="0.1"
                              className="w-16 rounded border px-2 py-0.5 text-sm"
                              value={tierRule.benefit?.earn_multiplier || 1}
                              onChange={(e) => handleUpdateTierBenefit(index, 'earn_multiplier', Number(e.target.value))}
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <label className="text-xs text-slate-600">Miễn phí giao hàng</label>
                            <input 
                              type="checkbox" 
                              className="w-4 h-4 rounded border"
                              checked={tierRule.benefit?.free_shipping || false}
                              onChange={(e) => handleUpdateTierBenefit(index, 'free_shipping', e.target.checked)}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 flex items-center justify-end gap-3 border-t border-slate-100 bg-white z-10 shrink-0">
              <Button variant="outline" onClick={() => setShowRuleModal(false)} disabled={saving}>Hủy</Button>
              <Button onClick={handleSaveRule} disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu cài đặt'}</Button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

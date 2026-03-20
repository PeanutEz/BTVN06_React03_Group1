import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import ReactDOM from "react-dom";
import { useConfirm } from "../../../components";
import { categoryFranchiseService } from "../../../services/category-franchise.service";
import { categoryService } from "../../../services/category.service";
import { fetchFranchiseSelect, type FranchiseSelectItem } from "../../../services/store.service";
import type { CategoryFranchiseApiResponse, CategorySelectItem } from "../../../models/product.model";
import { showError, showSuccess } from "../../../utils";
import Pagination from "../../../components/ui/Pagination";
import { useManagerFranchiseId } from "../../../hooks/useManagerFranchiseId";

const PAGE_SIZE = 10;

// ── Portal Combobox ──────────────────────────────────────────────────────────
interface PortalComboboxProps {
  value: string;
  placeholder: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  allLabel?: string;
  disabled?: boolean;
}
function PortalCombobox({ value, placeholder, options, onChange, allLabel = "-- Tất cả --", disabled }: PortalComboboxProps) {
  const [open, setOpen] = useState(false);
  const [keyword, setKeyword] = useState("");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (triggerRef.current?.contains(e.target as Node) || dropRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const filtered = useMemo(() => {
    if (!keyword.trim()) return options;
    const k = keyword.toLowerCase();
    return options.filter(o => o.label.toLowerCase().includes(k));
  }, [options, keyword]);

  const selectedLabel = options.find(o => o.value === value)?.label;
  return (
    <>
      {disabled ? (
        <div className="flex w-full items-center justify-between rounded-lg border border-primary-500/50 bg-primary-500/10 px-3 py-2 text-sm text-white cursor-not-allowed">
          <span className="truncate font-medium">{value ? (selectedLabel ?? value) : allLabel}</span>
          <svg className="ml-2 size-4 shrink-0 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
      ) : (
        <button
          ref={triggerRef}
          type="button"
          onClick={() => {
            setRect(triggerRef.current?.getBoundingClientRect() ?? null);
            setOpen(o => !o);
          }}
          className="flex w-full items-center justify-between rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-left text-sm text-white outline-none transition hover:bg-white/15"
        >
          <span className="truncate">{value ? (selectedLabel ?? value) : allLabel}</span>
          <svg className={`ml-2 size-4 shrink-0 text-white/40 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      )}
      {open && !disabled && rect && ReactDOM.createPortal(
        <div
          ref={dropRef}
          style={{ position: "fixed", top: rect.bottom + 4, left: rect.left, width: Math.max(rect.width, 200), zIndex: 99999, background: "rgba(15,23,42,0.97)", backdropFilter: "blur(16px)" }}
          className="rounded-xl border border-white/15 shadow-2xl overflow-hidden"
        >
          <div className="border-b border-white/10 px-3 py-2">
            <input autoFocus value={keyword} onChange={e => setKeyword(e.target.value)} placeholder={placeholder}
              className="w-full rounded-md border border-white/15 bg-white/10 text-white placeholder-white/30 px-2.5 py-1.5 text-xs outline-none focus:border-primary-500" />
          </div>
          <div className="max-h-56 overflow-y-auto py-1">
            <button type="button" onClick={() => { onChange(""); setOpen(false); setKeyword(""); }}
              className={`flex w-full px-3 py-2 text-left text-xs font-semibold ${!value ? "bg-primary-500/20 text-primary-400" : "text-white/60 hover:bg-white/10"}`}>
              {allLabel}
            </button>
            {filtered.map(o => (
              <button key={o.value} type="button" onClick={() => { onChange(o.value); setOpen(false); setKeyword(""); }}
                className={`flex w-full px-3 py-2 text-left text-xs truncate ${value === o.value ? "bg-primary-500/20 text-primary-400" : "text-white/80 hover:bg-white/10"}`}>
                {o.label}
              </button>
            ))}
            {filtered.length === 0 && <div className="px-3 py-2 text-xs text-white/30">Không tìm thấy</div>}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function CategoryFranchisePage() {
  const showConfirm = useConfirm();
  const managerFranchiseId = useManagerFranchiseId();
  const params = useParams<{ id?: string; franchiseId?: string }>();
  const routeFranchiseId = params.franchiseId ?? params.id;
  const isStandalone = !routeFranchiseId;

  const [franchises, setFranchises] = useState<FranchiseSelectItem[]>([]);
  const [categories, setCategories] = useState<CategorySelectItem[]>([]);
  const [items, setItems] = useState<CategoryFranchiseApiResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Filters — nếu là manager thì lock vào franchise của họ
  const [selectedFranchiseId, setSelectedFranchiseId] = useState(routeFranchiseId ?? managerFranchiseId ?? "");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterDeleted, setFilterDeleted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [createFranchiseId, setCreateFranchiseId] = useState(routeFranchiseId ?? managerFranchiseId ?? "");
  const [createCategoryId, setCreateCategoryId] = useState("");
  const [createDisplayOrder, setCreateDisplayOrder] = useState(1);

  // Inline edit display order
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingOrder, setEditingOrder] = useState(0);

  const franchiseId = isStandalone ? selectedFranchiseId : (routeFranchiseId ?? "");

  const franchiseOptions = useMemo(() =>
    franchises.map(f => ({ value: f.value, label: `${f.name} (${f.code})` })), [franchises]);
  const categoryOptions = useMemo(() =>
    categories.map(c => ({ value: c.value, label: `${c.name} (${c.code})` })), [categories]);
  useEffect(() => {
    fetchFranchiseSelect().then(setFranchises).catch(() => {});
    categoryService.getSelectCategories().then(setCategories).catch(() => {});
  }, []);

  // Sync khi managerFranchiseId thay đổi (store hydrate muộn)
  useEffect(() => {
    if (!managerFranchiseId) return;
    if (!routeFranchiseId) setSelectedFranchiseId(managerFranchiseId);
    setCreateFranchiseId(managerFranchiseId);
  }, [managerFranchiseId]);

  const load = async (page = 1, fid = franchiseId) => {
    if (!fid) { setItems([]); setTotalItems(0); setTotalPages(1); return; }
    setLoading(true);
    try {
      const res = await categoryFranchiseService.searchCategoryFranchises({
        searchCondition: {
          franchise_id: fid,
          ...(filterStatus !== "" && { is_active: filterStatus === "true" }),
          is_deleted: filterDeleted,
        },
        pageInfo: { pageNum: page, pageSize: PAGE_SIZE },
      });
      let data = res.data ?? [];
      if (searchQuery.trim()) {
        const kw = searchQuery.toLowerCase();
        data = data.filter(it => it.category_name?.toLowerCase().includes(kw) || it.category_code?.toLowerCase().includes(kw));
      }
      setItems(data);
      setCurrentPage(page);
      setTotalPages(res.pageInfo?.totalPages ?? 1);
      setTotalItems(res.pageInfo?.totalItems ?? data.length);
    } catch { showError("Không tải được dữ liệu"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(1, franchiseId); }, [franchiseId, filterStatus, filterDeleted]);

  const handleDelete = async (it: CategoryFranchiseApiResponse) => {
    if (!await showConfirm({ message: `Xóa danh mục "${it.category_name}"?`, variant: "danger" })) return;
    setSubmitting(true);
    try { await categoryFranchiseService.deleteCategoryFranchise(it.id); showSuccess("Đã xóa"); load(currentPage); }
    catch { showError("Xóa thất bại"); } finally { setSubmitting(false); }
  };

  const handleRestore = async (it: CategoryFranchiseApiResponse) => {
    if (!await showConfirm({ message: `Khôi phục danh mục "${it.category_name}"?`, variant: "warning" })) return;
    setSubmitting(true);
    try { await categoryFranchiseService.restoreCategoryFranchise(it.id); showSuccess("Đã khôi phục"); load(currentPage); }
    catch { showError("Khôi phục thất bại"); } finally { setSubmitting(false); }
  };

  const handleToggleStatus = async (it: CategoryFranchiseApiResponse) => {
    const next = !it.is_active;
    if (!await showConfirm({ message: `Đổi trạng thái sang ${next ? "Active" : "Inactive"}?`, variant: "warning" })) return;
    setSubmitting(true);
    try { await categoryFranchiseService.changeCategoryFranchiseStatus(it.id, next); showSuccess("Đã cập nhật"); load(currentPage); }
    catch { showError("Cập nhật thất bại"); } finally { setSubmitting(false); }
  };

  const handleSaveOrder = async (it: CategoryFranchiseApiResponse) => {
    setSubmitting(true);
    try { await categoryFranchiseService.changeCategoryDisplayOrder(it.id, editingOrder); showSuccess("Đã cập nhật"); setEditingId(null); load(currentPage); }
    catch { showError("Cập nhật thất bại"); } finally { setSubmitting(false); }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createFranchiseId) { showError("Vui lòng chọn franchise"); return; }
    if (!createCategoryId) { showError("Vui lòng chọn danh mục"); return; }
    setSubmitting(true);
    try {
      await categoryFranchiseService.createCategoryFranchise({ franchise_id: createFranchiseId, category_id: createCategoryId, display_order: createDisplayOrder });
      showSuccess("Tạo thành công");
      setShowCreate(false); setCreateCategoryId(""); setCreateDisplayOrder(1);
      if (createFranchiseId === franchiseId) load(1);
    } catch { showError("Tạo thất bại"); } finally { setSubmitting(false); }
  };

  const franchiseName = franchises.find(f => f.value === franchiseId)?.name;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-white sm:text-2xl">Category Franchises</h1>
          <p className="text-xs text-white/50 sm:text-sm">
            {franchiseId
              ? <>Franchise: <span className="font-medium text-white/80">{franchiseName ?? franchiseId}</span> — {totalItems} bản ghi</>
              : "Chọn franchise để xem danh mục"}
          </p>
        </div>
        <button type="button" disabled={!franchiseId}
          onClick={() => { setCreateFranchiseId(franchiseId); setShowCreate(true); }}
          className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition disabled:opacity-40"
          style={{ background: "rgba(239,68,68,0.25)", border: "1px solid rgba(239,68,68,0.4)" }}>
          <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Thêm mới
        </button>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex flex-wrap gap-3 items-end">          {isStandalone && (
            <div className="space-y-1.5 min-w-[220px]">
              <label className="text-xs font-semibold uppercase tracking-wide text-white/50">Franchise</label>
              <PortalCombobox value={selectedFranchiseId} placeholder="Tìm franchise..." options={franchiseOptions}
                onChange={v => { setSelectedFranchiseId(v); setCurrentPage(1); }} allLabel="-- Chọn franchise --"
                disabled={!!managerFranchiseId} />
            </div>
          )}
          <div className="space-y-1.5 flex-1 min-w-[180px]">
            <label className="text-xs font-semibold uppercase tracking-wide text-white/50">Tìm kiếm</label>
            <div className="flex gap-2">
              <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={e => e.key === "Enter" && load(1)}
                placeholder="Tên hoặc mã danh mục..."
                className="flex-1 rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-primary-500" />
              <button type="button" onClick={() => load(1)}
                className="rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-white hover:bg-white/15 transition">
                <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 104.5 4.5a7.5 7.5 0 0012.15 12.15z" />
                </svg>
              </button>
            </div>
          </div>
          <div className="space-y-1.5 min-w-[140px]">
            <label className="text-xs font-semibold uppercase tracking-wide text-white/50">Trạng thái</label>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="w-full rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm text-white outline-none hover:bg-white/15">
              <option value="" className="bg-slate-800">-- Tất cả --</option>
              <option value="true" className="bg-slate-800">Active</option>
              <option value="false" className="bg-slate-800">Inactive</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-white/50 block">&nbsp;</label>
            <label className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer select-none transition ${filterDeleted ? "border-red-400/60 bg-red-500/20 text-red-300" : "border-white/15 bg-white/10 text-white/70 hover:bg-white/15"}`}>
              <input type="checkbox" checked={filterDeleted} onChange={e => setFilterDeleted(e.target.checked)} className="accent-red-500" />
              <span className="font-medium">Đã xóa</span>
            </label>
          </div>
        </div>
      </div>

      {/* Empty state */}
      {!franchiseId && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/5 py-20 text-center">
          <svg className="size-12 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" />
          </svg>
          <p className="text-white/40 text-sm">Chọn franchise để xem danh mục</p>
        </div>
      )}

      {/* Table */}
      {franchiseId && (
        <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/5">
          <table className="w-full text-sm">
            <thead className="border-b border-white/10 bg-white/5 text-xs font-semibold uppercase tracking-wide text-white/50">
              <tr>
                <th className="px-4 py-3 text-left">#</th>
                <th className="px-4 py-3 text-left">Danh mục</th>
                <th className="px-4 py-3 text-left">Mã</th>
                <th className="px-4 py-3 text-left">Franchise</th>
                <th className="px-4 py-3 text-center">Order</th>
                <th className="px-4 py-3 text-center">Trạng thái</th>
                <th className="px-4 py-3 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading && <tr><td colSpan={7} className="py-10 text-center text-white/40">Đang tải...</td></tr>}
              {!loading && items.length === 0 && <tr><td colSpan={7} className="py-10 text-center text-white/40">Không có dữ liệu</td></tr>}
              {!loading && items.map((it, idx) => (
                <tr key={it.id} className={`transition-colors ${it.is_deleted ? "bg-red-500/5" : "hover:bg-white/5"}`}>
                  <td className="px-4 py-3 text-white/40 text-xs">{(currentPage - 1) * PAGE_SIZE + idx + 1}</td>
                  <td className="px-4 py-3 text-white/90 font-medium">{it.category_name ?? "—"}</td>
                  <td className="px-4 py-3 text-white/50 font-mono text-xs">{it.category_code ?? "—"}</td>
                  <td className="px-4 py-3 text-white/60 text-xs">{it.franchise_name ?? it.franchise_code ?? it.franchise_id}</td>

                  {/* Display order inline */}
                  <td className="px-4 py-3 text-center">
                    {editingId === it.id ? (
                      <div className="flex items-center justify-center gap-1">
                        <input type="number" min={1} value={editingOrder} onChange={e => setEditingOrder(Number(e.target.value))} autoFocus
                          className="w-14 rounded border border-white/20 bg-white/10 px-1.5 py-0.5 text-center text-xs text-white outline-none" />
                        <button type="button" disabled={submitting} onClick={() => handleSaveOrder(it)}
                          className="rounded bg-emerald-500/20 border border-emerald-400/40 px-1.5 py-0.5 text-xs text-emerald-400 hover:bg-emerald-500/30">✓</button>
                        <button type="button" onClick={() => setEditingId(null)}
                          className="rounded bg-white/10 border border-white/15 px-1.5 py-0.5 text-xs text-white/50 hover:bg-white/15">✕</button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => { setEditingId(it.id); setEditingOrder(it.display_order); }}
                        className="rounded px-2 py-0.5 text-xs text-white/60 hover:bg-white/10 tabular-nums">
                        {it.display_order}
                        <svg className="inline ml-1 size-3 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a2 2 0 01-1.415.586H9v-2.414a2 2 0 01.586-1.414L9 13z" />
                        </svg>
                      </button>
                    )}
                  </td>

                  {/* Status badge */}
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${it.is_active ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
                      {it.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>

                  {/* Action buttons */}
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1.5">
                      <button type="button" title={it.is_active ? "Tắt" : "Bật"} disabled={submitting} onClick={() => handleToggleStatus(it)}
                        className={`inline-flex items-center justify-center size-8 rounded-lg border transition-colors ${it.is_active ? "border-amber-400/40 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20" : "border-emerald-400/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"}`}>
                        {it.is_active
                          ? <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                          : <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        }
                      </button>
                      {it.is_deleted ? (
                        <button type="button" title="Khôi phục" disabled={submitting} onClick={() => handleRestore(it)}
                          className="inline-flex items-center justify-center size-8 rounded-lg border border-emerald-400/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors">
                          <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                        </button>
                      ) : (
                        <button type="button" title="Xóa" disabled={submitting} onClick={() => handleDelete(it)}
                          className="inline-flex items-center justify-center size-8 rounded-lg border border-red-400/40 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors">
                          <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}      {/* Pagination */}
      {franchiseId && totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={p => load(p)}
          totalItems={totalItems}
          itemsPerPage={PAGE_SIZE}
          variant="dark"
        />
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowCreate(false)} />
          <div className="relative w-full max-w-md rounded-2xl p-6 shadow-2xl"
            style={{ background: "rgba(15,23,42,0.95)", backdropFilter: "blur(40px)", border: "1px solid rgba(255,255,255,0.12)", boxShadow: "0 25px 60px rgba(0,0,0,0.5)" }}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-bold text-white">Thêm Category Franchise</h2>
                <p className="text-xs text-white/40 mt-0.5">Gán danh mục vào franchise</p>
              </div>
              <button type="button" onClick={() => setShowCreate(false)}
                className="rounded-lg border border-white/15 bg-white/10 p-1.5 text-white/50 hover:bg-white/15 transition">
                <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-white/50">Franchise <span className="text-red-400">*</span></label>
                <PortalCombobox value={createFranchiseId} placeholder="Tìm franchise..." options={franchiseOptions} onChange={setCreateFranchiseId} allLabel="-- Chọn franchise --" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-white/50">Danh mục <span className="text-red-400">*</span></label>
                <PortalCombobox value={createCategoryId} placeholder="Tìm danh mục..." options={categoryOptions} onChange={setCreateCategoryId} allLabel="-- Chọn danh mục --" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-white/50">Display Order</label>
                <input type="number" min={1} value={createDisplayOrder} onChange={e => setCreateDisplayOrder(Number(e.target.value))}
                  className="w-full rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm text-white outline-none focus:border-primary-500" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowCreate(false)}
                  className="rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-white/70 hover:bg-white/15 transition">Hủy</button>
                <button type="submit" disabled={submitting}
                  className="rounded-xl px-4 py-2 text-sm font-semibold text-white transition disabled:opacity-50"
                  style={{ background: "rgba(239,68,68,0.3)", border: "1px solid rgba(239,68,68,0.5)" }}>
                  {submitting ? "Đang tạo..." : "Tạo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
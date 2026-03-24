import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import ReactDOM from "react-dom";
import { Button, useConfirm } from "../../../components";
import { TimeSelect } from "../../../components/ui/TimeSelect";
import {
  createShift,
  deleteShift,
  restoreShift,
  changeShiftStatus,
  updateShift,
  searchShifts,
} from "../../../services/shift.service";
import type { Shift, CreateShiftPayload } from "../../../services/shift.service";
import { fetchFranchiseSelect } from "../../../services/store.service";
import type { FranchiseSelectItem } from "../../../services/store.service";
import Pagination from "../../../components/ui/Pagination";
import { showSuccess, showError } from "../../../utils";
import { useManagerFranchiseId } from "../../../hooks/useManagerFranchiseId";

const ITEMS_PER_PAGE = 10;

const DEFAULT_FORM: CreateShiftPayload = {
  franchise_id: "",
  name: "",
  start_time: "",
  end_time: "",
};

const ShiftPage = () => {
  const showConfirm = useConfirm();
  const managerFranchiseId = useManagerFranchiseId();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState<CreateShiftPayload>({ ...DEFAULT_FORM });
  const [submitting, setSubmitting] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const [searchName, setSearchName] = useState("");
  const [filterFranchise, setFilterFranchise] = useState(managerFranchiseId ?? "");
  const [showDeleted, setShowDeleted] = useState(false);

  // franchise combobox (filter)
  const [franchiseComboOpen, setFranchiseComboOpen] = useState(false);
  const [franchiseKeyword, setFranchiseKeyword] = useState("");
  const franchiseComboRef = useRef<HTMLDivElement>(null);

  // franchise combobox inside modal — using portal
  const [modalFranchiseOpen, setModalFranchiseOpen] = useState(false);
  const [modalFranchiseKeyword, setModalFranchiseKeyword] = useState("");
  const modalFranchiseTriggerRef = useRef<HTMLButtonElement>(null);
  const modalFranchiseDropdownRef = useRef<HTMLDivElement>(null);
  const [modalFranchiseRect, setModalFranchiseRect] = useState<DOMRect | null>(null);

  const openModalFranchise = useCallback(() => {
    if (modalFranchiseTriggerRef.current) {
      setModalFranchiseRect(modalFranchiseTriggerRef.current.getBoundingClientRect());
    }
    setModalFranchiseOpen(true);
  }, []);

  const closeModalFranchise = useCallback(() => {
    setModalFranchiseOpen(false);
    setModalFranchiseKeyword("");
  }, []);

  const [franchises, setFranchises] = useState<FranchiseSelectItem[]>([]);

  const hasRun = useRef(false);

  const loadFranchises = async () => {
    try {
      const data = await fetchFranchiseSelect();
      setFranchises(data);
    } catch {
      // ignore
    }
  };

  const load = async (
    name = searchName,
    franchiseId = filterFranchise,
    page = currentPage,
    isDeleted = showDeleted,
  ) => {
    setLoading(true);
    try {
      const result = await searchShifts({
        searchCondition: {
          name,
          franchise_id: franchiseId || undefined,
          is_deleted: isDeleted,
        },
        pageInfo: { pageNum: page, pageSize: ITEMS_PER_PAGE },
      });
      setShifts(result.data);
      setTotalPages(result.pageInfo.totalPages);
      setTotalItems(result.pageInfo.totalItems);
      setCurrentPage(result.pageInfo.pageNum);
    } catch {
      showError("Lấy danh sách ca làm việc thất bại");
    } finally {
      setLoading(false);
    }
  };  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;
    const initFranchise = managerFranchiseId ?? "";
    if (initFranchise) setFilterFranchise(initFranchise);
    load("", initFranchise, 1);
    loadFranchises();
  }, []);
  // Sync khi managerFranchiseId thay đổi (store hydrate muộn)
  useEffect(() => {
    if (!managerFranchiseId) return;
    setFilterFranchise(managerFranchiseId);
    load(searchName, managerFranchiseId, 1, showDeleted);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [managerFranchiseId]);

  // Sync franchiseKeyword khi options load xong và đang là manager
  useEffect(() => {
    if (!managerFranchiseId || !franchises.length) return;
    const found = franchises.find(f => f.value === managerFranchiseId);
    if (found) setFranchiseKeyword(`${found.name} (${found.code})`);
  }, [managerFranchiseId, franchises]);

  // click-outside franchise combobox
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (franchiseComboRef.current && !franchiseComboRef.current.contains(e.target as Node)) {
        setFranchiseComboOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // click-outside modal franchise portal dropdown
  useEffect(() => {
    if (!modalFranchiseOpen) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!modalFranchiseTriggerRef.current?.contains(t) && !modalFranchiseDropdownRef.current?.contains(t)) {
        closeModalFranchise();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [modalFranchiseOpen, closeModalFranchise]);

  const filteredFranchisesForCombo = useMemo(() => {
    if (!franchiseKeyword.trim()) return franchises;
    const k = franchiseKeyword.trim().toLowerCase();
    return franchises.filter(f =>
      (f.name || "").toLowerCase().includes(k) ||
      (f.code || "").toLowerCase().includes(k)
    );
  }, [franchises, franchiseKeyword]);

  const filteredModalFranchises = useMemo(() => {
    if (!modalFranchiseKeyword.trim()) return franchises;
    const k = modalFranchiseKeyword.trim().toLowerCase();
    return franchises.filter(f =>
      (f.name || "").toLowerCase().includes(k) ||
      (f.code || "").toLowerCase().includes(k)
    );
  }, [franchises, modalFranchiseKeyword]);

  const handleOpenCreate = () => {    setFormData({ ...DEFAULT_FORM });
    setEditingShift(null);
    setFormErrors({});
    setShowModal(true);
  };

  const handleOpenEdit = (shift: Shift) => {
    setEditingShift(shift);    setFormData({
      franchise_id: shift.franchise_id,
      name: shift.name,
      start_time: shift.start_time,
      end_time: shift.end_time,
    });
    setFormErrors({});
    setShowModal(true);
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.franchise_id) { setFormErrors({ franchise_id: "Vui lòng chọn franchise" }); return; }
    if (!formData.name.trim()) { setFormErrors({ name: "Vui lòng nhập tên ca" }); return; }
    setFormErrors({});
    setSubmitting(true);
    try {
      if (editingShift) {
        await updateShift(editingShift.id, {
          name: formData.name,
          start_time: formData.start_time,
          end_time: formData.end_time,
        });
        showSuccess("Cập nhật ca làm việc thành công");
      } else {
        await createShift(formData);
        showSuccess("Tạo ca làm việc thành công");
      }
      setShowModal(false);
      await load();
    } catch (err: unknown) {
      const responseData = (err as any)?.responseData ?? (err as any)?.response?.data;
      const apiErrors: Array<{ field?: string; message?: string }> = responseData?.errors ?? [];
      if (apiErrors.length > 0) {
        const fieldErrors: Record<string, string> = {};
        apiErrors.forEach(e => { if (e.field && e.message) fieldErrors[e.field] = e.message; });
        if (Object.keys(fieldErrors).length > 0) { setFormErrors(fieldErrors); return; }
      }
      const msg = responseData?.message || (err instanceof Error ? err.message : null) || (editingShift ? "Cập nhật thất bại" : "Tạo ca thất bại");
      setFormErrors({ general: msg });
    } finally {
      setSubmitting(false);
    }
  };

  const extractErrMsg = (err: unknown, fallback: string) =>
    (err as { response?: { data?: { message?: string; errors?: { message: string }[] } } })
      ?.response?.data?.message ||
    (err as { response?: { data?: { errors?: { message: string }[] } } })
      ?.response?.data?.errors?.[0]?.message ||
    (err instanceof Error ? err.message : null) ||
    fallback;

  const handleDelete = async (shift: Shift) => {
    if (!await showConfirm({ message: `Bạn có chắc muốn xóa ca "${shift.name}"?`, variant: "danger", confirmText: "Xóa" })) return;
    setSubmitting(true);
    try {
      await deleteShift(shift.id);
      showSuccess(`Đã xóa ca "${shift.name}"`);
      await load();
    } catch (err) {
      showError(extractErrMsg(err, "Xóa ca làm việc thất bại"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleRestore = async (shift: Shift) => {
    if (!await showConfirm({ message: `Bạn có chắc muốn khôi phục ca "${shift.name}"?`, variant: "warning", confirmText: "Khôi phục" })) return;
    setSubmitting(true);
    try {
      await restoreShift(shift.id);
      showSuccess(`Đã khôi phục ca "${shift.name}"`);
      await load(searchName, filterFranchise, currentPage, showDeleted);
    } catch {
      showError("Khôi phục ca làm việc thất bại");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (shift: Shift) => {
    const action = shift.is_active ? "Vô hiệu hóa" : "Kích hoạt";
    if (!await showConfirm({ message: `Bạn có chắc muốn ${action} ca "${shift.name}"?`, variant: "warning" })) return;
    setSubmitting(true);
    try {
      await changeShiftStatus(shift.id, !shift.is_active);
      showSuccess(`Đã ${action} ca "${shift.name}"`);
      await load();
    } catch (err) {
      showError(extractErrMsg(err, `${action} ca làm việc thất bại`));
    } finally {
      setSubmitting(false);
    }
  };

  const getFranchiseName = (id: string) =>
    franchises.find((f) => f.value === id)?.name ?? id;

  const selectedModalFranchise = franchises.find(f => f.value === formData.franchise_id);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Quản lý ca làm việc</h1>
          <p className="text-xs sm:text-sm text-slate-600">Quản lý ca làm việc hệ thống</p>
        </div>
        <Button onClick={handleOpenCreate}>+ Tạo ca làm việc</Button>
      </div>      {/* Search bar */}
      <div className="relative z-20 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap gap-3">
          {/* Search name */}
          <div className="relative flex-1 min-w-48">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Tên ca</label>
            <div className="relative">
              <svg className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Tìm kiếm theo tên ca..."
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") load(searchName, filterFranchise, 1, showDeleted); }}
                className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-4 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              />
            </div>
          </div>          {/* Franchise custom combobox */}
          <div className="min-w-[200px]" ref={franchiseComboRef}>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Franchise</label>
            <div className="relative">
              {managerFranchiseId ? (
                <div className="flex w-full items-center justify-between rounded-lg border border-primary-500/50 bg-primary-500/10 px-3 py-2 text-sm text-white cursor-not-allowed">
                  <span className="truncate font-medium">
                    {filterFranchise ? (franchises.find(f => f.value === filterFranchise)?.name || filterFranchise) : "-- Tất cả --"}
                  </span>
                  <svg className="ml-2 size-4 flex-shrink-0 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
              ) : (                <button
                  type="button"
                  onClick={() => setFranchiseComboOpen((o) => !o)}
                  className="flex w-full items-center justify-between rounded-lg border border-white/[0.15] bg-slate-800 px-3 py-2 text-left text-sm text-white/90 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                >
                  <span className="truncate">
                    {filterFranchise ? (franchises.find(f => f.value === filterFranchise)?.name || filterFranchise) : "-- Tất cả --"}
                  </span>
                  <svg className="ml-2 size-4 flex-shrink-0 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              )}
              {franchiseComboOpen && (
                <div className="absolute left-0 right-0 z-50 mt-1 rounded-lg border border-white/[0.15] bg-slate-800 shadow-lg">
                  <div className="border-b border-white/[0.12] px-3 py-2">
                    <input
                      autoFocus
                      value={franchiseKeyword}
                      onChange={(e) => setFranchiseKeyword(e.target.value)}
                      placeholder="Tìm theo tên hoặc mã..."
                      className="w-full rounded-md border border-white/[0.15] bg-white/[0.08] text-white/90 placeholder-white/40 px-2.5 py-1.5 text-xs outline-none transition focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30"
                    />
                  </div>
                  <div className="max-h-56 overflow-y-auto py-1">
                    <button
                      type="button"
                      onMouseDown={() => {
                        setFilterFranchise("");
                        setFranchiseKeyword("");
                        setFranchiseComboOpen(false);
                        load(searchName, "", 1, showDeleted);
                      }}
                      className={`flex w-full items-center px-3 py-2 text-left text-xs font-semibold ${!filterFranchise ? "bg-white/[0.12] text-white" : "text-white/60 hover:bg-white/[0.08]"}`}
                    >
                      -- Tất cả --
                    </button>
                    {filteredFranchisesForCombo.map((f) => (
                      <button
                        key={f.value}
                        type="button"
                        onMouseDown={() => {
                          setFilterFranchise(f.value);
                          setFranchiseKeyword("");
                          setFranchiseComboOpen(false);
                          load(searchName, f.value, 1, showDeleted);
                        }}
                        className={`flex w-full items-center px-3 py-2 text-left text-xs ${filterFranchise === f.value ? "bg-white/[0.12] text-white" : "text-white/80 hover:bg-white/[0.08]"}`}
                      >
                        <span className="truncate">{f.name} ({f.code})</span>
                      </button>
                    ))}
                    {filteredFranchisesForCombo.length === 0 && (
                      <div className="px-3 py-2 text-xs text-white/40">Không tìm thấy franchise</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Đã xóa */}
          <div className="flex flex-col justify-end">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 invisible">&nbsp;</label>
            <label className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer hover:bg-slate-50 transition select-none ${showDeleted ? "border-red-400 bg-red-50 text-red-700" : "border-slate-300 bg-white text-slate-600"}`}>
              <input
                type="checkbox"
                checked={showDeleted}
                onChange={(e) => {
                  const val = e.target.checked;
                  setShowDeleted(val);
                  load(searchName, filterFranchise, 1, val);
                }}
                className="size-4 rounded accent-red-500"
              />
              <span className="font-medium whitespace-nowrap">Đã xóa</span>
            </label>
          </div>

          {/* Tìm kiếm */}
          <div className="flex flex-col justify-end">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 invisible">&nbsp;</label>
            <Button onClick={() => load(searchName, filterFranchise, 1, showDeleted)} loading={loading}>
              Tìm kiếm
            </Button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-4 py-3">Tên ca</th>
                <th className="px-4 py-3">Franchise</th>
                <th className="px-4 py-3">Giờ bắt đầu</th>
                <th className="px-4 py-3">Giờ kết thúc</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3">Ngày tạo</th>
                <th className="px-4 py-3">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {shifts.map((s) => (
                <tr key={s.id} className={`hover:bg-slate-50 ${s.is_deleted ? "bg-red-50/60 opacity-75" : ""}`}>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-900">{s.name}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{getFranchiseName(s.franchise_id)}</td>
                  <td className="px-4 py-3 text-slate-700">{s.start_time}</td>
                  <td className="px-4 py-3 text-slate-700">{s.end_time}</td>
                  <td className="px-4 py-3">
                    {s.is_deleted ? (
                      <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-600">Đã xóa</span>
                    ) : s.is_active ? (
                      <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">Hoạt động</span>
                    ) : (
                      <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">Không hoạt động</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {s.created_at ? new Date(s.created_at).toLocaleDateString("vi-VN") : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {s.is_deleted ? (
                        <button
                          title="Khôi phục ca"
                          onClick={() => handleRestore(s)}
                          disabled={submitting}
                          className="inline-flex items-center justify-center size-8 rounded-lg border border-emerald-300 bg-white text-emerald-600 hover:border-emerald-500 hover:bg-emerald-50 transition-colors disabled:opacity-50"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        </button>
                      ) : (
                        <>
                          <button
                            title="Chỉnh sửa"
                            onClick={() => handleOpenEdit(s)}
                            className="inline-flex items-center justify-center size-8 rounded-lg border border-slate-200 bg-white text-slate-500 hover:border-primary-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                          <button
                            title={s.is_active ? "Vô hiệu hóa" : "Kích hoạt"}
                            onClick={() => handleToggleStatus(s)}
                            disabled={submitting}
                            className={`inline-flex items-center justify-center size-8 rounded-lg border transition-colors disabled:opacity-50 ${
                              s.is_active
                                ? "border-amber-200 bg-white text-amber-500 hover:border-amber-400 hover:bg-amber-50"
                                : "border-green-200 bg-white text-green-500 hover:border-green-400 hover:bg-green-50"
                            }`}
                          >
                            {s.is_active ? (
                              <svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                              </svg>
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            )}
                          </button>
                          <button
                            title="Xóa ca"
                            onClick={() => handleDelete(s)}
                            disabled={submitting}
                            className="inline-flex items-center justify-center size-8 rounded-lg border border-red-200 bg-white text-red-500 hover:border-red-400 hover:bg-red-50 transition-colors disabled:opacity-50"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {shifts.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-sm text-slate-500">
                    Không có ca làm việc
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
            </tbody>
          </table>
        </div>
        <div className="px-4">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={(page) => { setCurrentPage(page); load(searchName, filterFranchise, page, showDeleted); }}
            totalItems={totalItems}
            itemsPerPage={ITEMS_PER_PAGE}
          />
        </div>
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {editingShift ? "Cập nhật ca làm việc" : "Tạo ca làm việc"}
                </h2>
                <p className="mt-0.5 text-sm text-slate-500">
                  {editingShift ? "Chỉnh sửa thông tin ca" : "Thêm ca mới vào hệ thống"}
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Franchise — portal combobox */}
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Franchise <span className="text-red-500">*</span>
                </label>
                {editingShift ? (
                  <div className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 cursor-not-allowed">
                    {selectedModalFranchise ? `${selectedModalFranchise.name} (${selectedModalFranchise.code})` : formData.franchise_id}
                  </div>
                ) : (
                  <div className="relative">
                    <button
                      ref={modalFranchiseTriggerRef}
                      type="button"
                      onClick={() => modalFranchiseOpen ? closeModalFranchise() : openModalFranchise()}                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        width: "100%",
                        padding: "8px 12px",
                        background: "#1e293b",
                        border: `1px solid ${formErrors.franchise_id ? "#f87171" : "#475569"}`,
                        borderRadius: 8,
                        color: "#f1f5f9",
                        fontSize: 14,
                        cursor: "pointer",
                        outline: "none",
                      }}
                    >
                      <span
                        style={{
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          color: selectedModalFranchise ? "#f1f5f9" : "#94a3b8",
                        }}
                      >
                        {selectedModalFranchise ? `${selectedModalFranchise.name} (${selectedModalFranchise.code})` : "-- Chọn franchise --"}
                      </span>
                      <svg
                        style={{
                          width: 16,
                          height: 16,
                          flexShrink: 0,
                          marginLeft: 8,
                          color: "#94a3b8",
                          transform: modalFranchiseOpen ? "rotate(180deg)" : "rotate(0deg)",
                          transition: "transform 0.2s",
                        }}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {modalFranchiseOpen && modalFranchiseRect && ReactDOM.createPortal(
                      <div
                        ref={modalFranchiseDropdownRef}
                        style={{
                          position: "fixed",
                          top: modalFranchiseRect.bottom + 4,
                          left: modalFranchiseRect.left,
                          width: modalFranchiseRect.width,
                          zIndex: 99999,
                          background: "#1e293b",
                          border: "1px solid #475569",
                          borderRadius: 8,
                          boxShadow: "0 10px 40px rgba(0,0,0,0.7)",
                          overflow: "hidden",
                        }}
                      >
                        <div style={{ padding: "8px 10px", borderBottom: "1px solid #334155" }}>
                          <input
                            autoFocus
                            value={modalFranchiseKeyword}
                            onChange={(e) => setModalFranchiseKeyword(e.target.value)}
                            placeholder="Tìm theo tên hoặc mã..."
                            style={{
                              width: "100%",
                              boxSizing: "border-box",
                              background: "#0f172a",
                              border: "1px solid #475569",
                              borderRadius: 6,
                              padding: "5px 10px",
                              fontSize: 12,
                              color: "#f1f5f9",
                              outline: "none",
                            }}
                          />
                        </div>
                        <div style={{ maxHeight: 220, overflowY: "auto" }}>
                          {filteredModalFranchises.map((f) => (
                            <button
                              key={f.value}
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => {
                                setFormData(p => ({ ...p, franchise_id: f.value }));
                                closeModalFranchise();
                              }}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                width: "100%",
                                padding: "8px 12px",
                                boxSizing: "border-box",
                                background: formData.franchise_id === f.value ? "#334155" : "transparent",
                                color: formData.franchise_id === f.value ? "#f1f5f9" : "#cbd5e1",
                                fontSize: 13,
                                border: "none",
                                cursor: "pointer",
                                textAlign: "left",
                              }}
                            >
                              <span style={{ fontFamily: "monospace", color: "#64748b", fontSize: 10, flexShrink: 0 }}>{f.code}</span>
                              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</span>
                            </button>
                          ))}
                          {filteredModalFranchises.length === 0 && (
                            <div style={{ padding: "10px 12px", fontSize: 12, color: "#64748b", textAlign: "center" }}>Không tìm thấy franchise</div>
                          )}
                        </div>
                      </div>,
                      document.body
                    )}
                  </div>                )}
              </div>
              {formErrors.franchise_id && <p className="!text-[#f87171]" style={{ fontSize: 11, marginTop: 4 }}>{formErrors.franchise_id}</p>}

              {/* Name */}
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Tên ca <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="VD: Ca Sáng"
                  value={formData.name}
                  onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                  className={`w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-primary-500/20 ${formErrors.name ? "border-red-400 focus:border-red-400" : "border-slate-300 focus:border-primary-500"}`}
                />
                {formErrors.name && <p className="!text-[#f87171]" style={{ fontSize: 11, marginTop: 4 }}>{formErrors.name}</p>}
              </div>

              {/* Times */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Giờ bắt đầu <span className="text-red-500">*</span>
                  </label>
                  <TimeSelect
                    value={formData.start_time}
                    onChange={(v) => setFormData((p) => ({ ...p, start_time: v }))}
                  />
                  {formErrors.start_time && <p className="!text-[#f87171]" style={{ fontSize: 11, marginTop: 4 }}>{formErrors.start_time}</p>}
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Giờ kết thúc <span className="text-red-500">*</span>
                  </label>
                  <TimeSelect
                    value={formData.end_time}
                    onChange={(v) => setFormData((p) => ({ ...p, end_time: v }))}
                  />
                  {formErrors.end_time && <p className="!text-[#f87171]" style={{ fontSize: 11, marginTop: 4 }}>{formErrors.end_time}</p>}
                </div>
              </div>

              {formErrors.general && (
                <p className="!text-[#f87171] rounded-lg border border-red-400/30 bg-red-50 px-3 py-2" style={{ fontSize: 12 }}>{formErrors.general}</p>
              )}

              <div className="flex gap-3 pt-2">
                <Button type="submit" loading={submitting} className="flex-1">
                  {editingShift ? "Lưu thay đổi" : "Tạo ca"}
                </Button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 rounded-lg border border-slate-300 bg-white py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShiftPage;

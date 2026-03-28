import { useEffect, useRef, useState, useCallback } from "react";
import ReactDOM from "react-dom";
import { Button, useConfirm } from "../../../components";
import type { ApiFranchise, CreateFranchisePayload } from "../../../services/store.service";
import { searchFranchises, deleteFranchise, getFranchiseById, createFranchise, updateFranchise, changeFranchiseStatus, restoreFranchise } from "../../../services/store.service";

import Pagination from "../../../components/ui/Pagination";
import { showSuccess, showError } from "../../../utils";
import { useLoadingStore } from "../../../store/loading.store";

const CLOUDINARY_CLOUD_NAME = "dn2xh5rxe";
const CLOUDINARY_UPLOAD_PRESET = "btvn06_upload";

async function uploadImageToCloudinary(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    { method: "POST", body: formData }
  );
  if (!res.ok) throw new Error("Upload ảnh lên Cloudinary thất bại");
  const data = await res.json() as { secure_url: string };
  return data.secure_url;
}

const emptyCreateForm: CreateFranchisePayload = {
  code: "",
  name: "",
  opened_at: "10:00",
  closed_at: "23:30",
  hotline: "",
  logo_url: "",
  address: "",
};

const ITEMS_PER_PAGE = 10;

const formatAddress = (address?: string | null) => {
  if (!address) return "-";
  return address.length > 30 ? `${address.slice(0, 30)}...` : address;
};

const FranchiseListPage = () => {
  const showConfirm = useConfirm();
  const { show: showPageLoading, hide: hidePageLoading } = useLoadingStore();
  const [franchises, setFranchises] = useState<ApiFranchise[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0); const [keyword, setKeyword] = useState("");
  const [isActive, setIsActive] = useState("");
  const [isDeleted, setIsDeleted] = useState(false);
  const [viewingFranchise, setViewingFranchise] = useState<ApiFranchise | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState<CreateFranchisePayload>({ ...emptyCreateForm });
  const [creating, setCreating] = useState(false);
  const [createFieldErrors, setCreateFieldErrors] = useState<Record<string, string>>({});
  const [logoPreview, setLogoPreview] = useState<string>("");
  const pendingLogoFileRef = useRef<File | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  // Edit detail state
  const [, setIsEditingDetail] = useState(false);
  const [editForm, setEditForm] = useState<CreateFranchisePayload>({ ...emptyCreateForm });
  const [saving, setSaving] = useState(false);
  const [editLogoPreview, setEditLogoPreview] = useState<string>("");
  const pendingEditLogoFileRef = useRef<File | null>(null);
  const editLogoInputRef = useRef<HTMLInputElement>(null);

  // Refs để giữ latest values — tránh load bị stale closure mà không tạo lại function
  const keywordRef = useRef(keyword);
  const isActiveRef = useRef(isActive);
  const isDeletedRef = useRef(isDeleted);
  const currentPageRef = useRef(currentPage);
  keywordRef.current = keyword;
  isActiveRef.current = isActive;
  isDeletedRef.current = isDeleted;
  currentPageRef.current = currentPage;

  // load KHÔNG nằm trong useCallback có deps → không bao giờ bị tạo lại
  const load = useCallback(async (page?: number) => {
    const pageNum = page ?? currentPageRef.current;
    const kw = keywordRef.current;
    const active = isActiveRef.current;
    const deleted = isDeletedRef.current;

    setLoading(true);
    try {
      const result = await searchFranchises({
        searchCondition: {
          keyword: kw,
          ...(active !== "" && { is_active: active }),
          is_deleted: deleted,
        },
        pageInfo: { pageNum, pageSize: ITEMS_PER_PAGE },
      });
      setFranchises(result.data);
      setTotalPages(result.pageInfo.totalPages);
      setTotalItems(result.pageInfo.totalItems);
      setCurrentPage(result.pageInfo.pageNum);
      currentPageRef.current = result.pageInfo.pageNum;
    } catch (error) {
      console.error("Lỗi tải danh sách franchise:", error);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // deps rỗng — load không bao giờ thay đổi reference

  // Chỉ load 1 lần khi mount
  useEffect(() => {
    load(1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reload khi isActive thay đổi
  const prevIsActive = useRef(isActive);
  useEffect(() => {
    if (isActive === prevIsActive.current) return;
    prevIsActive.current = isActive;
    load(1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  // Reload khi isDeleted thay đổi
  const prevIsDeleted = useRef(isDeleted);
  useEffect(() => {
    if (isDeleted === prevIsDeleted.current) return;
    prevIsDeleted.current = isDeleted;
    load(1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDeleted]);

  const handlePageChange = (page: number) => {
    load(page);
  };

  const handleSearch = () => {
    load(1);
  };
  const handleRestore = async (f: ApiFranchise) => {
    if (!await showConfirm({ message: `Bạn có chắc muốn khôi phục franchise "${f.name}"?`, variant: "warning" })) return;
    try {
      await restoreFranchise(f.id);
      showSuccess(`Đã khôi phục franchise "${f.name}"`);
      load(currentPage);
    } catch {
      showError("Khôi phục franchise thất bại");
    }
  };

  const handleDelete = async (f: ApiFranchise) => {
    if (!await showConfirm({ message: `Bạn có chắc muốn xóa franchise "${f.name}"? Hành động này không thể hoàn tác.`, variant: "danger" })) return;
    try {
      await deleteFranchise(f.id);
      showSuccess(`Đã xóa franchise "${f.name}"`);
      load(currentPage);
    } catch {
      showError("Xóa franchise thất bại");
    }
  };

  const handleViewDetail = async (f: ApiFranchise) => {
    handleOpenEdit(f);
    setViewingFranchise(f);
    setLoadingDetail(true);
    try {
      const detail = await getFranchiseById(f.id);
      setViewingFranchise(detail);
      handleOpenEdit(detail);
    } catch {
      // fallback: dùng data từ list
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleOpenEdit = (f: ApiFranchise) => {
    setEditForm({
      code: f.code,
      name: f.name,
      opened_at: f.opened_at,
      closed_at: f.closed_at,
      hotline: f.hotline,
      logo_url: f.logo_url || "",
      address: f.address || "",
    });
    setEditLogoPreview("");
    pendingEditLogoFileRef.current = null;
    setIsEditingDetail(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!viewingFranchise) return;
    setViewingFranchise(null);
    setIsEditingDetail(false);
    setEditLogoPreview("");
    showPageLoading("Đang cập nhật franchise...");
    setSaving(true);
    try {
      let finalLogoUrl = editForm.logo_url ?? "";
      if (pendingEditLogoFileRef.current) {
        finalLogoUrl = await uploadImageToCloudinary(pendingEditLogoFileRef.current);
        pendingEditLogoFileRef.current = null;
      }
      await updateFranchise(viewingFranchise.id, { ...editForm, logo_url: finalLogoUrl });
      showSuccess("Cập nhật franchise thành công");
      await load(currentPage);
    } catch (error) {
      showError(error instanceof Error ? error.message : "Cập nhật franchise thất bại");
    } finally {
      setSaving(false);
      hidePageLoading();
    }
  };
  const handleToggleStatus = async (f: ApiFranchise) => {
    const action = f.is_active ? "Ngừng hoạt động" : "Kích hoạt";
    if (!await showConfirm({
      message: `Bạn có chắc muốn ${action} franchise "${f.name}"?`,
      title: `${action} franchise`,
      variant: f.is_active ? "warning" : "info",
      confirmText: action,
    })) return;
    try {
      await changeFranchiseStatus(f.id, !f.is_active);
      showSuccess(`Đã ${action} franchise "${f.name}"`);
      load(currentPage);
    } catch {
      showError(`${action} franchise thất bại`);
    }
  };

  const handleOpenCreate = () => {
    setCreateForm({ ...emptyCreateForm });
    setCreateFieldErrors({});
    setLogoPreview("");
    pendingLogoFileRef.current = null;
    setShowCreateModal(true);
  };

  const handleCreateChange = (field: keyof CreateFranchisePayload, value: string) => {
    setCreateForm((prev) => ({ ...prev, [field]: value }));
    if (createFieldErrors[field]) {
      setCreateFieldErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowCreateModal(false);
    setLogoPreview("");
    showPageLoading("Đang tạo franchise...");
    setCreating(true);
    setCreateFieldErrors({});
    try {
      let finalLogoUrl = createForm.logo_url ?? "";
      if (pendingLogoFileRef.current) {
        finalLogoUrl = await uploadImageToCloudinary(pendingLogoFileRef.current);
        pendingLogoFileRef.current = null;
      }
      await createFranchise({ ...createForm, logo_url: finalLogoUrl });
      showSuccess("Tạo franchise thành công");
      await load(1);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Tạo franchise thất bại";
      showError(msg);
    } finally {
      setCreating(false);
      hidePageLoading();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Quản lý Franchise</h1>
          <p className="text-xs sm:text-sm text-slate-600">Danh sách chi nhánh</p>
        </div>
        <Button onClick={handleOpenCreate}>
          + Tạo franchise
        </Button>
      </div>

      {/* Search bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <svg
              className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Tìm kiếm theo tên, mã..."
              value={keyword}
              onChange={(e) => { setKeyword(e.target.value); setCurrentPage(1); }}
              onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-4 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
            />
          </div>
          <select
            value={isActive}
            onChange={(e) => { setIsActive(e.target.value); setCurrentPage(1); }}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="true">Hoạt động</option>
            <option value="false">Ngừng</option>
          </select>
          <label className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer transition-colors select-none ${
            isDeleted
              ? "border-red-400 bg-red-50 text-red-700"
              : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
          }`}>
            <input
              type="checkbox"
              checked={isDeleted}
              onChange={(e) => { setIsDeleted(e.target.checked); setCurrentPage(1); }}
              className="accent-red-500"
            />
            <span className="font-medium">Đã xóa</span>
          </label>
          <Button onClick={handleSearch} loading={loading}>
            Tìm kiếm
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full table-fixed divide-y divide-slate-200 text-sm">
            <colgroup>
              <col style={{ width: "4rem" }} />
              <col style={{ width: "7rem" }} />
              <col style={{ width: "16rem" }} />
              <col style={{ width: "8rem" }} />
              <col style={{ width: "9rem" }} />
              <col style={{ width: "7rem" }} />
              <col style={{ width: "9rem" }} />
            </colgroup>
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-4 py-3">Logo</th>
                <th className="px-4 py-3">Mã</th>
                <th className="px-4 py-3">Tên chi nhánh</th>
                <th className="px-4 py-3">Hotline</th>
                <th className="px-4 py-3">Giờ mở cửa</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {franchises.map((f) => (
                <tr key={f.id} className={`${isDeleted ? "bg-red-50" : "hover:bg-slate-50"}`}>
                  <td className="px-4 py-3">
                    {f.logo_url ? (
                      <img
                        src={f.logo_url}
                        alt={f.name}
                        className="size-10 rounded-lg object-cover border border-slate-200"
                      />
                    ) : (
                      <div className="size-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
                        <svg xmlns="http://www.w3.org/2000/svg" className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 overflow-hidden">
                    <div className="font-mono text-xs text-slate-500" title={f.code}>
                      {f.code.length > 6 ? f.code.slice(0, 6) + "..." : f.code}
                    </div>
                  </td>
                  <td className="px-4 py-3 overflow-hidden">
                    <div className="leading-tight">
                      <p className="font-semibold text-slate-900 truncate">{f.name}</p>
                      <p className="text-xs text-slate-500 truncate" title={f.address || "-"}>{formatAddress(f.address)}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-700 whitespace-nowrap overflow-hidden">{f.hotline || "-"}</td>
                  <td className="px-4 py-3 text-slate-700 whitespace-nowrap overflow-hidden">{f.opened_at} - {f.closed_at}</td>
                  <td className="px-4 py-3 overflow-hidden">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      f.is_active
                        ? "bg-green-100 text-green-700"
                        : "bg-yellow-100 text-yellow-700"
                      }`}>
                      {f.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>                <td className="px-4 py-3 overflow-hidden">
                    <div className="flex flex-nowrap gap-2">
                      {isDeleted ? (
                        <button
                          title="Khôi phục franchise"
                          onClick={() => handleRestore(f)}
                          className="inline-flex items-center justify-center size-8 rounded-lg border border-emerald-200 bg-white text-emerald-600 hover:border-emerald-400 hover:bg-emerald-50 transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        </button>
                      ) : (
                        <>
                      <button
                        title="Chỉnh sửa"
                        onClick={() => handleViewDetail(f)}
                        className="inline-flex items-center justify-center size-8 rounded-lg border border-slate-200 bg-white text-slate-500 hover:border-primary-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      <button
                        title={f.is_active ? "Ngừng hoạt động" : "Kích hoạt"}
                        onClick={() => handleToggleStatus(f)}
                        className={`inline-flex items-center justify-center size-8 rounded-lg border transition-colors ${f.is_active
                          ? "border-amber-200 bg-white text-amber-500 hover:border-amber-400 hover:bg-amber-50"
                          : "border-emerald-200 bg-white text-emerald-500 hover:border-emerald-400 hover:bg-emerald-50"
                          }`}
                      >
                        {f.is_active ? (
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
                        title="Xóa franchise"
                        onClick={() => handleDelete(f)}
                        className="inline-flex items-center justify-center size-8 rounded-lg border border-red-200 bg-white text-red-500 hover:border-red-400 hover:bg-red-50 transition-colors"
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
              {franchises.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-sm text-slate-500">
                    Không có chi nhánh
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
            onPageChange={handlePageChange}
            totalItems={totalItems}
            itemsPerPage={ITEMS_PER_PAGE}
          />        </div>
      </div>

      {/* ─── View / Edit Detail Modal ─────────────────────────────────────── */}
      {viewingFranchise && ReactDOM.createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { setViewingFranchise(null); setIsEditingDetail(false); }} />
          <div
            className="relative w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
            style={{
              background: "rgba(15,23,42,0.85)",
              backdropFilter: "blur(40px) saturate(180%)",
              WebkitBackdropFilter: "blur(40px) saturate(180%)",
              border: "1px solid rgba(255,255,255,0.12)",
              boxShadow: "0 32px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.12)",
            }}
          >
            <div className="h-0.5 w-full shrink-0" style={{ background: "linear-gradient(90deg, #6366f1, #8b5cf6, #06b6d4)" }} />
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/[0.12] px-6 py-4 shrink-0">
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-white/[0.06] px-3 py-1 text-xs font-mono text-white/50">
                  {viewingFranchise.code}
                </span>
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  viewingFranchise.is_active
                    ? "bg-green-100 text-green-700"
                    : "bg-yellow-100 text-yellow-700"
                  }`}>
                  {viewingFranchise.is_active ? "Active" : "Inactive"}
                </span>
                <span className="text-sm font-semibold text-white/80">Chỉnh sửa Franchise</span>
                {loadingDetail && (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/[0.12] border-t-primary-500" />
                )}
              </div>
              <button
                onClick={() => { setViewingFranchise(null); setIsEditingDetail(false); }}
                className="rounded-lg p-1.5 text-white/40 hover:bg-white/[0.1] hover:text-white transition-colors"
              >
                <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body — EDIT form */}
            <form id="edit-franchise-form" onSubmit={handleEditSubmit} className="overflow-y-auto px-6 py-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-white/80">
                    Mã chi nhánh *
                    <input
                      className="mt-1 w-full rounded-lg border border-white/[0.15] bg-white/[0.08] text-white/90 placeholder-white/30 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                      value={editForm.code}
                      onChange={(e) => setEditForm((p) => ({ ...p, code: e.target.value }))}
                      required
                    />
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/80">
                    Tên chi nhánh *
                    <input
                      className="mt-1 w-full rounded-lg border border-white/[0.15] bg-white/[0.08] text-white/90 placeholder-white/30 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                      value={editForm.name}
                      onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                      required
                    />
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/80">
                    Giờ mở cửa *
                    <input
                      type="time"
                      className="mt-1 w-full rounded-lg border border-white/[0.15] bg-white/[0.08] text-white/90 placeholder-white/30 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                      value={editForm.opened_at}
                      onChange={(e) => setEditForm((p) => ({ ...p, opened_at: e.target.value }))}
                      required
                    />
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/80">
                    Giờ đóng cửa *
                    <input
                      type="time"
                      className="mt-1 w-full rounded-lg border border-white/[0.15] bg-white/[0.08] text-white/90 placeholder-white/30 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                      value={editForm.closed_at}
                      onChange={(e) => setEditForm((p) => ({ ...p, closed_at: e.target.value }))}
                      required
                    />
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/80">
                    Hotline *
                    <input
                      type="tel"
                      className="mt-1 w-full rounded-lg border border-white/[0.15] bg-white/[0.08] text-white/90 placeholder-white/30 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                      value={editForm.hotline}
                      onChange={(e) => setEditForm((p) => ({ ...p, hotline: e.target.value }))}
                      required
                    />
                  </label>
                </div>
                <div>
                  <span className="block text-sm font-medium text-white/80 mb-1">Logo</span>
                  <div className="flex items-center gap-4">
                    <div className="size-16 rounded-xl border-2 border-dashed border-white/[0.15] bg-white/[0.06] flex items-center justify-center overflow-hidden shrink-0">
                      {(editLogoPreview || editForm.logo_url) ? (
                        <img src={editLogoPreview || editForm.logo_url} alt="Logo" className="size-full object-cover" />
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="size-7 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      )}
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <button type="button" onClick={() => editLogoInputRef.current?.click()} className="rounded-lg border border-white/[0.15] px-3 py-1.5 text-xs font-medium text-white/80 hover:bg-white/[0.1] transition">Chọn ảnh</button>
                      {(editLogoPreview || editForm.logo_url) && (
                        <button type="button" onClick={() => { setEditLogoPreview(""); setEditForm((p) => ({ ...p, logo_url: "" })); pendingEditLogoFileRef.current = null; if (editLogoInputRef.current) editLogoInputRef.current.value = ""; }} className="text-xs text-red-400 hover:underline text-left">Xóa ảnh</button>
                      )}
                      <p className="text-xs text-white/40">PNG, JPG, WEBP tối đa 5MB</p>
                    </div>
                  </div>
                  <input ref={editLogoInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (!file) return; pendingEditLogoFileRef.current = file; setEditLogoPreview(URL.createObjectURL(file)); }} />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-white/80">
                    Địa chỉ
                    <input
                      className="mt-1 w-full rounded-lg border border-white/[0.15] bg-white/[0.08] text-white/90 placeholder-white/30 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                      value={editForm.address}
                      onChange={(e) => setEditForm((p) => ({ ...p, address: e.target.value }))}
                    />
                  </label>
                </div>
              </div>
            </form>

            {/* Footer actions */}            <div className="flex items-center justify-between gap-3 border-t border-white/[0.12] px-6 py-4 shrink-0">
              <div className="flex gap-2">
                <Button type="submit" form="edit-franchise-form" loading={saving}>Lưu thay đổi</Button>
              </div>
              <button
                onClick={() => { setViewingFranchise(null); setIsEditingDetail(false); }}
                className="rounded-lg border border-slate-600 bg-slate-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-600"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      , document.body)}

      {/* ─── Create Franchise Modal ──────────────────────────────────────── */}
      {showCreateModal && ReactDOM.createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
            style={{
              background: "rgba(15,23,42,0.85)",
              backdropFilter: "blur(40px) saturate(180%)",
              WebkitBackdropFilter: "blur(40px) saturate(180%)",
              border: "1px solid rgba(255,255,255,0.12)",
              boxShadow: "0 32px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.12)",
            }}
          >
            <div className="h-0.5 w-full shrink-0" style={{ background: "linear-gradient(90deg, #6366f1, #8b5cf6, #06b6d4)" }} />
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/[0.12] px-6 py-4 shrink-0">
              <div>
                <h2 className="text-lg font-bold text-white/95">Tạo Franchise</h2>
                <p className="text-xs text-white/40">Tạo chi nhánh mới</p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="rounded-lg p-1.5 text-white/40 hover:bg-white/[0.1] hover:text-white transition-colors"
              >
                <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleCreateSubmit} className="overflow-y-auto px-6 py-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-white/80">
                    Mã chi nhánh *
                    <input
                      className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-1 ${createFieldErrors.code ? "border-red-400 focus:border-red-500 focus:ring-red-500 bg-white/[0.08] text-white/90 placeholder-white/30" : "border-white/[0.15] bg-white/[0.08] text-white/90 placeholder-white/30 focus:border-primary-500 focus:ring-primary-500"}`}
                      value={createForm.code}
                      onChange={(e) => handleCreateChange("code", e.target.value)}
                      placeholder="HL008"
                      required
                    />
                  </label>
                  {createFieldErrors.code && (
                    <p className="mt-1 text-xs text-red-500">{createFieldErrors.code}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/80">
                    Tên chi nhánh *
                    <input
                      className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-1 ${createFieldErrors.name ? "border-red-400 focus:border-red-500 focus:ring-red-500 bg-white/[0.08] text-white/90 placeholder-white/30" : "border-white/[0.15] bg-white/[0.08] text-white/90 placeholder-white/30 focus:border-primary-500 focus:ring-primary-500"}`}
                      value={createForm.name}
                      onChange={(e) => handleCreateChange("name", e.target.value)}
                      placeholder="High Land 008"
                      required
                    />
                  </label>
                  {createFieldErrors.name && (
                    <p className="mt-1 text-xs text-red-500">{createFieldErrors.name}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/80">
                    Giờ mở cửa *
                    <input
                      type="time"
                      className="mt-1 w-full rounded-lg border border-white/[0.15] bg-white/[0.08] text-white/90 placeholder-white/30 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                      value={createForm.opened_at}
                      onChange={(e) => handleCreateChange("opened_at", e.target.value)}
                      required
                    />
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/80">
                    Giờ đóng cửa *
                    <input
                      type="time"
                      className="mt-1 w-full rounded-lg border border-white/[0.15] bg-white/[0.08] text-white/90 placeholder-white/30 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                      value={createForm.closed_at}
                      onChange={(e) => handleCreateChange("closed_at", e.target.value)}
                      required
                    />
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/80">
                    Hotline *
                    <input
                      type="tel"
                      className="mt-1 w-full rounded-lg border border-white/[0.15] bg-white/[0.08] text-white/90 placeholder-white/30 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                      value={createForm.hotline}
                      onChange={(e) => handleCreateChange("hotline", e.target.value)}
                      placeholder="0123456789"
                      required
                    />
                  </label>
                </div>
                <div>
                  <span className="block text-sm font-medium text-white/80 mb-1">Logo</span>
                  <div className="flex items-center gap-4">
                    {/* Preview */}
                    <div className="size-16 rounded-xl border-2 border-dashed border-white/[0.15] bg-white/[0.06] flex items-center justify-center overflow-hidden shrink-0">
                      {logoPreview ? (
                        <img src={logoPreview} alt="Logo preview" className="size-full object-cover" />
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="size-7 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      )}
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <button
                        type="button"
                        onClick={() => logoInputRef.current?.click()}
                        className="rounded-lg border border-white/[0.15] px-3 py-1.5 text-xs font-medium text-white/80 hover:bg-white/[0.1] transition"
                      >
                        Chọn ảnh
                      </button>
                      {logoPreview && (
                        <button
                          type="button"
                          onClick={() => { setLogoPreview(""); pendingLogoFileRef.current = null; if (logoInputRef.current) logoInputRef.current.value = ""; }}
                          className="text-xs text-red-400 hover:underline text-left"
                        >
                          Xóa ảnh
                        </button>
                      )}
                      <p className="text-xs text-white/40">PNG, JPG, WEBP tối đa 5MB</p>
                    </div>
                  </div>
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      pendingLogoFileRef.current = file;
                      setLogoPreview(URL.createObjectURL(file));
                    }}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-white/80">
                    Địa chỉ
                    <input
                      className="mt-1 w-full rounded-lg border border-white/[0.15] bg-white/[0.08] text-white/90 placeholder-white/30 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                      value={createForm.address}
                      onChange={(e) => handleCreateChange("address", e.target.value)}
                      placeholder="123 Nguyễn Huệ, Quận 1, TP.HCM"
                    />
                  </label>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-6 flex items-center justify-end gap-3 border-t border-white/[0.12] pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-lg border border-slate-600 bg-slate-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-600"
                >
                  Hủy
                </button>
                <Button type="submit" loading={creating}>
                  Tạo franchise
                </Button>
              </div>
            </form>
          </div>
        </div>
      , document.body)}
    </div>
  );
};

export default FranchiseListPage;

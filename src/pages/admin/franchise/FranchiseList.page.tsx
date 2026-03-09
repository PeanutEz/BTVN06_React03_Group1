import { useEffect, useState, useCallback, useRef } from "react";
import { Button } from "../../../components";
import type { ApiFranchise, CreateFranchisePayload } from "../../../services/store.service";
import {
  searchFranchises,
  restoreFranchise,
  deleteFranchise,
  getFranchiseById,
  createFranchise,
  updateFranchise,
  changeFranchiseStatus,
} from "../../../services/store.service";
import { Link, useNavigate } from "react-router-dom";
import { ROUTER_URL } from "../../../routes/router.const";
import Pagination from "../../../components/ui/Pagination";
import { showSuccess, showError } from "../../../utils";

const CLOUDINARY_CLOUD_NAME = "dn2xh5rxe";
const CLOUDINARY_UPLOAD_PRESET = "btvn06_upload";

async function uploadImageToCloudinary(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    { method: "POST", body: formData },
  );
  if (!res.ok) throw new Error("Upload ảnh lên Cloudinary thất bại");
  const data = (await res.json()) as { secure_url: string };
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

const FranchiseListPage = () => {
  const [franchises, setFranchises] = useState<ApiFranchise[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [keyword, setKeyword] = useState("");
  const [isActive, setIsActive] = useState("");

  // Deleted franchises modal
  const [showDeletedModal, setShowDeletedModal] = useState(false);
  const [deletedFranchises, setDeletedFranchises] = useState<ApiFranchise[]>([]);
  const [loadingDeleted, setLoadingDeleted] = useState(false);

  // View / edit detail modal
  const [viewingFranchise, setViewingFranchise] = useState<ApiFranchise | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [_isEditingDetail, setIsEditingDetail] = useState(false);
  const [editForm, setEditForm] = useState<CreateFranchisePayload>({ ...emptyCreateForm });
  const [saving, setSaving] = useState(false);
  const [editLogoPreview, setEditLogoPreview] = useState<string>("");
  const pendingEditLogoFileRef = useRef<File | null>(null);
  const editLogoInputRef = useRef<HTMLInputElement | null>(null);

  // Create modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState<CreateFranchisePayload>({ ...emptyCreateForm });
  const [creating, setCreating] = useState(false);
  const [createFieldErrors, setCreateFieldErrors] = useState<Record<string, string>>({});
  const [logoPreview, setLogoPreview] = useState<string>("");
  const pendingLogoFileRef = useRef<File | null>(null);
  const logoInputRef = useRef<HTMLInputElement | null>(null);

  const navigate = useNavigate();

  const load = useCallback(
    async (page = currentPage) => {
      setLoading(true);
      try {
        const result = await searchFranchises({
          searchCondition: {
            keyword,
            is_active: isActive,
            is_deleted: false,
          },
          pageInfo: {
            pageNum: page,
            pageSize: ITEMS_PER_PAGE,
          },
        });
        setFranchises(result.data);
        setTotalPages(result.pageInfo.totalPages);
        setTotalItems(result.pageInfo.totalItems);
        setCurrentPage(result.pageInfo.pageNum);
      } catch (error) {
        console.error("Lỗi tải danh sách franchise:", error);
        showError("Không thể tải danh sách franchise");
      } finally {
        setLoading(false);
      }
    },
    [currentPage, keyword, isActive],
  );

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePageChange = (page: number) => {
    load(page);
  };

  const handleSearch = () => {
    load(1);
  };

  // ====== Deleted franchises logic ======
  const loadDeletedFranchises = async () => {
    setLoadingDeleted(true);
    try {
      const result = await searchFranchises({
        searchCondition: {
          keyword: "",
          is_active: "",
          is_deleted: true,
        },
        pageInfo: {
          pageNum: 1,
          pageSize: 100,
        },
      });
      setDeletedFranchises(result.data);
    } catch (error) {
      console.error("Lỗi tải danh sách franchise đã xóa:", error);
      showError("Không thể tải danh sách franchise đã xóa");
    } finally {
      setLoadingDeleted(false);
    }
  };

  const openDeletedModal = async () => {
    setShowDeletedModal(true);
    await loadDeletedFranchises();
  };

  const handleRestore = async (id: string) => {
    if (!window.confirm("Bạn có chắc muốn khôi phục franchise này?")) return;
    try {
      await restoreFranchise(id);
      showSuccess("Khôi phục franchise thành công");
      setDeletedFranchises((list) => list.filter((f) => f.id !== id));
      load(1);
    } catch (error) {
      showError(
        error instanceof Error ? error.message : "Khôi phục franchise thất bại",
      );
    }
  };

  const handleDeleteForever = async (id: string) => {
    if (
      !window.confirm(
        "Bạn có chắc muốn xóa vĩnh viễn franchise này? Hành động này không thể hoàn tác.",
      )
    )
      return;
    try {
      await deleteFranchise(id);
      showSuccess("Xóa vĩnh viễn franchise thành công");
      setDeletedFranchises((list) => list.filter((f) => f.id !== id));
    } catch (error) {
      showError(
        error instanceof Error ? error.message : "Xóa vĩnh viễn franchise thất bại",
      );
    }
  };

  // ====== Main list: actions ======

  const handleDelete = async (f: ApiFranchise) => {
    if (
      !window.confirm(
        `Bạn có chắc muốn xóa franchise "${f.name}"? Có thể khôi phục trong mục "Franchise đã xóa".`,
      )
    )
      return;
    try {
      await deleteFranchise(f.id);
      showSuccess("Xóa franchise thành công");
      load(currentPage);
    } catch (error) {
      showError(error instanceof Error ? error.message : "Xóa franchise thất bại");
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
    setSaving(true);
    try {
      let finalLogoUrl = editForm.logo_url ?? "";
      if (pendingEditLogoFileRef.current) {
        finalLogoUrl = await uploadImageToCloudinary(
          pendingEditLogoFileRef.current,
        );
        pendingEditLogoFileRef.current = null;
      }
      await updateFranchise(viewingFranchise.id, {
        ...editForm,
        logo_url: finalLogoUrl,
      });
      showSuccess("Cập nhật franchise thành công");
      setViewingFranchise(null);
      setIsEditingDetail(false);
      setEditLogoPreview("");
      load(currentPage);
    } catch (error) {
      showError(
        error instanceof Error ? error.message : "Cập nhật franchise thất bại",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (f: ApiFranchise) => {
    const action = f.is_active ? "Ngừng hoạt động" : "Kích hoạt";
    if (!window.confirm(`Bạn có chắc muốn ${action} franchise "${f.name}"?`))
      return;
    try {
      await changeFranchiseStatus(f.id, !f.is_active);
      showSuccess(`Đã ${action} franchise "${f.name}"`);
      load(currentPage);
    } catch {
      showError(`${action} franchise thất bại`);
    }
  };

  // ====== Create modal logic ======

  const handleOpenCreate = () => {
    setCreateForm({ ...emptyCreateForm });
    setCreateFieldErrors({});
    setLogoPreview("");
    pendingLogoFileRef.current = null;
    setShowCreateModal(true);
  };

  const handleCreateChange = (field: keyof CreateFranchisePayload, value: string) => {
    setCreateForm((prev) => ({ ...prev, [field]: value }));
    setCreateFieldErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (!createForm.code.trim()) errors.code = "Mã chi nhánh không được để trống";
    if (!createForm.name.trim()) errors.name = "Tên chi nhánh không được để trống";

    if (Object.keys(errors).length > 0) {
      setCreateFieldErrors(errors);
      return;
    }

    setCreating(true);
    try {
      let finalLogoUrl = createForm.logo_url ?? "";
      if (pendingLogoFileRef.current) {
        finalLogoUrl = await uploadImageToCloudinary(pendingLogoFileRef.current);
        pendingLogoFileRef.current = null;
      }
      await createFranchise({ ...createForm, logo_url: finalLogoUrl });
      showSuccess("Tạo franchise thành công");
      setShowCreateModal(false);
      setLogoPreview("");
      setCreateForm({ ...emptyCreateForm });
      load(1);
    } catch (error) {
      showError(
        error instanceof Error ? error.message : "Tạo franchise thất bại",
      );
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
            Quản lý Franchise
          </h1>
          <p className="text-xs sm:text-sm text-slate-600">Danh sách chi nhánh</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleOpenCreate}>+ Tạo franchise</Button>
          <Button variant="outline" onClick={openDeletedModal}>
            Franchise đã xóa
          </Button>
        </div>
      </div>

      {/* Search bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <svg
              className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="Tìm kiếm theo tên, mã..."
              value={keyword}
              onChange={(e) => {
                setKeyword(e.target.value);
                setCurrentPage(1);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSearch();
              }}
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-4 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
            />
          </div>
          <select
            value={isActive}
            onChange={(e) => {
              setIsActive(e.target.value);
              setCurrentPage(1);
            }}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="true">Hoạt động</option>
            <option value="false">Ngừng</option>
          </select>
          <Button onClick={handleSearch} loading={loading}>
            Tìm kiếm
          </Button>
        </div>
      </div>

      {/* Main table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
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
                <tr key={f.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    {f.logo_url ? (
                      <img
                        src={f.logo_url}
                        alt={f.name}
                        className="size-10 rounded-lg object-cover border border-slate-200"
                      />
                    ) : (
                      <div className="size-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="size-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">
                    {f.code}
                  </td>
                  <td className="px-4 py-3">
                    <div className="leading-tight">
                      <p className="font-semibold text-slate-900">{f.name}</p>
                      <p className="text-xs text-slate-500">{f.address}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {f.hotline || "-"}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {f.opened_at} - {f.closed_at}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${
                        f.is_active
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-slate-200 bg-slate-50 text-slate-600"
                      }`}
                    >
                      {f.is_active ? "Hoạt động" : "Ngừng"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2 items-center">
                      {/* Giữ nguyên các link cũ */}
                      

                      {/* Thêm các nút icon từ nhánh main */}
                      <button
                        title="Xem / chỉnh sửa nhanh"
                        onClick={() => handleViewDetail(f)}
                        className="inline-flex items-center justify-center size-8 rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-slate-400 hover:bg-slate-50 transition-colors"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
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
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                        </svg>
                      </button>
                      <button
                        title={f.is_active ? "Ngừng hoạt động" : "Kích hoạt"}
                        onClick={() => handleToggleStatus(f)}
                        className={`inline-flex items-center justify-center size-8 rounded-lg border transition-colors ${
                          f.is_active
                            ? "border-amber-200 bg-white text-amber-500 hover:border-amber-400 hover:bg-amber-50"
                            : "border-emerald-200 bg-white text-emerald-500 hover:border-emerald-400 hover:bg-emerald-50"
                        }`}
                      >
                        {f.is_active ? (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="size-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                            />
                          </svg>
                        ) : (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="size-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                        )}
                      </button>
                      <button
                        title="Xóa franchise"
                        onClick={() => handleDelete(f)}
                        className="inline-flex items-center justify-center size-8 rounded-lg border border-red-200 bg-white text-red-500 hover:border-red-400 hover:bg-red-50 transition-colors"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="size-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5-4h4m-4 0a1 1 0 00-1 1v1h6V4a1 1 0 00-1-1m-4 0h4"
                          />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {franchises.length === 0 && !loading && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-6 text-center text-sm text-slate-500"
                  >
                    Không có chi nhánh
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td colSpan={7}>
                    <div className="flex justify-center items-center py-20">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500" />
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 pb-4 pt-2">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            totalItems={totalItems}
            itemsPerPage={ITEMS_PER_PAGE}
          />
        </div>
      </div>

      {/* View / Edit Detail Modal */}
      {viewingFranchise && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 shrink-0">
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-mono text-slate-500">
                  {viewingFranchise.code}
                </span>
                <span
                  className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${
                    viewingFranchise.is_active
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-slate-200 bg-slate-50 text-slate-600"
                  }`}
                >
                  {viewingFranchise.is_active ? "Hoạt động" : "Ngừng"}
                </span>
                <span className="text-sm font-semibold text-slate-700">
                  Chỉnh sửa Franchise
                </span>
                {loadingDetail && (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-primary-500" />
                )}
              </div>
              <button
                onClick={() => {
                  setViewingFranchise(null);
                  setIsEditingDetail(false);
                }}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
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

            {/* Body — EDIT form */}
            <form
              id="edit-franchise-form"
              onSubmit={handleEditSubmit}
              className="overflow-y-auto px-6 py-5"
            >
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Mã chi nhánh *
                    <input
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                      value={editForm.code}
                      onChange={(e) =>
                        setEditForm((p) => ({ ...p, code: e.target.value }))
                      }
                      required
                    />
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Tên chi nhánh *
                    <input
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                      value={editForm.name}
                      onChange={(e) =>
                        setEditForm((p) => ({ ...p, name: e.target.value }))
                      }
                      required
                    />
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Giờ mở cửa *
                    <input
                      type="time"
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                      value={editForm.opened_at}
                      onChange={(e) =>
                        setEditForm((p) => ({ ...p, opened_at: e.target.value }))
                      }
                      required
                    />
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Giờ đóng cửa *
                    <input
                      type="time"
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                      value={editForm.closed_at}
                      onChange={(e) =>
                        setEditForm((p) => ({ ...p, closed_at: e.target.value }))
                      }
                      required
                    />
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Hotline *
                    <input
                      type="tel"
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                      value={editForm.hotline}
                      onChange={(e) =>
                        setEditForm((p) => ({ ...p, hotline: e.target.value }))
                      }
                      required
                    />
                  </label>
                </div>
                <div>
                  <span className="block text-sm font-medium text-slate-700 mb-1">
                    Logo
                  </span>
                  <div className="flex items-center gap-4">
                    <div className="size-16 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
                      {editLogoPreview || editForm.logo_url ? (
                        <img
                          src={editLogoPreview || editForm.logo_url}
                          alt="Logo"
                          className="size-full object-cover"
                        />
                      ) : (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="size-7 text-slate-300"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                      )}
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <button
                        type="button"
                        onClick={() => editLogoInputRef.current?.click()}
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
                      >
                        Chọn ảnh
                      </button>
                      {(editLogoPreview || editForm.logo_url) && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditLogoPreview("");
                            setEditForm((p) => ({ ...p, logo_url: "" }));
                            pendingEditLogoFileRef.current = null;
                            if (editLogoInputRef.current) {
                              editLogoInputRef.current.value = "";
                            }
                          }}
                          className="text-xs text-red-500 hover:underline text-left"
                        >
                          Xóa ảnh
                        </button>
                      )}
                      <p className="text-xs text-slate-400">
                        PNG, JPG, WEBP tối đa 5MB
                      </p>
                    </div>
                  </div>
                  <input
                    ref={editLogoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      pendingEditLogoFileRef.current = file;
                      setEditLogoPreview(URL.createObjectURL(file));
                    }}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700">
                    Địa chỉ
                    <input
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                      value={editForm.address}
                      onChange={(e) =>
                        setEditForm((p) => ({ ...p, address: e.target.value }))
                      }
                    />
                  </label>
                </div>
              </div>
            </form>

            {/* Footer actions */}
            <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-6 py-4 shrink-0">
              <div className="flex gap-2 flex-wrap">
                <Button type="submit" form="edit-franchise-form" loading={saving}>
                  Lưu thay đổi
                </Button>
                <button
                  type="button"
                  onClick={() => {
                    if (!viewingFranchise) return;
                    setViewingFranchise(null);
                    navigate(
                      `${ROUTER_URL.ADMIN}/${ROUTER_URL.ADMIN_ROUTES.INVENTORY_BY_FRANCHISE.replace(
                        ":id",
                        viewingFranchise.id,
                      )}`,
                    );
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
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
                      d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                    />
                  </svg>
                  Xem tồn kho
                </button>
                {viewingFranchise && (
                  <Link
                    to={`${ROUTER_URL.ADMIN}/${ROUTER_URL.ADMIN_ROUTES.FRANCHISE_DETAIL.replace(
                      ":id",
                      viewingFranchise.id,
                    )}`}
                    onClick={() => setViewingFranchise(null)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
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
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                    Trang chi tiết
                  </Link>
                )}
              </div>
              <button
                onClick={() => {
                  setViewingFranchise(null);
                  setIsEditingDetail(false);
                }}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deleted franchises modal */}
      {showDeletedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Franchise đã xóa</h2>
                <p className="text-xs text-slate-500">
                  Danh sách các franchise đã bị xóa mềm. Bạn có thể khôi phục hoặc xóa
                  vĩnh viễn.
                </p>
              </div>
              <button
                onClick={() => setShowDeletedModal(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <svg
                  className="h-5 w-5"
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

            {loadingDeleted ? (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
                Đang tải danh sách...
              </div>
            ) : deletedFranchises.length === 0 ? (
              <p className="text-sm text-slate-500">
                Không có franchise nào đã bị xóa.
              </p>
            ) : (
              <div className="max-h-[60vh] overflow-auto rounded-xl border border-slate-100">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                    <tr>
                      <th className="px-4 py-2">Mã</th>
                      <th className="px-4 py-2">Tên chi nhánh</th>
                      <th className="px-4 py-2">Hotline</th>
                      <th className="px-4 py-2">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {deletedFranchises.map((f) => (
                      <tr key={f.id}>
                        <td className="px-4 py-2 font-mono text-xs text-slate-500">
                          {f.code}
                        </td>
                        <td className="px-4 py-2">
                          <div className="leading-tight">
                            <p className="font-semibold text-slate-900">{f.name}</p>
                            <p className="text-xs text-slate-500">{f.address}</p>
                          </div>
                        </td>
                        <td className="px-4 py-2 text-slate-700">
                          {f.hotline || "-"}
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRestore(f.id)}
                            >
                              Khôi phục
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-red-200 text-red-600 hover:bg-red-50"
                              onClick={() => handleDeleteForever(f.id)}
                            >
                              Xóa vĩnh viễn
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create franchise modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 shrink-0">
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-slate-800">
                  Tạo franchise mới
                </span>
                <span className="text-xs text-slate-500">
                  Nhập thông tin chi nhánh và upload logo (nếu có)
                </span>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
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

            {/* Body */}
            <form
              onSubmit={handleCreateSubmit}
              className="overflow-y-auto px-6 py-5"
            >
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Mã chi nhánh *
                    <input
                      className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-1 ${
                        createFieldErrors.code
                          ? "border-red-400 focus:border-red-500 focus:ring-red-500"
                          : "border-slate-200 focus:border-primary-500 focus:ring-primary-500"
                      }`}
                      value={createForm.code}
                      onChange={(e) =>
                        handleCreateChange("code", e.target.value)
                      }
                      placeholder="HL008"
                      required
                    />
                  </label>
                  {createFieldErrors.code && (
                    <p className="mt-1 text-xs text-red-500">
                      {createFieldErrors.code}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Tên chi nhánh *
                    <input
                      className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-1 ${
                        createFieldErrors.name
                          ? "border-red-400 focus:border-red-500 focus:ring-red-500"
                          : "border-slate-200 focus:border-primary-500 focus:ring-primary-500"
                      }`}
                      value={createForm.name}
                      onChange={(e) =>
                        handleCreateChange("name", e.target.value)
                      }
                      placeholder="High Land 008"
                      required
                    />
                  </label>
                  {createFieldErrors.name && (
                    <p className="mt-1 text-xs text-red-500">
                      {createFieldErrors.name}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Giờ mở cửa *
                    <input
                      type="time"
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                      value={createForm.opened_at}
                      onChange={(e) =>
                        handleCreateChange("opened_at", e.target.value)
                      }
                      required
                    />
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Giờ đóng cửa *
                    <input
                      type="time"
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                      value={createForm.closed_at}
                      onChange={(e) =>
                        handleCreateChange("closed_at", e.target.value)
                      }
                      required
                    />
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Hotline *
                    <input
                      type="tel"
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                      value={createForm.hotline}
                      onChange={(e) =>
                        handleCreateChange("hotline", e.target.value)
                      }
                      placeholder="0123456789"
                      required
                    />
                  </label>
                </div>
                <div>
                  <span className="block text-sm font-medium text-slate-700 mb-1">
                    Logo
                  </span>
                  <div className="flex items-center gap-4">
                    <div className="size-16 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
                      {logoPreview ? (
                        <img
                          src={logoPreview}
                          alt="Logo preview"
                          className="size-full object-cover"
                        />
                      ) : (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="size-7 text-slate-300"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                      )}
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <button
                        type="button"
                        onClick={() => logoInputRef.current?.click()}
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
                      >
                        Chọn ảnh
                      </button>
                      {logoPreview && (
                        <button
                          type="button"
                          onClick={() => {
                            setLogoPreview("");
                            pendingLogoFileRef.current = null;
                            if (logoInputRef.current) {
                              logoInputRef.current.value = "";
                            }
                          }}
                          className="text-xs text-red-500 hover:underline text-left"
                        >
                          Xóa ảnh
                        </button>
                      )}
                      <p className="text-xs text-slate-400">
                        PNG, JPG, WEBP tối đa 5MB
                      </p>
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
                  <label className="block text-sm font-medium text-slate-700">
                    Địa chỉ
                    <input
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                      value={createForm.address}
                      onChange={(e) =>
                        handleCreateChange("address", e.target.value)
                      }
                      placeholder="123 Nguyễn Huệ, Quận 1, TP.HCM"
                    />
                  </label>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-end gap-2 border-t border-slate-200 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
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
      )}
    </div>
  );
};

export default FranchiseListPage;
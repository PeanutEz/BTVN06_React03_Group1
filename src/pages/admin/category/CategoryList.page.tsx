import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "../../../components";
import Pagination from "../../../components/ui/Pagination";
import { categoryService } from "../../../services/category.service";
import type { CategoryApiResponse, CreateCategoryDto, CategorySelectItem } from "../../../models/product.model";
import { showSuccess, showError } from "../../../utils";

const ITEMS_PER_PAGE = 10;

const DEFAULT_FORM: CreateCategoryDto = {
  code: "",
  name: "",
  description: "",
  parent_id: "",
};

export default function CategoryListPage() {
  const [categories, setCategories] = useState<CategoryApiResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [parentFilter, setParentFilter] = useState<string>("");
  const [isDeletedFilter, setIsDeletedFilter] = useState<boolean>(false);

  // Parent category options
  const [parentOptions, setParentOptions] = useState<CategorySelectItem[]>([]);

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState<CreateCategoryDto>({ ...DEFAULT_FORM });
  const [editingCategory, setEditingCategory] = useState<CategoryApiResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [viewingCategory, setViewingCategory] = useState<CategoryApiResponse | null>(null);
  const hasRun = useRef(false);

  const loadParentOptions = async () => {
    try {
      const data = await categoryService.getSelectCategories();
      setParentOptions(data);
    } catch {
      // silent
    }
  };

  const load = useCallback(
    async (
      keyword = searchQuery,
      page = currentPage,
      status = statusFilter,
      parent = parentFilter,
      isDeleted = isDeletedFilter,
    ) => {
      setLoading(true);
      try {
        const isActive = status === "true" ? true : status === "false" ? false : "";
        const result = await categoryService.searchCategories({
          searchCondition: {
            keyword,
            parent_id: parent,
            is_active: isActive,
            is_deleted: isDeleted,
          },
          pageInfo: { pageNum: page, pageSize: ITEMS_PER_PAGE },
        });
        setCategories(result.data);
        setTotalPages(result.pageInfo.totalPages);
        setTotalItems(result.pageInfo.totalItems);
        setCurrentPage(result.pageInfo.pageNum);
      } catch {
        showError("Lấy danh sách category thất bại");
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
    load("", 1, "", "", false);
    loadParentOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Handlers ───────────────────────────────────────────────────────────────
  const handleSearch = () => {
    setCurrentPage(1);
    load(searchQuery, 1, statusFilter, parentFilter, isDeletedFilter);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    load(searchQuery, page, statusFilter, parentFilter, isDeletedFilter);
  };

  const handleOpenCreate = () => {
    setFormData({ ...DEFAULT_FORM });
    setEditingCategory(null);
    setShowModal(true);
  };

  const handleOpenEdit = (cat: CategoryApiResponse) => {
    setEditingCategory(cat);
    setFormData({
      code: cat.code,
      name: cat.name,
      description: cat.description ?? "",
      parent_id: cat.parent_id ?? "",
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code.trim() || !formData.name.trim()) {
      showError("Vui lòng nhập đầy đủ Code và Tên");
      return;
    }
    setSubmitting(true);
    try {
      if (editingCategory) {
        await categoryService.updateCategory(editingCategory.id, formData);
        showSuccess("Cập nhật category thành công");
      } else {
        await categoryService.createCategory(formData);
        showSuccess("Tạo category thành công");
      }
      setShowModal(false);
      await load(searchQuery, currentPage, statusFilter, parentFilter, isDeletedFilter);
      loadParentOptions();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err instanceof Error ? err.message : null) ||
        (editingCategory ? "Cập nhật thất bại" : "Tạo thất bại");
      showError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (cat: CategoryApiResponse) => {
    if (!confirm(`Bạn có chắc muốn xóa category "${cat.name}"?`)) return;
    setSubmitting(true);
    try {
      await categoryService.deleteCategory(cat.id);
      showSuccess(`Đã xóa category "${cat.name}"`);
      await load(searchQuery, currentPage, statusFilter, parentFilter, isDeletedFilter);
      loadParentOptions();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err instanceof Error ? err.message : null) ||
        "Xóa category thất bại";
      showError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRestore = async (cat: CategoryApiResponse) => {
    if (!confirm(`Bạn có chắc muốn khôi phục category "${cat.name}"?`)) return;
    setSubmitting(true);
    try {
      await categoryService.restoreCategory(cat.id);
      showSuccess(`Đã khôi phục category "${cat.name}"`);
      await load(searchQuery, currentPage, statusFilter, parentFilter, isDeletedFilter);
    } catch {
      showError("Khôi phục category thất bại");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setStatusFilter("");
    setParentFilter("");
    setIsDeletedFilter(false);
    setCurrentPage(1);
    load("", 1, "", "", false);
  };

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Category Management</h1>
          <p className="text-xs sm:text-sm text-slate-600">
            Quản lý danh mục sản phẩm
            {totalItems > 0 && (
              <span className="ml-2 inline-flex items-center rounded-full bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-700">
                {totalItems} danh mục
              </span>
            )}
          </p>
        </div>
        <Button onClick={handleOpenCreate}>+ Tạo danh mục</Button>
      </div>

      {/* Filter Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap gap-3">
          {/* Search keyword */}
          <div className="relative min-w-[200px] flex-1">
            <svg
              className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Tìm theo tên hoặc mã..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-4 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
            />
          </div>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); load(searchQuery, 1, e.target.value, parentFilter, isDeletedFilter); }}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>

          {/* Parent category filter */}
          <select
            value={parentFilter}
            onChange={(e) => { setParentFilter(e.target.value); setCurrentPage(1); load(searchQuery, 1, statusFilter, e.target.value, isDeletedFilter); }}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
          >
            <option value="">Tất cả danh mục cha</option>          {parentOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.name}</option>
            ))}
          </select>

          {/* Is deleted filter */}
          <label className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer transition-colors select-none ${
            isDeletedFilter
              ? "border-red-400 bg-red-50 text-red-700"
              : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
          }`}>
            <input
              type="checkbox"
              checked={isDeletedFilter}
              onChange={(e) => { setIsDeletedFilter(e.target.checked); setCurrentPage(1); load(searchQuery, 1, statusFilter, parentFilter, e.target.checked); }}
              className="accent-red-500"
            />
            <span className="font-medium">Đã xóa</span>
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
                <th className="px-4 py-3">Mã</th>
                <th className="px-4 py-3">Tên danh mục</th>
                <th className="px-4 py-3">Mô tả</th>
                <th className="px-4 py-3">Danh mục cha</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3">Ngày tạo</th>
                <th className="px-4 py-3 text-right">Thao tác</th>
              </tr>
            </thead>            <tbody className="divide-y divide-slate-200">
              {categories.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-sm text-slate-500">
                    Không có danh mục nào
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
              {!loading && categories.map((cat) => (
                <tr key={cat.id} className={`hover:bg-slate-50 transition-colors ${cat.is_deleted && !isDeletedFilter ? "opacity-60" : cat.is_deleted && isDeletedFilter ? "bg-red-50" : ""}`}>
                  <td className="px-4 py-3 font-mono text-xs font-medium text-slate-700">
                    <span className="rounded bg-slate-100 px-2 py-1">{cat.code}</span>
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900">{cat.name}</td>
                  <td className="px-4 py-3 max-w-[200px] truncate text-slate-500">
                    {cat.description || <span className="text-slate-300 italic">—</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {cat.parent_name ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
                        <svg className="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                        </svg>
                        {cat.parent_name}
                      </span>
                    ) : (
                      <span className="text-slate-300 italic text-xs">Root</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {cat.is_deleted ? (
                      <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
                        Đã xóa
                      </span>
                    ) : cat.is_active ? (
                      <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-700">
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {new Date(cat.created_at).toLocaleDateString("vi-VN")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setViewingCategory(cat)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                        title="Xem chi tiết"
                      >
                        <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                      {!cat.is_deleted && (
                        <button
                          onClick={() => handleOpenEdit(cat)}
                          className="rounded-lg p-1.5 text-blue-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                          title="Chỉnh sửa"
                        >
                          <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                      )}
                      {cat.is_deleted ? (
                        <button
                          onClick={() => handleRestore(cat)}
                          disabled={submitting}
                          className="rounded-lg p-1.5 text-green-400 hover:bg-green-50 hover:text-green-600 transition-colors"
                          title="Khôi phục"
                        >
                          <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleDelete(cat)}
                          disabled={submitting}
                          className="rounded-lg p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                          title="Xóa"
                        >
                          <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}                      </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
            <p className="text-xs text-slate-500">
              Tổng: <span className="font-semibold text-slate-700">{totalItems}</span> danh mục
            </p>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          </div>
        )}
      </div>

      {/* ─── Create / Edit Modal ─────────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-slate-900">
                {editingCategory ? "Chỉnh sửa danh mục" : "Tạo danh mục mới"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Mã danh mục <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="VD: CAT001"
                    value={formData.code}
                    onChange={(e) => setFormData((f) => ({ ...f, code: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Tên danh mục <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="VD: Cà phê"
                    value={formData.name}
                    onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Mô tả</label>
                <textarea
                  rows={3}
                  placeholder="Nhập mô tả danh mục..."
                  value={formData.description ?? ""}
                  onChange={(e) => setFormData((f) => ({ ...f, description: e.target.value }))}
                  className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Danh mục cha</label>
                <select
                  value={formData.parent_id ?? ""}
                  onChange={(e) => setFormData((f) => ({ ...f, parent_id: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                >
                  <option value="">— Không có (Root) —</option>                  {parentOptions
                    .filter((opt) => !editingCategory || opt.value !== editingCategory.id)
                    .map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.name}</option>
                    ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Hủy
                </button>
                <Button type="submit" loading={submitting}>
                  {editingCategory ? "Cập nhật" : "Tạo mới"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Detail / View Modal ─────────────────────────────────────────────── */}
      {viewingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-slate-900">Chi tiết danh mục</h2>
              <button
                onClick={() => setViewingCategory(null)}
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
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Mã</p>
                  <p className="mt-1 font-mono font-semibold text-slate-800">{viewingCategory.code}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Trạng thái</p>
                  <div className="mt-1">
                    {viewingCategory.is_deleted ? (
                      <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">Đã xóa</span>
                    ) : viewingCategory.is_active ? (
                      <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">Active</span>
                    ) : (
                      <span className="rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-700">Inactive</span>
                    )}
                  </div>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Tên danh mục</p>
                <p className="mt-1 text-slate-800">{viewingCategory.name}</p>
              </div>
              {viewingCategory.description && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Mô tả</p>
                  <p className="mt-1 text-slate-700">{viewingCategory.description}</p>
                </div>
              )}
              {viewingCategory.parent_name && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Danh mục cha</p>
                  <p className="mt-1 text-slate-700">{viewingCategory.parent_name}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Ngày tạo</p>
                  <p className="mt-1 text-sm text-slate-700">
                    {new Date(viewingCategory.created_at).toLocaleString("vi-VN")}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Cập nhật lúc</p>
                  <p className="mt-1 text-sm text-slate-700">
                    {new Date(viewingCategory.updated_at).toLocaleString("vi-VN")}
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                {!viewingCategory.is_deleted && (
                  <button
                    onClick={() => { setViewingCategory(null); handleOpenEdit(viewingCategory); }}
                    className="rounded-lg border border-blue-300 px-4 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-50"
                  >
                    Chỉnh sửa
                  </button>
                )}
                <button
                  onClick={() => setViewingCategory(null)}
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

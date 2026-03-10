import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "../../../components";
import Pagination from "../../../components/ui/Pagination";
import { fetchFranchiseSelect } from "../../../services/store.service";
import type { FranchiseSelectItem } from "../../../services/store.service";
import { categoryFranchiseService } from "../../../services/category-franchise.service";
import { adminProductFranchiseService } from "../../../services/product-franchise.service";
import { productCategoryFranchiseService } from "../../../services/product-category-franchise.service";
import type {
  ProductCategoryFranchiseApiResponse,
  SearchProductCategoryFranchiseDto,
  CreateProductCategoryFranchiseDto,
  ReorderProductCategoryFranchiseDto,
  CategoryFranchiseApiResponse,
  ProductFranchiseApiResponse,
} from "../../../models/product.model";
import { showError, showSuccess } from "../../../utils";

const ITEMS_PER_PAGE = 10;

const DEFAULT_CREATE: CreateProductCategoryFranchiseDto = {
  category_franchise_id: "",
  product_franchise_id: "",
  display_order: 1,
};

const getApiErrorMessage = (err: unknown, fallback: string) => {
  const data = (err as { response?: { data?: unknown } })?.response?.data as
    | { message?: string | null; errors?: Array<{ message?: string }> }
    | undefined;
  const errors = data?.errors;
  if (Array.isArray(errors) && errors.length > 0) {
    const msg = errors
      .map((e) => e?.message)
      .filter(Boolean)
      .join(", ");
    if (msg) return msg;
  }
  if (data?.message) return String(data.message);
  return err instanceof Error ? err.message : fallback;
};

export default function ProductCategoryFranchisePage() {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<ProductCategoryFranchiseApiResponse[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const [franchises, setFranchises] = useState<FranchiseSelectItem[]>([]);
  const [categoryFranchises, setCategoryFranchises] = useState<
    CategoryFranchiseApiResponse[]
  >([]);
  const [productFranchises, setProductFranchises] = useState<
    ProductFranchiseApiResponse[]
  >([]);

  const [filters, setFilters] = useState<{
    franchise_id: string;
    category_id: string;
    product_id: string;
    is_active: string;
    is_deleted: boolean;
  }>({
    franchise_id: "",
    category_id: "",
    product_id: "",
    is_active: "",
    is_deleted: false,
  });

  // create modal
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] =
    useState<CreateProductCategoryFranchiseDto>({ ...DEFAULT_CREATE });
  const [creating, setCreating] = useState(false);

  // detail modal
  const [detail, setDetail] =
    useState<ProductCategoryFranchiseApiResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // reorder modal
  const [reorderItem, setReorderItem] =
    useState<ProductCategoryFranchiseApiResponse | null>(null);
  const [newPosition, setNewPosition] = useState<string>("");
  const [reordering, setReordering] = useState(false);

  const hasRun = useRef(false);

  const franchiseNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    franchises.forEach((f) => {
      map[f.value] = `${f.name} (${f.code})`;
    });
    return map;
  }, [franchises]);

  const buildSearchDto = (
    pageNum: number,
  ): SearchProductCategoryFranchiseDto => {
    const isActive =
      filters.is_active === "true"
        ? true
        : filters.is_active === "false"
          ? false
          : undefined;
    return {
      searchCondition: {
        franchise_id: filters.franchise_id || undefined,
        category_id: filters.category_id || undefined,
        product_id: filters.product_id || undefined,
        is_active: isActive,
        is_deleted: filters.is_deleted,
      },
      pageInfo: { pageNum, pageSize: ITEMS_PER_PAGE },
    };
  };

  const load = async (pageNum = currentPage) => {
    setLoading(true);
    try {
      const result =
        await productCategoryFranchiseService.searchProductCategoryFranchises(
          buildSearchDto(pageNum),
        );
      setItems(result.data);
      setCurrentPage(result.pageInfo.pageNum);
      setTotalPages(result.pageInfo.totalPages);
      setTotalItems(result.pageInfo.totalItems);
    } catch (err) {
      showError("Lấy danh sách thất bại");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadSelects = async () => {
    try {
      const [frs, cfRes, pfRes] = await Promise.all([
        fetchFranchiseSelect(),
        categoryFranchiseService.searchCategoryFranchises({
          searchCondition: { is_deleted: false },
          pageInfo: { pageNum: 1, pageSize: 100 },
        }),
        adminProductFranchiseService.searchProductFranchises({
          searchCondition: { is_deleted: false },
          pageInfo: { pageNum: 1, pageSize: 100 },
        }),
      ]);
      setFranchises(frs);
      setCategoryFranchises(cfRes.data);
      setProductFranchises(pfRes.data);
    } catch (err) {
      console.error("[PCF] loadSelects error:", err);
    }
  };

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;
    loadSelects();
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.category_franchise_id || !createForm.product_franchise_id) {
      showError("Vui lòng chọn category franchise và product franchise");
      return;
    }
    if (!createForm.display_order || createForm.display_order < 1) {
      showError("display_order phải >= 1");
      return;
    }
    setCreating(true);
    try {
      await productCategoryFranchiseService.createProductCategoryFranchise(
        createForm,
      );
      showSuccess("Thêm thành công");
      setCreateOpen(false);
      setCreateForm({ ...DEFAULT_CREATE });
      await load(1);
    } catch (err) {
      showError(getApiErrorMessage(err, "Tạo thất bại"));
    } finally {
      setCreating(false);
    }
  };

  const openDetail = async (id: string) => {
    setDetail(null);
    setDetailLoading(true);
    try {
      const d =
        await productCategoryFranchiseService.getProductCategoryFranchiseById(
          id,
        );
      setDetail(d);
    } catch (err) {
      showError("Lấy chi tiết thất bại");
      console.error(err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDelete = async (it: ProductCategoryFranchiseApiResponse) => {
    if (!confirm("Bạn có chắc muốn xóa item này?")) return;
    try {
      await productCategoryFranchiseService.deleteProductCategoryFranchise(
        it.id,
      );
      showSuccess("Đã xóa");
      await load(currentPage);
    } catch (err) {
      showError(getApiErrorMessage(err, "Xóa thất bại"));
    }
  };

  const handleRestore = async (it: ProductCategoryFranchiseApiResponse) => {
    if (!confirm("Khôi phục item này?")) return;
    try {
      await productCategoryFranchiseService.restoreProductCategoryFranchise(
        it.id,
      );
      showSuccess("Đã khôi phục");
      await load(currentPage);
    } catch (err) {
      showError(getApiErrorMessage(err, "Khôi phục thất bại"));
    }
  };

  const handleToggleStatus = async (
    it: ProductCategoryFranchiseApiResponse,
  ) => {
    const next = !it.is_active;
    if (!confirm(`${next ? "Bật" : "Tắt"} item này?`)) return;
    try {
      await productCategoryFranchiseService.changeProductCategoryFranchiseStatus(
        it.id,
        next,
      );
      showSuccess("Đã cập nhật trạng thái");
      await load(currentPage);
    } catch (err) {
      showError(getApiErrorMessage(err, "Đổi trạng thái thất bại"));
    }
  };

  const submitReorder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reorderItem) return;
    const pos = Number(newPosition);
    if (!newPosition || isNaN(pos) || pos < 1) {
      showError("Vị trí phải là số >= 1");
      return;
    }
    setReordering(true);
    try {
      const dto: ReorderProductCategoryFranchiseDto = {
        category_franchise_id: reorderItem.category_franchise_id,
        item_id: reorderItem.id,
        new_position: pos,
      };
      await productCategoryFranchiseService.reorderProductCategoryFranchise(
        dto,
      );
      showSuccess("Đã cập nhật thứ tự");
      setReorderItem(null);
      await load(currentPage);
    } catch (err) {
      showError(getApiErrorMessage(err, "Đổi thứ tự thất bại"));
    } finally {
      setReordering(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
            Product Category Franchise
          </h1>
          <p className="text-xs text-slate-600 sm:text-sm">
            Quản lý sản phẩm theo danh mục trong từng franchise — tổng{" "}
            {totalItems} item
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => load(1)} loading={loading}>
            Tải lại
          </Button>
          <Button
            onClick={() => {
              setCreateForm({ ...DEFAULT_CREATE });
              setCreateOpen(true);
            }}
          >
            + Thêm mới
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Franchise
            </label>
            <select
              value={filters.franchise_id}
              onChange={(e) =>
                setFilters((f) => ({ ...f, franchise_id: e.target.value }))
              }
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
            >
              <option value="">-- Tất cả --</option>
              {franchises.map((fr) => (
                <option key={fr.value} value={fr.value}>
                  {fr.name} ({fr.code})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Trạng thái
            </label>
            <select
              value={filters.is_active}
              onChange={(e) =>
                setFilters((f) => ({ ...f, is_active: e.target.value }))
              }
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
            >
              <option value="">-- Tất cả --</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Đã xóa
            </label>
            <select
              value={filters.is_deleted ? "true" : "false"}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  is_deleted: e.target.value === "true",
                }))
              }
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
            >
              <option value="false">Chưa xóa</option>
              <option value="true">Đã xóa</option>
            </select>
          </div>

          <div className="flex items-end">
            <Button
              className="w-full"
              onClick={() => load(1)}
              loading={loading}
            >
              Tìm kiếm
            </Button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left">Franchise</th>
              <th className="px-4 py-3 text-left">Category</th>
              <th className="px-4 py-3 text-left">Product</th>
              <th className="px-4 py-3 text-left">Size</th>
              <th className="px-4 py-3 text-right">Price</th>
              <th className="px-4 py-3 text-center">Order</th>
              <th className="px-4 py-3 text-center">Status</th>
              <th className="px-4 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-8 text-center text-slate-400"
                >
                  Đang tải...
                </td>
              </tr>
            )}
            {!loading && items.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-8 text-center text-slate-400"
                >
                  Không có dữ liệu
                </td>
              </tr>
            )}
            {!loading &&
              items.map((it) => (
                <tr key={it.id} className="transition-colors hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-700">
                    {it.franchise_name ||
                      franchiseNameMap[it.franchise_id] ||
                      it.franchise_id}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {it.category_name || it.category_id}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {it.product_name || it.product_id}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{it.size}</td>
                  <td className="px-4 py-3 text-right font-medium text-slate-700">
                    {it.price_base.toLocaleString("vi-VN")}đ
                  </td>
                  <td className="px-4 py-3 text-center text-slate-500">
                    {it.display_order}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        it.is_active
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-red-50 text-red-700"
                      }`}
                    >
                      {it.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => openDetail(it.id)}
                        className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600 transition hover:bg-slate-50"
                      >
                        Chi tiết
                      </button>
                      <button
                        onClick={() => handleToggleStatus(it)}
                        className={`rounded-lg border px-2 py-1 text-xs transition ${
                          it.is_active
                            ? "border-amber-200 text-amber-700 hover:bg-amber-50"
                            : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                        }`}
                      >
                        {it.is_active ? "Tắt" : "Bật"}
                      </button>
                      <button
                        onClick={() => {
                          setReorderItem(it);
                          setNewPosition(String(it.display_order));
                        }}
                        className="rounded-lg border border-blue-200 px-2 py-1 text-xs text-blue-700 transition hover:bg-blue-50"
                      >
                        Sắp xếp
                      </button>
                      {it.is_deleted ? (
                        <button
                          onClick={() => handleRestore(it)}
                          className="rounded-lg border border-emerald-200 px-2 py-1 text-xs text-emerald-700 transition hover:bg-emerald-50"
                        >
                          Khôi phục
                        </button>
                      ) : (
                        <button
                          onClick={() => handleDelete(it)}
                          className="rounded-lg border border-red-200 px-2 py-1 text-xs text-red-600 transition hover:bg-red-50"
                        >
                          Xóa
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={(p) => load(p)}
        />
      )}

      {/* Create Modal */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-bold text-slate-900">
              Thêm Product vào Category Franchise
            </h2>
            <form onSubmit={submitCreate} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Category Franchise <span className="text-red-500">*</span>
                </label>
                <select
                  value={createForm.category_franchise_id}
                  onChange={(e) =>
                    setCreateForm((f) => ({
                      ...f,
                      category_franchise_id: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                  required
                >
                  <option value="">-- Chọn category franchise --</option>
                  {categoryFranchises.map((cf) => (
                    <option key={cf.id} value={cf.id}>
                      {cf.category_name || cf.category_id} —{" "}
                      {cf.franchise_name || cf.franchise_id}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Product Franchise <span className="text-red-500">*</span>
                </label>
                <select
                  value={createForm.product_franchise_id}
                  onChange={(e) =>
                    setCreateForm((f) => ({
                      ...f,
                      product_franchise_id: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                  required
                >
                  <option value="">-- Chọn product franchise --</option>
                  {productFranchises.map((pf) => (
                    <option key={pf.id} value={pf.id}>
                      {pf.product_id} — Size: {pf.size} —{" "}
                      {pf.price_base.toLocaleString("vi-VN")}đ
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Display Order <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min={1}
                  value={createForm.display_order}
                  onChange={(e) =>
                    setCreateForm((f) => ({
                      ...f,
                      display_order: Number(e.target.value),
                    }))
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCreateOpen(false)}
                >
                  Hủy
                </Button>
                <Button type="submit" loading={creating}>
                  Tạo
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {(detail || detailLoading) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-bold text-slate-900">Chi tiết</h2>
            {detailLoading && (
              <p className="text-sm text-slate-400">Đang tải...</p>
            )}
            {detail && (
              <div className="space-y-2 text-sm">
                {(
                  [
                    ["ID", detail.id],
                    [
                      "Franchise",
                      `${detail.franchise_name} (${detail.franchise_id})`,
                    ],
                    [
                      "Category",
                      `${detail.category_name} (${detail.category_id})`,
                    ],
                    [
                      "Product",
                      `${detail.product_name} (${detail.product_id})`,
                    ],
                    ["Size", detail.size],
                    ["Price", `${detail.price_base.toLocaleString("vi-VN")}đ`],
                    ["Display Order", detail.display_order],
                    ["Status", detail.is_active ? "Active" : "Inactive"],
                    ["Deleted", detail.is_deleted ? "Yes" : "No"],
                    [
                      "Created",
                      new Date(detail.created_at).toLocaleString("vi-VN"),
                    ],
                    [
                      "Updated",
                      new Date(detail.updated_at).toLocaleString("vi-VN"),
                    ],
                  ] as [string, string | number][]
                ).map(([label, value]) => (
                  <div key={label} className="flex gap-2">
                    <span className="w-32 flex-shrink-0 font-semibold text-slate-500">
                      {label}
                    </span>
                    <span className="break-all text-slate-700">{value}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-4 flex justify-end">
              <Button variant="outline" onClick={() => setDetail(null)}>
                Đóng
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Reorder Modal */}
      {reorderItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="mb-1 text-lg font-bold text-slate-900">
              Đổi thứ tự hiển thị
            </h2>
            <p className="mb-4 text-xs text-slate-500">
              {reorderItem.product_name} — {reorderItem.category_name}
            </p>
            <form onSubmit={submitReorder} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Vị trí mới <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min={1}
                  value={newPosition}
                  onChange={(e) => setNewPosition(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                  autoFocus
                  required
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setReorderItem(null)}
                >
                  Hủy
                </Button>
                <Button type="submit" loading={reordering}>
                  Cập nhật
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

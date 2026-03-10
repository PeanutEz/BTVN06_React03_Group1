import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "../../../components";
import Pagination from "../../../components/ui/Pagination";
import { fetchFranchiseSelect } from "../../../services/store.service";
import type { FranchiseSelectItem } from "../../../services/store.service";
import {
  adminProductCategoryFranchiseService,
} from "../../../services/product-category-franchise.service";
import type {
  CreateProductCategoryFranchiseDto,
  ProductCategoryFranchiseApiResponse,
  SearchProductCategoryFranchiseDto,
} from "../../../models/product.model";
import { showError, showSuccess } from "../../../utils";

const ITEMS_PER_PAGE = 10;

const DEFAULT_CREATE: CreateProductCategoryFranchiseDto = {
  category_franchise_id: "",
  product_franchise_id: "",
  display_order: 1,
};

export default function ProductCategoryFranchisePage() {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<ProductCategoryFranchiseApiResponse[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const [franchises, setFranchises] = useState<FranchiseSelectItem[]>([]);


  const [filters, setFilters] = useState<{
    franchise_id: string;
    is_active: string;
    is_deleted: boolean;
  }>({
    franchise_id: "",
    is_active: "",
    is_deleted: false,
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateProductCategoryFranchiseDto>({
    ...DEFAULT_CREATE,
  });
  const [creating, setCreating] = useState(false);

  const [detailId, setDetailId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ProductCategoryFranchiseApiResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const hasRun = useRef(false);

  const franchiseNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    franchises.forEach((f) => {
      map[f.value] = `${f.name} (${f.code})`;
    });
    return map;
  }, [franchises]);

  const buildSearchDto = (pageNum: number): SearchProductCategoryFranchiseDto => {
    const isActive =
      filters.is_active === "true" ? true : filters.is_active === "false" ? false : undefined;
    return {
      searchCondition: {
        franchise_id: filters.franchise_id || undefined,
        is_active: isActive,
        is_deleted: filters.is_deleted,
      },
      pageInfo: {
        pageNum,
        pageSize: ITEMS_PER_PAGE,
      },
    };
  };

  const loadSelects = async () => {
    try {
      const [frs] = await Promise.all([fetchFranchiseSelect()]);
      setFranchises(frs);
    } catch (err) {
      console.error("[ProductCategoryFranchise] loadSelects error:", err);
    }
  };

  const load = async (pageNum = currentPage) => {
    setLoading(true);
    try {
      const result =
        await adminProductCategoryFranchiseService.searchProductCategoryFranchises(
          buildSearchDto(pageNum),
        );
      setItems(result.data);
      setCurrentPage(result.pageInfo.pageNum);
      setTotalPages(result.pageInfo.totalPages);
      setTotalItems(result.pageInfo.totalItems);
    } catch (err) {
      console.error("[ProductCategoryFranchise] load error:", err);
      showError("Lấy danh sách product-category-franchise thất bại");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;
    loadSelects();
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openCreate = () => {
    setCreateForm({ ...DEFAULT_CREATE });
    setCreateOpen(true);
  };

  const submitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.category_franchise_id || !createForm.product_franchise_id) {
      showError("Vui lòng chọn category franchise và product franchise");
      return;
    }
    if (!createForm.display_order || Number.isNaN(Number(createForm.display_order))) {
      showError("Vui lòng nhập display_order hợp lệ");
      return;
    }
    setCreating(true);
    try {
      await adminProductCategoryFranchiseService.createProductCategoryFranchise({
        category_franchise_id: createForm.category_franchise_id,
        product_franchise_id: createForm.product_franchise_id,
        display_order: Number(createForm.display_order),
      });
      showSuccess("Thêm product vào category franchise thành công");
      setCreateOpen(false);
      await load(1);
    } catch (err) {
      console.error("[ProductCategoryFranchise] create error:", err);
      showError("Tạo thất bại");
    } finally {
      setCreating(false);
    }
  };

  const openDetail = async (id: string) => {
    setDetailId(id);
    setDetail(null);
    setDetailLoading(true);
    try {
      const d = await adminProductCategoryFranchiseService.getProductCategoryFranchiseById(id);
      setDetail(d);
    } catch (err) {
      console.error("[ProductCategoryFranchise] detail error:", err);
      showError("Lấy chi tiết thất bại");
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDelete = async (it: ProductCategoryFranchiseApiResponse) => {
    if (!confirm("Bạn có chắc muốn xóa item này?")) return;
    try {
      await adminProductCategoryFranchiseService.deleteProductCategoryFranchise(it.id);
      showSuccess("Đã xóa");
      await load(currentPage);
    } catch (err) {
      showError("Xóa thất bại");
    }
  };

  const handleRestore = async (it: ProductCategoryFranchiseApiResponse) => {
    if (!confirm("Khôi phục item này?")) return;
    try {
      await adminProductCategoryFranchiseService.restoreProductCategoryFranchise(it.id);
      showSuccess("Đã khôi phục");
      await load(currentPage);
    } catch (err) {
      showError("Khôi phục thất bại");
    }
  };

  const handleToggleStatus = async (it: ProductCategoryFranchiseApiResponse) => {
    const next = !it.is_active;
    const action = next ? "Bật" : "Tắt";
    if (!confirm(`${action} item này?`)) return;
    try {
      await adminProductCategoryFranchiseService.changeProductCategoryFranchiseStatus(
        it.id,
        next,
      );
      showSuccess("Đã cập nhật trạng thái");
      await load(currentPage);
    } catch (err) {
      showError("Đổi trạng thái thất bại");
    }
  };

  const handleReorder = async (
    it: ProductCategoryFranchiseApiResponse,
    newPosition: number,
  ) => {
    if (!Number.isFinite(newPosition) || newPosition <= 0) {
      showError("Vị trí mới không hợp lệ");
      return;
    }
    try {
      await adminProductCategoryFranchiseService.reorderProductCategoryFranchise(
        it.category_franchise_id,
        it.id,
        newPosition,
      );
      showSuccess("Đã cập nhật thứ tự");
      await load(currentPage);
    } catch (err) {
      showError("Đổi thứ tự thất bại");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
            Product Category Franchise
          </h1>
          <p className="text-xs text-slate-600 sm:text-sm">
            Quản lý gán sản phẩm (product franchise) vào danh mục theo franchise
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => load(1)} loading={loading}>
            Tải lại
          </Button>
          <Button onClick={openCreate}>+ Thêm product vào category</Button>
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
              onChange={(e) => {
                setFilters((f) => ({ ...f, franchise_id: e.target.value }));
                setCurrentPage(1);
              }}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
            >
              <option value="">-- Tất cả franchise --</option>
              {franchises.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.name} ({f.code})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              is_active
            </label>
            <select
              value={filters.is_active}
              onChange={(e) => {
                setFilters((f) => ({ ...f, is_active: e.target.value }));
                setCurrentPage(1);
              }}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
            >
              <option value="">Tất cả</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Khác
            </label>
            <div className="flex items-center gap-2">
              <label className="flex flex-1 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={filters.is_deleted}
                  onChange={(e) => {
                    setFilters((f) => ({ ...f, is_deleted: e.target.checked }));
                    setCurrentPage(1);
                  }}
                />
                Hiện record đã xóa
              </label>
              <Button onClick={() => load(1)} loading={loading} className="shrink-0">
                Tìm
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-4 py-3">Franchise</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Size / Price</th>
                <th className="px-4 py-3">Display Order</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {items.map((it) => (
                <tr key={it.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-900">
                      {franchiseNameMap[it.franchise_id] || it.franchise_name || it.franchise_id}
                    </p>
                    <p className="text-[11px] font-mono text-slate-400">{it.franchise_id}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-900">{it.category_name}</p>
                    <p className="text-[11px] font-mono text-slate-400">{it.category_franchise_id}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-900">{it.product_name}</p>
                    <p className="text-[11px] font-mono text-slate-400">{it.product_franchise_id}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="space-y-1 text-xs">
                      <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">
                        Size: {it.size}
                      </span>
                      <div className="font-semibold text-slate-900">
                        {Number(it.price_base).toLocaleString("vi-VN")} đ
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        defaultValue={it.display_order}
                        min={1}
                        className="w-16 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30"
                        onBlur={(e) =>
                          handleReorder(it, Number((e.target as HTMLInputElement).value))
                        }
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {it.is_deleted ? (
                      <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                        Deleted
                      </span>
                    ) : it.is_active ? (
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                        Active
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => openDetail(it.id)}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-primary-400 hover:bg-primary-50 hover:text-primary-700"
                      >
                        Chi tiết
                      </button>
                      {!it.is_deleted && (
                        <button
                          onClick={() => handleToggleStatus(it)}
                          className="rounded-lg border border-amber-200 bg-white px-3 py-1.5 text-xs font-semibold text-amber-700 transition hover:border-amber-400 hover:bg-amber-50"
                        >
                          {it.is_active ? "Tắt" : "Bật"}
                        </button>
                      )}
                      {!it.is_deleted ? (
                        <button
                          onClick={() => handleDelete(it)}
                          className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:border-red-400 hover:bg-red-50"
                        >
                          Xóa
                        </button>
                      ) : (
                        <button
                          onClick={() => handleRestore(it)}
                          className="rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-600 transition hover:border-emerald-400 hover:bg-emerald-50"
                        >
                          Khôi phục
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {items.length === 0 && !loading && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-sm text-slate-500"
                  >
                    Không có dữ liệu
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td colSpan={7}>
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
            onPageChange={(page) => {
              setCurrentPage(page);
              load(page);
            }}
          />
        </div>
      </div>

      {/* Create Modal */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Thêm product vào Category Franchise
                </h2>
              </div>
              <button
                onClick={() => setCreateOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={submitCreate} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">
                    Category Franchise ID *
                  </label>
                  <input
                    value={createForm.category_franchise_id}
                    onChange={(e) =>
                      setCreateForm((f) => ({ ...f, category_franchise_id: e.target.value }))
                    }
                    placeholder="Nhập category_franchise_id"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">
                    Product Franchise ID *
                  </label>
                  <input
                    value={createForm.product_franchise_id}
                    onChange={(e) =>
                      setCreateForm((f) => ({ ...f, product_franchise_id: e.target.value }))
                    }
                    placeholder="Nhập product_franchise_id"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">
                  Display order *
                </label>
                <input
                  type="number"
                  value={String(createForm.display_order ?? "")}
                  onChange={(e) =>
                    setCreateForm((f) => ({
                      ...f,
                      display_order: Number(e.target.value),
                    }))
                  }
                  placeholder="VD: 1"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                />
              </div>

              <div className="flex gap-3 pt-1">
                <Button type="submit" loading={creating} className="flex-1">
                  Xác nhận
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCreateOpen(false)}
                  disabled={creating}
                  className="flex-1"
                >
                  Hủy
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {detailId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Chi tiết</h2>
              </div>
              <button
                onClick={() => setDetailId(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {detailLoading ? (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
                Đang tải...
              </div>
            ) : !detail ? (
              <p className="text-sm text-slate-500">Không có dữ liệu</p>
            ) : (
              <div className="space-y-3 text-sm">
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs text-slate-500">ID</p>
                  <p className="font-mono text-xs text-slate-700">{detail.id}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                  <p className="text-xs text-slate-500">Franchise</p>
                  <p className="font-semibold text-slate-900">
                    {franchiseNameMap[detail.franchise_id] || detail.franchise_name}
                  </p>
                  <p className="font-mono text-[11px] text-slate-400">{detail.franchise_id}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                  <p className="text-xs text-slate-500">Category</p>
                  <p className="font-semibold text-slate-900">{detail.category_name}</p>
                  <p className="font-mono text-[11px] text-slate-400">
                    {detail.category_franchise_id}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                  <p className="text-xs text-slate-500">Product</p>
                  <p className="font-semibold text-slate-900">{detail.product_name}</p>
                  <p className="font-mono text-[11px] text-slate-400">
                    {detail.product_franchise_id}
                  </p>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                    <p className="text-xs text-slate-500">Size</p>
                    <p className="font-semibold text-slate-900">{detail.size}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                    <p className="text-xs text-slate-500">Price base</p>
                    <p className="font-semibold text-slate-900">
                      {Number(detail.price_base).toLocaleString("vi-VN")} đ
                    </p>
                  </div>
                </div>
              </div>
            )}
            <div className="mt-5 flex gap-3">
              <Button
                variant="outline"
                onClick={() => setDetailId(null)}
                className="flex-1"
              >
                Đóng
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


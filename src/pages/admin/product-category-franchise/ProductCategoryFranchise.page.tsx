import { useEffect, useMemo, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { Button } from "../../../components";
import Pagination from "../../../components/ui/Pagination";
import { GlassSearchSelect } from "../../../components/ui";
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
  ProductWithCategoriesResponse,
} from "../../../models/product.model";
import { showError, showSuccess } from "../../../utils";
import { useManagerFranchiseId } from "../../../hooks/useManagerFranchiseId";

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
  const managerFranchiseId = useManagerFranchiseId();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<ProductCategoryFranchiseApiResponse[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const [franchises, setFranchises] = useState<FranchiseSelectItem[]>([]);
  const [categoryFranchises, setCategoryFranchises] = useState<
    CategoryFranchiseApiResponse[]
  >([]);
  const [_productFranchises, setProductFranchises] = useState<
    ProductFranchiseApiResponse[]
  >([]);
  const [filters, setFilters] = useState<{
    franchise_id: string;
    category_id: string;
    product_id: string;
    is_active: string;
    is_deleted: boolean;
  }>({
    franchise_id: managerFranchiseId ?? "",
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

  // create modal - products by franchise (PCF-08)
  const [createPFItems, setCreatePFItems] = useState<ProductWithCategoriesResponse[]>([]);  const [createPFLoading, setCreatePFLoading] = useState(false);
  const [createFranchiseId, setCreateFranchiseId] = useState("");  // create franchise combobox
  const [createFranchiseOpen, setCreateFranchiseOpen] = useState(false);
  const [createFranchiseKeyword, setCreateFranchiseKeyword] = useState("");
  const createFranchiseTriggerRef = useRef<HTMLButtonElement>(null);
  const createFranchiseDropRef = useRef<HTMLDivElement>(null);
  const [createFranchiseRect, setCreateFranchiseRect] = useState<DOMRect | null>(null);
  // click-outside: create franchise portal
  useEffect(() => {
    if (!createFranchiseOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        createFranchiseTriggerRef.current?.contains(e.target as Node) ||
        createFranchiseDropRef.current?.contains(e.target as Node)
      ) return;
      setCreateFranchiseOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [createFranchiseOpen]);

  const createFranchiseOptions = useMemo(() => {
    if (!createFranchiseKeyword.trim()) return franchises;
    const k = createFranchiseKeyword.trim().toLowerCase();
    return franchises.filter(
      (f) => (f.name || "").toLowerCase().includes(k) || (f.code || "").toLowerCase().includes(k)
    );
  }, [franchises, createFranchiseKeyword]);

  const hasRun = useRef(false);
  const isInitialized = useRef(false);

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
    load(1).finally(() => {
      isInitialized.current = true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync khi managerFranchiseId thay đổi (store hydrate muộn)
  useEffect(() => {
    if (!managerFranchiseId) return;
    setFilters(prev => ({ ...prev, franchise_id: managerFranchiseId }));
  }, [managerFranchiseId]);

  useEffect(() => {
    if (!isInitialized.current) return;
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

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
  ) => {    const next = !it.is_active;
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

  // Reset category + product when franchise changes in create modal
  useEffect(() => {
    setCreateForm((f) => ({ ...f, category_franchise_id: "", product_franchise_id: "" }));
    setCreatePFItems([]);
    if (!createFranchiseId) return;
    setCreatePFLoading(true);
    productCategoryFranchiseService
      .getProductsByFranchiseWithCategory(createFranchiseId)
      .then((res) => setCreatePFItems(res))
      .catch(() => showError("Không thể tải sản phẩm"))
      .finally(() => setCreatePFLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createFranchiseId]);

  // Load PCF-08 when category franchise changes in create modal
  useEffect(() => {
    if (!createForm.category_franchise_id) {
      setCreateForm((f) => ({ ...f, product_franchise_id: "" }));
      return;
    }
    setCreateForm((f) => ({ ...f, product_franchise_id: "" }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createForm.category_franchise_id]);

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
        <div>          <h1 className="text-xl font-bold text-white sm:text-2xl">
            Product Category Franchise
          </h1>
          <p className="text-xs text-white/50 sm:text-sm">
            Quản lý sản phẩm theo danh mục trong từng franchise — tổng{" "}
            {totalItems} item
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={() => {
              setCreateForm({ ...DEFAULT_CREATE });
              setCreateFranchiseId(managerFranchiseId ?? "");
              setCreatePFItems([]);
              setCreateOpen(true);
            }}
          >
            + Thêm mới
          </Button>
        </div>
      </div>      {/* Filters */}
      <div className="relative z-20 rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {/* Franchise */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-widest text-white/40">
              Franchise
            </label>
            {managerFranchiseId ? (
              <div className="flex w-full items-center justify-between rounded-xl border border-primary-500/50 bg-primary-500/10 px-4 py-2.5 text-sm text-white cursor-not-allowed">
                <span className="truncate font-medium">
                  {filters.franchise_id ? (franchiseNameMap[filters.franchise_id] || filters.franchise_id) : "-- Tất cả franchise --"}
                </span>
                <svg className="ml-2 size-4 flex-shrink-0 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
            ) : (
              <GlassSearchSelect
                value={filters.franchise_id}
                onChange={(v) => setFilters((f) => ({ ...f, franchise_id: v }))}
                options={franchises.map((fr) => ({ value: fr.value, label: `${fr.name} (${fr.code})` }))}
                placeholder="-- Tất cả franchise --"
                searchPlaceholder="Tìm theo tên hoặc mã..."
                allLabel="-- Tất cả franchise --"
              />
            )}
          </div>

          {/* Danh mục */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-widest text-white/40">
              Danh mục
            </label>
            <GlassSearchSelect
              value={filters.category_id}
              onChange={(v) => setFilters((f) => ({ ...f, category_id: v }))}
              options={categoryFranchises.map((cf) => ({
                value: cf.category_id ?? cf.id,
                label: cf.category_name ?? cf.category_code ?? cf.id,
              }))}
              placeholder="-- Tất cả danh mục --"
              searchPlaceholder="Tìm theo tên danh mục..."
              allLabel="-- Tất cả danh mục --"
            />
          </div>

          {/* Status select */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-widest text-white/40">
              Trạng thái
            </label>
            <select
              value={filters.is_active}
              onChange={(e) => setFilters((f) => ({ ...f, is_active: e.target.value }))}
              className="w-full rounded-xl border border-white/15 bg-white/8 px-4 py-2.5 text-sm text-white outline-none transition hover:bg-white/15 hover:border-white/25 focus:border-primary-500/60"
            >
              <option value="" className="bg-slate-900">-- Tất cả --</option>
              <option value="true" className="bg-slate-900">Active</option>
              <option value="false" className="bg-slate-900">Inactive</option>
            </select>
          </div>

          {/* Đã xóa checkbox */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-widest text-white/40">
              &nbsp;
            </label>
            <label className={`flex h-[42px] cursor-pointer select-none items-center gap-2.5 rounded-xl border px-4 text-sm font-medium transition-colors ${
              filters.is_deleted
                ? "border-red-400/50 bg-red-500/15 text-red-300"
                : "border-white/15 bg-white/8 text-white/60 hover:bg-white/15 hover:border-white/25"
            }`}>
              <input
                type="checkbox"
                checked={filters.is_deleted}
                onChange={(e) => setFilters((f) => ({ ...f, is_deleted: e.target.checked }))}
                className="accent-red-500 size-4"
              />
              Đã xóa
            </label>
          </div>
        </div>
      </div>{/* Portal: filter franchise dropdown */}      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/5 shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-white/10 bg-white/5 text-xs font-semibold uppercase tracking-wide text-white/50">
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
          <tbody className="divide-y divide-white/5">
            {loading && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-white/40">
                  Đang tải...
                </td>
              </tr>
            )}
            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-white/40">
                  Không có dữ liệu
                </td>
              </tr>
            )}            {!loading &&
              items.map((it) => (
                <tr key={it.id} className={`transition-colors ${it.is_deleted && filters.is_deleted ? "bg-red-500/10" : "hover:bg-white/5"}`}>
                  <td className="px-4 py-3 text-white/80">
                    {it.franchise_name ||
                      franchiseNameMap[it.franchise_id] ||
                      "N/A"}
                  </td>
                  <td className="px-4 py-3 text-white/80">
                    {it.category_name || "N/A"}
                  </td>
                  <td className="px-4 py-3 text-white/80">
                    {it.product_name || "N/A"}
                  </td>
                  <td className="px-4 py-3 text-white/50">{it.size}</td>
                  <td className="px-4 py-3 text-right font-medium text-white/80">
                    {it.price_base.toLocaleString("vi-VN")}đ
                  </td>
                  <td className="px-4 py-3 text-center text-white/50">
                    {it.display_order}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        it.is_active
                          ? "bg-green-100 text-green-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {it.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        title="Xem chi tiết"
                        onClick={() => openDetail(it.id)}
                        className="inline-flex items-center justify-center size-8 rounded-lg border border-white/15 bg-white/10 text-white/60 hover:border-primary-400/60 hover:text-primary-400 hover:bg-primary-500/20 transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>                      <button
                        title={it.is_active ? "Tắt" : "Bật"}
                        onClick={() => handleToggleStatus(it)}
                        disabled={it.is_deleted}
                        className={`inline-flex items-center justify-center size-8 rounded-lg border transition-colors ${
                          it.is_deleted
                            ? "hidden"
                            : it.is_active
                            ? "border-amber-400/40 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
                            : "border-emerald-400/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
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
                      <button
                        title="Sắp xếp"
                        onClick={() => {
                          setReorderItem(it);
                          setNewPosition(String(it.display_order));
                        }}
                        className={`inline-flex items-center justify-center size-8 rounded-lg border border-blue-400/40 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors ${it.is_deleted ? "hidden" : ""}`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                        </svg>
                      </button>
                      {it.is_deleted ? (
                        <button
                          title="Khôi phục"
                          onClick={() => handleRestore(it)}
                          className="inline-flex items-center justify-center size-8 rounded-lg border border-emerald-400/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        </button>
                      ) : (
                        <button
                          title="Xóa"
                          onClick={() => handleDelete(it)}
                          className="inline-flex items-center justify-center size-8 rounded-lg border border-red-400/40 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/25" />
          <div className="relative w-full max-w-md rounded-2xl p-6 shadow-2xl" style={{
            background: "rgba(255, 255, 255, 0.12)",
            backdropFilter: "blur(40px) saturate(200%)",
            WebkitBackdropFilter: "blur(40px) saturate(200%)",
            border: "1px solid rgba(255, 255, 255, 0.25)",
            boxShadow: "0 25px 60px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)",
          }}>
            <h2 className="mb-4 text-lg font-bold text-white/95">
              Thêm Product vào Category Franchise
            </h2>            <form onSubmit={submitCreate} className="space-y-4">              <div className="space-y-1.5">                <label className="text-xs font-semibold uppercase tracking-wide text-white/50">
                  Franchise <span className="text-red-500">*</span>
                </label>
                {managerFranchiseId ? (
                  <div className="flex w-full items-center justify-between rounded-lg border border-primary-500/50 bg-primary-500/10 px-3 py-2 text-sm text-white cursor-not-allowed select-none">
                    <span className="truncate font-medium">
                      {createFranchiseId ? (franchiseNameMap[createFranchiseId] || createFranchiseId) : "-- Chọn franchise --"}
                    </span>
                    <svg className="ml-2 size-4 flex-shrink-0 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                ) : (
                  <button
                    ref={createFranchiseTriggerRef}
                    type="button"
                    onClick={() => {
                      const rect = createFranchiseTriggerRef.current?.getBoundingClientRect() ?? null;
                      setCreateFranchiseRect(rect);
                      setCreateFranchiseOpen((o) => !o);
                    }}
                    className="flex w-full items-center justify-between rounded-lg border border-white/[0.15] bg-white/[0.08] px-3 py-2 text-left text-sm text-white/90 outline-none transition hover:bg-white/[0.12] focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                  >
                    <span className="truncate">
                      {createFranchiseId ? (franchiseNameMap[createFranchiseId] || createFranchiseId) : "-- Chọn franchise --"}
                    </span>
                    <svg
                      className={`ml-2 size-4 flex-shrink-0 text-white/40 transition-transform duration-200 ${createFranchiseOpen ? "rotate-180" : ""}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-white/50">
                  Category Franchise <span className="text-red-500">*</span>
                </label>
                <select
                  value={createForm.category_franchise_id}
                  onChange={(e) =>
                    setCreateForm((f) => ({
                      ...f,
                      category_franchise_id: e.target.value,
                    }))
                  }                  disabled={!createFranchiseId}
                  className="w-full rounded-lg border border-white/[0.15] bg-slate-800 px-3 py-2 text-sm text-white/90 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 [&>option]:bg-slate-900 [&>option]:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  required
                >
                  <option value="">
                    {!createFranchiseId ? "-- Chọn franchise trước --" : "-- Chọn category franchise --"}
                  </option>
                  {categoryFranchises
                    .filter((cf) => !createFranchiseId || cf.franchise_id === createFranchiseId)
                    .map((cf) => (
                      <option key={cf.id} value={cf.id}>
                        {cf.category_name || "N/A"}
                      </option>
                    ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-white/50">
                  Product Franchise <span className="text-red-500">*</span>
                </label>
                <select
                  value={createForm.product_franchise_id}
                  onChange={(e) =>
                    setCreateForm((f) => ({
                      ...f,
                      product_franchise_id: e.target.value,
                    }))
                  }                  disabled={!createFranchiseId || createPFLoading}
                  className="w-full rounded-lg border border-white/[0.15] bg-slate-800 px-3 py-2 text-sm text-white/90 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 [&>option]:bg-slate-900 [&>option]:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  required
                >
                  <option value="">
                    {!createFranchiseId
                      ? "-- Chọn franchise trước --"
                      : createPFLoading
                        ? "Đang tải..."
                        : "-- Chọn product franchise --"}
                  </option>
                  {createPFItems.map((pf) => (
                    <option key={pf.product_franchise_id} value={pf.product_franchise_id}>
                      {pf.product_name} — Size: {pf.size} — {pf.price_base.toLocaleString("vi-VN")}đ
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-white/50">
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
                  className="w-full rounded-lg border border-white/[0.15] bg-white/[0.08] px-3 py-2 text-sm text-white/90 placeholder-white/30 outline-none focus:border-white/40 focus:ring-2 focus:ring-white/20"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCreateOpen(false)}
                  className="text-white/70 hover:bg-white/[0.1] hover:text-white border-white/[0.15]"
                >
                  Hủy
                </Button>
                <Button type="submit" loading={creating}>
                  Tạo
                </Button>
              </div>
            </form>
          </div>
        </div>      )}

      {/* Portal: create franchise dropdown */}
      {createFranchiseOpen && createFranchiseRect && ReactDOM.createPortal(
        <div
          ref={createFranchiseDropRef}
          className="rounded-lg border border-white/[0.15] shadow-2xl overflow-hidden"
          style={{
            position: "fixed",
            top: createFranchiseRect.bottom + 4,
            left: createFranchiseRect.left,
            width: createFranchiseRect.width,
            zIndex: 99999,
            background: "rgba(15,23,42,0.97)",
            backdropFilter: "blur(20px)",
          }}
        >
          <div className="border-b border-white/[0.12] px-3 py-2">
            <input
              autoFocus
              value={createFranchiseKeyword}
              onChange={(e) => setCreateFranchiseKeyword(e.target.value)}
              placeholder="Tìm theo tên hoặc mã..."
              className="w-full rounded-md border border-white/[0.15] bg-white/[0.08] text-white/90 placeholder-white/40 px-2.5 py-1.5 text-xs outline-none transition focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30"
            />
          </div>
          <div className="max-h-56 overflow-y-auto py-1 text-sm">
            {createFranchiseOptions.map((fr) => (
              <button
                key={fr.value}
                type="button"
                onClick={() => {
                  setCreateFranchiseId(fr.value);
                  setCreateFranchiseOpen(false);
                  setCreateFranchiseKeyword("");
                }}
                className={`flex w-full items-center px-3 py-2 text-left text-xs ${
                  createFranchiseId === fr.value ? "bg-white/[0.12] text-white" : "text-white/80 hover:bg-white/[0.08]"
                }`}
              >
                <span className="truncate">{fr.name} ({fr.code})</span>
              </button>
            ))}
            {createFranchiseOptions.length === 0 && (
              <div className="px-3 py-2 text-xs text-white/40">Không tìm thấy franchise</div>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* Detail Modal */}
      {(detail || detailLoading) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/25" />
          <div className="relative w-full max-w-lg rounded-2xl p-6 shadow-2xl" style={{
            background: "rgba(255, 255, 255, 0.12)",
            backdropFilter: "blur(40px) saturate(200%)",
            WebkitBackdropFilter: "blur(40px) saturate(200%)",
            border: "1px solid rgba(255, 255, 255, 0.25)",
            boxShadow: "0 25px 60px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)",
          }}>
            <h2 className="mb-4 text-lg font-bold text-white/95">Chi tiết</h2>
            {detailLoading && (
              <p className="text-sm text-white/50">Đang tải...</p>
            )}
            {detail && (
              <div className="space-y-2 text-sm">
                {(
                  [
                    [
                      "Franchise",
                      detail.franchise_name || "N/A",
                    ],
                    [
                      "Category",
                      detail.category_name || "N/A",
                    ],
                    [
                      "Product",
                      detail.product_name || "N/A",
                    ],
                    ["Size", detail.size],
                    ["Price", `${detail.price_base.toLocaleString("vi-VN")}đ`],
                    ["Display Order", detail.display_order],
                    ["Status", detail.is_active ? "Active" : "Inactive"],
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
                    <span className="w-32 flex-shrink-0 font-semibold text-white/50">
                      {label}
                    </span>
                    <span className="break-all text-white/90">{value}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-4 flex justify-end">
              <Button variant="outline" onClick={() => setDetail(null)} className="text-white/70 hover:bg-white/[0.1] hover:text-white border-white/[0.15]">
                Đóng
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Reorder Modal */}
      {reorderItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/25" />
          <div className="relative w-full max-w-sm rounded-2xl p-6 shadow-2xl" style={{
            background: "rgba(255, 255, 255, 0.12)",
            backdropFilter: "blur(40px) saturate(200%)",
            WebkitBackdropFilter: "blur(40px) saturate(200%)",
            border: "1px solid rgba(255, 255, 255, 0.25)",
            boxShadow: "0 25px 60px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)",
          }}>
            <h2 className="mb-1 text-lg font-bold text-white/95">
              Đổi thứ tự hiển thị
            </h2>
            <p className="mb-4 text-xs text-white/50">
              {reorderItem.product_name} — {reorderItem.category_name}
            </p>
            <form onSubmit={submitReorder} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-white/50">
                  Vị trí mới <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min={1}
                  value={newPosition}
                  onChange={(e) => setNewPosition(e.target.value)}
                  className="w-full rounded-lg border border-white/[0.15] bg-white/[0.08] px-3 py-2 text-sm text-white/90 placeholder-white/30 outline-none focus:border-white/40 focus:ring-2 focus:ring-white/20"
                  autoFocus
                  required
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setReorderItem(null)}
                  className="text-white/70 hover:bg-white/[0.1] hover:text-white border-white/[0.15]"
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

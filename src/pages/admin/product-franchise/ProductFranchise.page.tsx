import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { Button, useConfirm } from "../../../components";
import Pagination from "../../../components/ui/Pagination";
import { fetchFranchiseSelect } from "../../../services/store.service";
import type { FranchiseSelectItem } from "../../../services/store.service";
import { adminProductService } from "../../../services/product.service";
import type {
  CreateProductFranchiseDto,
  ProductFranchiseApiResponse,
  SearchProductFranchiseDto,
} from "../../../models/product.model";
import { adminProductFranchiseService } from "../../../services/product-franchise.service";
import { showError, showSuccess } from "../../../utils";
import { useManagerFranchiseId } from "../../../hooks/useManagerFranchiseId";

const ITEMS_PER_PAGE = 10;

const DEFAULT_CREATE: CreateProductFranchiseDto = {
  franchise_id: "",
  product_id: "",
  size: "DEFAULT",
  price_base: 0,
};

export default function ProductFranchisePage() {
  const showConfirm = useConfirm();
  const managerFranchiseId = useManagerFranchiseId();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<ProductFranchiseApiResponse[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const [franchises, setFranchises] = useState<FranchiseSelectItem[]>([]);
  // Cache for product names used in table (covers items not in `products` list)
  const [productNameById, setProductNameById] = useState<Record<string, string>>({});
  const [productNameFailedIds, setProductNameFailedIds] = useState<Record<string, true>>({});
  // Products loaded by franchise (API-08) for filter + create comboboxes
  const [filterPFProducts, setFilterPFProducts] = useState<{ product_id: string; name: string }[]>([]);
  const [filterPFLoading, setFilterPFLoading] = useState(false);
  const [createPFProducts, setCreatePFProducts] = useState<{ product_id: string; name: string }[]>([]);
  const [createPFLoading, setCreatePFLoading] = useState(false);
  // filters
  const [filters, setFilters] = useState<{
    franchise_id: string;
    product_id: string;
    size: string;
    price_from: string;
    price_to: string;
    is_active: string;
    is_deleted: boolean;
  }>({
    franchise_id: managerFranchiseId ?? "",
    product_id: "",
    size: "",
    price_from: "",
    price_to: "",
    is_active: "",
    is_deleted: false,
  });

  // combobox states (Filter bar)
  const [franchiseOpen, setFranchiseOpen] = useState(false);
  const [franchiseKeyword, setFranchiseKeyword] = useState("");
  const [productOpen, setProductOpen] = useState(false);
  const [productKeyword, setProductKeyword] = useState("");

  // create modal
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateProductFranchiseDto>({
    ...DEFAULT_CREATE,
  });
  const [creating, setCreating] = useState(false);  const [createFranchiseOpen, setCreateFranchiseOpen] = useState(false);
  const [createFranchiseKeyword, setCreateFranchiseKeyword] = useState("");
  const [createProductOpen, setCreateProductOpen] = useState(false);
  const [createProductKeyword, setCreateProductKeyword] = useState("");

  // portal refs for create modal dropdowns
  const createFranchiseTriggerRef = useRef<HTMLButtonElement>(null);
  const createFranchiseDropdownRef = useRef<HTMLDivElement>(null);
  const [createFranchiseRect, setCreateFranchiseRect] = useState<DOMRect | null>(null);
  const createProductTriggerRef = useRef<HTMLButtonElement>(null);
  const createProductDropdownRef = useRef<HTMLDivElement>(null);
  const [createProductRect, setCreateProductRect] = useState<DOMRect | null>(null);

  const openCreateFranchise = useCallback(() => {
    if (createFranchiseTriggerRef.current)
      setCreateFranchiseRect(createFranchiseTriggerRef.current.getBoundingClientRect());
    setCreateFranchiseOpen(true);
  }, []);
  const closeCreateFranchise = useCallback(() => { setCreateFranchiseOpen(false); setCreateFranchiseKeyword(""); }, []);

  const openCreateProduct = useCallback(() => {
    if (createProductTriggerRef.current)
      setCreateProductRect(createProductTriggerRef.current.getBoundingClientRect());
    setCreateProductOpen(true);
  }, []);
  const closeCreateProduct = useCallback(() => { setCreateProductOpen(false); setCreateProductKeyword(""); }, []);

  // detail
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ProductFranchiseApiResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // edit
  const [editing, setEditing] = useState<ProductFranchiseApiResponse | null>(null);
  const [editSize, setEditSize] = useState("");
  const [editPriceBase, setEditPriceBase] = useState<string>("");
  const [updating, setUpdating] = useState(false);


  const hasRun = useRef(false);
  const isInitialized = useRef(false);

  const getApiErrorMessage = (err: unknown, fallback: string) => {
    const data = (err as { response?: { data?: unknown } })?.response?.data as
      | {
          message?: string | null;
          errors?: Array<{ message?: string; field?: string }>;
        }
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

  const franchiseOptions = useMemo(() => {
    if (!franchiseKeyword.trim()) return franchises;
    const k = franchiseKeyword.trim().toLowerCase();
    return franchises.filter((f) => (f.name || "").toLowerCase().includes(k) || (f.code || "").toLowerCase().includes(k));
  }, [franchises, franchiseKeyword]);

  const productOptions = useMemo(() => {
    if (!productKeyword.trim()) return filterPFProducts;
    const k = productKeyword.trim().toLowerCase();
    return filterPFProducts.filter((p) => p.name.toLowerCase().includes(k));
  }, [filterPFProducts, productKeyword]);

  const createFranchiseOptions = useMemo(() => {
    if (!createFranchiseKeyword.trim()) return franchises;
    const k = createFranchiseKeyword.trim().toLowerCase();
    return franchises.filter((f) => (f.name || "").toLowerCase().includes(k) || (f.code || "").toLowerCase().includes(k));
  }, [franchises, createFranchiseKeyword]);

  const createProductOptions = useMemo(() => {
    if (!createProductKeyword.trim()) return createPFProducts;
    const k = createProductKeyword.trim().toLowerCase();
    return createPFProducts.filter((p) => p.name.toLowerCase().includes(k));
  }, [createPFProducts, createProductKeyword]);

  const productNameMap = useMemo(() => {
    const map: Record<string, string> = { ...productNameById };
    filterPFProducts.forEach((p) => { map[p.product_id] = p.name; });
    createPFProducts.forEach((p) => { map[p.product_id] = p.name; });
    return map;
  }, [productNameById, filterPFProducts, createPFProducts]);

  const franchiseNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    franchises.forEach((f) => { map[f.value] = `${f.name} (${f.code})`; });
    return map;
  }, [franchises]);

  const buildSearchDto = (pageNum: number): SearchProductFranchiseDto => {
    const isActive =
      filters.is_active === "true" ? true : filters.is_active === "false" ? false : undefined;
    const dto: SearchProductFranchiseDto = {
      searchCondition: {
        franchise_id: filters.franchise_id || undefined,
        product_id: filters.product_id || undefined,
        size: filters.size || undefined,
        price_from: filters.price_from || undefined,
        price_to: filters.price_to || undefined,
        is_active: isActive,
        is_deleted: filters.is_deleted,
      },
      pageInfo: { pageNum, pageSize: ITEMS_PER_PAGE },
    };
    return dto;
  };

  const loadSelects = async () => {
    try {
      const [frs] = await Promise.all([
        fetchFranchiseSelect(),
      ]);
      setFranchises(frs);
    } catch (err) {
      console.error("[ProductFranchise] loadSelects error:", err);
    }
  };

  // Ensure table shows product name (fetch missing names by product_id)
  useEffect(() => {
    const ids = Array.from(new Set(items.map((i) => i.product_id).filter(Boolean)));
    const missing = ids.filter((id) => !productNameMap[id] && !productNameFailedIds[id]);
    if (missing.length === 0) return;

    let cancelled = false;
    (async () => {
      try {
        // Fetch in batches until all missing are resolved (or failed)
        const batchSize = 20;
        for (let offset = 0; offset < missing.length; offset += batchSize) {
          if (cancelled) return;
          const batch = missing.slice(offset, offset + batchSize);
          const results = await Promise.allSettled(
            batch.map(async (id) => {
              const p = await adminProductService.getProductById(id);
              return { id: p.id, name: p.name };
            }),
          );
          if (cancelled) return;

          const ok: Record<string, string> = {};
          const fail: Record<string, true> = {};
          results.forEach((r, idx) => {
            const targetId = batch[idx];
            if (r.status === "fulfilled" && r.value?.id && r.value?.name) {
              ok[r.value.id] = r.value.name;
            } else {
              // Mark failed to avoid infinite refetch spam
              fail[targetId] = true;
            }
          });

          if (Object.keys(ok).length > 0) {
            setProductNameById((prev) => ({ ...prev, ...ok }));
          }
          if (Object.keys(fail).length > 0) {
            setProductNameFailedIds((prev) => ({ ...prev, ...fail }));
          }
        }
      } catch {
        // ignore
      }
    })();

    return () => { cancelled = true; };
     
  }, [items, productNameFailedIds, productNameMap]);

  // Load products by franchise for filter bar (API-08)
  useEffect(() => {
    if (!filters.franchise_id) {
      setFilterPFProducts([]);
      return;
    }
    setFilterPFLoading(true);
    adminProductFranchiseService
      .getProductsByFranchise(filters.franchise_id, true)
      .then((res) => {
        const seen = new Set<string>();
        const unique: { product_id: string; name: string }[] = [];
        res.forEach((pf) => {
          if (!seen.has(pf.product_id)) {
            seen.add(pf.product_id);
            unique.push({ product_id: pf.product_id, name: pf.product_name || pf.product_id });
          }
        });
        setFilterPFProducts(unique);
      })
      .catch(() => showError("Không thể tải sản phẩm của franchise"))
      .finally(() => setFilterPFLoading(false));
     
  }, [filters.franchise_id]);

  // Load products by franchise for create modal (API-08)
  useEffect(() => {
    if (!createForm.franchise_id) {
      setCreatePFProducts([]);
      return;
    }
    setCreatePFLoading(true);
    adminProductFranchiseService
      .getProductsByFranchise(createForm.franchise_id, true)
      .then((res) => {
        const seen = new Set<string>();
        const unique: { product_id: string; name: string }[] = [];
        res.forEach((pf) => {
          if (!seen.has(pf.product_id)) {
            seen.add(pf.product_id);
            unique.push({ product_id: pf.product_id, name: pf.product_name || pf.product_id });
          }
        });
        setCreatePFProducts(unique);
      })
      .catch(() => showError("Không thể tải sản phẟm của franchise"))
      .finally(() => setCreatePFLoading(false));
     
  }, [createForm.franchise_id]);

  const load = async (pageNum = currentPage) => {
    setLoading(true);
    try {
      const result = await adminProductFranchiseService.searchProductFranchises(buildSearchDto(pageNum));
      setItems(result.data);
      setCurrentPage(result.pageInfo.pageNum);
      setTotalPages(result.pageInfo.totalPages);
      setTotalItems(result.pageInfo.totalItems);
    } catch (err) {
      console.error("[ProductFranchise] load error:", err);
      showError("Lấy danh sách product-franchise thất bại");
    } finally {
      setLoading(false);
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

  // click-outside for create modal portal dropdowns
  useEffect(() => {
    if (!createFranchiseOpen) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!createFranchiseTriggerRef.current?.contains(t) && !createFranchiseDropdownRef.current?.contains(t))
        closeCreateFranchise();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [createFranchiseOpen, closeCreateFranchise]);

  useEffect(() => {
    if (!createProductOpen) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!createProductTriggerRef.current?.contains(t) && !createProductDropdownRef.current?.contains(t))
        closeCreateProduct();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [createProductOpen, closeCreateProduct]);

  const openCreate = () => {
    setCreateForm({ ...DEFAULT_CREATE });
    setCreateOpen(true);
  };

  const submitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.franchise_id || !createForm.product_id || !createForm.size) {
      showError("Vui lòng chọn franchise, product và size");
      return;
    }
    if (!createForm.price_base || Number.isNaN(Number(createForm.price_base))) {
      showError("Vui lòng nhập price_base hợp lệ");
      return;
    }
    setCreating(true);
    try {
      await adminProductFranchiseService.createProductFranchise({
        franchise_id: createForm.franchise_id,
        product_id: createForm.product_id,
        size: createForm.size,
        price_base: Number(createForm.price_base),
      });
      showSuccess("Thêm sản phẩm vào franchise thành công");
      setCreateOpen(false);
      await load(1);
    } catch (err: unknown) {
      showError(getApiErrorMessage(err, "Tạo thất bại"));
    } finally {
      setCreating(false);
    }
  };

  const openDetail = async (id: string) => {
    setDetailId(id);
    setDetail(null);
    setDetailLoading(true);
    try {
      const d = await adminProductFranchiseService.getProductFranchiseById(id);
      setDetail(d);
    } catch (err) {
      console.error("[ProductFranchise] detail error:", err);
      showError("Lấy chi tiết thất bại");
    } finally {
      setDetailLoading(false);
    }
  };

  const openEdit = (it: ProductFranchiseApiResponse) => {
    setEditing(it);
    setEditSize(it.size);
    setEditPriceBase(String(it.price_base ?? ""));
  };

  const submitUpdate = async () => {
    if (!editing) return;
    if (!editSize.trim()) { showError("Size không được trống"); return; }
    const price = Number(editPriceBase);
    if (!editPriceBase.trim() || Number.isNaN(price)) { showError("price_base không hợp lệ"); return; }
    setUpdating(true);
    try {
      await adminProductFranchiseService.updateProductFranchise(editing.id, { size: editSize.trim(), price_base: price });
      showSuccess("Cập nhật thành công");
      setEditing(null);
      await load(currentPage);
    } catch (err: unknown) {
      showError(getApiErrorMessage(err, "Cập nhật thất bại"));
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async (it: ProductFranchiseApiResponse) => {
    if (!await showConfirm({ message: "Bạn có chắc muốn xóa item này?", variant: "danger" })) return;
    try {
      await adminProductFranchiseService.deleteProductFranchise(it.id);
      showSuccess("Đã xóa");
      await load(currentPage);
    } catch (err: unknown) {
      showError(err instanceof Error ? err.message : "Xóa thất bại");
    }
  };

  const handleRestore = async (it: ProductFranchiseApiResponse) => {
    if (!await showConfirm({ message: "Khôi phục item này?", variant: "warning" })) return;
    try {
      await adminProductFranchiseService.restoreProductFranchise(it.id);
      showSuccess("Đã khôi phục");
      await load(currentPage);
    } catch (err: unknown) {
      showError(err instanceof Error ? err.message : "Khôi phục thất bại");
    }
  };

  const handleToggleStatus = async (it: ProductFranchiseApiResponse) => {    const next = !it.is_active;
    const action = next ? "Bật bán" : "Tắt bán";
    if (!await showConfirm({
      message: `Bạn có chắc muốn ${action.toLowerCase()} item này?`,
      title: action,
      variant: next ? "info" : "warning",
      confirmText: action,
    })) return;
    try {
      await adminProductFranchiseService.changeProductFranchiseStatus(it.id, next);
      showSuccess("Đã cập nhật trạng thái");
      await load(currentPage);
    } catch (err: unknown) {
      showError(err instanceof Error ? err.message : "Đổi trạng thái thất bại");
    }
  };
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Product Franchise</h1>
          <p className="text-xs text-slate-600 sm:text-sm">Quản lý danh mục sản phẩm theo từng franchise (size/price/status)</p>
        </div>        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={openCreate}>+ Thêm sản phẩm</Button>
        </div>
      </div>      {/* Filters */}
      <div className="relative z-30 overflow-visible rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="relative overflow-visible flex flex-wrap items-end gap-3">
          {/* Franchise combobox */}
          <div className="space-y-1.5 min-w-[180px] flex-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Franchise</label>            <div className="relative">
              {managerFranchiseId ? (
                <div className="flex w-full items-center justify-between rounded-lg border border-primary-500/50 bg-primary-500/10 px-3 py-2 text-sm text-white cursor-not-allowed">
                  <span className="truncate font-medium text-white">
                    {filters.franchise_id ? (franchiseNameMap[filters.franchise_id] || filters.franchise_id) : "-- Tất cả franchise --"}
                  </span>
                  <svg className="ml-2 size-4 flex-shrink-0 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setFranchiseOpen((o) => !o)}
                  className="flex w-full items-center justify-between rounded-lg border border-white/[0.15] bg-slate-800 px-3 py-2 text-left text-sm text-white/90 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                >
                  <span className="truncate">
                    {filters.franchise_id ? (franchiseNameMap[filters.franchise_id] || filters.franchise_id) : "-- Tất cả franchise --"}
                  </span>
                  <svg className="ml-2 size-4 flex-shrink-0 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              )}
              {franchiseOpen && (
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
                  <div className="max-h-64 overflow-y-auto py-1 text-sm">
                    <button
                      type="button"
                      onClick={() => {
                        setFilters((f) => ({ ...f, franchise_id: "", product_id: "" }));
                        setCurrentPage(1);
                        setFranchiseOpen(false);
                        setFranchiseKeyword("");
                      }}
                      className={`flex w-full items-center px-3 py-2 text-left text-xs font-semibold ${
                        !filters.franchise_id ? "bg-white/[0.12] text-white" : "text-white/60 hover:bg-white/[0.08]"
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
                            setFilters((f) => ({ ...f, franchise_id: fr.value, product_id: "" }));
                            setCurrentPage(1);
                            setFranchiseOpen(false);
                            setFranchiseKeyword("");
                          }}
                          className={`flex w-full items-center px-3 py-2 text-left text-xs ${
                            active ? "bg-white/[0.12] text-white" : "text-white/80 hover:bg-white/[0.08]"
                          }`}
                        >
                          <span className="truncate">{fr.name} ({fr.code})</span>
                        </button>
                      );
                    })}
                    {franchiseOptions.length === 0 && (
                      <div className="px-3 py-2 text-xs text-white/40">Không tìm thấy franchise</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>          {/* Product combobox */}
          <div className="min-w-[180px] flex-1 space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Product</label>
            <div className="relative">              <button
                type="button"
                disabled={!filters.franchise_id}
                onClick={() => setProductOpen((o) => !o)}
                className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm outline-none transition ${
                  filters.franchise_id
                    ? "border-white/[0.15] bg-slate-800 text-white/90 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                    : "border-white/[0.08] bg-slate-800/60 text-white/30 cursor-not-allowed"
                }`}
              >
                <span className="truncate">
                  {filters.product_id
                    ? (productNameMap[filters.product_id] || filters.product_id)
                    : filters.franchise_id
                      ? "-- Tất cả product --"
                      : "Chọn franchise trước"}
                </span>
                <svg className="ml-2 size-4 flex-shrink-0 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {productOpen && filters.franchise_id && (
                <div className="absolute left-0 right-0 z-50 mt-1 rounded-lg border border-white/[0.15] bg-slate-800 shadow-lg">
                  <div className="border-b border-white/[0.12] px-3 py-2">
                    <input
                      autoFocus
                      value={productKeyword}
                      onChange={(e) => setProductKeyword(e.target.value)}
                      placeholder="Tìm theo tên sản phẩm..."
                      className="w-full rounded-md border border-white/[0.15] bg-white/[0.08] text-white/90 placeholder-white/40 px-2.5 py-1.5 text-xs outline-none transition focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30"
                    />
                  </div>
                  <div className="max-h-64 overflow-y-auto py-1 text-sm">
                    <button
                      type="button"
                      onClick={() => {
                        setFilters((f) => ({ ...f, product_id: "" }));
                        setCurrentPage(1);
                        setProductOpen(false);
                        setProductKeyword("");
                      }}
                      className={`flex w-full items-center px-3 py-2 text-left text-xs font-semibold ${
                        !filters.product_id ? "bg-white/[0.12] text-white" : "text-white/60 hover:bg-white/[0.08]"
                      }`}
                    >
                      -- Tất cả product --
                    </button>
                    {filterPFLoading && (
                      <div className="px-3 py-2 text-xs text-white/40">Đang tải...</div>
                    )}
                    {productOptions.map((p) => {
                      const active = filters.product_id === p.product_id;
                      return (
                        <button
                          key={p.product_id}
                          type="button"
                          onClick={() => {
                            setFilters((f) => ({ ...f, product_id: p.product_id }));
                            setCurrentPage(1);
                            setProductOpen(false);
                            setProductKeyword("");
                          }}
                          className={`flex w-full items-center px-3 py-2 text-left text-xs ${
                            active ? "bg-white/[0.12] text-white" : "text-white/80 hover:bg-white/[0.08]"
                          }`}
                        >
                          <span className="truncate">{p.name}</span>
                        </button>
                      );
                    })}
                    {!filterPFLoading && productOptions.length === 0 && (
                      <div className="px-3 py-2 text-xs text-white/40">Không tìm thấy product</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>          <div className="min-w-[130px] space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Size</label>
            <select
              value={filters.size}
              onChange={(e) => { setFilters((f) => ({ ...f, size: e.target.value })); setCurrentPage(1); }}
              className="w-full rounded-lg border border-white/[0.15] bg-slate-800 px-3 py-2 text-sm text-white/90 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
            >
              <option value="" className="bg-slate-800">-- Tất cả size --</option>
              <option value="S" className="bg-slate-800">S</option>
              <option value="M" className="bg-slate-800">M</option>
              <option value="L" className="bg-slate-800">L</option>
              <option value="XL" className="bg-slate-800">XL</option>
              <option value="DEFAULT" className="bg-slate-800">DEFAULT</option>
            </select>
          </div>

          <div className="min-w-[200px] space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Giá</label>
            <div className="flex gap-2">
              <input
                value={filters.price_from}
                onChange={(e) => { setFilters((f) => ({ ...f, price_from: e.target.value })); setCurrentPage(1); }}
                placeholder="Từ"
                className="w-full rounded-lg border border-white/[0.15] bg-slate-800 px-3 py-2 text-sm text-white/90 placeholder-white/40 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              />
              <input
                value={filters.price_to}
                onChange={(e) => { setFilters((f) => ({ ...f, price_to: e.target.value })); setCurrentPage(1); }}
                placeholder="Đến"
                className="w-full rounded-lg border border-white/[0.15] bg-slate-800 px-3 py-2 text-sm text-white/90 placeholder-white/40 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              />
            </div>
          </div>

          <div className="min-w-[130px] space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Trạng thái</label>
            <select
              value={filters.is_active}
              onChange={(e) => { setFilters((f) => ({ ...f, is_active: e.target.value })); setCurrentPage(1); }}
              className="w-full rounded-lg border border-white/[0.15] bg-slate-800 px-3 py-2 text-sm text-white/90 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
            >
              <option value="" className="bg-slate-800">Tất cả</option>
              <option value="true" className="bg-slate-800">Active</option>
              <option value="false" className="bg-slate-800">Inactive</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Khác</label>
            <label className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer transition-colors select-none ${
              filters.is_deleted
                ? "border-red-400 bg-red-900/40 text-red-300"
                : "border-white/[0.15] bg-slate-800 text-white/60 hover:bg-slate-700"
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
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Franchise</th>
                <th className="px-4 py-3">Size</th>
                <th className="px-4 py-3">Price Base</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {items.map((it) => (
                <tr key={it.id} className={`${it.is_deleted && filters.is_deleted ? "bg-red-50" : "hover:bg-slate-50"}`}>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-900">{productNameMap[it.product_id] || "N/A"}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-900">{franchiseNameMap[it.franchise_id] || "N/A"}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{it.size}</span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    {Number(it.price_base).toLocaleString("vi-VN")} đ
                  </td>
                  <td className="px-4 py-3">
                    {it.is_deleted ? (
                      <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">Deleted</span>
                    ) : it.is_active ? (
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">Active</span>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">Inactive</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        title="Xem chi tiết"
                        onClick={() => openDetail(it.id)}
                        className="inline-flex items-center justify-center size-8 rounded-lg border border-slate-200 bg-white text-slate-500 hover:border-primary-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                      <button
                        title="Chỉnh sửa"
                        onClick={() => openEdit(it)}
                        className="inline-flex items-center justify-center size-8 rounded-lg border border-slate-200 bg-white text-slate-500 hover:border-primary-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      {!it.is_deleted && (
                        <button
                          title={it.is_active ? "Tắt bán" : "Bật bán"}
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
              ))}

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

      {/* Create Modal */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/25" />
          <div className="relative w-full max-w-xl rounded-2xl p-6" style={{
            background: "rgba(255, 255, 255, 0.12)",
            backdropFilter: "blur(40px) saturate(200%)",
            WebkitBackdropFilter: "blur(40px) saturate(200%)",
            border: "1px solid rgba(255, 255, 255, 0.25)",
            boxShadow: "0 25px 60px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)",
          }}>
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white/95">Thêm sản phẩm vào Franchise</h2>
              </div>
              <button onClick={() => setCreateOpen(false)} className="rounded-lg p-1.5 text-white/40 hover:bg-white/[0.1]">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={submitCreate} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-white/80">Franchise *</label>
                  <div className="relative">
                    <button
                      ref={createFranchiseTriggerRef}
                      type="button"
                      onClick={() => createFranchiseOpen ? closeCreateFranchise() : openCreateFranchise()}
                      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "8px 12px", background: "#1e293b", border: "1px solid #475569", borderRadius: 8, color: "#f1f5f9", fontSize: 14, cursor: "pointer", outline: "none" }}
                    >
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: createForm.franchise_id ? "#f1f5f9" : "#94a3b8" }}>
                        {createForm.franchise_id ? (franchiseNameMap[createForm.franchise_id] || createForm.franchise_id) : "-- Chọn franchise --"}
                      </span>
                      <svg style={{ width: 16, height: 16, flexShrink: 0, marginLeft: 8, color: "#94a3b8", transform: createFranchiseOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </button>

                    {createFranchiseOpen && createFranchiseRect && ReactDOM.createPortal(
                      <div ref={createFranchiseDropdownRef} style={{ position: "fixed", top: createFranchiseRect.bottom + 4, left: createFranchiseRect.left, width: createFranchiseRect.width, zIndex: 99999, background: "#1e293b", border: "1px solid #475569", borderRadius: 8, boxShadow: "0 10px 40px rgba(0,0,0,0.7)", overflow: "hidden" }}>
                        <div style={{ padding: "8px 10px", borderBottom: "1px solid #334155" }}>
                          <input autoFocus value={createFranchiseKeyword} onChange={(e) => setCreateFranchiseKeyword(e.target.value)} placeholder="Tìm theo tên hoặc mã..."
                            style={{ width: "100%", boxSizing: "border-box", background: "#0f172a", border: "1px solid #475569", borderRadius: 6, padding: "5px 10px", fontSize: 12, color: "#f1f5f9", outline: "none" }} />
                        </div>
                        <div style={{ maxHeight: 220, overflowY: "auto" }}>
                          {createFranchiseOptions.map((fr) => (
                            <button key={fr.value} type="button" onMouseDown={(e) => e.preventDefault()}
                              onClick={() => { setCreateForm((f) => ({ ...f, franchise_id: fr.value, product_id: "" })); closeCreateFranchise(); }}
                              style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 12px", boxSizing: "border-box", background: createForm.franchise_id === fr.value ? "#334155" : "transparent", color: createForm.franchise_id === fr.value ? "#f1f5f9" : "#cbd5e1", fontSize: 13, border: "none", cursor: "pointer", textAlign: "left" }}>
                              <span style={{ fontFamily: "monospace", color: "#64748b", fontSize: 10, flexShrink: 0 }}>{fr.code}</span>
                              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fr.name}</span>
                            </button>
                          ))}
                          {createFranchiseOptions.length === 0 && <div style={{ padding: "10px 12px", fontSize: 12, color: "#64748b", textAlign: "center" }}>Không tìm thấy franchise</div>}
                        </div>
                      </div>,
                      document.body
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-white/80">Product *</label>
                  <div className="relative">
                    <button
                      ref={createProductTriggerRef}
                      type="button"
                      disabled={!createForm.franchise_id}
                      onClick={() => createProductOpen ? closeCreateProduct() : openCreateProduct()}
                      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "8px 12px", background: createForm.franchise_id ? "#1e293b" : "#0f172a", border: "1px solid #475569", borderRadius: 8, color: createForm.franchise_id ? "#f1f5f9" : "#475569", fontSize: 14, cursor: createForm.franchise_id ? "pointer" : "not-allowed", outline: "none", opacity: createForm.franchise_id ? 1 : 0.5 }}
                    >
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: createForm.product_id ? "#f1f5f9" : "#94a3b8" }}>
                        {createPFLoading ? "Đang tải..." : createForm.product_id ? (productNameMap[createForm.product_id] || createForm.product_id) : createForm.franchise_id ? "-- Chọn product --" : "Chọn franchise trước"}
                      </span>
                      <svg style={{ width: 16, height: 16, flexShrink: 0, marginLeft: 8, color: "#94a3b8", transform: createProductOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </button>

                    {createProductOpen && createForm.franchise_id && createProductRect && ReactDOM.createPortal(
                      <div ref={createProductDropdownRef} style={{ position: "fixed", top: createProductRect.bottom + 4, left: createProductRect.left, width: createProductRect.width, zIndex: 99999, background: "#1e293b", border: "1px solid #475569", borderRadius: 8, boxShadow: "0 10px 40px rgba(0,0,0,0.7)", overflow: "hidden" }}>
                        <div style={{ padding: "8px 10px", borderBottom: "1px solid #334155" }}>
                          <input autoFocus value={createProductKeyword} onChange={(e) => setCreateProductKeyword(e.target.value)} placeholder="Tìm theo tên sản phẩm..."
                            style={{ width: "100%", boxSizing: "border-box", background: "#0f172a", border: "1px solid #475569", borderRadius: 6, padding: "5px 10px", fontSize: 12, color: "#f1f5f9", outline: "none" }} />
                        </div>
                        <div style={{ maxHeight: 220, overflowY: "auto" }}>
                          {createPFLoading && <div style={{ padding: "10px 12px", fontSize: 12, color: "#64748b", textAlign: "center" }}>Đang tải...</div>}
                          {createProductOptions.map((p) => (
                            <button key={p.product_id} type="button" onMouseDown={(e) => e.preventDefault()}
                              onClick={() => { setCreateForm((f) => ({ ...f, product_id: p.product_id })); closeCreateProduct(); }}
                              style={{ display: "flex", width: "100%", padding: "8px 12px", boxSizing: "border-box", background: createForm.product_id === p.product_id ? "#334155" : "transparent", color: createForm.product_id === p.product_id ? "#f1f5f9" : "#cbd5e1", fontSize: 13, border: "none", cursor: "pointer", textAlign: "left" }}>
                              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
                            </button>
                          ))}
                          {!createPFLoading && createProductOptions.length === 0 && <div style={{ padding: "10px 12px", fontSize: 12, color: "#64748b", textAlign: "center" }}>Không tìm thấy product</div>}
                        </div>
                      </div>,
                      document.body
                    )}
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-white/80">Size *</label>
                  <select
                    value={createForm.size}
                    onChange={(e) => setCreateForm((f) => ({ ...f, size: e.target.value }))}
                    className="w-full rounded-lg border border-white/[0.15] bg-white/[0.08] text-white/90 px-4 py-2.5 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                  >
                    <option value="">-- Chọn size --</option>
                    <option value="S">S</option>
                    <option value="M">M</option>
                    <option value="L">L</option>
                    <option value="XL">XL</option>
                    <option value="DEFAULT">DEFAULT</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-white/80">Price Base *</label>
                  <input
                    value={String(createForm.price_base ?? "")}
                    onChange={(e) => setCreateForm((f) => ({ ...f, price_base: Number(e.target.value) }))}
                    placeholder="VD: 35000"
                    className="w-full rounded-lg border border-white/[0.15] bg-white/[0.08] text-white/90 placeholder-white/30 px-4 py-2.5 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <Button type="submit" loading={creating} className="flex-1">Xác nhận</Button>
                <Button type="button" variant="outline" onClick={() => setCreateOpen(false)} disabled={creating} className="flex-1 border border-white/[0.15] text-white/70 hover:bg-white/[0.1] hover:text-white">Hủy</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {detailId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/25" />
          <div className="relative w-full max-w-lg rounded-2xl p-6" style={{
            background: "rgba(255, 255, 255, 0.12)",
            backdropFilter: "blur(40px) saturate(200%)",
            WebkitBackdropFilter: "blur(40px) saturate(200%)",
            border: "1px solid rgba(255, 255, 255, 0.25)",
            boxShadow: "0 25px 60px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)",
          }}>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white/95">Chi tiết</h2>
              </div>
              <button onClick={() => setDetailId(null)} className="rounded-lg p-1.5 text-white/40 hover:bg-white/[0.1]">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {detailLoading ? (
              <div className="flex items-center gap-2 text-sm text-white/50">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white/70" />
                Đang tải...
              </div>
            ) : !detail ? (
              <p className="text-sm text-white/50">Không có dữ liệu</p>
            ) : (
              <div className="space-y-3 text-sm">
                <div className="rounded-xl border border-white/[0.12] px-4 py-3">
                  <p className="text-xs text-white/50">Product</p>
                  <p className="font-semibold text-white/95">{productNameMap[detail.product_id] || "N/A"}</p>
                </div>
                <div className="rounded-xl border border-white/[0.12] px-4 py-3">
                  <p className="text-xs text-white/50">Franchise</p>
                  <p className="font-semibold text-white/95">{franchiseNameMap[detail.franchise_id] || "N/A"}</p>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl border border-white/[0.12] px-4 py-3">
                    <p className="text-xs text-white/50">Size</p>
                    <p className="font-semibold text-white/95">{detail.size}</p>
                  </div>
                  <div className="rounded-xl border border-white/[0.12] px-4 py-3">
                    <p className="text-xs text-white/50">Price base</p>
                    <p className="font-semibold text-white/95">{Number(detail.price_base).toLocaleString("vi-VN")} đ</p>
                  </div>
                </div>
              </div>
            )}
            <div className="mt-5 flex gap-3">
              <Button variant="outline" onClick={() => { if (detail) openEdit(detail); setDetailId(null); }} disabled={!detail} className="flex-1 border border-white/[0.15] text-white/70 hover:bg-white/[0.1] hover:text-white">Sửa</Button>
              <Button variant="outline" onClick={() => setDetailId(null)} className="flex-1 border border-white/[0.15] text-white/70 hover:bg-white/[0.1] hover:text-white">Đóng</Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/25" />
          <div className="relative w-full max-w-lg rounded-2xl p-6" style={{
            background: "rgba(255, 255, 255, 0.12)",
            backdropFilter: "blur(40px) saturate(200%)",
            WebkitBackdropFilter: "blur(40px) saturate(200%)",
            border: "1px solid rgba(255, 255, 255, 0.25)",
            boxShadow: "0 25px 60px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)",
          }}>
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white/95">Cập nhật</h2>
              </div>
              <button onClick={() => setEditing(null)} className="rounded-lg p-1.5 text-white/40 hover:bg-white/[0.1]">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-4 rounded-xl border border-white/[0.12] bg-white/[0.06] px-4 py-3 text-sm">
              <p className="font-semibold text-white/95">
                {productNameMap[editing.product_id] || editing.product_id} • {franchiseNameMap[editing.franchise_id] || editing.franchise_id}
              </p>
              <p className="text-xs text-white/50">Chỉnh sửa thông tin sản phẩm</p>
            </div>

            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-white/80">Size *</label>
                  <input
                    value={editSize}
                    onChange={(e) => setEditSize(e.target.value)}
                    className="w-full rounded-lg border border-white/[0.15] bg-white/[0.08] text-white/90 placeholder-white/30 px-4 py-2.5 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-white/80">Price base *</label>
                  <input
                    value={editPriceBase}
                    onChange={(e) => setEditPriceBase(e.target.value)}
                    className="w-full rounded-lg border border-white/[0.15] bg-white/[0.08] text-white/90 placeholder-white/30 px-4 py-2.5 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <Button onClick={submitUpdate} loading={updating} className="flex-1">Lưu</Button>
                <Button variant="outline" onClick={() => setEditing(null)} disabled={updating} className="flex-1 border border-white/[0.15] text-white/70 hover:bg-white/[0.1] hover:text-white">Hủy</Button>
              </div>
            </div>
          </div>
        </div>
      )}    </div>
  );
}


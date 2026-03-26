import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Pagination from "../../../components/ui/Pagination";
import { fetchFranchiseSelect } from "../../../services/store.service";
import type { FranchiseSelectItem } from "../../../services/store.service";
import { customerFranchiseService } from "../../../services/customer-franchise.service";
import type { CustomerFranchise } from "../../../services/client.service";
import { searchCustomersPaged } from "../../../services/customer.service";
import type { CustomerDisplay } from "../../../models/customer.model";
import { showError } from "../../../utils";
import { useManagerFranchiseId } from "../../../hooks/useManagerFranchiseId";

const ITEMS_PER_PAGE = 10;

function formatDate(dt: string) {
  if (!dt) return "—";
  const d = new Date(dt);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatDatetime(dt: string) {
  if (!dt) return "—";
  const d = new Date(dt);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("vi-VN", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

function Row({
  label,
  value,
  mono = false,
  truncate = false,
  dim = false,
}: {
  label: string;
  value?: string | null;
  mono?: boolean;
  truncate?: boolean;
  dim?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-2.5">
      <span className="shrink-0 text-xs text-white/50">{label}</span>
      <span
        className={`text-xs font-medium text-right ${mono ? "font-mono" : ""} ${
          dim ? "text-white/30 italic" : "text-white/90"
        } ${truncate ? "max-w-[200px] truncate" : ""}`}
        title={truncate ? (value ?? "") : undefined}
      >
        {value || "—"}
      </span>
    </div>
  );
}

export default function CustomerFranchisePage() {
  const managerFranchiseId = useManagerFranchiseId();

  /* ── data ─────────────────────────────────────────── */
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<CustomerFranchise[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  /* ── selects ───────────────────────────────────────── */
  const [franchises, setFranchises] = useState<FranchiseSelectItem[]>([]);

  /* ── filters ───────────────────────────────────────── */
  const [filters, setFilters] = useState({
    franchise_id: "",
    customer_id: "",
    is_active: "" as "" | "true" | "false",
    is_deleted: false,
    loyalty_points: "",
  });

  /* ── franchise combobox ────────────────────────────── */
  const [franchiseOpen, setFranchiseOpen] = useState(false);
  const [franchiseKeyword, setFranchiseKeyword] = useState("");
  const franchiseComboRef = useRef<HTMLDivElement>(null);

  /* ── customer combobox ─────────────────────────────── */
  const [customerOpen, setCustomerOpen] = useState(false);
  const [customerKeyword, setCustomerKeyword] = useState("");
  const [customers, setCustomers] = useState<CustomerDisplay[]>([]);
  const [customerLoading, setCustomerLoading] = useState(false);
  const customerComboRef = useRef<HTMLDivElement>(null);
  const customerSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedCustomer = customers.find((c) => c.id === filters.customer_id);

  /* ── detail modal ──────────────────────────────────── */
  const [detailItem, setDetailItem] = useState<CustomerFranchise | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const hasRun = useRef(false);
  const isInitialized = useRef(false);

  /* ── franchise maps ────────────────────────────────── */
  const franchiseNameMap = useMemo(() => {
    const m: Record<string, string> = {};
    franchises.forEach((f) => { m[f.value] = `${f.name} (${f.code})`; });
    return m;
  }, [franchises]);

  const franchiseOptions = useMemo(() => {
    if (!franchiseKeyword.trim()) return franchises;
    const k = franchiseKeyword.trim().toLowerCase();
    return franchises.filter(
      (f) => f.name.toLowerCase().includes(k) || (f.code || "").toLowerCase().includes(k)
    );
  }, [franchises, franchiseKeyword]);

  /* ── load selects ──────────────────────────────────── */
  const loadSelects = async () => {
    try {
      const frs = await fetchFranchiseSelect();
      setFranchises(frs);
    } catch {
      // non-fatal
    }
  };

  /* ── load data ─────────────────────────────────────── */
  const load = useCallback(async (pageNum = 1) => {
    setLoading(true);
    try {
      const isActive =
        filters.is_active === "true" ? true :
        filters.is_active === "false" ? false : undefined;

      const res = await customerFranchiseService.search({
        searchCondition: {
          franchise_id: filters.franchise_id || undefined,
          customer_id: filters.customer_id || undefined,
          loyalty_points: filters.loyalty_points ? Number(filters.loyalty_points) : undefined,
          is_active: isActive,
          is_deleted: filters.is_deleted,
        },
        pageInfo: { pageNum, pageSize: ITEMS_PER_PAGE },
      });
      setItems(res.data ?? []);
      setCurrentPage(res.pageInfo.pageNum);
      setTotalPages(res.pageInfo.totalPages);
      setTotalItems(res.pageInfo.totalItems);
    } catch {
      showError("Lấy danh sách Customer Franchise thất bại");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  /* ── init ──────────────────────────────────────────── */
  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;
    loadSelects();
    load(1).finally(() => { isInitialized.current = true; });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── sync managerFranchiseId ────────────────────────── */
  useEffect(() => {
    if (!managerFranchiseId) return;
    setFilters((prev) => ({ ...prev, franchise_id: managerFranchiseId }));
  }, [managerFranchiseId]);

  /* ── sync franchiseKeyword khi manager ─────────────── */
  useEffect(() => {
    if (!managerFranchiseId || !franchises.length) return;
    const found = franchises.find((f) => f.value === managerFranchiseId);
    if (found) setFranchiseKeyword(`${found.name} (${found.code})`);
  }, [managerFranchiseId, franchises]);

  /* ── reload khi filter thay đổi ────────────────────── */
  useEffect(() => {
    if (!isInitialized.current) return;
    load(1);
  }, [filters, load]);

  /* ── click-outside franchise combobox ──────────────── */
  useEffect(() => {
    if (!franchiseOpen) return;
    const handler = (e: MouseEvent) => {
      if (!franchiseComboRef.current?.contains(e.target as Node))
        setFranchiseOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [franchiseOpen]);

  /* ── customer search (debounce) ─────────────────────── */
  useEffect(() => {
    if (!customerOpen) return;
    if (customerSearchTimer.current) clearTimeout(customerSearchTimer.current);
    customerSearchTimer.current = setTimeout(async () => {
      setCustomerLoading(true);
      try {
        const res = await searchCustomersPaged({
          searchCondition: { keyword: customerKeyword, is_active: "", is_deleted: false },
          pageInfo: { pageNum: 1, pageSize: 30 },
        });
        setCustomers(res.pageData);
      } catch { /* non-fatal */ }
      finally { setCustomerLoading(false); }
    }, 300);
    return () => { if (customerSearchTimer.current) clearTimeout(customerSearchTimer.current); };
  }, [customerKeyword, customerOpen]);

  /* ── click-outside customer combobox ───────────────── */
  useEffect(() => {
    if (!customerOpen) return;
    const handler = (e: MouseEvent) => {
      if (!customerComboRef.current?.contains(e.target as Node))
        setCustomerOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [customerOpen]);

  /* ── detail ────────────────────────────────────────── */
  const openDetail = async (item: CustomerFranchise) => {
    setDetailItem(item);
    setDetailLoading(true);
    try {
      const fresh = await customerFranchiseService.getById(item.id);
      setDetailItem(fresh);
    } catch {
      // dùng item đã có
    } finally {
      setDetailLoading(false);
    }
  };

  /* ─────────────────────────────────────────────────── */
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Customer Franchise</h1>
          <p className="text-xs text-slate-600 sm:text-sm">
            Quản lý mối liên kết khách hàng — franchise (điểm tích lũy, trạng thái)
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span className="font-semibold">{totalItems.toLocaleString()}</span> bản ghi
        </div>
      </div>

      {/* Filters */}
      <div className="relative z-30 overflow-visible rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="relative overflow-visible flex flex-wrap items-end gap-3">

          {/* Franchise combobox */}
          <div className="space-y-1.5 min-w-[200px] flex-1" ref={franchiseComboRef}>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Franchise</label>
            <div className="relative">
              {managerFranchiseId ? (
                <div className="flex w-full items-center justify-between rounded-lg border border-primary-500/50 bg-primary-500/10 px-3 py-2 text-sm cursor-not-allowed">
                  <span className="truncate font-medium text-slate-700">
                    {filters.franchise_id
                      ? (franchiseNameMap[filters.franchise_id] || filters.franchise_id)
                      : "-- Tất cả franchise --"}
                  </span>
                  <svg className="ml-2 size-4 flex-shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setFranchiseOpen((o) => !o)}
                  className="flex w-full items-center justify-between rounded-lg border border-white/[0.15] bg-slate-800 px-3 py-2 text-left text-sm text-white/90 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                >
                  <span className="truncate">
                    {filters.franchise_id
                      ? (franchiseNameMap[filters.franchise_id] || filters.franchise_id)
                      : "-- Tất cả franchise --"}
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
                  <div className="max-h-60 overflow-y-auto py-1">
                    <button
                      type="button"
                      onClick={() => {
                        setFilters((f) => ({ ...f, franchise_id: "" }));
                        setFranchiseOpen(false);
                        setFranchiseKeyword("");
                      }}
                      className={`flex w-full items-center px-3 py-2 text-left text-xs font-semibold ${
                        !filters.franchise_id ? "bg-white/[0.12] text-white" : "text-white/60 hover:bg-white/[0.08]"
                      }`}
                    >
                      -- Tất cả franchise --
                    </button>
                    {franchiseOptions.map((fr) => (
                      <button
                        key={fr.value}
                        type="button"
                        onClick={() => {
                          setFilters((f) => ({ ...f, franchise_id: fr.value }));
                          setFranchiseOpen(false);
                          setFranchiseKeyword("");
                        }}
                        className={`flex w-full items-center px-3 py-2 text-left text-xs ${
                          filters.franchise_id === fr.value
                            ? "bg-white/[0.12] text-white"
                            : "text-white/80 hover:bg-white/[0.08]"
                        }`}
                      >
                        <span className="truncate">{fr.name} ({fr.code})</span>
                      </button>
                    ))}
                    {franchiseOptions.length === 0 && (
                      <div className="px-3 py-2 text-xs text-white/40">Không tìm thấy franchise</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Customer combobox */}
          <div className="min-w-[200px] flex-1 space-y-1.5" ref={customerComboRef}>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Khách hàng</label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setCustomerOpen((o) => !o)}
                className="flex w-full items-center justify-between rounded-lg border border-white/[0.15] bg-slate-800 px-3 py-2 text-left text-sm text-white/90 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              >
                <span className="truncate">
                  {selectedCustomer
                    ? `${selectedCustomer.name}${selectedCustomer.email ? ` — ${selectedCustomer.email}` : ""}`
                    : "-- Tất cả khách hàng --"}
                </span>
                <svg className="ml-2 size-4 flex-shrink-0 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {customerOpen && (
                <div className="absolute left-0 right-0 z-50 mt-1 rounded-lg border border-white/[0.15] bg-slate-800 shadow-lg">
                  <div className="border-b border-white/[0.12] px-3 py-2">
                    <input
                      autoFocus
                      value={customerKeyword}
                      onChange={(e) => setCustomerKeyword(e.target.value)}
                      placeholder="Tìm theo tên, email..."
                      className="w-full rounded-md border border-white/[0.15] bg-white/[0.08] text-white/90 placeholder-white/40 px-2.5 py-1.5 text-xs outline-none transition focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30"
                    />
                  </div>
                  <div className="max-h-60 overflow-y-auto py-1">
                    <button
                      type="button"
                      onClick={() => {
                        setFilters((f) => ({ ...f, customer_id: "" }));
                        setCustomerOpen(false);
                        setCustomerKeyword("");
                      }}
                      className={`flex w-full items-center px-3 py-2 text-left text-xs font-semibold ${
                        !filters.customer_id ? "bg-white/[0.12] text-white" : "text-white/60 hover:bg-white/[0.08]"
                      }`}
                    >
                      -- Tất cả khách hàng --
                    </button>
                    {customerLoading && (
                      <div className="flex items-center justify-center py-4">
                        <svg className="size-5 animate-spin text-primary-400" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      </div>
                    )}
                    {!customerLoading && customers.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setFilters((f) => ({ ...f, customer_id: c.id }));
                          setCustomerOpen(false);
                          setCustomerKeyword("");
                        }}
                        className={`flex w-full flex-col px-3 py-2 text-left text-xs ${
                          filters.customer_id === c.id
                            ? "bg-white/[0.12] text-white"
                            : "text-white/80 hover:bg-white/[0.08]"
                        }`}
                      >
                        <span className="font-medium truncate">{c.name}</span>
                        {c.email && <span className="text-white/40 truncate">{c.email}</span>}
                      </button>
                    ))}
                    {!customerLoading && customers.length === 0 && (
                      <div className="px-3 py-2 text-xs text-white/40">Nhập từ khóa để tìm khách hàng</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Loyalty points */}
          <div className="min-w-[140px] space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Điểm tối thiểu</label>
            <input
              type="number"
              min={0}
              value={filters.loyalty_points}
              onChange={(e) => setFilters((f) => ({ ...f, loyalty_points: e.target.value }))}
              placeholder="0"
              className="w-full rounded-lg border border-white/[0.15] bg-slate-800 px-3 py-2 text-sm text-white/90 placeholder-white/40 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
            />
          </div>

          {/* Trạng thái */}
          <div className="min-w-[130px] space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Trạng thái</label>
            <select
              value={filters.is_active}
              onChange={(e) => setFilters((f) => ({ ...f, is_active: e.target.value as "" | "true" | "false" }))}
              className="w-full rounded-lg border border-white/[0.15] bg-slate-800 px-3 py-2 text-sm text-white/90 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
            >
              <option value="" className="bg-slate-800">Tất cả</option>
              <option value="true" className="bg-slate-800">Active</option>
              <option value="false" className="bg-slate-800">Inactive</option>
            </select>
          </div>

          {/* Đã xóa */}
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
                onChange={(e) => setFilters((f) => ({ ...f, is_deleted: e.target.checked }))}
                className="accent-red-500"
              />
              <span className="font-medium">Đã xóa</span>
            </label>
          </div>

          {/* Reset */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wide text-transparent">_</label>
            <button
              type="button"
              onClick={() => {
                setFilters({
                  franchise_id: managerFranchiseId ?? "",
                  customer_id: "",
                  is_active: "",
                  is_deleted: false,
                  loyalty_points: "",
                });
                setCustomerKeyword("");
              }}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Đặt lại
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="relative z-10 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-4 py-3">Khách hàng</th>
                <th className="px-4 py-3">Franchise</th>
                <th className="px-4 py-3 text-right">Điểm hiện tại</th>
                <th className="px-4 py-3 text-right">Tổng điểm tích</th>
                <th className="px-4 py-3">Đơn đầu tiên</th>
                <th className="px-4 py-3">Đơn gần nhất</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3">Chi tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">              {loading ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3 text-slate-400">
                      <svg className="size-8 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      <span className="text-sm">Đang tải...</span>
                    </div>
                  </td>
                </tr>              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <svg className="size-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
                        <path strokeLinecap="round" strokeLinejoin="round"
                          d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                      </svg>
                      <p className="text-sm font-medium">Không có dữ liệu</p>
                    </div>
                  </td>
                </tr>
              ) : (                items.map((item) => (
                  <tr
                    key={item.id}
                    className={`transition-colors ${
                      item.is_deleted ? "bg-red-50 hover:bg-red-100/60" : "hover:bg-slate-50"
                    }`}
                  >
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-900">{item.customer_name || "N/A"}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{item.customer_email || ""}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-900">{item.franchise_name || "N/A"}</p>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">{item.franchise_code || ""}</p>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="inline-flex items-center gap-1 font-bold text-amber-600">
                        <svg className="size-3.5" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        {(item.loyalty_points ?? 0).toLocaleString("vi-VN")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600 font-medium">
                      {(item.total_earned_points ?? 0).toLocaleString("vi-VN")}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{formatDate(item.first_order_date)}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{formatDate(item.last_order_date)}</td>
                    <td className="px-4 py-3">
                      {item.is_deleted ? (
                        <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">Deleted</span>
                      ) : item.is_active ? (
                        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">Active</span>
                      ) : (
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">Inactive</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        title="Xem chi tiết"
                        onClick={() => openDetail(item)}
                        className="inline-flex items-center justify-center size-8 rounded-lg border border-slate-200 bg-white text-slate-500 hover:border-primary-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                      >
                        <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
            <p className="text-xs text-slate-500">
              Trang {currentPage}/{totalPages} — {totalItems.toLocaleString()} bản ghi
            </p>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={(p) => {
                setCurrentPage(p);
                load(p);
              }}
            />
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {detailItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setDetailItem(null); }}
        >
          <div className="relative w-full max-w-lg rounded-2xl border border-white/[0.12] bg-slate-900 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/[0.10] px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400">
                  <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Chi tiết Customer Franchise</h3>
                  <p className="text-xs text-white/40 font-mono mt-0.5">{detailItem.id}</p>
                </div>
              </div>
              <button
                onClick={() => setDetailItem(null)}
                className="flex size-8 items-center justify-center rounded-lg text-white/40 hover:bg-white/10 hover:text-white transition-colors"
              >
                <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>            {/* Body */}
            {detailLoading ? (
              <div className="flex items-center justify-center py-16">
                <svg className="size-8 animate-spin text-amber-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
            ) : (
              <div className="max-h-[80vh] overflow-y-auto p-6 space-y-4">

                {/* Points hero — 2 card nổi bật */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-4 text-center">
                    <p className="text-xs text-amber-300/70 font-semibold uppercase tracking-wide mb-1">
                      ⭐ Điểm hiện tại
                    </p>
                    <p className="text-3xl font-bold text-amber-400">
                      {(detailItem.loyalty_points ?? 0).toLocaleString("vi-VN")}
                    </p>
                  </div>
                  <div className="rounded-xl bg-white/[0.05] border border-white/[0.10] p-4 text-center">
                    <p className="text-xs text-white/50 font-semibold uppercase tracking-wide mb-1">
                      📈 Tổng điểm tích
                    </p>
                    <p className="text-3xl font-bold text-white">
                      {(detailItem.total_earned_points ?? 0).toLocaleString("vi-VN")}
                    </p>
                  </div>
                </div>

                {/* Trạng thái badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  {detailItem.is_deleted ? (
                    <span className="rounded-full bg-red-500/20 px-3 py-1 text-xs font-semibold text-red-400 border border-red-500/30">
                      🗑 Đã xóa
                    </span>
                  ) : detailItem.is_active ? (
                    <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-400 border border-emerald-500/30">
                      ✓ Active
                    </span>
                  ) : (
                    <span className="rounded-full bg-white/[0.08] px-3 py-1 text-xs font-semibold text-white/50 border border-white/[0.10]">
                      Inactive
                    </span>
                  )}
                  <span className="rounded-full bg-white/[0.05] px-3 py-1 text-xs text-white/40 border border-white/[0.08] font-mono">
                    {detailItem.id}
                  </span>
                </div>

                {/* Thông tin khách hàng */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2 px-1">
                    Khách hàng
                  </p>
                  <div className="rounded-xl bg-white/[0.04] border border-white/[0.08] divide-y divide-white/[0.06]">
                    <Row label="Tên" value={detailItem.customer_name} />
                    <Row label="Email" value={detailItem.customer_email} mono />
                    <Row label="Customer ID" value={detailItem.customer_id} mono truncate />
                  </div>
                </div>

                {/* Thông tin franchise */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2 px-1">
                    Franchise
                  </p>
                  <div className="rounded-xl bg-white/[0.04] border border-white/[0.08] divide-y divide-white/[0.06]">
                    <Row label="Tên franchise" value={detailItem.franchise_name} />
                    <Row label="Mã franchise" value={detailItem.franchise_code} mono />
                    <Row label="Franchise ID" value={detailItem.franchise_id} mono truncate />
                  </div>
                </div>

                {/* Lịch sử đơn hàng */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2 px-1">
                    Lịch sử đơn hàng
                  </p>
                  <div className="rounded-xl bg-white/[0.04] border border-white/[0.08] divide-y divide-white/[0.06]">
                    <Row label="Đơn đầu tiên" value={formatDate(detailItem.first_order_date)} />
                    <Row
                      label="Đơn gần nhất"
                      value={detailItem.last_order_date ? formatDate(detailItem.last_order_date) : "Chưa có"}
                      dim={!detailItem.last_order_date}
                    />
                  </div>
                </div>

                {/* Metadata */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2 px-1">
                    Metadata
                  </p>
                  <div className="rounded-xl bg-white/[0.04] border border-white/[0.08] divide-y divide-white/[0.06]">
                    <Row label="Tạo lúc" value={formatDatetime(detailItem.created_at)} />
                    <Row label="Cập nhật" value={formatDatetime(detailItem.updated_at)} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

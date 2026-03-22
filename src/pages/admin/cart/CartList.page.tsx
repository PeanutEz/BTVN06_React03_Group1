import React, { useEffect, useRef, useState } from "react";
import { GlassSearchSelect } from "../../../components/ui";
import { cartClient } from "../../../services/cart.client";
import type { CartApiData } from "../../../services/cart.client";
import { fetchFranchiseSelect } from "../../../services/store.service";
import type { FranchiseSelectItem } from "../../../services/store.service";
import { searchCustomersPaged } from "../../../services/customer.service";
import Pagination from "../../../components/ui/Pagination";
import { useManagerFranchiseId } from "../../../hooks/useManagerFranchiseId";
import { showSuccess, showError } from "../../../utils";

const ITEMS_PER_PAGE = 10;

const CART_STATUS_OPTIONS = [
  { value: "ACTIVE",      label: "Đang hoạt động" },
  { value: "CHECKED_OUT", label: "Đã checkout" },
  { value: "CANCELLED",   label: "Đã hủy" },
];

const CART_STATUS_COLORS: Record<string, string> = {
  ACTIVE:       "bg-blue-50 text-blue-700 border-blue-200",
  CHECKED_OUT:  "bg-green-50 text-green-700 border-green-200",
  CANCELLED:    "bg-red-50 text-red-700 border-red-200",
};

const CART_STATUS_LABELS: Record<string, string> = {
  ACTIVE:      "Đang hoạt động",
  CHECKED_OUT: "Đã checkout",
  CANCELLED:   "Đã hủy",
};

// ─── Cart detail modal ────────────────────────────────────────────────────────
function CartDetailModal({ cart, onClose }: { cart: CartApiData; onClose: () => void }) {
  const [detail, setDetail] = useState<CartApiData | null>(null);
  const [detailLoading, setDetailLoading] = useState(true);
  const [detailError, setDetailError] = useState(false);

  const cartId = String(cart._id ?? cart.id);

  useEffect(() => {
    let cancelled = false;
    setDetailLoading(true);
    setDetailError(false);
    cartClient.getCartDetail(cartId)
      .then((data) => { if (!cancelled) setDetail(data); })
      .catch(() => { if (!cancelled) setDetailError(true); })
      .finally(() => { if (!cancelled) setDetailLoading(false); });
    return () => { cancelled = true; };
  }, [cartId]);

  // Use detail if loaded, otherwise fall back to list-level cart data
  const d = detail ?? cart;

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n);

  const cartItems: any[] = (detail as any)?.cart_items ?? (d as any)?.cart_items ?? (d as any)?.items ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl my-6 rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
        >
          <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <div className="p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-1">Chi tiết giỏ hàng</h2>
          <p className="text-xs text-slate-500 mb-4">ID: {cartId}</p>

          {/* Summary info grid */}
          <div className="grid grid-cols-2 gap-3 text-sm mb-5">
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
              <p className="text-xs text-slate-500 mb-0.5">Khách hàng</p>
              <p className="font-semibold text-slate-900">{String((d as any).customer_name || d.customer_id || "—")}</p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
              <p className="text-xs text-slate-500 mb-0.5">Chi nhánh</p>
              <p className="font-semibold text-slate-900">{String((d as any).franchise_name || d.franchise_id || "—")}</p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
              <p className="text-xs text-slate-500 mb-0.5">Nhân viên</p>
              <p className="font-semibold text-slate-900">{String((d as any).staff_name || (d as any).staff_email || (d as any).staff_id || "—")}</p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
              <p className="text-xs text-slate-500 mb-0.5">Trạng thái</p>
              <span className={`inline-block rounded-full border px-2 py-0.5 text-xs font-semibold ${CART_STATUS_COLORS[d.status ?? ""] ?? "bg-slate-100 text-slate-600 border-slate-200"}`}>
                {CART_STATUS_LABELS[d.status ?? ""] ?? d.status ?? "—"}
              </span>
            </div>
          </div>

          {/* Cart items */}
          <h3 className="text-sm font-semibold text-slate-700 mb-2">Sản phẩm</h3>

          {detailLoading ? (
            <div className="flex justify-center items-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
            </div>
          ) : detailError ? (
            <p className="text-center text-sm text-red-500 py-6">Không thể tải chi tiết giỏ hàng.</p>
          ) : cartItems.length === 0 ? (
            <p className="text-center text-sm text-slate-400 py-6">Giỏ hàng trống.</p>
          ) : (
            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {cartItems.map((item: any, idx: number) => {
                // API returns item.product.name and item.product.image_url
                const productName: string = item.product?.name ?? item.product_name ?? "Sản phẩm";
                const productImage: string | undefined = item.product?.image_url ?? item.product_image_url;
                const options: any[] = item.options ?? [];
                return (
                  <div key={item.cart_item_id ?? item._id ?? idx} className="rounded-xl border border-slate-100 p-3">
                    <div className="flex items-start gap-3">
                      {productImage ? (
                        <img src={productImage} alt={productName} className="size-14 rounded-lg object-cover shrink-0 border border-slate-100" />
                      ) : (
                        <div className="size-14 rounded-lg bg-slate-100 shrink-0 flex items-center justify-center text-slate-300">
                          <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3 3h18M3 3v18M21 3v18" />
                          </svg>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 leading-snug">{productName}</p>
                        {item.note && (
                          <p className="text-xs text-slate-500 mt-0.5 truncate">📝 {item.note}</p>
                        )}
                        {/* Options */}
                        {options.length > 0 && (
                          <div className="mt-1.5 space-y-1">
                            {options.map((opt: any, oi: number) => {
                              const optName: string = opt.product?.name ?? opt.product_name ?? "Option";
                              const optImage: string | undefined = opt.product?.image_url ?? opt.product_image_url;
                              return (
                                <div key={oi} className="flex items-center gap-1.5 text-xs text-slate-600">
                                  {optImage && <img src={optImage} alt={optName} className="size-5 rounded object-cover border border-slate-100" />}
                                  <span className="truncate">+ {optName}</span>
                                  <span className="text-slate-400">x{opt.quantity}</span>
                                  {opt.final_price != null && (
                                    <span className="ml-auto shrink-0 text-primary-600 font-medium">{formatCurrency(opt.final_price)}</span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        <p className="text-xs text-slate-400">x{item.quantity}</p>
                        <p className="font-semibold text-primary-600 text-sm mt-0.5">
                          {formatCurrency(item.final_line_total ?? item.line_total ?? 0)}
                        </p>
                        {item.final_line_total != null && item.line_total != null && item.final_line_total !== item.line_total && (
                          <p className="text-xs text-slate-400 line-through">{formatCurrency(item.line_total)}</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Totals breakdown */}
          {!detailLoading && !detailError && (
            <div className="mt-4 space-y-1.5 border-t border-slate-100 pt-3 text-sm">
              {(d as any).subtotal_amount > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Tạm tính</span><span>{formatCurrency((d as any).subtotal_amount)}</span>
                </div>
              )}
              {(d as any).promotion_discount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Giảm giá khuyến mãi</span><span>-{formatCurrency((d as any).promotion_discount)}</span>
                </div>
              )}
              {(d as any).voucher_discount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Voucher</span><span>-{formatCurrency((d as any).voucher_discount)}</span>
                </div>
              )}
              {(d as any).loyalty_discount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Điểm thưởng</span><span>-{formatCurrency((d as any).loyalty_discount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-slate-900 text-base border-t border-slate-200 pt-2">
                <span>Tổng cộng</span>
                <span className="text-primary-600">{formatCurrency((d as any).final_amount ?? d.total_amount ?? 0)}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
const CartListPage = (): React.JSX.Element => {
  const managerFranchiseId = useManagerFranchiseId();

  // Raw carts từ API (của customer đang chọn)
  const [rawCarts, setRawCarts] = useState<CartApiData[]>([]);
  const [franchises, setFranchises] = useState<FranchiseSelectItem[]>([]);
  const [selectedFranchiseId, setSelectedFranchiseId] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCart, setSelectedCart] = useState<CartApiData | null>(null);
  const [checkingOutId, setCheckingOutId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [allCustomers, setAllCustomers] = useState<{ id: string; name: string; email: string }[]>([]);

  // Guard chống StrictMode double-call (chỉ cho mount effect)
  const initDoneRef = useRef(false);

  const activeFranchiseId = managerFranchiseId ?? selectedFranchiseId;

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n);

  // Chỉ gọi API khi user đã chọn customer
  const loadCartsForCustomer = async (customerId: string, customerName: string, customerEmail: string) => {
    setLoading(true);
    setCurrentPage(1);
    try {
      const data = await cartClient.getCartsByCustomerId(customerId) as CartApiData[];
      setRawCarts(data.map(cart => ({
        ...cart,
        customer_name: customerName,
        customer_email: customerEmail,
      })));
    } catch {
      setRawCarts([]);
    } finally {
      setLoading(false);
    }
  };

  // Mount: load franchises + customers list (chỉ 2 API, không load carts)
  useEffect(() => {
    if (initDoneRef.current) return;
    initDoneRef.current = true;

    fetchFranchiseSelect().then(setFranchises).catch(() => {});
    searchCustomersPaged({
      searchCondition: { keyword: "", is_active: "", is_deleted: false },
      pageInfo: { pageNum: 1, pageSize: 500 },
    })
      .then(res => {
        setAllCustomers(res.pageData.map(c => ({ id: c.id, name: c.name, email: c.email ?? "" })));
      })
      .catch(() => {});
  }, []);

  // Set franchise khi là MANAGER (không load carts tự động)
  useEffect(() => {
    if (!managerFranchiseId) return;
    setSelectedFranchiseId(managerFranchiseId);
  }, [managerFranchiseId]);

  const handleFranchiseChange = (v: string) => {
    setSelectedFranchiseId(v);
    setSelectedCustomerId("");
    setRawCarts([]);
    setStatusFilter("");
    setCurrentPage(1);
  };

  const handleCustomerChange = (customerId: string) => {
    setSelectedCustomerId(customerId);
    setCurrentPage(1);
    if (!customerId) {
      setRawCarts([]);
      return;
    }
    const customer = allCustomers.find(c => c.id === customerId);
    loadCartsForCustomer(customerId, customer?.name ?? "", customer?.email ?? "");
  };

  const handleStatusChange = (v: string) => {
    setStatusFilter(v);
    setCurrentPage(1);
  };

  const handleReset = () => {
    setSelectedCustomerId("");
    setStatusFilter("");
    setCurrentPage(1);
    setRawCarts([]);
  };

  const handleCheckout = async (cartId: string) => {
    if (!confirm("Xác nhận checkout giỏ hàng này?")) return;
    setCheckingOutId(cartId);
    try {
      await cartClient.checkoutCart(cartId);
      showSuccess("Checkout thành công");
      if (selectedCustomerId) {
        const customer = allCustomers.find(c => c.id === selectedCustomerId);
        loadCartsForCustomer(selectedCustomerId, customer?.name ?? "", customer?.email ?? "");
      }
    } catch (err: any) {
      showError(err?.response?.data?.message || "Không thể checkout");
    } finally { setCheckingOutId(null); }
  };

  const handleCancel = async (cartId: string) => {
    if (!confirm("Xác nhận hủy giỏ hàng này?")) return;
    setCancellingId(cartId);
    try {
      await cartClient.cancelCart(cartId);
      showSuccess("Đã hủy giỏ hàng");
      if (selectedCustomerId) {
        const customer = allCustomers.find(c => c.id === selectedCustomerId);
        loadCartsForCustomer(selectedCustomerId, customer?.name ?? "", customer?.email ?? "");
      }
    } catch (err: any) {
      showError(err?.response?.data?.message || "Không thể hủy giỏ hàng");
    } finally { setCancellingId(null); }
  };

  const franchiseMap = Object.fromEntries(franchises.map(f => [f.value, f.name]));
  const franchiseSelectOptions = franchises.map(f => ({ value: f.value, label: `${f.name} (${f.code})` }));
  const customerOptions = allCustomers.map(c => ({ value: c.id, label: c.name }));

  // Filter client-side: franchise + status
  const filteredCarts = rawCarts.filter(c => {
    if (activeFranchiseId && c.franchise_id !== activeFranchiseId) return false;
    if (statusFilter && c.status !== statusFilter) return false;
    return true;
  });
  const totalPages = Math.ceil(filteredCarts.length / ITEMS_PER_PAGE);
  const paginatedCarts = filteredCarts.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // Hiển thị bảng khi đã chọn customer (hoặc đang load)
  const showTable = !!selectedCustomerId || loading;

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Quản lý giỏ hàng</h1>
        <p className="text-xs sm:text-sm text-slate-600">Xem và xử lý giỏ hàng của khách hàng</p>
      </div>

      {/* FILTERS */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">

          {/* Chi nhánh */}
          <div className="min-w-[220px] space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Chi nhánh</label>
            {managerFranchiseId ? (
              <div className="flex items-center gap-2 rounded-lg border border-primary-500/40 bg-primary-50 px-3 py-2 text-sm text-primary-700">
                <svg className="size-4 shrink-0 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span className="font-medium truncate">{franchiseMap[managerFranchiseId] || managerFranchiseId}</span>
              </div>
            ) : (
              <GlassSearchSelect
                value={selectedFranchiseId}
                onChange={handleFranchiseChange}
                options={franchiseSelectOptions}
                placeholder="-- Chọn chi nhánh --"
                searchPlaceholder="Tìm theo tên hoặc mã..."
                allLabel="-- Tất cả --"
              />
            )}
          </div>

          {/* Trạng thái */}
          <div className="min-w-[180px] space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Trạng thái</label>
            <GlassSearchSelect
              value={statusFilter}
              onChange={handleStatusChange}
              options={CART_STATUS_OPTIONS}
              placeholder="-- Tất cả --"
              searchPlaceholder="Tìm trạng thái..."
              allLabel="-- Tất cả --"
            />
          </div>          {/* Khách hàng — dropdown có search, giống hình */}
          <div className="min-w-[220px] space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Khách hàng</label>
            <GlassSearchSelect
              value={selectedCustomerId}
              onChange={handleCustomerChange}
              options={customerOptions}
              placeholder="-- Chọn khách hàng --"
              searchPlaceholder="Tìm theo tên khách hàng..."
              allLabel="-- Tất cả khách hàng --"
            />
          </div>

          {/* Reset */}
          <div className="space-y-1.5">
            <label className="invisible block text-xs">&nbsp;</label>
            <button
              onClick={handleReset}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Đặt lại
            </button>
          </div>
        </div>

        {selectedCustomerId && (
          <p className="mt-3 text-xs text-slate-400">
            Hiển thị <span className="font-semibold text-slate-600">{filteredCarts.length}</span> giỏ hàng
            {rawCarts.length !== filteredCarts.length && ` (lọc từ ${rawCarts.length})`}
          </p>
        )}
      </div>

      {/* Chưa chọn customer */}
      {!showTable && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-slate-400">
          <svg className="mb-3 size-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
          </svg>
          <p className="text-sm font-medium">Chọn khách hàng để xem giỏ hàng</p>
        </div>
      )}      {/* TABLE */}
      {showTable && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-4 py-3">ID giỏ hàng</th>
                  <th className="px-4 py-3">Khách hàng</th>
                  <th className="px-4 py-3">Nhân viên</th>
                  <th className="px-4 py-3">Chi nhánh</th>
                  <th className="px-4 py-3">Tổng tiền</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {loading ? (
                  <tr><td colSpan={7}>
                    <div className="flex justify-center items-center py-16">
                      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500" />
                    </div>
                  </td></tr>
                ) : paginatedCarts.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-500">Không có giỏ hàng nào</td></tr>
                ) : (
                  paginatedCarts.map((cart) => {
                    const cartId = String(cart._id ?? cart.id);
                    const statusColor = CART_STATUS_COLORS[cart.status ?? ""] ?? "bg-slate-100 text-slate-600 border-slate-200";
                    const isActive = cart.status === "ACTIVE";
                    return (
                      <tr key={cartId} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-primary-600 max-w-[120px] truncate" title={cartId}>{cartId.slice(-8)}</td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-slate-900">{String((cart as any).customer_name || "—")}</p>
                          <p className="text-xs text-slate-500">{String((cart as any).customer_email || cart.customer_id || "")}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-slate-700">{String((cart as any).staff_name || "—")}</p>
                          <p className="text-xs text-slate-500">{String((cart as any).staff_email || "")}</p>
                        </td>
                        <td className="px-4 py-3 text-slate-700">{String((cart as any).franchise_name || cart.franchise_id || "—")}</td>
                        <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">
                          {formatCurrency((cart as any).final_amount ?? cart.total_amount ?? 0)}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusColor}`}>
                            {CART_STATUS_LABELS[cart.status ?? ""] ?? cart.status ?? "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => setSelectedCart(cart)}
                              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-primary-50 hover:text-primary-600"
                              title="Xem chi tiết"
                            >
                              <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                            </button>
                            {isActive && (
                              <button
                                onClick={() => handleCheckout(cartId)}
                                disabled={checkingOutId === cartId}
                                className="rounded-lg border border-green-200 bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700 transition-colors hover:bg-green-100 disabled:opacity-50"
                              >
                                {checkingOutId === cartId ? "..." : "Checkout"}
                              </button>
                            )}
                            {isActive && (
                              <button
                                onClick={() => handleCancel(cartId)}
                                disabled={cancellingId === cartId}
                                className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 transition-colors hover:bg-red-100 disabled:opacity-50"
                              >
                                {cancellingId === cartId ? "..." : "Hủy"}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <div className="px-4">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              totalItems={filteredCarts.length}
              itemsPerPage={ITEMS_PER_PAGE}
            />
          </div>
        </div>
      )}

      {selectedCart && (
        <CartDetailModal cart={selectedCart} onClose={() => setSelectedCart(null)} />
      )}
    </div>
  );
};

export default CartListPage;

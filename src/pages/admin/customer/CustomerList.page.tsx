import { useEffect, useRef, useState } from "react";
import { Button } from "../../../components";
import type { CustomerDisplay } from "../../../models/customer.model";
import {
  createCustomer,
  searchCustomersPaged,
} from "../../../services/customer.service";
import { showSuccess, showError } from "../../../utils";
import Pagination from "../../../components/ui/Pagination";
import CustomerDetailModal from "./CustomerDetailModal";

const PAGE_SIZE = 10;

type ActiveFilter = "" | "true" | "false";

/** Avatar initials fallback */
function AvatarCell({ name, url }: { name: string; url?: string }) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(-2)
    .map((w) => w[0].toUpperCase())
    .join("");
  if (url) {
    return (
      <img
        src={url}
        alt={name}
        className="size-9 rounded-full object-cover ring-2 ring-slate-100"
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.display = "none";
        }}
      />
    );
  }
  return (
    <div className="size-9 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-xs font-bold ring-2 ring-slate-100 shrink-0">
      {initials}
    </div>
  );
}

const CustomerListPage = () => {
  const [customers, setCustomers] = useState<CustomerDisplay[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Filters
  const [keyword, setKeyword] = useState("");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("");

  // Pagination — server-side
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: "", email: "", phone: "", is_active: true });
  const [detailCustomerId, setDetailCustomerId] = useState<string | null>(null);

  // keep latest search params in ref to avoid stale closures
  const searchRef = useRef({ keyword, activeFilter });

  const loadPage = async (page: number, kw = keyword, active = activeFilter) => {
    setLoading(true);
    try {
      const result = await searchCustomersPaged({
        searchCondition: {
          keyword: kw,
          is_active: active === "" ? "" : active === "true",
          is_deleted: false,
        },
        pageInfo: { pageNum: page, pageSize: PAGE_SIZE },
      });
      setCustomers(result.pageData);
      setTotalItems(result.pageInfo.totalItems);
      setTotalPages(result.pageInfo.totalPages);
      setCurrentPage(page);
    } catch (err) {
      console.error("Lỗi tải danh sách khách hàng:", err);
      showError("Không thể tải danh sách khách hàng");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPage(1);
  }, []);

  const handleSearch = () => {
    searchRef.current = { keyword, activeFilter };
    loadPage(1, keyword, activeFilter);
  };

  const handlePageChange = (page: number) => {
    loadPage(page, searchRef.current.keyword, searchRef.current.activeFilter);
  };

  const handleOpenModal = () => {
    setFormData({ name: "", email: "", phone: "", is_active: true });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createCustomer({ ...formData, is_deleted: false });
      showSuccess("Tạo khách hàng thành công");
      setShowModal(false);
      loadPage(1, searchRef.current.keyword, searchRef.current.activeFilter);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Có lỗi xảy ra";
      showError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Quản lý khách hàng</h1>
          <p className="text-xs sm:text-sm text-slate-500">
            {totalItems > 0 ? `${totalItems} khách hàng` : "Quản lý thông tin khách hàng"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => handleOpenModal()}>+ Thêm khách hàng</Button>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
            </svg>
            <input
              type="text"
              placeholder="Tìm theo tên, email, số điện thoại..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="w-full rounded-lg border border-slate-300 bg-white pl-9 pr-4 py-2 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
            />
          </div>

          <select
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value as ActiveFilter)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 min-w-[140px]"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="true">Hoạt động</option>
            <option value="false">Ngưng hoạt động</option>
          </select>

          <div className="flex gap-2">
            <Button onClick={handleSearch} size="sm" loading={loading}>
              Tìm kiếm
            </Button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Khách hàng</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Liên hệ</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Xác thực</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Trạng thái</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Ngày tạo</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <svg className="animate-spin size-4 text-primary-500" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                      Đang tải...
                    </div>
                  </td>
                </tr>
              )}
              {!loading && customers.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-400">
                    Không tìm thấy khách hàng nào
                  </td>
                </tr>
              )}
              {!loading && customers.map((customer) => (
                <tr key={customer.id} className="hover:bg-slate-50 transition-colors">
                  {/* Avatar + Name */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <AvatarCell name={customer.name} url={customer.avatar_url} />
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 truncate">{customer.name}</p>
                        <p className="text-xs text-slate-400 font-mono truncate">{customer.id.slice(-8)}</p>
                      </div>
                    </div>
                  </td>

                  {/* Contact */}
                  <td className="px-4 py-3">
                    <p className="text-slate-700 truncate">{customer.email || <span className="text-slate-400 italic">Chưa có email</span>}</p>
                    <p className="text-xs text-slate-500">{customer.phone}</p>
                  </td>

                  {/* Verified */}
                  <td className="px-4 py-3">
                    {customer.is_verified ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                        ✓ Đã xác thực
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 border border-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-500">
                        Chưa xác thực
                      </span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                        customer.is_active
                          ? "bg-green-50 text-green-700 border-green-200"
                          : "bg-slate-50 text-slate-500 border-slate-200"
                      }`}
                    >
                      <span className={`mr-1 size-1.5 rounded-full ${customer.is_active ? "bg-green-500" : "bg-slate-400"}`} />
                      {customer.is_active ? "Hoạt động" : "Ngưng"}
                    </span>
                  </td>

                  {/* Created at */}
                  <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                    {new Date(customer.created_at).toLocaleDateString("vi-VN")}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        title="Xem chi tiết"
                        onClick={() => setDetailCustomerId(customer.id)}
                        className="inline-flex items-center justify-center size-8 rounded-lg border border-slate-200 bg-white text-slate-500 hover:border-primary-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="border-t border-slate-100 px-4">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            totalItems={totalItems}
            itemsPerPage={PAGE_SIZE}
          />
        </div>
      </div>

      {/* Detail Modal */}
      {detailCustomerId && (
        <CustomerDetailModal
          customerId={detailCustomerId}
          onClose={() => setDetailCustomerId(null)}
        />
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl animate-slide-in">
            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 className="text-lg font-bold text-slate-900">
                Thêm khách hàng mới
              </h2>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              >
                <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Họ tên *</label>
                  <input
                    type="text"
                    required
                    placeholder="Nguyễn Văn A"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Email</label>
                  <input
                    type="email"
                    placeholder="email@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Số điện thoại *</label>
                  <input
                    type="tel"
                    required
                    placeholder="09xxxxxxxx"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Trạng thái</label>
                  <div className="flex gap-3">
                    {[{ val: true, label: "Hoạt động" }, { val: false, label: "Ngưng hoạt động" }].map(({ val, label }) => (
                      <label key={String(val)} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="is_active"
                          checked={formData.is_active === val}
                          onChange={() => setFormData({ ...formData, is_active: val })}
                          className="accent-primary-500"
                        />
                        <span className="text-sm text-slate-700">{label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="submit" loading={submitting} disabled={submitting} className="flex-1">
                  Tạo khách hàng
                </Button>
                <Button
                  type="button"
                  onClick={() => setShowModal(false)}
                  variant="outline"
                  disabled={submitting}
                  className="flex-1"
                >
                  Hủy
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerListPage;

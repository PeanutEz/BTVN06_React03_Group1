import { useEffect, useRef, useState } from "react";
import { Button, GlassSelect, useConfirm } from "../../../components";
import type { CustomerDisplay } from "../../../models/customer.model";
import {
  createCustomer,
  searchCustomersPaged,
  deleteCustomer,
  changeCustomerStatus,
  restoreCustomer,
} from "../../../services/customer.service";
import { showSuccess, showError } from "../../../utils";
import { useLoadingStore } from "../../../store/loading.store";
import Pagination from "../../../components/ui/Pagination";
import CustomerDetailModal from "./CustomerDetailModal";
import { useAuthStore } from "../../../store";

const CLOUDINARY_CLOUD_NAME = "dn2xh5rxe";
const CLOUDINARY_UPLOAD_PRESET = "btvn06_upload";

async function uploadImageToCloudinary(file: File): Promise<string> {
  const data = new FormData();
  data.append("file", file);
  data.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    { method: "POST", body: data }
  );
  if (!res.ok) throw new Error("Upload ảnh lên Cloudinary thất bại");
  const json = await res.json();
  return json.secure_url as string;
}

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
  const showConfirm = useConfirm();
  const { show: showPageLoading, hide: hidePageLoading } = useLoadingStore();
  const user = useAuthStore((s) => s.user);
  const isStaff = user?.active_context
    ? (user.active_context as any)?.role?.toUpperCase() === "STAFF"
    : user?.roles?.some((r) => r.role?.toUpperCase() === "STAFF") ?? false;
  const [customers, setCustomers] = useState<CustomerDisplay[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // Filters
  const [keyword, setKeyword] = useState("");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("");
  const [showDeleted, setShowDeleted] = useState(false);

  // Pagination — server-side
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);  // Modal
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: "", email: "", phone: "", password: "", address: "", avatar_url: "", is_active: true });
  const [showPassword, setShowPassword] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [detailCustomerId, setDetailCustomerId] = useState<string | null>(null);
  // keep latest search params in ref to avoid stale closures
  const searchRef = useRef({ keyword, activeFilter, showDeleted });
  const hasRun = useRef(false);

  const loadPage = async (page: number, kw = keyword, active = activeFilter, isDeleted = showDeleted) => {
    setLoading(true);
    try {
      const result = await searchCustomersPaged({
        searchCondition: {
          keyword: kw,
          is_active: isDeleted ? "" : (active === "" ? "" : active === "true"),
          is_deleted: isDeleted,
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
    if (hasRun.current) return;
    hasRun.current = true;
    loadPage(1);
  }, []);
  const handleSearch = () => {
    searchRef.current = { keyword, activeFilter, showDeleted };
    loadPage(1, keyword, activeFilter, showDeleted);
  };

  const handlePageChange = (page: number) => {
    loadPage(page, searchRef.current.keyword, searchRef.current.activeFilter, searchRef.current.showDeleted);
  };const handleOpenModal = () => {
    setFormData({ name: "", email: "", phone: "", password: "", address: "", avatar_url: "", is_active: true });
    setShowPassword(false);
    setFormErrors({});
    setAvatarUploading(false);
    setShowModal(true);
  };

  const handleDelete = async (id: string, name: string, email?: string) => {
    if (!await showConfirm({
      title: "Xác nhận xóa",
      message: `Bạn có chắc muốn xóa khách hàng "${name}" không?`,
      variant: "danger",
      confirmText: "Xóa",
    })) return;
    try {
      await deleteCustomer(id);      showSuccess(`Xóa khách hàng${email ? ` ${email}` : ` ${name}`} thành công`);
      const nextPage = customers.length <= 1 && currentPage > 1 ? currentPage - 1 : currentPage;
      setCurrentPage(nextPage);
      loadPage(nextPage, searchRef.current.keyword, searchRef.current.activeFilter, searchRef.current.showDeleted);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Có lỗi xảy ra";
      showError(msg);
    }
  };  const handleRestore = async (id: string, name?: string) => {
    try {
      await restoreCustomer(id);
      showSuccess(`Đã khôi phục khách hàng${name ? ` "${name}"` : ""} thành công`);
      loadPage(currentPage, searchRef.current.keyword, searchRef.current.activeFilter, searchRef.current.showDeleted);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Có lỗi xảy ra";
      showError(msg);
    }
  };

  const handleToggleStatus = async (id: string, currentActive: boolean, email?: string, name?: string) => {
    const actionLabel = currentActive ? "vô hiệu hóa" : "kích hoạt";
    const targetLabel = email || name ? ` ${email || name}` : "";
    const variant = currentActive ? "danger" : "warning";
    const confirmed = await showConfirm({
      title: "Xác nhận thay đổi trạng thái",
      message: `Bạn có chắc muốn ${actionLabel} khách hàng${targetLabel} không?`,
      variant,
      confirmText: currentActive ? "Vô hiệu hóa" : "Kích hoạt",
    });
    if (!confirmed) return;

    try {
      await changeCustomerStatus(id, !currentActive);
      const label = email || name || "";
      showSuccess(`Đã ${!currentActive ? "kích hoạt" : "vô hiệu hóa"} khách hàng${label ? ` ${label}` : ""} thành công`);
      loadPage(currentPage, searchRef.current.keyword, searchRef.current.activeFilter, searchRef.current.showDeleted);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Có lỗi xảy ra";
      showError(msg);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) { setFormErrors({ name: "Vui lòng nhập họ tên" }); return; }
    setFormErrors({});
    setShowModal(false);
    showPageLoading("Đang tạo khách hàng...");
    setSubmitting(true);
    try {
      await createCustomer({ ...formData, is_deleted: false });
      showSuccess("Tạo khách hàng thành công");
      await loadPage(1, searchRef.current.keyword, searchRef.current.activeFilter);
    } catch (err) {
      const responseData = (err as any)?.responseData ?? (err as any)?.response?.data;
      const apiErrors: Array<{ field?: string; message?: string }> = responseData?.errors ?? [];
      if (apiErrors.length > 0) {
        const fieldErrors: Record<string, string> = {};
        apiErrors.forEach(e => { if (e.field && e.message) fieldErrors[e.field] = e.message; });
        if (Object.keys(fieldErrors).length > 0) { setFormErrors(fieldErrors); setShowModal(true); return; }
      }
      // fallback: lỗi không có field cụ thể
      const msg = responseData?.message || (err instanceof Error ? err.message : "Có lỗi xảy ra");
      setFormErrors({ general: msg });
      setShowModal(true);
    } finally {
      setSubmitting(false);
      hidePageLoading();
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
          </div>          <GlassSelect
            value={activeFilter}
            onChange={(v) => setActiveFilter(v as ActiveFilter)}
            disabled={showDeleted}
            className="min-w-[140px]"
            options={[
              { value: "", label: "Tất cả trạng thái" },
              { value: "true", label: "Hoạt động" },
              { value: "false", label: "Ngưng hoạt động" },
            ]}
          />

          <label className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm cursor-pointer hover:bg-slate-50 transition select-none">
            <input
              type="checkbox"
              checked={showDeleted}
              onChange={(e) => {
                const val = e.target.checked;
                setShowDeleted(val);
                searchRef.current = { keyword, activeFilter, showDeleted: val };
                loadPage(1, keyword, activeFilter, val);
              }}
              className="size-4 rounded accent-red-500"
            />
            <span className="text-slate-700 whitespace-nowrap">Đã xóa</span>
          </label>

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
                  <td colSpan={6}>
                    <div className="flex justify-center items-center py-20">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
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
              )}              {!loading && customers.map((customer) => (
                <tr key={customer.id} className={`transition-colors ${customer.is_deleted ? "bg-red-50/60 opacity-75" : "hover:bg-slate-50"}`}>
                  {/* Avatar + Name */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <AvatarCell name={customer.name} url={customer.avatar_url} />
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 truncate">{customer.name}</p>
                        {customer.is_deleted && (
                          <span className="text-xs text-red-500 font-medium">✕ Đã xóa</span>
                        )}
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
                      <span className="inline-flex items-center rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                        Đã xác thực
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-slate-50 border border-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-500">
                        Chưa xác thực
                      </span>
                    )}
                  </td>                  {/* Status */}
                  <td className="px-4 py-3">
                    {customer.is_deleted ? (
                      <span className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-600">
                        Đã xóa
                      </span>
                    ) : (
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                          customer.is_active
                            ? "bg-green-50 text-green-700 border-green-200"
                            : "bg-slate-50 text-slate-500 border-slate-200"
                        }`}
                      >
                        {customer.is_active ? "Active" : "Inactive"}
                      </span>
                    )}
                  </td>

                  {/* Created at */}
                  <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                    {new Date(customer.created_at).toLocaleDateString("vi-VN")}
                  </td>                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {customer.is_deleted ? (
                        /* Khôi phục */
                        <button
                          title="Khôi phục khách hàng"
                          onClick={() => handleRestore(customer.id, customer.name)}
                          className="inline-flex items-center justify-center size-8 rounded-lg border border-emerald-300 bg-white text-emerald-600 hover:border-emerald-500 hover:bg-emerald-50 transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        </button>
                      ) : (
                        <>
                          <button
                            title="Chỉnh sửa"
                            onClick={() => setDetailCustomerId(customer.id)}
                            className="inline-flex items-center justify-center size-8 rounded-lg border border-slate-200 bg-white text-slate-500 hover:border-primary-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>

                          {/* Toggle status */}
                          {!isStaff && (
                          <button
                            title={customer.is_active ? "Vô hiệu hóa" : "Kích hoạt"}
                            onClick={() => handleToggleStatus(customer.id, customer.is_active, customer.email, customer.name)}
                            className={`inline-flex items-center justify-center size-8 rounded-lg border transition-colors ${
                              customer.is_active
                                ? "border-amber-200 bg-white text-amber-500 hover:border-amber-400 hover:bg-amber-50"
                                : "border-green-200 bg-white text-green-500 hover:border-green-400 hover:bg-green-50"
                            }`}
                          >
                            {customer.is_active ? (
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

                          {/* Delete */}
                          {!isStaff && (
                          <button
                            title="Xóa khách hàng"
                            onClick={() => handleDelete(customer.id, customer.name, customer.email)}
                            className="inline-flex items-center justify-center size-8 rounded-lg border border-red-200 bg-white text-red-400 hover:border-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                          )}
                        </>
                      )}
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
          onUpdated={() => loadPage(currentPage, searchRef.current.keyword, searchRef.current.activeFilter, searchRef.current.showDeleted)}
          onClose={() => setDetailCustomerId(null)}
        />
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
           
          />          <div
            className="relative w-full max-w-lg rounded-2xl animate-slide-in overflow-y-auto max-h-[90vh] overflow-hidden"
            style={{
              background: "rgba(15,23,42,0.85)",
              backdropFilter: "blur(40px) saturate(180%)",
              WebkitBackdropFilter: "blur(40px) saturate(180%)",
              border: "1px solid rgba(255,255,255,0.12)",
              boxShadow: "0 32px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.12)",
            }}
          >
            <div className="h-0.5 w-full shrink-0" style={{ background: "linear-gradient(90deg, #6366f1, #8b5cf6, #06b6d4)" }} />
            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-white/[0.12] px-6 py-4">
              <h2 className="text-lg font-bold text-white/95">
                Thêm khách hàng mới
              </h2>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="rounded-lg p-1.5 text-white/40 hover:bg-white/[0.1] hover:text-white transition"
              >
                <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-sm font-semibold text-white/80">Họ tên <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    placeholder="Nguyễn Văn A"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={`w-full rounded-lg border bg-white/[0.08] px-4 py-2.5 text-sm text-white/90 placeholder-white/30 outline-none transition focus:ring-2 focus:ring-primary-500/20 ${formErrors.name ? "border-red-400 focus:border-red-400" : "border-white/[0.15] focus:border-primary-500"}`}
                  />
                  {formErrors.name && <p className="!text-[#f87171]" style={{ fontSize: 11, marginTop: 4 }}>{formErrors.name}</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-white/80">Email</label>
                  <input
                    type="email"
                    placeholder="email@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className={`w-full rounded-lg border bg-white/[0.08] px-4 py-2.5 text-sm text-white/90 placeholder-white/30 outline-none transition focus:ring-2 focus:ring-primary-500/20 ${formErrors.email ? "border-red-400 focus:border-red-400" : "border-white/[0.15] focus:border-primary-500"}`}
                  />
                  {formErrors.email && <p className="!text-[#f87171]" style={{ fontSize: 11, marginTop: 4 }}>{formErrors.email}</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-white/80">Số điện thoại <span className="text-red-400">*</span></label>
                  <input
                    type="tel"
                    placeholder="09xxxxxxxx"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className={`w-full rounded-lg border bg-white/[0.08] px-4 py-2.5 text-sm text-white/90 placeholder-white/30 outline-none transition focus:ring-2 focus:ring-primary-500/20 ${formErrors.phone ? "border-red-400 focus:border-red-400" : "border-white/[0.15] focus:border-primary-500"}`}
                  />
                  {formErrors.phone && <p className="!text-[#f87171]" style={{ fontSize: 11, marginTop: 4 }}>{formErrors.phone}</p>}
                </div>

                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-sm font-semibold text-white/80">Mật khẩu <span className="text-red-400">*</span></label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Tối thiểu 8 ký tự"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className={`w-full rounded-lg border bg-white/[0.08] px-4 py-2.5 pr-10 text-sm text-white/90 placeholder-white/30 outline-none transition focus:ring-2 focus:ring-primary-500/20 ${formErrors.password ? "border-red-400 focus:border-red-400" : "border-white/[0.15] focus:border-primary-500"}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                    >
                      {showPassword ? (
                        <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>                  </div>
                  {formErrors.password && <p className="!text-[#f87171]" style={{ fontSize: 11, marginTop: 4 }}>{formErrors.password}</p>}
                </div>

                {/* Địa chỉ */}
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-sm font-semibold text-white/80">Địa chỉ</label>
                  <input
                    type="text"
                    placeholder="FTOWN-1, FPT Software, Ho Chi Minh"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className={`w-full rounded-lg border bg-white/[0.08] px-4 py-2.5 text-sm text-white/90 placeholder-white/30 outline-none transition focus:ring-2 focus:ring-primary-500/20 ${formErrors.address ? "border-red-400 focus:border-red-400" : "border-white/[0.15] focus:border-primary-500"}`}
                  />
                  {formErrors.address && <p className="!text-[#f87171]" style={{ fontSize: 11, marginTop: 4 }}>{formErrors.address}</p>}
                </div>

                {/* Upload ảnh đại diện */}
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-sm font-semibold text-white/80">Ảnh đại diện</label>
                  <div className="flex items-center gap-3">
                    {/* Preview */}
                    <div className="size-14 shrink-0 rounded-full overflow-hidden border-2 border-white/[0.15] bg-white/[0.06] flex items-center justify-center">
                      {avatarUploading ? (
                        <div className="size-5 animate-spin rounded-full border-2 border-white/20 border-t-white/70" />
                      ) : formData.avatar_url ? (
                        <img src={formData.avatar_url} alt="preview" className="size-14 object-cover rounded-full" />
                      ) : (
                        <svg className="size-7 text-white/25" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 space-y-1.5">
                      <label className={`flex cursor-pointer items-center gap-2 rounded-lg border border-dashed px-4 py-2.5 text-sm transition ${avatarUploading ? "cursor-not-allowed border-white/[0.1] bg-white/[0.02] text-white/30" : "border-white/[0.2] bg-white/[0.04] text-white/60 hover:border-primary-400/60 hover:bg-white/[0.08] hover:text-white/80"}`}>
                        <svg className="size-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>{avatarUploading ? "Đang tải lên..." : formData.avatar_url ? "Đổi ảnh..." : "Chọn ảnh..."}</span>
                        <input
                          type="file"
                          accept="image/*"
                          disabled={avatarUploading}
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            e.target.value = "";
                            setAvatarUploading(true);
                            try {
                              const url = await uploadImageToCloudinary(file);
                              setFormData((prev) => ({ ...prev, avatar_url: url }));
                            } catch {
                              showError("Upload ảnh thất bại");
                            } finally {
                              setAvatarUploading(false);
                            }
                          }}
                        />
                      </label>
                      {formData.avatar_url && !avatarUploading && (
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, avatar_url: "" })}
                          className="text-xs text-red-400/70 hover:text-red-400 transition"
                        >
                          Xóa ảnh
                        </button>
                      )}
                    </div>
                  </div>
                  {formErrors.avatar_url && <p className="!text-[#f87171]" style={{ fontSize: 11, marginTop: 4 }}>{formErrors.avatar_url}</p>}
                </div>
              </div>

              {formErrors.general && (
                <p className="!text-[#f87171] rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2" style={{ fontSize: 12 }}>{formErrors.general}</p>
              )}              <div className="flex gap-3 pt-2">
                <Button type="submit" loading={submitting} disabled={submitting || avatarUploading} className="flex-1">
                  Tạo khách hàng
                </Button>
                <Button
                  type="button"
                  onClick={() => setShowModal(false)}
                  variant="outline"
                  disabled={submitting}
                  className="flex-1 border border-white/[0.15] text-white/70 hover:bg-white/[0.1] hover:text-white"
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

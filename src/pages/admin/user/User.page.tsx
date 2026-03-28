import { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { Button, GlassSelect, useConfirm } from "../../../components";

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
import { useAuthStore } from "../../../store";
import { createUser, deleteUser, fetchUsers, fetchUserById, updateUserProfile, changeUserStatus, restoreUser } from "../../../services/user.service";
import type { ApiUser, CreateUserPayload } from "../../../services/user.service";
import Pagination from "../../../components/ui/Pagination";
import { showSuccess, showError } from "../../../utils";
import { useLoadingStore } from "../../../store/loading.store";

const ITEMS_PER_PAGE = 10;

const DEFAULT_FORM: CreateUserPayload = {
  name: "",
  email: "",
  password: "",
  phone: "",
  avatar_url: "",
  role_id: "",
};

const UserPage = () => {
  const showConfirm = useConfirm();
  const { show: showPageLoading, hide: hidePageLoading } = useLoadingStore();
  const { user: currentUser } = useAuthStore();
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState<CreateUserPayload>({ ...DEFAULT_FORM });
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [editingUser, setEditingUser] = useState<ApiUser | null>(null);
  const [updateError, setUpdateError] = useState("");
  const [showDeleted, setShowDeleted] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [avatarUploading, setAvatarUploading] = useState(false);

  const hasRun = useRef(false);


  const load = async (keyword = searchQuery, page = currentPage, status = statusFilter, isDeleted = showDeleted) => {
    console.log("[User.page] load() called with keyword:", keyword, "page:", page, "status:", status, "isDeleted:", isDeleted);
    setLoading(true);
    try {
      const isActive = isDeleted ? "" : (status === "true" ? true : status === "false" ? false : "");
      const result = await fetchUsers(keyword, page, ITEMS_PER_PAGE, isActive, isDeleted);
      console.log("[User.page] fetchUsers result:", result);
      console.log("[User.page] pageData length:", result.pageData?.length);
      console.log("[User.page] pageInfo:", result.pageInfo);
      setUsers(result.pageData);
      setTotalPages(result.pageInfo.totalPages);
      setTotalItems(result.pageInfo.totalItems);
      setCurrentPage(result.pageInfo.pageNum);
    } catch (err) {
      console.error("[User.page] load() ERROR:", err);
      showError("Lấy danh sách người dùng thất bại");
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;
    load("", 1);
  }, []);


  const handleOpenModal = () => {
    setFormData({ ...DEFAULT_FORM });
    setFormErrors({});
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});
    setShowModal(false);
    showPageLoading("Đang tạo người dùng...");
    setSubmitting(true);
    try {
      await createUser(formData);
      showSuccess("Tạo người dùng thành công");
      await load(searchQuery, currentPage);
    } catch (err) {
      const responseData = (err as any)?.responseData ?? (err as any)?.response?.data;
      const apiErrors: Array<{ field?: string; message?: string }> = responseData?.errors ?? [];
      if (apiErrors.length > 0) {
        const fieldErrors: Record<string, string> = {};
        apiErrors.forEach((e) => { if (e.field && e.message) fieldErrors[e.field] = e.message; });
        if (Object.keys(fieldErrors).length > 0) { setFormErrors(fieldErrors); setShowModal(true); return; }
      }
      const msg = responseData?.message || (err instanceof Error ? err.message : "Tạo người dùng thất bại");
      setFormErrors({ general: msg }); setShowModal(true);
    } finally {
      setSubmitting(false);
      hidePageLoading();
    }
  };

  const handleOpenEdit = async (u: ApiUser) => {
    try {
      const detail = await fetchUserById(u.id);
      setEditingUser(detail);
    } catch {
      // Fallback: dùng data từ danh sách nếu API lỗi
      setEditingUser(u);
    }
    setUpdateError("");
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;
    const userToEdit = editingUser;
    setEditingUser(null);
    setUpdateError("");
    showPageLoading("Đang cập nhật người dùng...");
    setSubmitting(true);
    try {
      await updateUserProfile(editingUser.id, {
        name: editingUser.name,
        phone: editingUser.phone,
        avatar_url: editingUser.avatar_url,
      });
      showSuccess("Cập nhật thành công");
      await load();
    } catch {
      setEditingUser(userToEdit);
      setUpdateError("Cập nhật thất bại");
    } finally {
      setSubmitting(false);
      hidePageLoading();
    }
  };

  const handleDeleteUser = async (u: ApiUser) => {
    if (!await showConfirm({
      title: `Bạn có chắc muốn XÓA VĨNH VIỄN`,
      message: `user "${u.name}"? Hành động này không thể hoàn tác.`,
      variant: "danger",
      confirmText: "Xóa vĩnh viễn",
    })) return;
    setSubmitting(true);
    try {
      await deleteUser(u.id);
      showSuccess(`Đã xóa user "${u.name}"`);
      const nextPage = users.length <= 1 && currentPage > 1 ? currentPage - 1 : currentPage;
      setCurrentPage(nextPage);
      await load(searchQuery, nextPage, statusFilter, showDeleted);
    } catch {
      showError("Xóa user thất bại");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (u: ApiUser) => {
    const action = u.is_active ? "Block" : "Unblock";
    if (!await showConfirm({
      title: `Bạn có chắc muốn ${action}`,
      message: `user "${u.name}"?`,
      variant: u.is_active ? "warning" : "info",
      confirmText: action,
    })) return;
    setSubmitting(true);
    try {
      await changeUserStatus(u.id, !u.is_active);
      showSuccess(`Đã ${action} user "${u.name}"`);
      await load();
    } catch {
      showError(`${action} user thất bại`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRestoreUser = async (u: ApiUser) => {
    if (!await showConfirm({
      title: `Bạn có chắc muốn KHÔI PHỤC`,
      message: `user "${u.name}"?`,
      variant: "warning",
      confirmText: "Khôi phục",
    })) return;
    setSubmitting(true);
    try {
      await restoreUser(u.id);
      showSuccess(`Đã khôi phục user "${u.name}"`);
      await load(searchQuery, currentPage, statusFilter, showDeleted);
    } catch {
      showError("Khôi phục user thất bại");
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">User Management</h1>
          <p className="text-xs sm:text-sm text-slate-600">Quản lý người dùng hệ thống</p>
        </div>
        <Button onClick={handleOpenModal}>+ Tạo người dùng</Button>
      </div>

      {/* Search bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <svg
              className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Tìm kiếm theo tên hoặc email..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              onKeyDown={(e) => { if (e.key === "Enter") load(searchQuery, 1, statusFilter, showDeleted); }}
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-4 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
            />
          </div>
          <GlassSelect
            value={statusFilter}
            onChange={(v) => { setStatusFilter(v); setCurrentPage(1); load(searchQuery, 1, v, showDeleted); }}
            disabled={showDeleted}
            options={[
              { value: "", label: "Tất cả trạng thái" },
              { value: "true", label: "Active" },
              { value: "false", label: "Blocked" },
            ]}
          />
          <label className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm cursor-pointer hover:bg-slate-50 transition select-none">
            <input
              type="checkbox"
              checked={showDeleted}
              onChange={(e) => {
                const val = e.target.checked;
                setShowDeleted(val);
                setCurrentPage(1);
                load(searchQuery, 1, statusFilter, val);
              }}
              className="size-4 rounded accent-red-500"
            />
            <span className="text-slate-700 whitespace-nowrap">Đã xóa</span>
          </label>
          <Button onClick={() => load(searchQuery, 1, statusFilter, showDeleted)} loading={loading}>
            Tìm kiếm
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
            <tr>
              <th className="px-4 py-3">Tên</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">SĐT</th>
              <th className="px-4 py-3">Trạng thái</th>
              <th className="px-4 py-3">Ngày tạo</th>
              <th className="px-4 py-3">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {users.map((u) => (
              <tr key={u.id} className={`hover:bg-slate-50 ${u.is_deleted ? "bg-red-50/60 opacity-75" : ""}`}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="relative size-9 shrink-0">
                      <div className="size-9 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-xs font-bold ring-2 ring-slate-100">
                        {u.name
                          ? u.name.split(" ").filter(Boolean).slice(-2).map((w: string) => w[0].toUpperCase()).join("")
                          : u.email?.[0]?.toUpperCase() ?? "?"}
                      </div>
                      {u.avatar_url && (
                        <img
                          src={u.avatar_url}
                          alt={u.name}
                          className="absolute inset-0 size-9 rounded-full object-cover ring-2 ring-slate-100"
                          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                        />
                      )}
                    </div>
                    <div className="leading-tight">
                      <p className="font-semibold text-slate-900">{u.name || "(Chưa đặt tên)"}</p>
                      {u.is_deleted ? (
                        <span className="text-xs text-red-500 font-medium">✕ Đã xóa</span>
                      ) : u.is_verified ? (
                        <span className="text-xs text-green-600">✓ Đã xác thực</span>
                      ) : (
                        <span className="text-xs text-amber-600">○ Chưa xác thực</span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-700">{u.email}</td>
                <td className="px-4 py-3 text-slate-700">{u.phone || "—"}</td>
                <td className="px-4 py-3">
                  {u.is_deleted ? (
                    <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-600">Đã xóa</span>
                  ) : u.is_active ? (
                    <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">Active</span>
                  ) : (
                    <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">Blocked</span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">
                  {new Date(u.created_at).toLocaleDateString("vi-VN")}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {u.is_deleted ? (
                      <button
                        title="Khôi phục user"
                        onClick={() => handleRestoreUser(u)}
                        disabled={submitting}
                        className="inline-flex items-center justify-center size-8 rounded-lg border border-emerald-300 bg-white text-emerald-600 hover:border-emerald-500 hover:bg-emerald-50 transition-colors disabled:opacity-50"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      </button>
                    ) : (
                      <>
                        <button
                          title="Chỉnh sửa"
                          onClick={() => handleOpenEdit(u)}
                          className="inline-flex items-center justify-center size-8 rounded-lg border border-slate-200 bg-white text-slate-500 hover:border-primary-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>

                        {currentUser?.id !== u.id && (
                          <>
                            <button
                              title={u.is_active ? "Block user" : "Unblock user"}
                              onClick={() => handleToggleStatus(u)}
                              disabled={submitting}
                              className={`inline-flex items-center justify-center size-8 rounded-lg border transition-colors disabled:opacity-50 ${
                                u.is_active
                                  ? "border-amber-200 bg-white text-amber-500 hover:border-amber-400 hover:bg-amber-50"
                                  : "border-green-200 bg-white text-green-500 hover:border-green-400 hover:bg-green-50"
                              }`}
                            >
                              {u.is_active ? (
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
                              title="Xóa user"
                              onClick={() => handleDeleteUser(u)}
                              disabled={submitting}
                              className="inline-flex items-center justify-center size-8 rounded-lg border border-red-200 bg-white text-red-500 hover:border-red-400 hover:bg-red-50 transition-colors disabled:opacity-50"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </>
                        )}
                        {currentUser?.id === u.id && (
                          <span className="text-xs text-amber-600">(Bạn)</span>
                        )}
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {users.length === 0 && !loading && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-sm text-slate-500">
                  Không có người dùng
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
          </tbody>
        </table>
        </div>
        <div className="px-4">          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={(page) => { setCurrentPage(page); load(searchQuery, page); }}
            totalItems={totalItems}
            itemsPerPage={ITEMS_PER_PAGE}
          />
        </div>
      </div>

      {/* Create User Modal */}
      {showModal && ReactDOM.createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div
            className="relative w-full max-w-md rounded-2xl p-6 shadow-2xl overflow-hidden"
            style={{
              background: "rgba(15,23,42,0.85)",
              backdropFilter: "blur(40px) saturate(180%)",
              WebkitBackdropFilter: "blur(40px) saturate(180%)",
              border: "1px solid rgba(255,255,255,0.12)",
              boxShadow: "0 32px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.12)",
            }}
          >
            <div className="h-0.5 w-full absolute top-0 left-0 right-0" style={{ background: "linear-gradient(90deg, #6366f1, #8b5cf6, #06b6d4)" }} />
            <h2 className="mb-5 mt-2 text-xl font-bold text-white/95">Tạo người dùng mới</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {formErrors.general && (
                <p className="!text-[#f87171]" style={{ fontSize: 12, marginBottom: 4 }}>{formErrors.general}</p>
              )}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-white/80">Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="user@example.com"
                  className={`w-full rounded-lg border bg-white/[0.08] px-4 py-2 text-sm text-white/90 placeholder-white/30 outline-none transition focus:ring-2 focus:ring-primary-500/20 ${formErrors.email ? "border-red-400 focus:border-red-400" : "border-white/[0.15] focus:border-primary-500"}`}
                />
                {formErrors.email && <p className="!text-[#f87171]" style={{ fontSize: 11, marginTop: 4 }}>{formErrors.email}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-white/80">Mật khẩu *</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                  className={`w-full rounded-lg border bg-white/[0.08] px-4 py-2 text-sm text-white/90 placeholder-white/30 outline-none transition focus:ring-2 focus:ring-primary-500/20 ${formErrors.password ? "border-red-400 focus:border-red-400" : "border-white/[0.15] focus:border-primary-500"}`}
                />                {formErrors.password && <p className="!text-[#f87171]" style={{ fontSize: 11, marginTop: 4 }}>{formErrors.password}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-white/80">Họ tên</label>
                <input
                  type="text"
                  value={formData.name || ""}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nguyễn Văn A"
                  className={`w-full rounded-lg border bg-white/[0.08] px-4 py-2 text-sm text-white/90 placeholder-white/30 outline-none transition focus:ring-2 focus:ring-primary-500/20 ${formErrors.name ? "border-red-400 focus:border-red-400" : "border-white/[0.15] focus:border-primary-500"}`}
                />
                {formErrors.name && <p className="!text-[#f87171]" style={{ fontSize: 11, marginTop: 4 }}>{formErrors.name}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-white/80">Số điện thoại</label>
                <input
                  type="tel"
                  value={formData.phone || ""}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="0938947221"
                  className={`w-full rounded-lg border bg-white/[0.08] px-4 py-2 text-sm text-white/90 placeholder-white/30 outline-none transition focus:ring-2 focus:ring-primary-500/20 ${formErrors.phone ? "border-red-400 focus:border-red-400" : "border-white/[0.15] focus:border-primary-500"}`}
                />
                {formErrors.phone && <p className="!text-[#f87171]" style={{ fontSize: 11, marginTop: 4 }}>{formErrors.phone}</p>}
              </div>              <div className="space-y-2">
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
              </div>              <div className="flex gap-3 pt-2">
                <Button type="submit" loading={submitting} disabled={submitting || avatarUploading} className="flex-1">
                  Tạo mới
                </Button>
                <Button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={submitting}
                  className="flex-1 bg-slate-700 border border-slate-600 text-white hover:bg-slate-600"
                >
                  Hủy
                </Button>
              </div>
            </form>
          </div>
        </div>
      , document.body)}

      {/* Edit / Detail User Modal */}
      {editingUser && ReactDOM.createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setEditingUser(null)} />
          <div
            className="relative w-full max-w-md rounded-2xl p-6 shadow-2xl overflow-hidden"
            style={{
              background: "rgba(15,23,42,0.85)",
              backdropFilter: "blur(40px) saturate(180%)",
              WebkitBackdropFilter: "blur(40px) saturate(180%)",
              border: "1px solid rgba(255,255,255,0.12)",
              boxShadow: "0 32px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.12)",
            }}
          >
            <div className="h-0.5 w-full absolute top-0 left-0 right-0" style={{ background: "linear-gradient(90deg, #6366f1, #8b5cf6, #06b6d4)" }} />
            <h2 className="mb-5 mt-2 text-xl font-bold text-white/95">Chi tiết người dùng</h2>

            <div className="space-y-4">
              {/* Avatar & basic info */}
              <div className="flex items-center gap-4 rounded-xl bg-white/[0.06] p-4">
                <img
                  src={editingUser.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${editingUser.email}`}
                  alt={editingUser.name}
                  className="size-14 rounded-full object-cover ring-2 ring-primary-200"
                />
                <div className="leading-tight">
                  <p className="font-semibold text-white/95">{editingUser.name || "(Chưa đặt tên)"}</p>
                  <p className="text-sm text-white/50">{editingUser.email}</p>
                  <div className="mt-1 flex gap-2">
                    {editingUser.is_active ? (
                      <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-700">Active</span>
                    ) : (
                      <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">Blocked</span>
                    )}
                    {editingUser.is_verified ? (
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">Verified</span>
                    ) : (
                      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">Unverified</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-white/80">Email</label>
                <input
                  type="email"
                  disabled
                  value={editingUser.email}
                  className="w-full rounded-lg border border-white/[0.12] bg-white/[0.06] px-4 py-2 text-sm text-white/50 cursor-not-allowed"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-white/80">Họ tên</label>
                <input
                  type="text"
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  className="w-full rounded-lg border border-white/[0.15] bg-white/[0.08] px-4 py-2 text-sm text-white/90 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-white/80">Số điện thoại</label>
                <input
                  type="tel"
                  value={editingUser.phone}
                  onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })}
                  className="w-full rounded-lg border border-white/[0.15] bg-white/[0.08] px-4 py-2 text-sm text-white/90 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-white/80">Ngày tạo</label>
                <input
                  type="text"
                  disabled
                  value={new Date(editingUser.created_at).toLocaleString("vi-VN")}
                  className="w-full rounded-lg border border-white/[0.12] bg-white/[0.06] px-4 py-2 text-sm text-white/50 cursor-not-allowed"
                />
              </div>

              {updateError && (
                <p className="mb-3 rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 text-xs text-[#f87171]">{updateError}</p>
              )}
              <div className="flex flex-wrap gap-3 pt-2">
                <Button onClick={handleUpdateUser} loading={submitting} disabled={submitting} className="flex-1">
                  Cập nhật
                </Button>
                <Button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  disabled={submitting}
                  className="flex-1 bg-slate-700 border border-slate-600 text-white hover:bg-slate-600"
                >
                  Hủy
                </Button>
              </div>
            </div>
          </div>
        </div>
      , document.body)}
    </div>
  );
};

export default UserPage;

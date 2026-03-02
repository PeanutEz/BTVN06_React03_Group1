import { useEffect, useState } from "react";
import { Button } from "../../../components";
import { useAuthStore } from "../../../store";
import { createUser, deleteUser, fetchUsers, fetchUserById, updateUserProfile, fetchRoles } from "../../../services/user.service";
import type { ApiUser, CreateUserPayload, RoleSelectItem } from "../../../services/user.service";
import Pagination from "../../../components/ui/Pagination";
import { showSuccess, showError } from "../../../utils";

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
  const [editingUser, setEditingUser] = useState<ApiUser | null>(null);
  const [roles, setRoles] = useState<RoleSelectItem[]>([]);

  const loadRoles = async () => {
    try {
      const data = await fetchRoles();
      setRoles(data);
    } catch (error) {
      console.error("Lỗi tải danh sách role:", error);
    }
  };

  const load = async (keyword = searchQuery, page = currentPage) => {
    setLoading(true);
    try {
      const result = await fetchUsers(keyword, page, ITEMS_PER_PAGE);
      setUsers(result.pageData);
      setTotalPages(result.pageInfo.totalPages);
      setTotalItems(result.pageInfo.totalItems);
      setCurrentPage(result.pageInfo.pageNum);
    } catch {
      showError("Lấy danh sách người dùng thất bại");
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load("", 1); loadRoles(); }, []);

  const handleOpenModal = () => {
    setFormData({ ...DEFAULT_FORM });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {      await createUser(formData);
      showSuccess("Tạo người dùng thành công");
      setShowModal(false);
      await load(searchQuery, currentPage);
    } catch {
      showError("Tạo người dùng thất bại");
    } finally {
      setSubmitting(false);
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
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;
    setSubmitting(true);
    try {
      await updateUserProfile(editingUser.id, {
        name: editingUser.name,
        phone: editingUser.phone,
        avatar_url: editingUser.avatar_url,
      });
      showSuccess("Cập nhật thành công");
      setEditingUser(null);
      await load();
    } catch {
      showError("Cập nhật thất bại");
    } finally {
      setSubmitting(false);
    }
  };

  const handleBlock = async () => {
    if (!editingUser) return;
    if (!confirm(`Bạn có chắc muốn Block user "${editingUser.name}"?`)) return;
    setSubmitting(true);
    try {
      await deleteUser(editingUser.id);
      showSuccess(`Đã Block user "${editingUser.name}"`);
      setEditingUser(null);
      await load();
    } catch {
      showError("Block user thất bại");
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
          <p className="text-sm text-slate-600">Quản lý người dùng hệ thống</p>
        </div>
        <Button onClick={handleOpenModal}>+ Tạo người dùng</Button>
      </div>

      {/* Search bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"            placeholder="Tìm kiếm theo tên hoặc email..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            onKeyDown={(e) => { if (e.key === "Enter") load(searchQuery, 1); }}
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-4 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
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
              <tr key={u.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={u.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.email}`}
                      alt={u.name}
                      className="size-9 rounded-full object-cover"
                    />
                    <div className="leading-tight">
                      <p className="font-semibold text-slate-900">{u.name || "(Chưa đặt tên)"}</p>
                      {u.is_verified ? (
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
                  {u.is_active ? (
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
                    <Button variant="outline" size="sm" onClick={() => handleOpenEdit(u)}>
                      Chi tiết
                    </Button>
                    {currentUser?.id === u.id && (
                      <span className="text-xs text-amber-600">(Bạn)</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {users.length === 0 && !loading && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-sm text-slate-500">
                  Không có người dùng
                </td>
              </tr>
            )}
            {loading && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-sm text-slate-500">
                  Đang tải...
                </td>
              </tr>
            )}
          </tbody>
        </table>
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
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <h2 className="mb-5 text-xl font-bold text-slate-900">Tạo người dùng mới</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Email *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="user@example.com"
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Mật khẩu *</label>
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Họ tên</label>
                <input
                  type="text"
                  value={formData.name || ""}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nguyễn Văn A"
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Số điện thoại</label>
                <input
                  type="tel"
                  value={formData.phone || ""}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="0938947221"
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Avatar URL</label>
                <input
                  type="url"
                  value={formData.avatar_url || ""}
                  onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })}
                  placeholder="https://picsum.photos/id/237/200/300"
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Vai trò</label>
                <select
                  value={formData.role_id || ""}
                  onChange={(e) => setFormData({ ...formData, role_id: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                >
                  <option value="">-- Chọn vai trò --</option>
                  {roles.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.name} ({role.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="submit" loading={submitting} disabled={submitting} className="flex-1">
                  Tạo mới
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowModal(false)}
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

      {/* Edit / Detail User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <h2 className="mb-5 text-xl font-bold text-slate-900">Chi tiết người dùng</h2>

            <div className="space-y-4">
              {/* Avatar & basic info */}
              <div className="flex items-center gap-4 rounded-xl bg-slate-50 p-4">
                <img
                  src={editingUser.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${editingUser.email}`}
                  alt={editingUser.name}
                  className="size-14 rounded-full object-cover ring-2 ring-primary-200"
                />
                <div className="leading-tight">
                  <p className="font-semibold text-slate-900">{editingUser.name || "(Chưa đặt tên)"}</p>
                  <p className="text-sm text-slate-500">{editingUser.email}</p>
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
                <label className="text-sm font-semibold text-slate-700">Email</label>
                <input
                  type="email"
                  disabled
                  value={editingUser.email}
                  className="w-full rounded-lg border border-slate-200 bg-slate-100 px-4 py-2 text-sm text-slate-500 cursor-not-allowed"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Họ tên</label>
                <input
                  type="text"
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Số điện thoại</label>
                <input
                  type="tel"
                  value={editingUser.phone}
                  onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Ngày tạo</label>
                <input
                  type="text"
                  disabled
                  value={new Date(editingUser.created_at).toLocaleString("vi-VN")}
                  className="w-full rounded-lg border border-slate-200 bg-slate-100 px-4 py-2 text-sm text-slate-500 cursor-not-allowed"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button onClick={handleUpdateUser} loading={submitting} disabled={submitting} className="flex-1">
                  Cập nhật
                </Button>
                <button
                  type="button"
                  onClick={handleBlock}
                  disabled={submitting}
                  className="flex-1 rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-50"
                >
                  🚫 Block
                </button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingUser(null)}
                  disabled={submitting}
                  className="flex-1"
                >
                  Hủy
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserPage;

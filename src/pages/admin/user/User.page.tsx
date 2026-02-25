import { useEffect, useState } from "react";
import { Button } from "../../../components";
import type { User } from "../../../models";
import { ROLE } from "../../../models/role.model";
import { useAuthStore } from "../../../store";
import { createUser, deleteUser, fetchUsers } from "../../../services/user.service";
import Pagination from "../../../components/ui/Pagination";
import { showSuccess, showError } from "../../../utils";

const ITEMS_PER_PAGE = 10;

const DEFAULT_FORM = {
  name: "",
  email: "",
  password: "",
  role: ROLE.USER as User["role"],
  avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=default",
};

const UserPage = () => {
  const { user: currentUser } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ ...DEFAULT_FORM });
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchUsers();
      setUsers(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleOpenModal = () => {
    setFormData({ ...DEFAULT_FORM });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createUser(formData);
      showSuccess("Tạo người dùng thành công");
      setShowModal(false);
      await load();
    } catch {
      showError("Tạo người dùng thất bại");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc muốn xóa user này?")) return;
    await deleteUser(id);
    await load();
  };

  const totalPages = Math.ceil(users.length / ITEMS_PER_PAGE);
  const paginatedUsers = users.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
          <p className="text-sm text-slate-600">Dữ liệu từ mock API /users</p>
        </div>
        <Button onClick={handleOpenModal}>+ Tạo người dùng</Button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
            <tr>
              <th className="px-4 py-3">Tên</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Ngày tạo</th>
              <th className="px-4 py-3">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {paginatedUsers.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <img src={u.avatar} alt={u.name} className="size-9 rounded-full object-cover" />
                    <div className="leading-tight">
                      <p className="font-semibold text-slate-900">{u.name}</p>
                      <p className="text-xs text-slate-500">{u.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-700">{u.email}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700">{u.role}</span>
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">{new Date(u.createDate).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleDelete(u.id)} disabled={loading}>
                      Xóa
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
                <td colSpan={5} className="px-4 py-6 text-center text-sm text-slate-500">
                  Không có người dùng
                </td>
              </tr>
            )}
            {loading && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-sm text-slate-500">
                  Đang tải...
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <div className="px-4">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={users.length}
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
                <label className="text-sm font-semibold text-slate-700">Họ tên *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nguyễn Văn A"
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                />
              </div>

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
                <label className="text-sm font-semibold text-slate-700">Vai trò *</label>
                <select
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({ ...formData, role: e.target.value as User["role"] })
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                >
                  <option value="User">User</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Avatar URL</label>
                <input
                  type="url"
                  value={formData.avatar}
                  onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
                  placeholder="https://..."
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                />
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
    </div>
  );
};

export default UserPage;

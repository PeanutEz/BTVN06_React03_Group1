import { useEffect, useState } from "react";
import { Button, Pagination } from "../../../components";
import type { User } from "../../../models";
import type { Role } from "../../../models/role.model";
import { useAuthStore } from "../../../store";
import { fetchUsers, createUser, updateUserProfile } from "../../../services/user.service";

const PAGE_SIZE = 10;

const ROLES: Role[] = ["Admin", "User", "Manager" as Role];

type UserFormData = {
  name: string;
  email: string;
  password: string;
  role: Role;
  avatar: string;
};

const defaultForm: UserFormData = {
  name: "",
  email: "",
  password: "",
  role: "User",
  avatar: "",
};

const UserPage = () => {  const { user: currentUser } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<UserFormData>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<UserFormData>>({});

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

  const openCreate = () => {
    setEditingUser(null);
    setFormData(defaultForm);
    setErrors({});
    setShowModal(true);
  };

  const openUpdate = (u: User) => {
    setEditingUser(u);
    setFormData({
      name: u.name,
      email: u.email,
      password: "",
      role: u.role,
      avatar: u.avatar ?? "",
    });
    setErrors({});
    setShowModal(true);
  };

  const validate = (): boolean => {
    const errs: Partial<UserFormData> = {};
    if (!formData.name.trim()) errs.name = "Vui lòng nhập tên";
    if (!formData.email.trim()) errs.email = "Vui lòng nhập email";
    else if (!/\S+@\S+\.\S+/.test(formData.email)) errs.email = "Email không hợp lệ";
    if (!editingUser && !formData.password.trim()) errs.password = "Vui lòng nhập mật khẩu";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      if (editingUser) {
        const payload: Partial<User> = {
          name: formData.name,
          email: formData.email,
          role: formData.role,
          avatar: formData.avatar,
          ...(formData.password ? { password: formData.password } : {}),
        };
        await updateUserProfile(editingUser.id, payload);
      } else {
        await createUser({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          role: formData.role,
          avatar: formData.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${formData.name}`,
          createDate: new Date().toISOString(),
          updateDate: new Date().toISOString(),
        });
      }
      setShowModal(false);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const pagedUsers = users
    .filter((u) => u.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const filteredTotal = users.filter((u) =>
    u.name.toLowerCase().includes(searchQuery.toLowerCase())
  ).length;

  return (
    <div className="space-y-6">      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
          <p className="text-sm text-slate-600">Dữ liệu từ mock API /users</p>
        </div>
        <Button onClick={openCreate}>+ Tạo User</Button>
      </div>

      {/* Search bar */}
      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <svg className="size-5 flex-shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
        </svg>
        <input
          type="text"
          placeholder="Tìm kiếm theo tên người dùng..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setCurrentPage(1);
          }}
          className="flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
        />
        {searchQuery && (
          <button
            onClick={() => { setSearchQuery(""); setCurrentPage(1); }}
            className="flex size-6 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
        {searchQuery && (
          <span className="text-xs text-slate-500">
            {filteredTotal} kết quả
          </span>
        )}
      </div>

      {/* Table */}
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
            {pagedUsers.map((u) => (
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
                  <span className="rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700">
                    {u.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">
                  {new Date(u.createDate).toLocaleDateString("vi-VN")}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => openUpdate(u)} disabled={loading}>
                      Update
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
        </table>        <Pagination
          currentPage={currentPage}
          totalItems={filteredTotal}
          pageSize={PAGE_SIZE}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* Create / Update Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl">
            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h2 className="text-lg font-bold text-slate-900">
                {editingUser ? "Cập nhật User" : "Tạo User mới"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="flex size-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              >
                <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal body */}
            <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
              {/* Avatar preview */}
              {editingUser && (
                <div className="flex items-center gap-4 rounded-xl bg-slate-50 p-4">
                  <img
                    src={formData.avatar || editingUser.avatar}
                    alt={formData.name}
                    className="size-14 rounded-full object-cover ring-2 ring-primary-200"
                  />
                  <div>
                    <p className="font-semibold text-slate-900">{editingUser.name}</p>
                    <p className="text-xs text-slate-500">ID: {editingUser.id}</p>
                  </div>
                </div>
              )}

              {/* Name */}
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700">
                  Họ tên <span className="text-primary-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nhập họ tên"
                  className={`w-full rounded-lg border px-4 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-primary-500/20 ${errors.name ? "border-red-400 focus:border-red-400" : "border-slate-300 focus:border-primary-500"}`}
                />
                {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
              </div>

              {/* Email */}
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700">
                  Email <span className="text-primary-500">*</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="example@email.com"
                  className={`w-full rounded-lg border px-4 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-primary-500/20 ${errors.email ? "border-red-400 focus:border-red-400" : "border-slate-300 focus:border-primary-500"}`}
                />
                {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
              </div>

              {/* Password */}
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700">
                  Mật khẩu {!editingUser && <span className="text-primary-500">*</span>}
                  {editingUser && <span className="ml-1 text-xs font-normal text-slate-400">(bỏ trống nếu không đổi)</span>}
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder={editingUser ? "••••••••" : "Nhập mật khẩu"}
                  className={`w-full rounded-lg border px-4 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-primary-500/20 ${errors.password ? "border-red-400 focus:border-red-400" : "border-slate-300 focus:border-primary-500"}`}
                />
                {errors.password && <p className="text-xs text-red-500">{errors.password}</p>}
              </div>

              {/* Role */}
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700">Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as Role })}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              {/* Avatar URL */}
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700">Avatar URL</label>
                <input
                  type="text"
                  value={formData.avatar}
                  onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
                  placeholder="https://..."
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowModal(false)}
                  disabled={saving}
                  className="flex-1"
                >
                  Hủy
                </Button>
                <Button type="submit" loading={saving} disabled={saving} className="flex-1">
                  {editingUser ? "Lưu thay đổi" : "Tạo mới"}
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

import { useEffect, useRef, useState } from "react";
import { Button } from "../../../components";
import { useAuthStore } from "../../../store";
import { createUser, deleteUser, fetchUsers, fetchUserById, updateUserProfile, fetchRoles, changeUserStatus } from "../../../services/user.service";
import type { ApiUser, CreateUserPayload, RoleSelectItem } from "../../../services/user.service";
import { createUserFranchiseRole, searchUserFranchiseRoles, updateUserFranchiseRole } from "../../../services/user-franchise-role.service";
import type { CreateUserFranchiseRolePayload, UserFranchiseRole } from "../../../services/user-franchise-role.service";
import { fetchFranchiseSelect } from "../../../services/store.service";
import type { FranchiseSelectItem } from "../../../services/store.service";
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
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [editingUser, setEditingUser] = useState<ApiUser | null>(null);
  const [roles, setRoles] = useState<RoleSelectItem[]>([]);
  const [franchises, setFranchises] = useState<FranchiseSelectItem[]>([]);

  // Set Role modal state
  const [setRoleUser, setSetRoleUser] = useState<ApiUser | null>(null);
  const [setRoleForm, setSetRoleForm] = useState<CreateUserFranchiseRolePayload>({
    user_id: "",
    role_id: "",
    franchise_id: null,
    note: "",
  });
  const [setRoleSubmitting, setSetRoleSubmitting] = useState(false);
  const [existingUserRoles, setExistingUserRoles] = useState<UserFranchiseRole[]>([]);
  const [loadingExistingRoles, setLoadingExistingRoles] = useState(false);
  const [updatingRoleId, setUpdatingRoleId] = useState<string | null>(null);
  const [updateRoleMap, setUpdateRoleMap] = useState<Record<string, string>>({});

  const hasRun = useRef(false);

  const loadRoles = async () => {
    try {
      const data = await fetchRoles();
      setRoles(data);
    } catch (error) {
      console.error("Lỗi tải danh sách role:", error);
    }
  };

  const loadFranchises = async () => {
    try {
      const data = await fetchFranchiseSelect();
      setFranchises(data);
    } catch (error) {
      console.error("Lỗi tải danh sách franchise:", error);
    }
  };

  const load = async (keyword = searchQuery, page = currentPage, status = statusFilter) => {
    console.log("[User.page] load() called with keyword:", keyword, "page:", page, "status:", status);
    setLoading(true);
    try {
      const isActive = status === "true" ? true : status === "false" ? false : "";
      const result = await fetchUsers(keyword, page, ITEMS_PER_PAGE, isActive);
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
    load("", 1); loadRoles(); loadFranchises();
  }, []);

  const handleOpenSetRole = async (u: ApiUser) => {
    setSetRoleUser(u);
    setSetRoleForm({ user_id: u.id, role_id: "", franchise_id: null, note: "" });
    setExistingUserRoles([]);
    setUpdateRoleMap({});
    setLoadingExistingRoles(true);
    try {
      const result = await searchUserFranchiseRoles({
        searchCondition: { user_id: u.id, is_deleted: false },
        pageInfo: { pageNum: 1, pageSize: 50 },
      });
      setExistingUserRoles(result.data);
      const map: Record<string, string> = {};
      result.data.forEach((r) => { map[r.id] = r.role_id; });
      setUpdateRoleMap(map);
    } catch {
      // ignore
    } finally {
      setLoadingExistingRoles(false);
    }
  };

  const handleUpdateRole = async (existingRole: UserFranchiseRole) => {
    const newRoleId = updateRoleMap[existingRole.id];
    if (!newRoleId) { showError("Vui lòng chọn role"); return; }
    setUpdatingRoleId(existingRole.id);
    try {
      await updateUserFranchiseRole(existingRole.id, { role_id: newRoleId });
      showSuccess("Cập nhật role thành công");
      setExistingUserRoles((prev) =>
        prev.map((r) => r.id === existingRole.id ? { ...r, role_id: newRoleId } : r)
      );
    } catch (err: unknown) {
      const apiMessage =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        || (err instanceof Error ? err.message : null)
        || "Cập nhật role thất bại";
      showError(apiMessage);
    } finally {
      setUpdatingRoleId(null);
    }
  };

  const handleSetRoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!setRoleForm.role_id) { showError("Vui lòng chọn role"); return; }
    setSetRoleSubmitting(true);
    try {
      await createUserFranchiseRole(setRoleForm);
      showSuccess("Set role cho user thành công");
      setSetRoleUser(null);
    } catch (err: unknown) {
      const apiMessage =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        || (err instanceof Error ? err.message : null)
        || "Set role thất bại";
      showError(apiMessage);
    } finally {
      setSetRoleSubmitting(false);
    }
  };

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

  const handleDeleteUser = async (u: ApiUser) => {
    if (!confirm(`Bạn có chắc muốn XÓA VĨNH VIỄN user "${u.name}"? Hành động này không thể hoàn tác.`)) return;
    setSubmitting(true);
    try {
      await deleteUser(u.id);
      showSuccess(`Đã xóa user "${u.name}"`);
      await load();
    } catch {
      showError("Xóa user thất bại");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (u: ApiUser) => {
    const action = u.is_active ? "Block" : "Unblock";
    if (!confirm(`Bạn có chắc muốn ${action} user "${u.name}"?`)) return;
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
              onKeyDown={(e) => { if (e.key === "Enter") load(searchQuery, 1, statusFilter); }}
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-4 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); load(searchQuery, 1, e.target.value); }}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="true">Active</option>
            <option value="false">Blocked</option>
          </select>
          <Button onClick={() => load(searchQuery, 1, statusFilter)} loading={loading}>
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
              <th className="px-4 py-3">Set Role</th>
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
                  <button
                    onClick={() => handleOpenSetRole(u)}
                    className="rounded-lg border border-primary-300 bg-primary-50 px-3 py-1.5 text-xs font-semibold text-primary-600 transition hover:bg-primary-100"
                  >
                    Set Role
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
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

      {/* Set Role Modal */}
      {setRoleUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            {/* Header */}
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Set Role</h2>
                <p className="mt-0.5 text-sm text-slate-500">Gán role cho user vào franchise / system</p>
              </div>
              <button
                onClick={() => setSetRoleUser(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* User info badge */}
            <div className="mb-5 flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3">
              <img
                src={setRoleUser.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${setRoleUser.email}`}
                alt={setRoleUser.name}
                className="size-10 rounded-full object-cover ring-2 ring-primary-200"
              />
              <div className="leading-tight">
                <p className="font-semibold text-slate-900">{setRoleUser.name || "(Chưa đặt tên)"}</p>
                <p className="text-xs text-slate-500">{setRoleUser.email}</p>
              </div>
            </div>

            {/* Existing roles */}
            {loadingExistingRoles && (
              <div className="mb-4 flex items-center gap-2 text-sm text-slate-500">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
                Đang kiểm tra role hiện tại...
              </div>
            )}
            {!loadingExistingRoles && existingUserRoles.length > 0 && (
              <div className="mb-5 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Roles đã gán</p>
                {existingUserRoles.map((er) => (
                  <div key={er.id} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-500 truncate">
                        {er.franchise_name ? `${er.franchise_name} (${er.franchise_code})` : "System (Global)"}
                      </p>
                    </div>
                    <select
                      value={updateRoleMap[er.id] ?? er.role_id}
                      onChange={(e) => setUpdateRoleMap((m) => ({ ...m, [er.id]: e.target.value }))}
                      className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs outline-none focus:border-primary-500"
                    >
                      {roles.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.name} ({r.code})
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => handleUpdateRole(er)}
                      disabled={updatingRoleId === er.id}
                      className="shrink-0 rounded-lg bg-blue-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-600 disabled:opacity-60"
                    >
                      {updatingRoleId === er.id ? "..." : "Cập nhật"}
                    </button>
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={handleSetRoleSubmit} className="space-y-4">
              {/* Role */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">
                  Role <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={setRoleForm.role_id}
                  onChange={(e) => {
                    const selectedRole = roles.find((r) => r.value === e.target.value);
                    const isGlobal = selectedRole?.scope === "GLOBAL";
                    setSetRoleForm((f) => ({
                      ...f,
                      role_id: e.target.value,
                      franchise_id: isGlobal ? null : f.franchise_id,
                    }));
                  }}
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                >
                  <option value="">-- Chọn role --</option>
                  {roles.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.name} ({r.code}) — {r.scope}
                    </option>
                  ))}
                </select>
              </div>

              {/* Franchise */}
              {(() => {
                const selectedRole = roles.find((r) => r.value === setRoleForm.role_id);
                const isGlobal = selectedRole?.scope === "GLOBAL";
                return (
                  <div className="space-y-1.5">
                    <label className={`text-sm font-semibold ${isGlobal ? "text-slate-400" : "text-slate-700"}`}>
                      Franchise
                    </label>

                    <select
                      value={setRoleForm.franchise_id ?? ""}
                      onChange={(e) =>
                        setSetRoleForm((f) => ({ ...f, franchise_id: e.target.value || null }))
                      }
                      className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                    >
                      <option value="">-- System (không chọn franchise) --</option>
                      {franchises.map((fr) => (
                        <option key={fr.value} value={fr.value}>
                          {fr.name} ({fr.code})
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })()}

              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  disabled={setRoleSubmitting}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-600 disabled:opacity-60"
                >
                  {setRoleSubmitting && (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  )}
                  {setRoleSubmitting ? "Đang lưu..." : "Xác nhận"}
                </button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSetRoleUser(null)}
                  disabled={setRoleSubmitting}
                  className="flex-1"
                >
                  Hủy
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

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

              <div className="flex flex-wrap gap-3 pt-2">
                <Button onClick={handleUpdateUser} loading={submitting} disabled={submitting} className="flex-1">
                  Cập nhật
                </Button>
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

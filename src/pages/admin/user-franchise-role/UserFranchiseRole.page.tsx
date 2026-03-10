import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "../../../components";
import Pagination from "../../../components/ui/Pagination";
import { fetchFranchiseSelect } from "../../../services/store.service";
import type { FranchiseSelectItem } from "../../../services/store.service";
import { fetchRoles, fetchUsers } from "../../../services/user.service";
import type { ApiUser, RoleSelectItem } from "../../../services/user.service";
import {
  createUserFranchiseRole,
  deleteUserFranchiseRole,
  getUserFranchiseRoleById,
  getUserFranchiseRolesByUserId,
  restoreUserFranchiseRole,
  searchUserFranchiseRoles,
  updateUserFranchiseRole,
} from "../../../services/user-franchise-role.service";
import type {
  CreateUserFranchiseRolePayload,
  SearchUserFranchiseRolePayload,
  UserFranchiseRole,
} from "../../../services/user-franchise-role.service";
import { showError, showSuccess } from "../../../utils";

const ITEMS_PER_PAGE = 10;

const DEFAULT_CREATE_FORM: CreateUserFranchiseRolePayload = {
  user_id: "",
  role_id: "",
  franchise_id: null,
  note: "",
};

export default function UserFranchiseRolePage() {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<UserFranchiseRole[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const [roles, setRoles] = useState<RoleSelectItem[]>([]);
  const [franchises, setFranchises] = useState<FranchiseSelectItem[]>([]);
  const [users, setUsers] = useState<ApiUser[]>([]);

  const [filters, setFilters] = useState<{
    user_id: string;
    franchise_id: string;
    role_id: string;
    is_deleted: boolean;
  }>({
    user_id: "",
    franchise_id: "",
    role_id: "",
    is_deleted: false,
  });

  const hasRun = useRef(false);

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<CreateUserFranchiseRolePayload>({
    ...DEFAULT_CREATE_FORM,
  });
  const [creating, setCreating] = useState(false);

  // Detail modal
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detail, setDetail] = useState<UserFranchiseRole | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Update modal
  const [editing, setEditing] = useState<UserFranchiseRole | null>(null);
  const [updating, setUpdating] = useState(false);
  const [editRoleId, setEditRoleId] = useState("");
  const [editNote, setEditNote] = useState("");

  // Quick lookup by userId (API-07)
  const [lookupUserId, setLookupUserId] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupResult, setLookupResult] = useState<UserFranchiseRole[] | null>(
    null,
  );

  const filteredUsers = useMemo(() => users, [users]);

  const buildSearchPayload = (pageNum: number): SearchUserFranchiseRolePayload => {
    const franchiseId =
      filters.franchise_id === "__GLOBAL__"
        ? null
        : filters.franchise_id || undefined;
    return {
      searchCondition: {
        user_id: filters.user_id || undefined,
        franchise_id: franchiseId,
        role_id: filters.role_id || undefined,
        is_deleted: filters.is_deleted,
      },
      pageInfo: { pageNum, pageSize: ITEMS_PER_PAGE },
    };
  };

  const loadSelects = async () => {
    try {
      const [roleList, franchiseList, userList] = await Promise.all([
        fetchRoles(),
        fetchFranchiseSelect(),
        fetchUsers("", 1, 200, ""),
      ]);
      setRoles(roleList);
      setFranchises(franchiseList);
      setUsers(userList.pageData);
    } catch (err) {
      console.error("[UserFranchiseRole] loadSelects error:", err);
      // Non-blocking
    }
  };

  const load = async (pageNum = currentPage) => {
    setLoading(true);
    try {
      const result = await searchUserFranchiseRoles(buildSearchPayload(pageNum));
      setItems(result.data);
      setCurrentPage(result.pageInfo.pageNum);
      setTotalPages(result.pageInfo.totalPages);
      setTotalItems(result.pageInfo.totalItems);
    } catch (err) {
      console.error("[UserFranchiseRole] search error:", err);
      showError("Tải danh sách user-franchise-role thất bại");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;
    loadSelects();
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openCreate = () => {
    setCreateForm({ ...DEFAULT_CREATE_FORM });
    setShowCreate(true);
  };

  const submitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.user_id || !createForm.role_id) {
      showError("Vui lòng chọn user và role");
      return;
    }
    setCreating(true);
    try {
      await createUserFranchiseRole(createForm);
      showSuccess("Tạo role cho user thành công");
      setShowCreate(false);
      await load(1);
    } catch (err: unknown) {
      const apiMessage =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ||
        (err instanceof Error ? err.message : null) ||
        "Tạo thất bại";
      showError(apiMessage);
    } finally {
      setCreating(false);
    }
  };

  const openDetail = async (id: string) => {
    setDetailId(id);
    setDetail(null);
    setLoadingDetail(true);
    try {
      const d = await getUserFranchiseRoleById(id);
      setDetail(d);
    } catch (err) {
      console.error("[UserFranchiseRole] get detail error:", err);
      showError("Lấy chi tiết thất bại");
    } finally {
      setLoadingDetail(false);
    }
  };

  const openEdit = (it: UserFranchiseRole) => {
    setEditing(it);
    setEditRoleId(it.role_id);
    setEditNote(it.note || "");
  };

  const submitUpdate = async () => {
    if (!editing) return;
    if (!editRoleId) {
      showError("Vui lòng chọn role");
      return;
    }
    setUpdating(true);
    try {
      await updateUserFranchiseRole(editing.id, {
        role_id: editRoleId,
        note: editNote,
      });
      showSuccess("Cập nhật thành công");
      setEditing(null);
      await load(currentPage);
    } catch (err: unknown) {
      const apiMessage =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ||
        (err instanceof Error ? err.message : null) ||
        "Cập nhật thất bại";
      showError(apiMessage);
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async (it: UserFranchiseRole) => {
    if (!confirm("Bạn có chắc muốn xóa record này?")) return;
    try {
      await deleteUserFranchiseRole(it.id);
      showSuccess("Đã xóa");
      await load(currentPage);
    } catch (err: unknown) {
      showError(err instanceof Error ? err.message : "Xóa thất bại");
    }
  };

  const handleRestore = async (it: UserFranchiseRole) => {
    if (!confirm("Khôi phục record này?")) return;
    try {
      await restoreUserFranchiseRole(it.id);
      showSuccess("Đã khôi phục");
      await load(currentPage);
    } catch (err: unknown) {
      showError(err instanceof Error ? err.message : "Khôi phục thất bại");
    }
  };

  const handleLookupByUserId = async () => {
    if (!lookupUserId.trim()) {
      showError("Nhập userId để tra cứu");
      return;
    }
    setLookupLoading(true);
    setLookupResult(null);
    try {
      const res = await getUserFranchiseRolesByUserId(lookupUserId.trim());
      setLookupResult(res);
    } catch (err: unknown) {
      showError(err instanceof Error ? err.message : "Tra cứu thất bại");
    } finally {
      setLookupLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
            User Franchise Roles
          </h1>
          <p className="text-xs text-slate-600 sm:text-sm">
            Quản lý quan hệ user ↔ franchise ↔ role
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => load(1)} loading={loading}>
            Tải lại
          </Button>
          <Button onClick={openCreate}>+ Tạo mới</Button>
        </div>
      </div>

      {/* Search / Filters */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              User
            </label>
            <select
              value={filters.user_id}
              onChange={(e) => {
                setFilters((f) => ({ ...f, user_id: e.target.value }));
                setCurrentPage(1);
              }}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
            >
              <option value="">-- Tất cả user --</option>
              {filteredUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name ? `${u.name} (${u.email})` : u.email}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Franchise
            </label>
            <select
              value={filters.franchise_id}
              onChange={(e) => {
                setFilters((f) => ({ ...f, franchise_id: e.target.value }));
                setCurrentPage(1);
              }}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
            >
              <option value="">-- Tất cả franchise --</option>
              <option value="__GLOBAL__">System (Global)</option>
              {franchises.map((fr) => (
                <option key={fr.value} value={fr.value}>
                  {fr.name} ({fr.code})
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-400">
              “System (Global)” sẽ map sang franchise_id = null khi search.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Role
            </label>
            <select
              value={filters.role_id}
              onChange={(e) => {
                setFilters((f) => ({ ...f, role_id: e.target.value }));
                setCurrentPage(1);
              }}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
            >
              <option value="">-- Tất cả role --</option>
              {roles.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.name} ({r.code}) — {r.scope}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Trạng thái
            </label>
            <div className="flex items-center gap-2">
              <label className="flex flex-1 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={filters.is_deleted}
                  onChange={(e) => {
                    setFilters((f) => ({ ...f, is_deleted: e.target.checked }));
                    setCurrentPage(1);
                  }}
                />
                Hiện record đã xóa
              </label>
              <Button
                onClick={() => load(1)}
                loading={loading}
                className="shrink-0"
              >
                Tìm
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Lookup by userId */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900">
              Tra cứu theo userId (API-07)
            </p>
            <p className="text-xs text-slate-500">
              Dùng endpoint `GET /api/user-franchise-roles/user/:userId`
            </p>
          </div>
          <div className="flex w-full gap-2 sm:w-auto">
            <input
              value={lookupUserId}
              onChange={(e) => setLookupUserId(e.target.value)}
              placeholder="Nhập userId…"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 sm:w-[320px]"
            />
            <Button
              variant="outline"
              onClick={handleLookupByUserId}
              loading={lookupLoading}
            >
              Tra cứu
            </Button>
          </div>
        </div>

        {lookupResult && (
          <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
            <div className="bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Kết quả ({lookupResult.length})
            </div>
            <div className="divide-y divide-slate-100">
              {lookupResult.map((r) => (
                <div
                  key={r.id}
                  className="flex flex-col gap-1 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">
                      {r.franchise_name
                        ? `${r.franchise_name} (${r.franchise_code})`
                        : "System (Global)"}
                    </p>
                    <p className="text-xs text-slate-500">
                      Role: {r.role_name} ({r.role_code}) • Record:{" "}
                      <span className="font-mono">{r.id}</span>
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openDetail(r.id)}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-primary-400 hover:bg-primary-50 hover:text-primary-700"
                    >
                      Chi tiết
                    </button>
                    <button
                      onClick={() => openEdit(r)}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-primary-400 hover:bg-primary-50 hover:text-primary-700"
                    >
                      Sửa
                    </button>
                  </div>
                </div>
              ))}
              {lookupResult.length === 0 && (
                <div className="px-4 py-6 text-center text-sm text-slate-500">
                  Không có dữ liệu
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Franchise</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Note</th>
                <th className="px-4 py-3">Deleted</th>
                <th className="px-4 py-3">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {items.map((it) => (
                <tr key={it.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="leading-tight">
                      <p className="font-semibold text-slate-900">
                        {it.user_name || "—"}
                      </p>
                      <p className="text-xs text-slate-500">{it.user_email}</p>
                      <p className="text-[11px] text-slate-400 font-mono">
                        {it.user_id}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {it.franchise_name ? (
                      <div className="leading-tight">
                        <p className="font-semibold text-slate-900">
                          {it.franchise_name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {it.franchise_code}
                        </p>
                        <p className="text-[11px] text-slate-400 font-mono">
                          {it.franchise_id}
                        </p>
                      </div>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                        System (Global)
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700">
                      {it.role_name} ({it.role_code})
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {it.note || "—"}
                  </td>
                  <td className="px-4 py-3">
                    {it.is_deleted ? (
                      <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                        Deleted
                      </span>
                    ) : (
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                        Active
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => openDetail(it.id)}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-primary-400 hover:bg-primary-50 hover:text-primary-700"
                      >
                        Chi tiết
                      </button>
                      <button
                        onClick={() => openEdit(it)}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-primary-400 hover:bg-primary-50 hover:text-primary-700"
                      >
                        Sửa
                      </button>
                      {!it.is_deleted ? (
                        <button
                          onClick={() => handleDelete(it)}
                          className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:border-red-400 hover:bg-red-50"
                        >
                          Xóa
                        </button>
                      ) : (
                        <button
                          onClick={() => handleRestore(it)}
                          className="rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-600 transition hover:border-emerald-400 hover:bg-emerald-50"
                        >
                          Khôi phục
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {items.length === 0 && !loading && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-sm text-slate-500"
                  >
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
            onPageChange={(page) => {
              setCurrentPage(page);
              load(page);
            }}
          />
        </div>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Tạo mới</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  POST /api/user-franchise-roles
                </p>
              </div>
              <button
                onClick={() => setShowCreate(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <form onSubmit={submitCreate} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">
                    User <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={createForm.user_id}
                    onChange={(e) =>
                      setCreateForm((f) => ({ ...f, user_id: e.target.value }))
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                  >
                    <option value="">-- Chọn user --</option>
                    {filteredUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name ? `${u.name} (${u.email})` : u.email}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">
                    Role <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={createForm.role_id}
                    onChange={(e) => {
                      const selectedRole = roles.find(
                        (r) => r.value === e.target.value,
                      );
                      const isGlobal = selectedRole?.scope === "GLOBAL";
                      setCreateForm((f) => ({
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
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">
                  Franchise
                </label>
                <select
                  value={createForm.franchise_id ?? ""}
                  onChange={(e) =>
                    setCreateForm((f) => ({
                      ...f,
                      franchise_id: e.target.value || null,
                    }))
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
                <p className="text-xs text-slate-400">
                  Nếu role scope = GLOBAL thì franchise sẽ tự set null.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">
                  Note
                </label>
                <input
                  value={createForm.note}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, note: e.target.value }))
                  }
                  placeholder="Ghi chú…"
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                />
              </div>

              <div className="flex gap-3 pt-1">
                <Button type="submit" loading={creating} className="flex-1">
                  Xác nhận
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreate(false)}
                  disabled={creating}
                  className="flex-1"
                >
                  Hủy
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {detailId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Chi tiết</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  GET /api/user-franchise-roles/:id
                </p>
              </div>
              <button
                onClick={() => setDetailId(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {loadingDetail ? (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
                Đang tải...
              </div>
            ) : !detail ? (
              <p className="text-sm text-slate-500">Không có dữ liệu</p>
            ) : (
              <div className="space-y-3 text-sm">
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs text-slate-500">Record ID</p>
                  <p className="font-mono text-xs text-slate-700">{detail.id}</p>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                    <p className="text-xs text-slate-500">User</p>
                    <p className="font-semibold text-slate-900">
                      {detail.user_name || "—"}
                    </p>
                    <p className="text-xs text-slate-500">{detail.user_email}</p>
                    <p className="font-mono text-[11px] text-slate-400">
                      {detail.user_id}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                    <p className="text-xs text-slate-500">Franchise</p>
                    <p className="font-semibold text-slate-900">
                      {detail.franchise_name
                        ? `${detail.franchise_name} (${detail.franchise_code})`
                        : "System (Global)"}
                    </p>
                    <p className="font-mono text-[11px] text-slate-400">
                      {detail.franchise_id || "—"}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                  <p className="text-xs text-slate-500">Role</p>
                  <p className="font-semibold text-slate-900">
                    {detail.role_name} ({detail.role_code})
                  </p>
                  <p className="font-mono text-[11px] text-slate-400">
                    {detail.role_id}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                  <p className="text-xs text-slate-500">Note</p>
                  <p className="text-slate-700">{detail.note || "—"}</p>
                </div>
              </div>
            )}

            <div className="mt-5 flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  if (detail) openEdit(detail);
                  setDetailId(null);
                }}
                disabled={!detail}
                className="flex-1"
              >
                Sửa
              </Button>
              <Button
                variant="outline"
                onClick={() => setDetailId(null)}
                className="flex-1"
              >
                Đóng
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Cập nhật</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  PUT /api/user-franchise-roles/:id
                </p>
              </div>
              <button
                onClick={() => setEditing(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
              <p className="font-semibold text-slate-900">
                {editing.user_name || "—"} •{" "}
                {editing.franchise_name
                  ? `${editing.franchise_name} (${editing.franchise_code})`
                  : "System (Global)"}
              </p>
              <p className="text-xs text-slate-500">
                Record: <span className="font-mono">{editing.id}</span>
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">
                  Role <span className="text-red-500">*</span>
                </label>
                <select
                  value={editRoleId}
                  onChange={(e) => setEditRoleId(e.target.value)}
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

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">
                  Note
                </label>
                <input
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  placeholder="Ghi chú…"
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                />
              </div>

              <div className="flex gap-3 pt-1">
                <Button onClick={submitUpdate} loading={updating} className="flex-1">
                  Lưu
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setEditing(null)}
                  disabled={updating}
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
}


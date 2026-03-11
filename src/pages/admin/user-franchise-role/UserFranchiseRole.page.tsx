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

  // Filter dropdown states
  const [userSearch, setUserSearch] = useState("");
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [franchiseSearch, setFranchiseSearch] = useState("");
  const [isFranchiseDropdownOpen, setIsFranchiseDropdownOpen] = useState(false);

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

  // Create modal dropdown states
  const [isCreateUserDropdownOpen, setIsCreateUserDropdownOpen] =
    useState(false);
  const [createUserSearch, setCreateUserSearch] = useState("");
  const [isCreateFranchiseDropdownOpen, setIsCreateFranchiseDropdownOpen] =
    useState(false);
  const [createFranchiseSearch, setCreateFranchiseSearch] = useState("");

  const filteredUsers = useMemo(() => {
    if (!userSearch.trim()) return users;
    const keyword = userSearch.trim().toLowerCase();
    return users.filter((u) => {
      const name = (u.name || "").toLowerCase();
      const email = (u.email || "").toLowerCase();
      return name.includes(keyword) || email.includes(keyword);
    });
  }, [users, userSearch]);

  const filteredFranchises = useMemo(() => {
    if (!franchiseSearch.trim()) return franchises;
    const keyword = franchiseSearch.trim().toLowerCase();
    return franchises.filter((f) => {
      const name = (f.name || "").toLowerCase();
      const code = (f.code || "").toLowerCase();
      return name.includes(keyword) || code.includes(keyword);
    });
  }, [franchises, franchiseSearch]);

  const createFilteredUsers = useMemo(() => {
    if (!createUserSearch.trim()) return users;
    const keyword = createUserSearch.trim().toLowerCase();
    return users.filter((u) => {
      const name = (u.name || "").toLowerCase();
      const email = (u.email || "").toLowerCase();
      return name.includes(keyword) || email.includes(keyword);
    });
  }, [users, createUserSearch]);

  const createFilteredFranchises = useMemo(() => {
    if (!createFranchiseSearch.trim()) return franchises;
    const keyword = createFranchiseSearch.trim().toLowerCase();
    return franchises.filter((f) => {
      const name = (f.name || "").toLowerCase();
      const code = (f.code || "").toLowerCase();
      return name.includes(keyword) || code.includes(keyword);
    });
  }, [franchises, createFranchiseSearch]);

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
            <div className="relative">
              {/* Fake select */}
              <button
                type="button"
                onClick={() =>
                  setIsUserDropdownOpen((open) => !open)
                }
                className="flex w-full items-center justify-between rounded-lg border border-slate-300 bg-white px-3 py-2 text-left text-sm text-slate-700 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              >
                <span className="truncate">
                  {(() => {
                    if (!filters.user_id) return "-- Tất cả user --";
                    const found = users.find((u) => u.id === filters.user_id);
                    if (!found) return filters.user_id;
                    return found.name
                      ? `${found.name} (${found.email})`
                      : found.email;
                  })()}
                </span>
                <svg
                  className="ml-2 size-4 flex-shrink-0 text-slate-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {/* Dropdown panel */}
              {isUserDropdownOpen && (
                <div className="absolute left-0 right-0 z-20 mt-1 rounded-lg border border-slate-200 bg-white shadow-lg">
                  <div className="border-b border-slate-200 px-3 py-2">
                    <input
                      type="text"
                      autoFocus
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      placeholder="Tìm theo tên hoặc email..."
                      className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs outline-none transition focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30"
                    />
                  </div>
                  <div className="max-h-64 overflow-y-auto py-1 text-sm">
                    <button
                      type="button"
                      onClick={() => {
                        setFilters((f) => ({ ...f, user_id: "" }));
                        setCurrentPage(1);
                        setIsUserDropdownOpen(false);
                        setUserSearch("");
                      }}
                      className={`flex w-full items-center px-3 py-2 text-left text-xs font-semibold ${
                        !filters.user_id
                          ? "bg-primary-50 text-primary-700"
                          : "text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      -- Tất cả user --
                    </button>
                    {filteredUsers.map((u) => {
                      const isActive = filters.user_id === u.id;
                      return (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => {
                            setFilters((f) => ({ ...f, user_id: u.id }));
                            setCurrentPage(1);
                            setIsUserDropdownOpen(false);
                            setUserSearch("");
                          }}
                          className={`flex w-full items-center px-3 py-2 text-left text-xs ${
                            isActive
                              ? "bg-primary-50 text-primary-700"
                              : "text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          <span className="truncate">
                            {u.name ? `${u.name} (${u.email})` : u.email}
                          </span>
                        </button>
                      );
                    })}
                    {filteredUsers.length === 0 && (
                      <div className="px-3 py-2 text-xs text-slate-400">
                        Không tìm thấy user phù hợp
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Franchise
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() =>
                  setIsFranchiseDropdownOpen((open) => !open)
                }
                className="flex w-full items-center justify-between rounded-lg border border-slate-300 bg-white px-3 py-2 text-left text-sm text-slate-700 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              >
                <span className="truncate">
                  {(() => {
                    if (!filters.franchise_id) return "-- Tất cả franchise --";
                    if (filters.franchise_id === "__GLOBAL__")
                      return "System (Global)";
                    const found = franchises.find(
                      (f) => f.value === filters.franchise_id,
                    );
                    if (!found) return filters.franchise_id;
                    return `${found.name} (${found.code})`;
                  })()}
                </span>
                <svg
                  className="ml-2 size-4 flex-shrink-0 text-slate-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {isFranchiseDropdownOpen && (
                <div className="absolute left-0 right-0 z-20 mt-1 rounded-lg border border-slate-200 bg-white shadow-lg">
                  <div className="border-b border-slate-200 px-3 py-2">
                    <input
                      type="text"
                      autoFocus
                      value={franchiseSearch}
                      onChange={(e) => setFranchiseSearch(e.target.value)}
                      placeholder="Tìm theo tên hoặc mã..."
                      className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs outline-none transition focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30"
                    />
                  </div>
                  <div className="max-h-64 overflow-y-auto py-1 text-sm">
                    <button
                      type="button"
                      onClick={() => {
                        setFilters((f) => ({ ...f, franchise_id: "" }));
                        setCurrentPage(1);
                        setIsFranchiseDropdownOpen(false);
                        setFranchiseSearch("");
                      }}
                      className={`flex w-full items-center px-3 py-2 text-left text-xs font-semibold ${
                        !filters.franchise_id
                          ? "bg-primary-50 text-primary-700"
                          : "text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      -- Tất cả franchise --
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFilters((f) => ({
                          ...f,
                          franchise_id: "__GLOBAL__",
                        }));
                        setCurrentPage(1);
                        setIsFranchiseDropdownOpen(false);
                        setFranchiseSearch("");
                      }}
                      className={`flex w-full items-center px-3 py-2 text-left text-xs ${
                        filters.franchise_id === "__GLOBAL__"
                          ? "bg-primary-50 text-primary-700"
                          : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      System (Global)
                    </button>
                    {filteredFranchises.map((fr) => {
                      const isActive = filters.franchise_id === fr.value;
                      return (
                        <button
                          key={fr.value}
                          type="button"
                          onClick={() => {
                            setFilters((f) => ({
                              ...f,
                              franchise_id: fr.value,
                            }));
                            setCurrentPage(1);
                            setIsFranchiseDropdownOpen(false);
                            setFranchiseSearch("");
                          }}
                          className={`flex w-full items-center px-3 py-2 text-left text-xs ${
                            isActive
                              ? "bg-primary-50 text-primary-700"
                              : "text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          <span className="truncate">
                            {fr.name} ({fr.code})
                          </span>
                        </button>
                      );
                    })}
                    {filteredFranchises.length === 0 && (
                      <div className="px-3 py-2 text-xs text-slate-400">
                        Không tìm thấy franchise phù hợp
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            
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
                        title="Xem chi tiết"
                        onClick={() => openDetail(it.id)}
                        className="inline-flex items-center justify-center size-8 rounded-lg border border-slate-200 bg-white text-slate-500 hover:border-primary-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                      <button
                        title="Chỉnh sửa"
                        onClick={() => openEdit(it)}
                        className="inline-flex items-center justify-center size-8 rounded-lg border border-slate-200 bg-white text-slate-500 hover:border-primary-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      {!it.is_deleted ? (
                        <button
                          title="Xóa"
                          onClick={() => handleDelete(it)}
                          className="inline-flex items-center justify-center size-8 rounded-lg border border-red-200 bg-white text-red-500 hover:border-red-400 hover:bg-red-50 transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      ) : (
                        <button
                          title="Khôi phục"
                          onClick={() => handleRestore(it)}
                          className="inline-flex items-center justify-center size-8 rounded-lg border border-emerald-200 bg-white text-emerald-500 hover:border-emerald-400 hover:bg-emerald-50 transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
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
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() =>
                        setIsCreateUserDropdownOpen((open) => !open)
                      }
                      className="flex w-full items-center justify-between rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-left text-sm text-slate-700 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                    >
                      <span className="truncate">
                        {(() => {
                          if (!createForm.user_id) return "-- Chọn user --";
                          const found = users.find(
                            (u) => u.id === createForm.user_id,
                          );
                          if (!found) return createForm.user_id;
                          return found.name
                            ? `${found.name} (${found.email})`
                            : found.email;
                        })()}
                      </span>
                      <svg
                        className="ml-2 size-4 flex-shrink-0 text-slate-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </button>

                    {isCreateUserDropdownOpen && (
                      <div className="absolute left-0 right-0 z-30 mt-1 rounded-lg border border-slate-200 bg-white shadow-lg">
                        <div className="border-b border-slate-200 px-3 py-2">
                          <input
                            type="text"
                            autoFocus
                            value={createUserSearch}
                            onChange={(e) => setCreateUserSearch(e.target.value)}
                            placeholder="Tìm theo tên hoặc email..."
                            className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs outline-none transition focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30"
                          />
                        </div>
                        <div className="max-h-64 overflow-y-auto py-1 text-sm">
                          {createFilteredUsers.map((u) => {
                            const isActive = createForm.user_id === u.id;
                            return (
                              <button
                                key={u.id}
                                type="button"
                                onClick={() => {
                                  setCreateForm((f) => ({
                                    ...f,
                                    user_id: u.id,
                                  }));
                                  setIsCreateUserDropdownOpen(false);
                                  setCreateUserSearch("");
                                }}
                                className={`flex w-full items-center px-3 py-2 text-left text-xs ${
                                  isActive
                                    ? "bg-primary-50 text-primary-700"
                                    : "text-slate-700 hover:bg-slate-50"
                                }`}
                              >
                                <span className="truncate">
                                  {u.name
                                    ? `${u.name} (${u.email})`
                                    : u.email}
                                </span>
                              </button>
                            );
                          })}
                          {createFilteredUsers.length === 0 && (
                            <div className="px-3 py-2 text-xs text-slate-400">
                              Không tìm thấy user phù hợp
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
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
                <div className="relative">
                  <button
                    type="button"
                    onClick={() =>
                      setIsCreateFranchiseDropdownOpen((open) => !open)
                    }
                    className="flex w-full items-center justify-between rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-left text-sm text-slate-700 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                  >
                    <span className="truncate">
                      {(() => {
                        if (!createForm.franchise_id)
                          return "-- System (không chọn franchise) --";
                        const found = franchises.find(
                          (f) => f.value === createForm.franchise_id,
                        );
                        if (!found) return createForm.franchise_id;
                        return `${found.name} (${found.code})`;
                      })()}
                    </span>
                    <svg
                      className="ml-2 size-4 flex-shrink-0 text-slate-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>

                  {isCreateFranchiseDropdownOpen && (
                    <div className="absolute left-0 right-0 z-30 mt-1 rounded-lg border border-slate-200 bg-white shadow-lg">
                      <div className="border-b border-slate-200 px-3 py-2">
                        <input
                          type="text"
                          autoFocus
                          value={createFranchiseSearch}
                          onChange={(e) =>
                            setCreateFranchiseSearch(e.target.value)
                          }
                          placeholder="Tìm theo tên hoặc mã..."
                          className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs outline-none transition focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30"
                        />
                      </div>
                      <div className="max-h-64 overflow-y-auto py-1 text-sm">
                        <button
                          type="button"
                          onClick={() => {
                            setCreateForm((f) => ({
                              ...f,
                              franchise_id: null,
                            }));
                            setIsCreateFranchiseDropdownOpen(false);
                            setCreateFranchiseSearch("");
                          }}
                          className={`flex w-full items-center px-3 py-2 text-left text-xs ${
                            !createForm.franchise_id
                              ? "bg-primary-50 text-primary-700"
                              : "text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          -- System (không chọn franchise) --
                        </button>
                        {createFilteredFranchises.map((fr) => {
                          const isActive =
                            createForm.franchise_id === fr.value;
                          return (
                            <button
                              key={fr.value}
                              type="button"
                              onClick={() => {
                                setCreateForm((f) => ({
                                  ...f,
                                  franchise_id: fr.value,
                                }));
                                setIsCreateFranchiseDropdownOpen(false);
                                setCreateFranchiseSearch("");
                              }}
                              className={`flex w-full items-center px-3 py-2 text-left text-xs ${
                                isActive
                                  ? "bg-primary-50 text-primary-700"
                                  : "text-slate-700 hover:bg-slate-50"
                              }`}
                            >
                              <span className="truncate">
                                {fr.name} ({fr.code})
                              </span>
                            </button>
                          );
                        })}
                        {createFilteredFranchises.length === 0 && (
                          <div className="px-3 py-2 text-xs text-slate-400">
                            Không tìm thấy franchise phù hợp
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
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


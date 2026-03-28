import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button, useConfirm } from "../../../components";
import Pagination from "../../../components/ui/Pagination";
import { fetchFranchiseSelect } from "../../../services/store.service";
import type { FranchiseSelectItem } from "../../../services/store.service";
import { fetchRoles, fetchUsers } from "../../../services/user.service";
import type { ApiUser, RoleSelectItem } from "../../../services/user.service";
import {
  createUserFranchiseRole,
  deleteUserFranchiseRole,
  getUserFranchiseRoleById,
  getUsersByFranchiseId,
  restoreUserFranchiseRole,
  searchUserFranchiseRoles,
  updateUserFranchiseRole,
} from "../../../services/user-franchise-role.service";
import type {
  CreateUserFranchiseRolePayload,
  SearchUserFranchiseRolePayload,
  UserByFranchise,
  UserFranchiseRole,
} from "../../../services/user-franchise-role.service";
import { showError, showSuccess } from "../../../utils";
import { useLoadingStore } from "../../../store/loading.store";
import { useManagerFranchiseId } from "../../../hooks/useManagerFranchiseId";

const ITEMS_PER_PAGE = 10;

const DEFAULT_CREATE_FORM: CreateUserFranchiseRolePayload = {
  user_id: "",
  role_id: "",
  franchise_id: null,
  note: "",
};

const getRoleBadge = (code: string) => {
  switch (code?.toUpperCase()) {
    case "ADMIN":
      return { cls: "bg-red-500/20 text-red-300 border border-red-500/40", dot: "bg-red-400" };
    case "MANAGER":
      return { cls: "bg-amber-500/20 text-amber-300 border border-amber-500/40", dot: "bg-amber-400" };
    case "STAFF":
      return { cls: "bg-blue-500/20 text-blue-300 border border-blue-500/40", dot: "bg-blue-400" };
    case "SHIPPER":
      return { cls: "bg-violet-500/20 text-violet-300 border border-violet-500/40", dot: "bg-violet-400" };
    case "USER":
      return { cls: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40", dot: "bg-emerald-400" };
    default:
      return { cls: "bg-slate-500/20 text-slate-300 border border-slate-500/40", dot: "bg-slate-400" };
  }
};

export default function UserFranchiseRolePage() {
  const showConfirm = useConfirm();
  const { show: showPageLoading, hide: hidePageLoading } = useLoadingStore();
  const managerFranchiseId = useManagerFranchiseId();

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
  const [filterFranchiseUsers, setFilterFranchiseUsers] = useState<UserByFranchise[]>([]);
  const [filterFranchiseUsersLoading, setFilterFranchiseUsersLoading] = useState(false);

  // Portal refs & rects for filter dropdowns
  const filterFranchiseTriggerRef = useRef<HTMLButtonElement>(null);
  const filterFranchiseDropdownRef = useRef<HTMLDivElement>(null);
  const [filterFranchiseRect, setFilterFranchiseRect] = useState<DOMRect | null>(null);
  const filterUserTriggerRef = useRef<HTMLButtonElement>(null);
  const filterUserDropdownRef = useRef<HTMLDivElement>(null);
  const [filterUserRect, setFilterUserRect] = useState<DOMRect | null>(null);

  const [filters, setFilters] = useState<{
    user_id: string;
    franchise_id: string;
    role_id: string;
    is_deleted: boolean;
  }>({
    user_id: "",
    franchise_id: managerFranchiseId ?? "",
    role_id: "",
    is_deleted: false,
  });

  const hasRun = useRef(false);
  const isInitialized = useRef(false);

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [createError, setCreateError] = useState("");
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
  const [updateError, setUpdateError] = useState("");
  const [updating, setUpdating] = useState(false);
  const [editRoleId, setEditRoleId] = useState("");
  const [editNote, setEditNote] = useState("");
  const [isEditRoleDropdownOpen, setIsEditRoleDropdownOpen] = useState(false);
  const editRoleBtnRef = useRef<HTMLButtonElement>(null);
  const editRoleDropdownRef = useRef<HTMLDivElement>(null);
  const [editRoleDropdownPos, setEditRoleDropdownPos] = useState({ top: 0, left: 0, width: 0 });
  useEffect(() => {
    if (!isEditRoleDropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        editRoleBtnRef.current?.contains(e.target as Node) ||
        editRoleDropdownRef.current?.contains(e.target as Node)
      ) return;
      setIsEditRoleDropdownOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isEditRoleDropdownOpen]);

  // Click-outside for filter portal dropdowns
  useEffect(() => {
    if (!isFranchiseDropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        filterFranchiseTriggerRef.current?.contains(e.target as Node) ||
        filterFranchiseDropdownRef.current?.contains(e.target as Node)
      ) return;
      setIsFranchiseDropdownOpen(false);
      setFranchiseSearch("");
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isFranchiseDropdownOpen]);

  useEffect(() => {
    if (!isUserDropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        filterUserTriggerRef.current?.contains(e.target as Node) ||
        filterUserDropdownRef.current?.contains(e.target as Node)
      ) return;
      setIsUserDropdownOpen(false);
      setUserSearch("");
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isUserDropdownOpen]);  // Filter role dropdown state
  const [isFilterRoleDropdownOpen, setIsFilterRoleDropdownOpen] = useState(false);
  const filterRoleTriggerRef = useRef<HTMLButtonElement>(null);
  const filterRoleDropdownRef = useRef<HTMLDivElement>(null);
  const [filterRoleRect, setFilterRoleRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!isFilterRoleDropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        filterRoleTriggerRef.current?.contains(e.target as Node) ||
        filterRoleDropdownRef.current?.contains(e.target as Node)
      ) return;
      setIsFilterRoleDropdownOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isFilterRoleDropdownOpen]);
  // Create modal dropdown states
  const [isCreateUserDropdownOpen, setIsCreateUserDropdownOpen] = useState(false);
  const [createUserSearch, setCreateUserSearch] = useState("");
  const [isCreateRoleDropdownOpen, setIsCreateRoleDropdownOpen] = useState(false);
  const [createRoleSearch, setCreateRoleSearch] = useState("");
  const [isCreateFranchiseDropdownOpen, setIsCreateFranchiseDropdownOpen] = useState(false);
  const [createFranchiseSearch, setCreateFranchiseSearch] = useState("");

  // Portal refs & rects for create modal dropdowns
  const createFranchiseTriggerRef = useRef<HTMLButtonElement>(null);
  const createFranchiseDropdownRef = useRef<HTMLDivElement>(null);
  const [createFranchiseRect, setCreateFranchiseRect] = useState<DOMRect | null>(null);
  const createUserTriggerRef = useRef<HTMLButtonElement>(null);
  const createUserDropdownRef = useRef<HTMLDivElement>(null);
  const [createUserRect, setCreateUserRect] = useState<DOMRect | null>(null);  const createRoleTriggerRef = useRef<HTMLButtonElement>(null);
  const createRoleDropdownRef = useRef<HTMLDivElement>(null);
  const [createRoleRect, setCreateRoleRect] = useState<DOMRect | null>(null);

  // Click-outside for create modal portal dropdowns
  useEffect(() => {
    if (!isCreateFranchiseDropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        createFranchiseTriggerRef.current?.contains(e.target as Node) ||
        createFranchiseDropdownRef.current?.contains(e.target as Node)
      ) return;
      setIsCreateFranchiseDropdownOpen(false);
      setCreateFranchiseSearch("");
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isCreateFranchiseDropdownOpen]);

  useEffect(() => {
    if (!isCreateUserDropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        createUserTriggerRef.current?.contains(e.target as Node) ||
        createUserDropdownRef.current?.contains(e.target as Node)
      ) return;
      setIsCreateUserDropdownOpen(false);
      setCreateUserSearch("");
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isCreateUserDropdownOpen]);

  useEffect(() => {
    if (!isCreateRoleDropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        createRoleTriggerRef.current?.contains(e.target as Node) ||
        createRoleDropdownRef.current?.contains(e.target as Node)
      ) return;
      setIsCreateRoleDropdownOpen(false);
      setCreateRoleSearch("");
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isCreateRoleDropdownOpen]);

  const filteredUsers = useMemo(() => {
    const source: { id: string; name: string; email: string }[] =
      filters.franchise_id && filters.franchise_id !== "__GLOBAL__"
        ? filterFranchiseUsers.map((u) => ({ id: u.value, name: u.name, email: u.email }))
        : users.map((u) => ({ id: u.id, name: u.name, email: u.email }));
    if (!userSearch.trim()) return source;
    const keyword = userSearch.trim().toLowerCase();
    return source.filter((u) => {
      const name = (u.name || "").toLowerCase();
      const email = (u.email || "").toLowerCase();
      return name.includes(keyword) || email.includes(keyword);
    });
  }, [users, filterFranchiseUsers, filters.franchise_id, userSearch]);

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

  const createFilteredRoles = useMemo(() => {
    if (!createRoleSearch.trim()) return roles;
    const keyword = createRoleSearch.trim().toLowerCase();
    return roles.filter((r) => {
      const name = (r.name || "").toLowerCase();
      const code = (r.code || "").toLowerCase();
      return name.includes(keyword) || code.includes(keyword);
    });
  }, [roles, createRoleSearch]);

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
    const initFranchise = managerFranchiseId ?? "";
    if (initFranchise) setFilters(f => ({ ...f, franchise_id: initFranchise }));
    loadSelects();
    load(1).finally(() => {
      isInitialized.current = true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync khi managerFranchiseId thay đổi (store hydrate muộn)
  useEffect(() => {
    if (!managerFranchiseId) return;
    setFilters(f => ({ ...f, franchise_id: managerFranchiseId }));
  }, [managerFranchiseId]);

  // Sync franchiseSearch (label hiển thị) khi franchises load xong
  useEffect(() => {
    if (!managerFranchiseId || !franchises.length) return;
    const found = franchises.find(f => f.value === managerFranchiseId);
    if (found) setFranchiseSearch(`${found.name} (${found.code})`);
  }, [managerFranchiseId, franchises]);

  useEffect(() => {
    if (!isInitialized.current) return;
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  useEffect(() => {
    setFilters((f) => ({ ...f, user_id: "" }));
    setFilterFranchiseUsers([]);
    const fid = filters.franchise_id;
    if (!fid || fid === "__GLOBAL__") return;
    setFilterFranchiseUsersLoading(true);
    getUsersByFranchiseId(fid)
      .then(setFilterFranchiseUsers)
      .catch(() => showError("Không thể tải danh sách user"))
      .finally(() => setFilterFranchiseUsersLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.franchise_id]);
  const openCreate = () => {
    setCreateError("");
    setCreateForm({
      ...DEFAULT_CREATE_FORM,
      franchise_id: managerFranchiseId ?? null,
    });
    setShowCreate(true);
  };

  const submitCreate = async (e: React.FormEvent) => {
    e.preventDefault();    if (!createForm.user_id) {
      showError("Vui lòng chọn user");
      return;
    }
    if (!createForm.role_id) {
      showError("Vui lòng chọn role");
      return;
    }
    setShowCreate(false);
    showPageLoading("Đang tạo role cho user...");
    setCreating(true);
    try {
      await createUserFranchiseRole(createForm);
      showSuccess("Tạo role cho user thành công");
      await load(1);
    } catch (err: unknown) {
      const apiMessage =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ||
        (err instanceof Error ? err.message : null) ||
        "Tạo thất bại";
      setShowCreate(true);
      setCreateError(apiMessage);
    } finally {
      setCreating(false);
      hidePageLoading();
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
    setUpdateError("");
    setEditing(it);
    setEditRoleId(it.role_id);
    setEditNote(it.note || "");
    setIsEditRoleDropdownOpen(false);
  };

  const submitUpdate = async () => {
    if (!editing) return;
    if (!editRoleId) {
      showError("Vui lòng chọn role");
      return;
    }
    const itemToEdit = editing;
    setEditing(null);
    setUpdateError("");
    showPageLoading("Đang cập nhật...");
    setUpdating(true);
    try {
      await updateUserFranchiseRole(editing.id, {
        role_id: editRoleId,
        note: editNote,
      });
      showSuccess("Cập nhật thành công");
      await load(currentPage);
    } catch (err: unknown) {
      const apiMessage =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ||
        (err instanceof Error ? err.message : null) ||
        "Cập nhật thất bại";
      setEditing(itemToEdit);
      setUpdateError(apiMessage);
    } finally {
      setUpdating(false);
      hidePageLoading();
    }
  };
  const handleDelete = async (it: UserFranchiseRole) => {
    if (!await showConfirm({ message: "Bạn có chắc muốn xóa record này?", variant: "danger" })) return;
    try {
      await deleteUserFranchiseRole(it.id);
      showSuccess("Đã xóa");
      await load(currentPage);
    } catch (err: unknown) {
      showError(err instanceof Error ? err.message : "Xóa thất bại");
    }
  };

  const handleRestore = async (it: UserFranchiseRole) => {
    if (!await showConfirm({ message: "Khôi phục record này?", variant: "warning" })) return;
    try {
      await restoreUserFranchiseRole(it.id);
      showSuccess("Đã khôi phục");
      await load(currentPage);
    } catch (err: unknown) {
      showError(err instanceof Error ? err.message : "Khôi phục thất bại");
    }
  };

  return (
    <div className="admin-glass-theme space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-white/95 sm:text-2xl">
            User Franchise Roles
          </h1>
          <p className="text-xs text-white/60 sm:text-sm">
            Quản lý quan hệ user ↔ franchise ↔ role
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={openCreate}>+ Tạo mới</Button>
        </div>
      </div>      {/* Search / Filters */}
      <div className="relative rounded-2xl border border-white/[0.12] bg-white/[0.06] p-4 backdrop-blur-sm">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-white/50">
              Franchise
            </label>            <div className="relative">
              {managerFranchiseId ? (
                <div className="flex w-full items-center justify-between rounded-lg border border-primary-500/50 bg-primary-500/10 px-3 py-2 text-sm text-white cursor-not-allowed select-none">
                  <span className="truncate font-medium">
                    {(() => {
                      const found = franchises.find((f) => f.value === managerFranchiseId);
                      if (!found) return managerFranchiseId;
                      return `${found.name} (${found.code})`;
                    })()}
                  </span>
                  <svg className="ml-2 size-4 flex-shrink-0 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
              ) : (
                <button
                  ref={filterFranchiseTriggerRef}
                  type="button"
                  onClick={() => {
                    if (isFranchiseDropdownOpen) {
                      setIsFranchiseDropdownOpen(false);
                      setFranchiseSearch("");
                    } else {
                      setFilterFranchiseRect(filterFranchiseTriggerRef.current?.getBoundingClientRect() ?? null);
                      setIsFranchiseDropdownOpen(true);
                    }
                  }}
                  className="flex w-full items-center justify-between rounded-lg border border-white/[0.15] bg-white/[0.08] px-3 py-2 text-left text-sm text-white/90 outline-none transition focus:border-white/40 focus:ring-2 focus:ring-white/20"
                >
                  <span className="truncate">
                    {(() => {
                      if (!filters.franchise_id) return "-- Tất cả franchise --";
                      if (filters.franchise_id === "__GLOBAL__") return "System (Global)";
                      const found = franchises.find((f) => f.value === filters.franchise_id);
                      if (!found) return filters.franchise_id;
                      return `${found.name} (${found.code})`;
                    })()}
                  </span>
                  <svg className={`ml-2 size-4 flex-shrink-0 text-white/40 transition-transform duration-200 ${isFranchiseDropdownOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-white/50">
              User
            </label>
            <div className="relative">
              {filterFranchiseUsersLoading ? (
                <div className="flex items-center gap-2 rounded-lg border border-white/[0.15] bg-white/[0.05] px-3 py-2 text-xs text-white/50">
                  <div className="size-3.5 animate-spin rounded-full border-2 border-white/20 border-t-white/60" />
                  Đang tải...
                </div>
              ) : !filters.franchise_id || filters.franchise_id === "__GLOBAL__" ? (
                <div className="flex items-center gap-2 rounded-lg border border-white/[0.10] bg-white/[0.03] px-3 py-2 text-xs text-white/30 cursor-not-allowed select-none">
                  <svg className="size-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Chọn Franchise trước
                </div>
              ) : (
                <button
                  ref={filterUserTriggerRef}
                  type="button"
                  onClick={() => {
                    if (isUserDropdownOpen) {
                      setIsUserDropdownOpen(false);
                      setUserSearch("");
                    } else {
                      setFilterUserRect(filterUserTriggerRef.current?.getBoundingClientRect() ?? null);
                      setIsUserDropdownOpen(true);
                    }
                  }}
                  className="flex w-full items-center justify-between rounded-lg border border-white/[0.15] bg-white/[0.08] px-3 py-2 text-left text-sm text-white/90 outline-none transition focus:border-white/40 focus:ring-2 focus:ring-white/20"
                >
                  <span className="truncate">
                    {(() => {
                      if (!filters.user_id) return "-- Tất cả user --";
                      const found = filteredUsers.find((u) => u.id === filters.user_id);
                      if (!found) return filters.user_id;
                      return found.name ? `${found.name} (${found.email})` : found.email;
                    })()}
                  </span>
                  <svg className={`ml-2 size-4 flex-shrink-0 text-white/40 transition-transform duration-200 ${isUserDropdownOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              )}
            </div>
          </div>          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-white/50">
              Role
            </label>
            <div className="relative">
              <button
                ref={filterRoleTriggerRef}
                type="button"
                onClick={() => {
                  if (isFilterRoleDropdownOpen) {
                    setIsFilterRoleDropdownOpen(false);
                  } else {
                    setFilterRoleRect(filterRoleTriggerRef.current?.getBoundingClientRect() ?? null);
                    setIsFilterRoleDropdownOpen(true);
                  }
                }}
                className="flex w-full items-center justify-between rounded-lg border border-white/[0.15] bg-white/[0.08] px-3 py-2 text-left text-sm text-white/90 outline-none transition focus:border-white/40 focus:ring-2 focus:ring-white/20"
              >
                <span className="truncate">
                  {(() => {
                    if (!filters.role_id) return "-- Tất cả role --";
                    const found = roles.find((r) => r.value === filters.role_id);
                    if (!found) return filters.role_id;
                    const scopeLabel = { GLOBAL: "Toàn cục", FRANCHISE: "Chi nhánh" }[found.scope] ?? found.scope;
                    return `${found.name} (${found.code}) — ${scopeLabel}`;
                  })()}
                </span>
                <svg className={`ml-2 size-4 flex-shrink-0 text-white/40 transition-transform duration-200 ${isFilterRoleDropdownOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-white/50">
              Trạng thái
            </label>
            <label className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer transition-colors select-none ${
              filters.is_deleted
                ? "border-red-500/40 bg-red-500/20 text-red-300"
                : "border-white/[0.15] bg-white/[0.08] text-white/60 hover:bg-white/[0.12]"
            }`}>
              <input
                type="checkbox"
                checked={filters.is_deleted}
                onChange={(e) => {
                  setFilters((f) => ({ ...f, is_deleted: e.target.checked }));
                  setCurrentPage(1);
                }}
                className="accent-red-500"
              />
              <span className="font-medium">Đã xóa</span>
            </label>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-white/[0.12] bg-white/[0.04]">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-white/[0.08] text-sm">
            <thead className="bg-white/[0.06] text-left text-xs font-semibold uppercase tracking-wide text-white/50">
              <tr>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Franchise</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Note</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.08]">
              {items.map((it) => (
                <tr key={it.id} className={`${it.is_deleted && filters.is_deleted ? "bg-red-500/10" : "hover:bg-white/[0.04]"}`}>
                  <td className="px-4 py-3">
                    <div className="leading-tight">
                      <p className="font-semibold text-white/90">
                        {it.user_name || "—"}
                      </p>
                      <p className="text-xs text-white/50">{it.user_email}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {it.franchise_name ? (
                      <div className="leading-tight">
                        <p className="font-semibold text-white/90">
                          {it.franchise_name}
                        </p>
                        <p className="text-xs text-white/50">
                          {it.franchise_code}
                        </p>
                      </div>
                    ) : (
                      <span className="rounded-full bg-white/[0.08] px-3 py-1 text-xs font-semibold text-white/50 border border-white/[0.10]">
                        System (Global)
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {(() => { const b = getRoleBadge(it.role_code); return (                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${b.cls}`}>
                      {it.role_name}
                    </span>
                    ); })()}
                  </td>
                  <td className="px-4 py-3 text-white/70">
                    {it.note || "—"}
                  </td>
                  <td className="px-4 py-3">                    {it.is_deleted ? (
                      <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
                        Deleted
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                        Active
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        title="Xem chi tiết"
                        onClick={() => openDetail(it.id)}
                        className="inline-flex items-center justify-center size-8 rounded-lg border border-white/[0.15] bg-white/[0.06] text-white/50 hover:bg-white/[0.15] hover:text-white transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                      <button
                        title="Chỉnh sửa"
                        onClick={() => openEdit(it)}
                        className="inline-flex items-center justify-center size-8 rounded-lg border border-white/[0.15] bg-white/[0.06] text-white/50 hover:bg-white/[0.15] hover:text-white transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      {!it.is_deleted ? (
                        <button
                          title="Xóa"
                          onClick={() => handleDelete(it)}
                          className="inline-flex items-center justify-center size-8 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      ) : (
                        <button
                          title="Khôi phục"
                          onClick={() => handleRestore(it)}
                          className="inline-flex items-center justify-center size-8 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
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
                    className="px-4 py-8 text-center text-sm text-white/40"
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
        <div className="px-4">          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={(page) => {
              setCurrentPage(page);
              load(page);
            }}
            variant="dark"
          />
        </div>
      </div>

      {/* Create Modal */}
      {showCreate && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden" style={{
            background: "rgba(15,23,42,0.85)",
            backdropFilter: "blur(40px) saturate(180%)",
            WebkitBackdropFilter: "blur(40px) saturate(180%)",
            border: "1px solid rgba(255,255,255,0.12)",
            boxShadow: "0 32px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.12)",
          }}>
            <div className="h-0.5 w-full" style={{ background: "linear-gradient(90deg, #6366f1, #8b5cf6, #06b6d4)" }} />
            <div className="shrink-0 px-6 pt-6 pb-5 flex items-start justify-between border-b border-white/[0.08]">
              <div>
                <h2 className="text-lg font-bold text-white/95">Tạo mới phân quyền</h2>
                <p className="mt-0.5 text-xs text-white/50">Gán người dùng vào chi nhánh với vai trò cụ thể</p>
              </div>
              <button
                onClick={() => setShowCreate(false)}
                className="ml-3 shrink-0 rounded-lg p-1.5 text-white/50 hover:bg-white/[0.1] transition"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>            <form onSubmit={submitCreate} className="px-6 py-5 space-y-4">              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-white/70">
                  Franchise
                  {managerFranchiseId && (
                    <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-primary-500/15 px-2 py-0.5 text-[10px] font-medium text-primary-300">
                      <svg className="size-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      Cố định
                    </span>
                  )}
                </label>
                <div className="relative">
                  {managerFranchiseId ? (
                    <div className="flex w-full items-center justify-between rounded-lg border border-primary-500/50 bg-primary-500/10 px-3 py-2.5 text-sm text-white cursor-not-allowed select-none">
                      <span className="truncate font-medium">
                        {(() => {
                          const found = franchises.find((f) => f.value === managerFranchiseId);
                          if (!found) return managerFranchiseId;
                          return `${found.name} (${found.code})`;
                        })()}
                      </span>
                      <svg className="ml-2 size-4 flex-shrink-0 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                  ) : (
                    <button
                      ref={createFranchiseTriggerRef}
                      type="button"
                      onClick={() => {
                        if (isCreateFranchiseDropdownOpen) {
                          setIsCreateFranchiseDropdownOpen(false);
                          setCreateFranchiseSearch("");
                        } else {
                          setCreateFranchiseRect(createFranchiseTriggerRef.current?.getBoundingClientRect() ?? null);
                          setIsCreateFranchiseDropdownOpen(true);
                        }
                      }}
                      className="flex w-full items-center justify-between rounded-lg border border-white/[0.15] bg-white/[0.08] px-3 py-2.5 text-left text-sm text-white/90 outline-none transition focus:border-white/40 focus:ring-2 focus:ring-white/20"
                    >
                      <span className="truncate">
                        {(() => {
                          if (!createForm.franchise_id) return "-- Hệ thống (Global) --";
                          const found = franchises.find((f) => f.value === createForm.franchise_id);
                          if (!found) return createForm.franchise_id;
                          return `${found.name} (${found.code})`;
                        })()}
                      </span>
                      <svg className={`ml-2 size-4 flex-shrink-0 text-white/50 transition-transform duration-200 ${isCreateFranchiseDropdownOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-white/70">
                  User <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <button
                    ref={createUserTriggerRef}
                    type="button"
                    onClick={() => {
                      if (isCreateUserDropdownOpen) {
                        setIsCreateUserDropdownOpen(false);
                        setCreateUserSearch("");
                      } else {
                        setCreateUserRect(createUserTriggerRef.current?.getBoundingClientRect() ?? null);
                        setIsCreateUserDropdownOpen(true);
                      }
                    }}
                    className="flex w-full items-center justify-between rounded-lg border border-white/[0.15] bg-white/[0.08] px-3 py-2.5 text-left text-sm text-white/90 outline-none transition focus:border-white/40 focus:ring-2 focus:ring-white/20"
                  >
                    <span className="truncate">
                      {(() => {
                        if (!createForm.user_id) return "-- Chọn user --";
                        const found = users.find((u) => u.id === createForm.user_id);
                        if (!found) return createForm.user_id;
                        return found.name ? `${found.name} (${found.email})` : found.email;
                      })()}
                    </span>
                    <svg className={`ml-2 size-4 flex-shrink-0 text-white/50 transition-transform duration-200 ${isCreateUserDropdownOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="relative space-y-1.5">
                <label className="text-sm font-semibold text-white/70">
                  Role <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <button
                    ref={createRoleTriggerRef}
                    type="button"
                    onClick={() => {
                      if (isCreateRoleDropdownOpen) {
                        setIsCreateRoleDropdownOpen(false);
                        setCreateRoleSearch("");
                      } else {
                        setCreateRoleRect(createRoleTriggerRef.current?.getBoundingClientRect() ?? null);
                        setIsCreateRoleDropdownOpen(true);
                      }
                    }}
                    className="flex w-full items-center justify-between rounded-lg border border-white/[0.15] bg-white/[0.08] px-3 py-2.5 text-left text-sm text-white/90 outline-none transition focus:border-white/40 focus:ring-2 focus:ring-white/20"
                  >
                    <span className="truncate">
                      {(() => {
                        if (!createForm.role_id) return "-- Chọn role --";
                        const found = roles.find((r) => r.value === createForm.role_id);
                        if (!found) return createForm.role_id;
                        const scopeLabel = { GLOBAL: "Toàn cục", FRANCHISE: "Chi nhánh" }[found.scope] ?? found.scope;
                        return `${found.name} (${found.code}) — ${scopeLabel}`;
                      })()}
                    </span>
                    <svg className={`ml-2 size-4 flex-shrink-0 text-white/50 transition-transform duration-200 ${isCreateRoleDropdownOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-white/70">
                  Ghi chú
                </label>
                <input
                  value={createForm.note}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, note: e.target.value }))
                  }
                  placeholder="Ghi chú…"
                  className="w-full rounded-lg border border-white/[0.15] bg-white/[0.08] px-4 py-2.5 text-sm text-white/90 placeholder:text-white/30 outline-none transition focus:border-white/40 focus:ring-2 focus:ring-white/20"
                />
              </div>

              <div className="flex gap-3 pt-1">
                {createError && (
                  <p className="mb-1 w-full rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 text-xs text-[#f87171]">{createError}</p>
                )}
                <Button type="submit" loading={creating} className="flex-1">
                  Xác nhận
                </Button>
                <Button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  disabled={creating}
                  className="flex-1 bg-slate-700 border border-slate-600 text-white hover:bg-slate-600"
                >
                  Hủy
                </Button>
              </div>
            </form>
          </div>
        </div>
      , document.body)}

      {/* Detail Modal */}
      {detailId && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative w-full max-w-lg rounded-2xl p-6 shadow-2xl overflow-hidden" style={{
            background: "rgba(15,23,42,0.85)",
            backdropFilter: "blur(40px) saturate(180%)",
            WebkitBackdropFilter: "blur(40px) saturate(180%)",
            border: "1px solid rgba(255,255,255,0.12)",
            boxShadow: "0 32px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.12)",
          }}>
            <div className="h-0.5 w-full absolute top-0 left-0 right-0" style={{ background: "linear-gradient(90deg, #6366f1, #8b5cf6, #06b6d4)" }} />
            <div className="mb-4 mt-2 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white/95">Chi tiết</h2>
                <p className="mt-0.5 text-xs text-white/50">
                  Thông tin chi tiết phân quyền
                </p>
              </div>
              <button
                onClick={() => setDetailId(null)}
                className="rounded-lg p-1.5 text-white/50 hover:bg-white/[0.1]"
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
              <div className="flex items-center gap-2 text-sm text-white/50">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white/70" />
                Đang tải...
              </div>
            ) : !detail ? (
              <p className="text-sm text-white/50">Không có dữ liệu</p>
            ) : (
              <div className="space-y-3 text-sm">
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl border border-white/[0.12] bg-white/[0.06] px-4 py-3">
                    <p className="text-xs text-white/50">User</p>
                    <p className="font-semibold text-white/95">
                      {detail.user_name || "—"}
                    </p>
                    <p className="text-xs text-white/50">{detail.user_email}</p>
                  </div>

                  <div className="rounded-xl border border-white/[0.12] bg-white/[0.06] px-4 py-3">
                    <p className="text-xs text-white/50">Franchise</p>
                    <p className="font-semibold text-white/95">
                      {detail.franchise_name
                        ? `${detail.franchise_name} (${detail.franchise_code})`
                        : "System (Global)"}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-white/[0.12] bg-white/[0.06] px-4 py-3">
                  <p className="text-xs text-white/50">Role</p>
                  <p className="font-semibold text-white/95">
                    {(() => { const b = getRoleBadge(detail.role_code); return (
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${b.cls}`}>
                      <span className={`size-1.5 rounded-full shrink-0 ${b.dot}`} />
                      {detail.role_name}
                    </span>
                    ); })()}
                  </p>
                </div>

                <div className="rounded-xl border border-white/[0.12] bg-white/[0.06] px-4 py-3">
                  <p className="text-xs text-white/50">Note</p>
                  <p className="text-white/70">{detail.note || "—"}</p>
                </div>
              </div>
            )}

            <div className="mt-5 flex gap-3">
              <Button
                onClick={() => setDetailId(null)}
                className="flex-1 bg-slate-700 border border-slate-600 text-white hover:bg-slate-600"
              >
                Đóng
              </Button>
            </div>
          </div>
        </div>
      , document.body)}

      {/* Edit Modal */}
      {editing && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative w-full max-w-lg rounded-2xl p-6 shadow-2xl overflow-hidden" style={{
            background: "rgba(15,23,42,0.85)",
            backdropFilter: "blur(40px) saturate(180%)",
            WebkitBackdropFilter: "blur(40px) saturate(180%)",
            border: "1px solid rgba(255,255,255,0.12)",
            boxShadow: "0 32px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.12)",
          }}>
            <div className="h-0.5 w-full absolute top-0 left-0 right-0" style={{ background: "linear-gradient(90deg, #6366f1, #8b5cf6, #06b6d4)" }} />
            <div className="mb-5 mt-2 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white/95">Cập nhật</h2>
                <p className="mt-0.5 text-xs text-white/50">
                  Chỉnh sửa phân quyền
                </p>
              </div>
              <button
                onClick={() => setEditing(null)}
                className="rounded-lg p-1.5 text-white/50 hover:bg-white/[0.1]"
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

            <div className="mb-4 rounded-xl border border-white/[0.12] bg-white/[0.06] px-4 py-3 text-sm">
              <p className="font-semibold text-white/95">
                {editing.user_name || "—"} •{" "}
                {editing.franchise_name
                  ? `${editing.franchise_name} (${editing.franchise_code})`
                  : "System (Global)"}
              </p>
              <p className="text-xs text-white/50">
                Chỉnh sửa thông tin
              </p>
            </div>

            <div className="space-y-4">
              <div className="relative space-y-1.5">
                <label className="text-sm font-semibold text-white/70">
                  Role <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <button
                    ref={editRoleBtnRef}
                    type="button"
                    onClick={() => {
                      if (editRoleBtnRef.current) {
                        const rect = editRoleBtnRef.current.getBoundingClientRect();
                        setEditRoleDropdownPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
                      }
                      setIsEditRoleDropdownOpen((o) => !o);
                    }}
                    className="flex w-full items-center justify-between rounded-lg border border-white/[0.15] bg-white/[0.08] px-3 py-2.5 text-left text-sm text-white/90 outline-none transition focus:border-white/40 focus:ring-2 focus:ring-white/20"
                  >
                    <span className="truncate">
                      {(() => {
                        if (!editRoleId) return "-- Chọn role --";
                        const found = roles.find((r) => r.value === editRoleId);
                        if (!found) return editRoleId;
                        const scopeLabel = { GLOBAL: "Toàn cục", FRANCHISE: "Chi nhánh" }[found.scope] ?? found.scope;
                        return `${found.name} (${found.code}) — ${scopeLabel}`;
                      })()}
                    </span>
                    <svg className="ml-2 size-4 flex-shrink-0 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-white/70">
                  Note
                </label>
                <input
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  placeholder="Ghi chú…"
                  className="w-full rounded-lg border border-white/[0.15] bg-white/[0.08] px-4 py-2.5 text-sm text-white/90 placeholder:text-white/30 outline-none transition focus:border-white/40 focus:ring-2 focus:ring-white/20"
                />
              </div>

              <div className="flex gap-3 pt-1">
                {updateError && (
                  <p className="mb-1 w-full rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 text-xs text-[#f87171]">{updateError}</p>
                )}
                <Button onClick={submitUpdate} loading={updating} className="flex-1">
                  Lưu
                </Button>
                <Button
                  onClick={() => setEditing(null)}
                  disabled={updating}
                  className="flex-1 bg-slate-700 border border-slate-600 text-white hover:bg-slate-600"
                >
                  Hủy
                </Button>
              </div>
            </div>
          </div>
        </div>
      , document.body)}      {/* Edit Role Dropdown Portal */}
      {isEditRoleDropdownOpen && createPortal(
        <div
          ref={editRoleDropdownRef}
          className="admin-glass-theme z-[99999] rounded-lg border border-white/[0.12] shadow-2xl"
          style={{
            position: "fixed",
            top: editRoleDropdownPos.top,
            left: editRoleDropdownPos.left,
            width: editRoleDropdownPos.width,
            background: "rgba(15,23,42,0.97)",
            backdropFilter: "blur(20px)",
          }}
        >
          <div className="max-h-48 overflow-y-auto py-1 text-sm">
            {roles.map((r) => {
              const isActive = editRoleId === r.value;
              const scopeLabel = { GLOBAL: "Toàn cục", FRANCHISE: "Chi nhánh" }[r.scope] ?? r.scope;
              return (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => {
                    setEditRoleId(r.value);
                    setIsEditRoleDropdownOpen(false);
                  }}
                  className={`flex w-full items-center justify-between px-3 py-2 text-left text-xs ${
                    isActive ? "bg-white/20 text-white font-semibold" : "text-white/90 hover:bg-white/[0.1]"
                  }`}
                >
                  <span className="truncate">{r.name} ({r.code})</span>
                  <span className={`ml-2 shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                    r.scope === "GLOBAL" ? "bg-blue-500/20 text-blue-300" : "bg-amber-500/20 text-amber-300"
                  }`}>{scopeLabel}</span>
                </button>
              );
            })}
          </div>
        </div>,
        document.body
      )}

      {/* Filter Role Dropdown Portal */}
      {isFilterRoleDropdownOpen && filterRoleRect && createPortal(
        <div
          ref={filterRoleDropdownRef}
          style={{
            position: "fixed",
            top: filterRoleRect.bottom + 4,
            left: filterRoleRect.left,
            width: filterRoleRect.width,
            zIndex: 99999,
            background: "rgba(15,23,42,0.97)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 8,
            boxShadow: "0 10px 40px rgba(0,0,0,0.7)",
            overflow: "hidden",
          }}
        >
          <div className="py-1 text-sm">
            <button
              type="button"
              onClick={() => {
                setFilters((f) => ({ ...f, role_id: "" }));
                setCurrentPage(1);
                setIsFilterRoleDropdownOpen(false);
              }}
              className={`flex w-full items-center px-3 py-2 text-left text-xs font-semibold ${
                !filters.role_id ? "bg-white/20 text-white" : "text-white/70 hover:bg-white/[0.08]"
              }`}
            >
              -- Tất cả role --
            </button>
            {roles.map((r) => {
              const isActive = filters.role_id === r.value;
              const scopeLabel = { GLOBAL: "Toàn cục", FRANCHISE: "Chi nhánh" }[r.scope] ?? r.scope;
              return (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => {
                    setFilters((f) => ({ ...f, role_id: r.value }));
                    setCurrentPage(1);
                    setIsFilterRoleDropdownOpen(false);
                  }}
                  className={`flex w-full items-center justify-between px-3 py-2 text-left text-xs ${
                    isActive ? "bg-white/20 text-white font-semibold" : "text-white/80 hover:bg-white/[0.08]"
                  }`}
                >
                  <span className="truncate">{r.name} ({r.code})</span>
                  <span className={`ml-2 shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                    r.scope === "GLOBAL" ? "bg-blue-500/20 text-blue-300" : "bg-amber-500/20 text-amber-300"
                  }`}>{scopeLabel}</span>
                </button>
              );
            })}
          </div>
        </div>,
        document.body
      )}

      {/* Filter Franchise Dropdown Portal */}      {isFranchiseDropdownOpen && filterFranchiseRect && createPortal(
        <div
          ref={filterFranchiseDropdownRef}
          style={{
            position: "fixed",
            top: filterFranchiseRect.bottom + 4,
            left: filterFranchiseRect.left,
            width: filterFranchiseRect.width,
            zIndex: 99999,
            background: "rgba(15,23,42,0.97)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 8,
            boxShadow: "0 10px 40px rgba(0,0,0,0.7)",
            overflow: "hidden",
          }}
        >
          <div className="border-b border-white/[0.10] px-3 py-2">
            <input
              type="text"
              autoFocus
              value={franchiseSearch}
              onChange={(e) => setFranchiseSearch(e.target.value)}
              placeholder="Tìm theo tên hoặc mã..."
              className="w-full rounded-md border border-white/[0.15] bg-white/[0.08] px-2.5 py-1.5 text-xs text-white/90 placeholder:text-white/30 outline-none transition focus:border-white/40 focus:ring-1 focus:ring-white/20"
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
                !filters.franchise_id ? "bg-white/20 text-white" : "text-white/70 hover:bg-white/[0.08]"
              }`}
            >
              -- Tất cả franchise --
            </button>
            <button
              type="button"
              onClick={() => {
                setFilters((f) => ({ ...f, franchise_id: "__GLOBAL__" }));
                setCurrentPage(1);
                setIsFranchiseDropdownOpen(false);
                setFranchiseSearch("");
              }}
              className={`flex w-full items-center px-3 py-2 text-left text-xs ${
                filters.franchise_id === "__GLOBAL__" ? "bg-white/20 text-white font-semibold" : "text-white/80 hover:bg-white/[0.08]"
              }`}
            >
              System (Global)
            </button>
            {filteredFranchises.map((fr) => (
              <button
                key={fr.value}
                type="button"
                onClick={() => {
                  setFilters((f) => ({ ...f, franchise_id: fr.value }));
                  setCurrentPage(1);
                  setIsFranchiseDropdownOpen(false);
                  setFranchiseSearch("");
                }}
                className={`flex w-full items-center px-3 py-2 text-left text-xs ${
                  filters.franchise_id === fr.value ? "bg-white/20 text-white font-semibold" : "text-white/80 hover:bg-white/[0.08]"
                }`}
              >
                <span className="truncate">{fr.name} ({fr.code})</span>
              </button>
            ))}
            {filteredFranchises.length === 0 && (
              <div className="px-3 py-2 text-xs text-white/40">Không tìm thấy franchise phù hợp</div>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* Filter User Dropdown Portal */}
      {isUserDropdownOpen && filterUserRect && createPortal(
        <div
          ref={filterUserDropdownRef}
          style={{
            position: "fixed",
            top: filterUserRect.bottom + 4,
            left: filterUserRect.left,
            width: filterUserRect.width,
            zIndex: 99999,
            background: "rgba(15,23,42,0.97)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 8,
            boxShadow: "0 10px 40px rgba(0,0,0,0.7)",
            overflow: "hidden",
          }}
        >
          <div className="border-b border-white/[0.10] px-3 py-2">
            <input
              type="text"
              autoFocus
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder="Tìm theo tên hoặc email..."
              className="w-full rounded-md border border-white/[0.15] bg-white/[0.08] px-2.5 py-1.5 text-xs text-white/90 placeholder:text-white/30 outline-none transition focus:border-white/40 focus:ring-1 focus:ring-white/20"
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
                !filters.user_id ? "bg-white/20 text-white" : "text-white/70 hover:bg-white/[0.08]"
              }`}
            >
              -- Tất cả user --
            </button>
            {filteredUsers.map((u) => (
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
                  filters.user_id === u.id ? "bg-white/20 text-white font-semibold" : "text-white/80 hover:bg-white/[0.08]"
                }`}
              >
                <span className="truncate">{u.name ? `${u.name} (${u.email})` : u.email}</span>
              </button>
            ))}
            {filteredUsers.length === 0 && (
              <div className="px-3 py-2 text-xs text-white/40">Không tìm thấy user phù hợp</div>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* Create Franchise Dropdown Portal */}
      {isCreateFranchiseDropdownOpen && createFranchiseRect && createPortal(
        <div
          ref={createFranchiseDropdownRef}
          style={{
            position: "fixed",
            top: createFranchiseRect.bottom + 4,
            left: createFranchiseRect.left,
            width: createFranchiseRect.width,
            zIndex: 99999,
            background: "rgba(15,23,42,0.97)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 8,
            boxShadow: "0 10px 40px rgba(0,0,0,0.7)",
            overflow: "hidden",
          }}
        >
          <div className="border-b border-white/[0.12] px-3 py-2">
            <input
              type="text"
              autoFocus
              value={createFranchiseSearch}
              onChange={(e) => setCreateFranchiseSearch(e.target.value)}
              placeholder="Tìm theo tên hoặc mã..."
              className="w-full rounded-md border border-white/[0.15] bg-white/[0.08] px-2.5 py-1.5 text-xs text-white/90 placeholder:text-white/30 outline-none transition focus:border-white/40 focus:ring-1 focus:ring-white/20"
            />
          </div>
          <button
            type="button"
            onClick={() => {
              setCreateForm((f) => ({ ...f, franchise_id: null }));
              setIsCreateFranchiseDropdownOpen(false);
              setCreateFranchiseSearch("");
            }}
            className={`flex w-full items-center gap-2 border-b border-white/[0.08] px-3 py-2 text-left text-xs transition ${
              !createForm.franchise_id
                ? "bg-primary-500/15 text-primary-300 font-semibold"
                : "text-white/70 hover:bg-white/[0.07] hover:text-white/90"
            }`}
          >
            <span className="size-1.5 rounded-full bg-white/30 shrink-0" />
            Hệ thống (Global)
          </button>
          <div className="max-h-48 overflow-y-auto py-1 text-sm">
            {createFilteredFranchises.map((fr) => (
              <button
                key={fr.value}
                type="button"
                onClick={() => {
                  setCreateForm((f) => ({ ...f, franchise_id: fr.value }));
                  setIsCreateFranchiseDropdownOpen(false);
                  setCreateFranchiseSearch("");
                }}
                className={`flex w-full items-center px-3 py-2 text-left text-xs ${
                  createForm.franchise_id === fr.value ? "bg-white/20 text-white font-semibold" : "text-white/90 hover:bg-white/[0.1]"
                }`}
              >
                <span className="truncate">{fr.name} ({fr.code})</span>
              </button>
            ))}
            {createFilteredFranchises.length === 0 && (
              <div className="px-3 py-2 text-xs text-white/50">Không tìm thấy franchise phù hợp</div>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* Create User Dropdown Portal */}
      {isCreateUserDropdownOpen && createUserRect && createPortal(
        <div
          ref={createUserDropdownRef}
          style={{
            position: "fixed",
            top: createUserRect.bottom + 4,
            left: createUserRect.left,
            width: createUserRect.width,
            zIndex: 99999,
            background: "rgba(15,23,42,0.97)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 8,
            boxShadow: "0 10px 40px rgba(0,0,0,0.7)",
            overflow: "hidden",
          }}
        >
          <div className="border-b border-white/[0.12] px-3 py-2">
            <input
              type="text"
              autoFocus
              value={createUserSearch}
              onChange={(e) => setCreateUserSearch(e.target.value)}
              placeholder="Tìm theo tên hoặc email..."
              className="w-full rounded-md border border-white/[0.15] bg-white/[0.08] px-2.5 py-1.5 text-xs text-white/90 placeholder:text-white/30 outline-none transition focus:border-white/40 focus:ring-1 focus:ring-white/20"
            />
          </div>
          <div className="max-h-48 overflow-y-auto py-1 text-sm">
            {createFilteredUsers.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => {
                  setCreateForm((f) => ({ ...f, user_id: u.id }));
                  setIsCreateUserDropdownOpen(false);
                  setCreateUserSearch("");
                }}
                className={`flex w-full items-center px-3 py-2 text-left text-xs ${
                  createForm.user_id === u.id ? "bg-white/20 text-white font-semibold" : "text-white/90 hover:bg-white/[0.1]"
                }`}
              >
                <span className="truncate">{u.name ? `${u.name} (${u.email})` : u.email}</span>
              </button>
            ))}
            {createFilteredUsers.length === 0 && (
              <div className="px-3 py-2 text-xs text-white/50">Không tìm thấy user phù hợp</div>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* Create Role Dropdown Portal */}
      {isCreateRoleDropdownOpen && createRoleRect && createPortal(
        <div
          ref={createRoleDropdownRef}
          style={{
            position: "fixed",
            top: createRoleRect.bottom + 4,
            left: createRoleRect.left,
            width: createRoleRect.width,
            zIndex: 99999,
            background: "rgba(15,23,42,0.97)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 8,
            boxShadow: "0 10px 40px rgba(0,0,0,0.7)",
            overflow: "hidden",
          }}
        >
          <div className="border-b border-white/[0.12] px-3 py-2">
            <input
              type="text"
              autoFocus
              value={createRoleSearch}
              onChange={(e) => setCreateRoleSearch(e.target.value)}
              placeholder="Tìm theo tên hoặc mã..."
              className="w-full rounded-md border border-white/[0.15] bg-white/[0.08] px-2.5 py-1.5 text-xs text-white/90 placeholder:text-white/30 outline-none transition focus:border-white/40 focus:ring-1 focus:ring-white/20"
            />
          </div>
          <div className="max-h-48 overflow-y-auto py-1 text-sm">
            {createFilteredRoles.map((r) => {
              const isActive = createForm.role_id === r.value;
              const scopeLabel = { GLOBAL: "Toàn cục", FRANCHISE: "Chi nhánh" }[r.scope] ?? r.scope;
              return (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => {
                    const isGlobal = r.scope === "GLOBAL";
                    setCreateForm((f) => ({
                      ...f,
                      role_id: r.value,
                      franchise_id: isGlobal ? null : f.franchise_id,
                    }));
                    setIsCreateRoleDropdownOpen(false);
                    setCreateRoleSearch("");
                  }}
                  className={`flex w-full items-center justify-between px-3 py-2 text-left text-xs ${
                    isActive ? "bg-white/20 text-white font-semibold" : "text-white/90 hover:bg-white/[0.1]"
                  }`}
                >
                  <span className="truncate">{r.name} ({r.code})</span>
                  <span className={`ml-2 shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                    r.scope === "GLOBAL" ? "bg-blue-500/20 text-blue-300" : "bg-amber-500/20 text-amber-300"
                  }`}>{scopeLabel}</span>
                </button>
              );
            })}
            {createFilteredRoles.length === 0 && (
              <div className="px-3 py-2 text-xs text-white/50">Không tìm thấy role phù hợp</div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}


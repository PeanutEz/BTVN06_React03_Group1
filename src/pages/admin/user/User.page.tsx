import { useEffect, useRef, useState } from "react";
import { Button } from "../../../components";
import { useAuthStore } from "../../../store";
import UserDetailModal from "./UserDetailModal";
import { fetchRoles } from "../../../services/user.service";
import type { RoleSelectItem } from "../../../services/user.service";
import {
  createUserFranchiseRole,
  searchUserFranchiseRoles,
} from "../../../services/user-franchise-role.service";
import type { UserFranchiseRole, CreateUserFranchiseRolePayload } from "../../../services/user-franchise-role.service";
import { fetchFranchiseSelect } from "../../../services/store.service";
import type { FranchiseSelectItem } from "../../../services/store.service";
import Pagination from "../../../components/ui/Pagination";
import { showSuccess, showError } from "../../../utils";

const ITEMS_PER_PAGE = 10;

const fmtDate = (d?: string) =>
  d ? new Intl.DateTimeFormat("vi-VN", { dateStyle: "short" }).format(new Date(d)) : "—";

const DEFAULT_UFR_FORM: CreateUserFranchiseRolePayload = {
  user_id: "",
  franchise_id: "",
  role_id: "",
  note: "",
};

const UserPage = () => {
  const { user: currentUser } = useAuthStore();
  const [ufrs, setUfrs] = useState<UserFranchiseRole[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState<CreateUserFranchiseRolePayload>({ ...DEFAULT_UFR_FORM });
  const [submitting, setSubmitting] = useState(false);
  const [franchises, setFranchises] = useState<FranchiseSelectItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showDeleted, setShowDeleted] = useState(false);
  const [roles, setRoles] = useState<RoleSelectItem[]>([]);
  const [selectedUfrId, setSelectedUfrId] = useState<string | null>(null);

  // ── User search combobox (cho modal gán vai trò) ──
  interface UserSuggestion { user_id: string; user_name: string; user_email: string; }
  const [userSearch, setUserSearch] = useState("");
  const [userSuggestions, setUserSuggestions] = useState<UserSuggestion[]>([]);
  const [userSearching, setUserSearching] = useState(false);
  const [showUserDrop, setShowUserDrop] = useState(false);
  const userSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userDropRef = useRef<HTMLDivElement>(null);

  const handleUserSearchInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setUserSearch(val);
    // Nếu sửa text tự do → reset user_id đã chọn
    setFormData((prev) => ({ ...prev, user_id: "" }));
    if (userSearchTimer.current) clearTimeout(userSearchTimer.current);
    if (val.trim().length < 2) { setUserSuggestions([]); setShowUserDrop(false); return; }
    userSearchTimer.current = setTimeout(async () => {
      setUserSearching(true);
      try {
        const res = await searchUserFranchiseRoles({
          searchCondition: { keyword: val.trim(), is_deleted: false },
          pageInfo: { pageNum: 1, pageSize: 20 },
        });
        const seen = new Set<string>();
        const unique: UserSuggestion[] = [];
        for (const r of res.data) {
          if (!seen.has(r.user_id)) {
            seen.add(r.user_id);
            unique.push({ user_id: r.user_id, user_name: r.user_name, user_email: r.user_email });
          }
        }
        setUserSuggestions(unique);
        setShowUserDrop(true);
      } finally {
        setUserSearching(false);
      }
    }, 350);
  };

  const selectUser = (u: UserSuggestion) => {
    setFormData((prev) => ({ ...prev, user_id: u.user_id }));
    setUserSearch(`${u.user_name} (${u.user_email})`);
    setShowUserDrop(false);
  };

  const loadRoles = async () => {
    try {
      const [rolesData, franchisesData] = await Promise.all([
        fetchRoles(),
        fetchFranchiseSelect(),
      ]);
      setRoles(rolesData);
      setFranchises(franchisesData);
    } catch (err) {
      console.error("Lỗi tải danh sách role/franchise:", err);
    }
  };

  const load = async (keyword = searchQuery, page = currentPage, deleted = showDeleted) => {
    setLoading(true);
    try {
      const result = await searchUserFranchiseRoles({
        searchCondition: { keyword, is_deleted: deleted },
        pageInfo: { pageNum: page, pageSize: ITEMS_PER_PAGE },
      });
      // Mỗi hàng là 1 UFR — user có thể có nhiều franchise
      setUfrs(result.data);
      setTotalPages(result.pageInfo.totalPages);
      setTotalItems(result.pageInfo.totalItems);
      setCurrentPage(result.pageInfo.pageNum);
    } catch (err) {
      console.error("[UserPage] load error:", err);
      showError("Lấy danh sách người dùng thất bại");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleDeleted = (val: boolean) => {
    setShowDeleted(val);
    setCurrentPage(1);
    load(searchQuery, 1, val);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load("", 1); loadRoles(); }, []);

  // ── Tạo UFR mới (UFR-01) ──
  const handleOpenModal = () => {
    setFormData({ ...DEFAULT_UFR_FORM });
    setUserSearch("");
    setUserSuggestions([]);
    setShowUserDrop(false);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.user_id) { showError("Vui lòng chọn người dùng từ danh sách gợi ý"); return; }
    setSubmitting(true);
    try {
      await createUserFranchiseRole(formData);
      showSuccess("Gán vai trò thành công");
      setShowModal(false);
      await load(searchQuery, currentPage);
    } catch {
      showError("Gán vai trò thất bại");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">User Management</h1>
          <p className="text-xs sm:text-sm text-slate-600">Quản lý người dùng &amp; vai trò trong hệ thống</p>
        </div>
        <Button onClick={handleOpenModal}>+ Gán vai trò người dùng</Button>
      </div>

      {/* Search bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Tìm kiếm theo tên hoặc email..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              onKeyDown={(e) => { if (e.key === "Enter") load(searchQuery, 1); }}
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-4 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
            />
          </div>
          <Button onClick={() => load(searchQuery, 1)} loading={loading}>Tìm kiếm</Button>
          <button
            type="button"
            onClick={() => handleToggleDeleted(!showDeleted)}
            className={`rounded-lg border px-4 py-2 text-sm font-semibold transition ${
              showDeleted ? "border-red-400 bg-red-50 text-red-700 hover:bg-red-100" : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {showDeleted ? "✅ Đang xóa" : "🗑 Đã xóa"}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-4 py-3 whitespace-nowrap">Người dùng</th>
                <th className="px-4 py-3 whitespace-nowrap">Franchise</th>
                <th className="px-4 py-3 whitespace-nowrap">Vai trò</th>
                <th className="px-4 py-3 whitespace-nowrap">Xác thực</th>
                <th className="px-4 py-3 whitespace-nowrap">Trạng thái</th>
                <th className="px-4 py-3 whitespace-nowrap">Ghi chú</th>
                <th className="px-4 py-3 whitespace-nowrap">Ngày tạo</th>
                <th className="px-4 py-3 whitespace-nowrap">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {ufrs.map((ufr) => (
                <tr key={ufr.id} className="hover:bg-slate-50">
                  {/* Người dùng */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="size-9 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-sm shrink-0">
                        {ufr.user_name?.[0]?.toUpperCase() || "?"}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900 whitespace-nowrap">
                          {ufr.user_name || "(Chưa đặt tên)"}
                          {currentUser?.id === ufr.user_id && (
                            <span className="ml-1.5 text-xs font-normal text-amber-500">(Bạn)</span>
                          )}
                        </p>
                        <p className="text-xs text-slate-400">{ufr.user_email}</p>
                      </div>
                    </div>
                  </td>
                  {/* Franchise */}
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800 whitespace-nowrap">{ufr.franchise_name || "—"}</p>
                    {ufr.franchise_code && (
                      <p className="text-xs text-slate-400">{ufr.franchise_code}</p>
                    )}
                  </td>
                  {/* Vai trò */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                      {ufr.role_name || ufr.role_code || "—"}
                    </span>
                  </td>
                  {/* Xác thực email */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    {ufr.is_active ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700">
                        <span className="size-1.5 rounded-full bg-green-500" />Đã xác thực
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
                        <span className="size-1.5 rounded-full bg-slate-400" />Chưa xác thực
                      </span>
                    )}
                  </td>
                  {/* Trạng thái */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    {ufr.is_deleted ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
                        <span className="size-1.5 rounded-full bg-red-500" />Đã xóa
                      </span>
                    ) : ufr.is_active ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                        <span className="size-1.5 rounded-full bg-emerald-500" />Hoạt động
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                        <span className="size-1.5 rounded-full bg-amber-400" />Không HĐ
                      </span>
                    )}
                  </td>
                  {/* Ghi chú */}
                  <td className="px-4 py-3 max-w-[160px]">
                    <p className="truncate text-slate-500 text-xs">{ufr.note || <span className="italic text-slate-300">—</span>}</p>
                  </td>
                  {/* Ngày tạo */}
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-500">
                    {fmtDate(ufr.created_at)}
                  </td>
                  {/* Thao tác */}
                  <td className="px-4 py-3">
                    <Button variant="outline" size="sm" onClick={() => setSelectedUfrId(ufr.id)}>✏️ Sửa</Button>
                  </td>
                </tr>
              ))}
              {ufrs.length === 0 && !loading && (
                <tr><td colSpan={8} className="px-4 py-6 text-center text-sm text-slate-500">Không có dữ liệu</td></tr>
              )}
              {loading && (
                <tr><td colSpan={8} className="px-4 py-6 text-center text-sm text-slate-500">Đang tải...</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={(page) => { setCurrentPage(page); load(searchQuery, page, showDeleted); }}
            totalItems={totalItems}
            itemsPerPage={ITEMS_PER_PAGE}
          />
        </div>
      </div>

      {/* ── User Detail Modal ── */}
      <UserDetailModal
        ufrId={selectedUfrId}
        onClose={() => setSelectedUfrId(null)}
        onSaved={() => load(searchQuery, currentPage, showDeleted)}
      />

      {/* ── Tạo UFR Modal (UFR-01) ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <h2 className="mb-1 text-xl font-bold text-slate-900">Gán vai trò người dùng</h2>
            <p className="mb-5 text-xs text-slate-500">Liên kết user ↔ franchise ↔ vai trò</p>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* User search combobox */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Người dùng *</label>
                <div className="relative" ref={userDropRef}>
                  <input
                    type="text"
                    autoComplete="off"
                    value={userSearch}
                    onChange={handleUserSearchInput}
                    onFocus={() => userSuggestions.length > 0 && setShowUserDrop(true)}
                    onBlur={() => setTimeout(() => setShowUserDrop(false), 150)}
                    placeholder="Nhập tên hoặc email để tìm..."
                    className={`w-full rounded-lg border px-4 py-2 text-sm outline-none transition focus:ring-2 focus:ring-primary-500/20 ${
                      formData.user_id
                        ? "border-emerald-400 focus:border-emerald-500 bg-emerald-50"
                        : "border-slate-300 focus:border-primary-500 bg-white"
                    }`}
                  />
                  {userSearching && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-slate-400">Đang tìm...</span>
                  )}
                  {!userSearching && formData.user_id && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500 text-base">✓</span>
                  )}
                  {showUserDrop && userSuggestions.length > 0 && (
                    <div className="absolute z-50 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg max-h-52 overflow-y-auto">
                      {userSuggestions.map((u) => (
                        <button
                          key={u.user_id}
                          type="button"
                          onMouseDown={() => selectUser(u)}
                          className="flex w-full flex-col px-4 py-2.5 text-left text-sm hover:bg-primary-50 transition"
                        >
                          <span className="font-semibold text-slate-800">{u.user_name || "(Chưa đặt tên)"}</span>
                          <span className="text-xs text-slate-400">{u.user_email}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {showUserDrop && userSuggestions.length === 0 && !userSearching && userSearch.length >= 2 && (
                    <div className="absolute z-50 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg px-4 py-3 text-sm text-slate-400">
                      Không tìm thấy người dùng
                    </div>
                  )}
                </div>
                {formData.user_id && (
                  <p className="text-[11px] text-slate-400 truncate">ID: {formData.user_id}</p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Franchise *</label>
                <select required value={formData.franchise_id}
                  onChange={(e) => setFormData({ ...formData, franchise_id: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                >
                  <option value="">-- Chọn franchise --</option>
                  {franchises.map((f) => (
                    <option key={f.value} value={f.value}>{f.name} ({f.code})</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Vai trò *</label>
                <select required value={formData.role_id}
                  onChange={(e) => setFormData({ ...formData, role_id: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                >
                  <option value="">-- Chọn vai trò --</option>
                  {roles.map((role) => (
                    <option key={role.value} value={role.value}>{role.name} ({role.code})</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Ghi chú</label>
                <input type="text" value={formData.note || ""}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  placeholder="Ghi chú (tùy chọn)"
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="submit" loading={submitting} disabled={submitting} className="flex-1">Gán vai trò</Button>
                <Button type="button" variant="outline" onClick={() => setShowModal(false)} disabled={submitting} className="flex-1">Hủy</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserPage;
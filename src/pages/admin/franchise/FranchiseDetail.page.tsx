import { useEffect, useRef, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Button } from "../../../components";
import type { ApiFranchise } from "../../../services/store.service";
import {
  getFranchiseById,
  deleteFranchise,
  changeFranchiseStatus,
} from "../../../services/store.service";
import { ROUTER_URL } from "../../../routes/router.const";
import { fetchInventoryByStore } from "../../../services/inventory.service";
import { isLowStock } from "../../../models/inventory.model";
import { showSuccess, showError } from "../../../utils";
import { searchUserFranchiseRoles, createUserFranchiseRole } from "../../../services/user-franchise-role.service";
import type { UserFranchiseRole } from "../../../services/user-franchise-role.service";
import { fetchUsers, fetchRoles } from "../../../services/user.service";
import type { ApiUser, RoleSelectItem } from "../../../services/user.service";

const FranchiseDetailPage = () => {
  const { id } = useParams();
  const [franchise, setFranchise] = useState<ApiFranchise | null>(null);
  const [loading, setLoading] = useState(false);
  const [togglingStatus, setTogglingStatus] = useState(false);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [franchiseUsers, setFranchiseUsers] = useState<UserFranchiseRole[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [allUsers, setAllUsers] = useState<ApiUser[]>([]);
  const [roles, setRoles] = useState<RoleSelectItem[]>([]);
  const [assignForm, setAssignForm] = useState({ user_id: "", role_id: "" });
  const [assignSubmitting, setAssignSubmitting] = useState(false);
  const navigate = useNavigate();
  const lastId = useRef<string | undefined>(undefined);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await getFranchiseById(id);
      setFranchise(data);
      try {
        const inventory = await fetchInventoryByStore(id);
        setLowStockCount(inventory.filter(isLowStock).length);
      } catch {
        // inventory is mock, ignore errors
      }
    } catch (error) {
      console.error("Lỗi tải chi tiết franchise:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadFranchiseUsers = async () => {
    if (!id) return;
    setLoadingUsers(true);
    try {
      const result = await searchUserFranchiseRoles({
        searchCondition: { franchise_id: id, is_deleted: false },
        pageInfo: { pageNum: 1, pageSize: 100 },
      });
      setFranchiseUsers(result.data);
    } catch {
      // ignore
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleOpenAssign = async () => {
    setAssignForm({ user_id: "", role_id: "" });
    setShowAssignModal(true);
    try {
      const [usersResult, rolesResult] = await Promise.all([
        fetchUsers("", 1, 200, ""),
        fetchRoles(),
      ]);
      setAllUsers(usersResult.pageData);
      setRoles(rolesResult);
    } catch {
      showError("Không thể tải danh sách");
    }
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignForm.user_id || !assignForm.role_id) {
      showError("Vui lòng chọn user và role");
      return;
    }
    setAssignSubmitting(true);
    try {
      await createUserFranchiseRole({
        user_id: assignForm.user_id,
        role_id: assignForm.role_id,
        franchise_id: id!,
        note: "",
      });
      showSuccess("Đã gán user vào franchise thành công");
      setShowAssignModal(false);
      await loadFranchiseUsers();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        || (err instanceof Error ? err.message : null)
        || "Gán user thất bại";
      showError(msg);
    } finally {
      setAssignSubmitting(false);
    }
  };

  useEffect(() => {
    if (id === lastId.current) return;
    lastId.current = id;
    load();
    loadFranchiseUsers();
  }, [id]);

  if (!franchise && !loading) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-slate-500">Không tìm thấy franchise.</p>
        <Link
          to={`${ROUTER_URL.ADMIN}/${ROUTER_URL.ADMIN_ROUTES.FRANCHISE_LIST}`}
          className="text-sm font-semibold text-primary-600 hover:text-primary-700"
        >
          ← Quay lại danh sách
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Chi tiết Franchise</h1>
          <p className="text-xs sm:text-sm text-slate-600">Thông tin chi nhánh & tóm tắt tồn kho</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() =>
              navigate(
                `/${ROUTER_URL.ADMIN}/${ROUTER_URL.ADMIN_ROUTES.FRANCHISE_EDIT.replace(":id", id!)}`,
              )
            }
          >
            Chỉnh sửa
          </Button>
          <Button
            variant="outline"
            className="text-red-600 border-red-200 hover:bg-red-50"
            onClick={async () => {
              if (!id) return;
              if (!window.confirm("Bạn có chắc muốn xóa franchise này?")) return;
              try {
                await deleteFranchise(id);
                showSuccess("Xóa franchise thành công");
                navigate(
                  `/${ROUTER_URL.ADMIN}/${ROUTER_URL.ADMIN_ROUTES.FRANCHISE_LIST}`,
                );
              } catch (err) {
                showError(
                  err instanceof Error ? err.message : "Xóa franchise thất bại",
                );
              }
            }}
          >
            Xóa
          </Button>
          {franchise && (
            <Button
              variant="outline"
              className={franchise.is_active
                ? "text-amber-600 border-amber-200 hover:bg-amber-50"
                : "text-emerald-600 border-emerald-200 hover:bg-emerald-50"
              }
              loading={togglingStatus}
              onClick={async () => {
                if (!id || !franchise) return;
                const newStatus = !franchise.is_active;
                const action = newStatus ? "kích hoạt" : "ngừng hoạt động";
                if (!window.confirm(`Bạn có chắc muốn ${action} franchise này?`)) return;
                setTogglingStatus(true);
                try {
                  await changeFranchiseStatus(id, newStatus);
                  showSuccess(`Đã ${action} franchise thành công`);
                  await load();
                } catch (err) {
                  showError(err instanceof Error ? err.message : "Thay đổi trạng thái thất bại");
                } finally {
                  setTogglingStatus(false);
                }
              }}
            >
              {franchise.is_active ? "Ngừng hoạt động" : "Kích hoạt"}
            </Button>
          )}
        </div>
      </div>

      {franchise && (
        <div className="grid gap-6 md:grid-cols-3">
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:col-span-2">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-mono text-slate-500">{franchise.code}</span>
                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${
                      franchise.is_active
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-slate-200 bg-slate-50 text-slate-600"
                    }`}
                  >
                    {franchise.is_active ? "Hoạt động" : "Ngừng"}
                  </span>
                </div>
                <h2 className="mt-2 text-xl font-semibold text-slate-900">{franchise.name}</h2>
                {franchise.address && <p className="text-sm text-slate-600">{franchise.address}</p>}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1 text-sm">
                <p className="font-semibold text-slate-800">Thông tin liên hệ</p>
                <p className="text-slate-600">Hotline: {franchise.hotline || "—"}</p>
                {franchise.logo_url && (
                  <p className="text-slate-600">Logo: <a href={franchise.logo_url} target="_blank" rel="noreferrer" className="text-primary-600 hover:underline">{franchise.logo_url}</a></p>
                )}
              </div>
              <div className="space-y-1 text-sm">
                <p className="font-semibold text-slate-800">Hoạt động</p>
                <p className="text-slate-600">Giờ mở cửa: {franchise.opened_at} - {franchise.closed_at}</p>
                <p className="text-slate-600">
                  Ngày tạo: {new Date(franchise.created_at).toLocaleDateString("vi-VN")}
                </p>
                <p className="text-slate-600">
                  Cập nhật: {new Date(franchise.updated_at).toLocaleDateString("vi-VN")}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tồn kho</p>
                <Link
                  to={`${ROUTER_URL.ADMIN}/${ROUTER_URL.ADMIN_ROUTES.INVENTORY_BY_FRANCHISE.replace(":id", franchise.id)}`}
                  className="text-xs font-semibold text-primary-600 hover:text-primary-700"
                >
                  Xem chi tiết
                </Link>
              </div>
              <div className="mt-3 space-y-2 text-sm">
                <p className="text-slate-600">
                  Số mặt hàng cảnh báo thấp:{" "}
                  <span className={lowStockCount > 0 ? "font-semibold text-amber-600" : "font-semibold text-emerald-600"}>
                    {lowStockCount}
                  </span>
                </p>
                {lowStockCount > 0 && (
                  <p className="text-xs text-amber-600">
                    Một số sản phẩm sắp hết hàng. Vui lòng kiểm tra trang tồn kho để điều chỉnh.
                  </p>
                )}
                {lowStockCount === 0 && (
                  <p className="text-xs text-emerald-600">Tất cả mặt hàng đang ở mức tồn kho an toàn.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Users in this franchise */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Người dùng trong franchise</p>
          <button
            onClick={handleOpenAssign}
            className="rounded-lg bg-primary-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-primary-600"
          >
            + Gán User
          </button>
        </div>
        {loadingUsers ? (
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
            Đang tải...
          </div>
        ) : franchiseUsers.length === 0 ? (
          <p className="text-sm text-slate-400">Chưa có người dùng nào được gán vào franchise này.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="pb-2 pr-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">Người dùng</th>
                  <th className="pb-2 pr-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">Email</th>
                  <th className="pb-2 pr-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">Role</th>
                  <th className="pb-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {franchiseUsers.map((u) => (
                  <tr key={u.id}>
                    <td className="py-2.5 pr-4 font-medium text-slate-900">{u.user_name || "—"}</td>
                    <td className="py-2.5 pr-4 text-slate-500">{u.user_email}</td>
                    <td className="py-2.5 pr-4">
                      <span className="rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-semibold text-primary-700">
                        {u.role_name} ({u.role_code})
                      </span>
                    </td>
                    <td className="py-2.5">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        u.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                      }`}>
                        {u.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Assign User Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Gán User vào Franchise</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Franchise: <span className="font-semibold text-slate-700">{franchise?.name}</span>
                  {" "}—{" "}<span className="font-mono text-slate-400">{franchise?.code}</span>
                </p>
              </div>
              <button
                onClick={() => setShowAssignModal(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleAssignSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">User <span className="text-red-500">*</span></label>
                <select
                  required
                  value={assignForm.user_id}
                  onChange={(e) => setAssignForm((f) => ({ ...f, user_id: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                >
                  <option value="">-- Chọn user --</option>
                  {allUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name || u.email} {u.name ? `(${u.email})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Role <span className="text-red-500">*</span></label>
                <select
                  required
                  value={assignForm.role_id}
                  onChange={(e) => setAssignForm((f) => ({ ...f, role_id: e.target.value }))}
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

              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-600">
                Franchise ID: <span className="font-mono text-xs text-slate-500">{id}</span>
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  disabled={assignSubmitting}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-600 disabled:opacity-60"
                >
                  {assignSubmitting && <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
                  {assignSubmitting ? "Đang lưu..." : "Xác nhận"}
                </button>
                <Button type="button" variant="outline" onClick={() => setShowAssignModal(false)} disabled={assignSubmitting} className="flex-1">
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

export default FranchiseDetailPage;


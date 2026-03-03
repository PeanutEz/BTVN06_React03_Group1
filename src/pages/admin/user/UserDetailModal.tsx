import { useEffect, useState } from "react";
import { useAuthStore } from "../../../store";
import {
  getUserFranchiseRoleById,
  updateUserFranchiseRole,
  deleteUserFranchiseRole,
  restoreUserFranchiseRole,
} from "../../../services/user-franchise-role.service";
import type { UserFranchiseRole } from "../../../services/user-franchise-role.service";
import { fetchRoles, updateUser } from "../../../services/user.service";
import type { RoleSelectItem, UpdateUserPayload } from "../../../services/user.service";
import { showSuccess, showError } from "../../../utils";
import { ROLE_CODE } from "../../../models/role.model";

// ─── types ───────────────────────────────────────────────────────────────────

interface Props {
  ufrId: string | null;     // null = closed
  onClose: () => void;
  onSaved?: () => void;     // called after a successful save/delete/restore
}

// ─── helpers ─────────────────────────────────────────────────────────────────

const fmtDate = (d?: string) =>
  d
    ? new Intl.DateTimeFormat("vi-VN", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(d))
    : "—";

// ─── component ───────────────────────────────────────────────────────────────

const UserDetailModal = ({ ufrId, onClose, onSaved }: Props) => {
  const { user: currentUser } = useAuthStore();

  const [ufr, setUfr] = useState<UserFranchiseRole | null>(null);
  const [roles, setRoles] = useState<RoleSelectItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"delete" | "restore" | null>(null);
  const [confirming, setConfirming] = useState(false);

  // form fields
  const [name, setName] = useState("");
  const [origName, setOrigName] = useState("");
  const [phone, setPhone] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [origIsActive, setOrigIsActive] = useState(true);
  const [roleId, setRoleId] = useState("");
  const [origRoleId, setOrigRoleId] = useState("");
  const [note, setNote] = useState("");
  const [origNote, setOrigNote] = useState("");

  // role guards
  const currentRole = (currentUser?.role ?? "").toUpperCase();
  const isAdmin = currentRole === ROLE_CODE.ADMIN;
  const isManager = currentRole === ROLE_CODE.MANAGER;
  const canEdit = isAdmin || isManager;
  const canDelete = isAdmin;

  // ─── load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!ufrId) {
      setUfr(null);
      return;
    }
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const [primary, rolesData] = await Promise.all([
          getUserFranchiseRoleById(ufrId),
          fetchRoles(),
        ]);
        if (cancelled) return;
        setUfr(primary);
        setRoles(rolesData);
        setName(primary.user_name ?? "");
        setOrigName(primary.user_name ?? "");
        setPhone("");
        setIsActive(primary.is_active);
        setOrigIsActive(primary.is_active);
        setRoleId(primary.role_id ?? "");
        setOrigRoleId(primary.role_id ?? "");
        setNote(primary.note ?? "");
        setOrigNote(primary.note ?? "");
      } catch {
        if (!cancelled) showError("Không tải được thông tin người dùng");
        onClose();
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [ufrId]);

  // close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // ─── save ──────────────────────────────────────────────────────────────────
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ufr || !canEdit) return;
    setSaving(true);
    try {
      const userPayload: UpdateUserPayload = {};
      if (name.trim() && name.trim() !== origName) userPayload.name = name.trim();
      if (phone.trim()) userPayload.phone = phone.trim();
      if (isActive !== origIsActive) userPayload.is_active = isActive;

      const ufrChanged = roleId !== origRoleId || note.trim() !== origNote.trim();
      const userChanged = Object.keys(userPayload).length > 0;

      if (!ufrChanged && !userChanged) {
        showSuccess("Không có thay đổi nào");
        setSaving(false);
        return;
      }

      if (ufrChanged) {
        await updateUserFranchiseRole(ufr.id, { role_id: roleId, note: note.trim() });
        setOrigRoleId(roleId);
        setOrigNote(note.trim());
      }

      if (userChanged) {
        await updateUser(ufr.user_id, userPayload);
      }

      showSuccess("Cập nhật thành công");
      const newRole = roles.find((r) => r.value === roleId);
      const updatedName = name.trim() || origName;
      setOrigName(updatedName);
      setOrigIsActive(isActive);
      setUfr({
        ...ufr,
        user_name: updatedName,
        is_active: isActive,
        role_id: roleId,
        role_name: newRole?.name ?? ufr.role_name,
        role_code: newRole?.code ?? ufr.role_code,
        note,
      });
      onSaved?.();
    } catch {
      showError("Cập nhật thất bại");
    } finally {
      setSaving(false);
    }
  };

  // ─── delete / restore ──────────────────────────────────────────────────────
  const handleConfirm = async () => {
    if (!ufr || !confirmAction) return;
    setConfirming(true);
    try {
      if (confirmAction === "delete") {
        await deleteUserFranchiseRole(ufr.id);
        showSuccess("Đã xóa vai trò");
        setUfr((prev) => (prev ? { ...prev, is_deleted: true } : prev));
      } else {
        await restoreUserFranchiseRole(ufr.id);
        showSuccess("Đã khôi phục vai trò");
        setUfr((prev) => (prev ? { ...prev, is_deleted: false } : prev));
      }
      onSaved?.();
    } catch {
      showError(
        confirmAction === "delete" ? "Xóa thất bại" : "Khôi phục thất bại",
      );
    } finally {
      setConfirming(false);
      setConfirmAction(null);
    }
  };

  // don't render if no id
  if (!ufrId) return null;

  return (
    <>
      {/* ── Backdrop ──────────────────────────────────────────────────────── */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* ── Dialog ────────────────────────────────────────────────────────── */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        aria-modal="true"
        role="dialog"
        aria-labelledby="user-detail-title"
      >
        <div
          className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* ── Header ──────────────────────────────────────────────────── */}
          <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-100 bg-white px-6 py-5">
            <div>
              <h2
                id="user-detail-title"
                className="text-lg font-bold text-slate-900"
              >
                Cập nhật người dùng
              </h2>
              {ufr && (
                <p className="mt-0.5 text-sm text-slate-500">
                  Chỉnh sửa thông tin người dùng{" "}
                  <span className="font-medium text-slate-700">
                    {ufr.user_name}
                  </span>
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="ml-4 rounded-lg p-1.5 text-xl leading-none text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              aria-label="Đóng"
            >
              ✕
            </button>
          </div>

          {/* ── Body ────────────────────────────────────────────────────── */}
          {loading ? (
            <div className="flex h-48 items-center justify-center">
              <svg
                className="h-8 w-8 animate-spin text-primary-500"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            </div>
          ) : ufr ? (
            <div className="px-6 py-5 space-y-5">
              {/* Banners */}
              {ufr.is_deleted && (
                <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm">
                  <span>⚠️</span>
                  <p className="font-semibold text-red-700">Tài khoản đã bị xóa</p>
                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => setConfirmAction("restore")}
                      className="ml-auto rounded-lg border border-blue-300 bg-white px-3 py-1 text-xs font-semibold text-blue-700 transition hover:bg-blue-50"
                    >
                      ♻️ Khôi phục
                    </button>
                  )}
                </div>
              )}
              {!ufr.is_deleted && !ufr.is_active && (
                <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
                  <span>🔕</span>
                  <p className="font-semibold text-amber-700">Tài khoản đang không hoạt động</p>
                </div>
              )}

              <form onSubmit={handleSave} className="space-y-5">
                {/* Tên + Email */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Tên người dùng *">
                    <input
                      type="text"
                      required
                      disabled={!canEdit || ufr.is_deleted}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Nguyễn Văn A"
                      className={inputCls(!canEdit || ufr.is_deleted)}
                    />
                  </Field>
                  <Field label="Email" hint="Không thể thay đổi">
                    <input
                      type="email"
                      disabled
                      value={ufr.user_email}
                      className={inputCls(true)}
                    />
                  </Field>
                </div>

                {/* Số điện thoại */}
                <Field label="Số điện thoại" hint="VD: 0912345678 (10 số, bắt đầu bằng 0)">
                  <input
                    type="tel"
                    disabled={!canEdit || ufr.is_deleted}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0912345678"
                    pattern="0[0-9]{9}"
                    className={inputCls(!canEdit || ufr.is_deleted)}
                  />
                </Field>

                {/* Vai trò + Trạng thái */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Vai trò *">
                    <div className="relative">
                      <select
                        required
                        disabled={!canEdit || ufr.is_deleted}
                        value={roleId}
                        onChange={(e) => setRoleId(e.target.value)}
                        className={selectCls(!canEdit || ufr.is_deleted)}
                      >
                        <option value="">-- Chọn vai trò --</option>
                        {roles.map((r) => (
                          <option key={r.value} value={r.value}>
                            {r.name}
                          </option>
                        ))}
                      </select>
                      <ChevronIcon />
                    </div>
                  </Field>
                  <Field label="Trạng thái">
                    <div className="relative">
                      <select
                        disabled={!canEdit || ufr.is_deleted}
                        value={isActive ? "1" : "0"}
                        onChange={(e) => setIsActive(e.target.value === "1")}
                        className={selectCls(!canEdit || ufr.is_deleted)}
                      >
                        <option value="1">✅ Hoạt động</option>
                        <option value="0">❌ Không hoạt động</option>
                      </select>
                      {(!canEdit || ufr.is_deleted) && <ChevronIcon />}
                    </div>
                  </Field>
                </div>

                {/* Xác thực email + Đại lý */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Xác thực email">
                    <div className={`${inputCls(true)} flex items-center gap-2`}>
                      {ufr.is_active ? (
                        <>
                          <span className="text-green-600">✓</span>
                          <span>Đã xác thực</span>
                        </>
                      ) : (
                        <>
                          <span className="text-slate-400">✗</span>
                          <span className="text-slate-500">Chưa xác thực</span>
                        </>
                      )}
                      <span className="ml-auto text-xs italic text-slate-400">Chỉ đọc</span>
                    </div>
                  </Field>
                  <Field label="Franchise" hint={'Để thêm franchise khác: dùng nút "Gán vai trò người dùng"'}>
                    <div className={`${inputCls(true)} flex items-center gap-2`}>
                      <span className="truncate">
                        {ufr.franchise_code
                          ? `${ufr.franchise_code} — ${ufr.franchise_name}`
                          : ufr.franchise_name || "—"}
                      </span>
                      <span className="ml-auto shrink-0 text-xs italic text-slate-400">Chỉ đọc</span>
                    </div>
                  </Field>
                </div>

                {/* Ghi chú */}
                <Field label="Ghi chú" hint="Ghi chú cho vai trò này (tùy chọn)">
                  <input
                    type="text"
                    disabled={!canEdit || ufr.is_deleted}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Ghi chú..."
                    className={inputCls(!canEdit || ufr.is_deleted)}
                  />
                </Field>

                {/* System info */}
                <div className="grid grid-cols-2 gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4 text-xs text-slate-500">
                  <div>
                    <span className="mb-0.5 block font-semibold uppercase tracking-wide text-slate-400">Ngày tạo</span>
                    {fmtDate(ufr.created_at)}
                  </div>
                  <div>
                    <span className="mb-0.5 block font-semibold uppercase tracking-wide text-slate-400">Cập nhật lần cuối</span>
                    {fmtDate(ufr.updated_at)}
                  </div>
                </div>

                {/* ── Footer actions ─────────────────────────────────────── */}
                <div className="flex items-center gap-3 border-t border-slate-100 pt-1">
                  {/* Destructive */}
                  {canDelete && !ufr.is_deleted && (
                    <button
                      type="button"
                      onClick={() => setConfirmAction("delete")}
                      className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100"
                    >
                      🗑 Xóa
                    </button>
                  )}
                  {canDelete && ufr.is_deleted && (
                    <button
                      type="button"
                      onClick={() => setConfirmAction("restore")}
                      className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
                    >
                      ♻️ Khôi phục
                    </button>
                  )}

                  {/* Primary */}
                  <div className="ml-auto flex gap-3">
                    <button
                      type="button"
                      onClick={onClose}
                      className="rounded-lg border border-slate-300 bg-white px-5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Hủy
                    </button>
                    {canEdit && !ufr.is_deleted && (
                      <button
                        type="submit"
                        disabled={saving}
                        className="flex items-center gap-2 rounded-lg bg-primary-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-primary-600 disabled:opacity-60"
                      >
                        {saving ? (
                          <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                          </svg>
                        ) : (
                          "✏️"
                        )}
                        Cập nhật
                      </button>
                    )}
                  </div>
                </div>
              </form>
            </div>
          ) : null}
        </div>
      </div>

      {/* ── Confirm sub-dialog ────────────────────────────────────────────── */}
      {confirmAction && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-2xl">
            <div className="mb-3 text-4xl">
              {confirmAction === "delete" ? "🗑" : "♻️"}
            </div>
            <h3 className="mb-2 text-lg font-bold text-slate-900">
              {confirmAction === "delete" ? "Xác nhận xóa?" : "Xác nhận khôi phục?"}
            </h3>
            <p className="mb-6 text-sm text-slate-500">
              {confirmAction === "delete"
                ? "Vai trò này sẽ bị soft delete. Có thể khôi phục sau."
                : "Vai trò này sẽ được khôi phục và hoạt động trở lại."}
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleConfirm}
                disabled={confirming}
                className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition disabled:opacity-60 ${
                  confirmAction === "delete"
                    ? "bg-red-500 hover:bg-red-600"
                    : "bg-blue-500 hover:bg-blue-600"
                }`}
              >
                {confirming
                  ? "..."
                  : confirmAction === "delete"
                  ? "Xóa"
                  : "Khôi phục"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                disabled={confirming}
                className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// ─── field sub-component ─────────────────────────────────────────────────────

const Field = ({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) => (
  <div className="space-y-1.5">
    <label className="block text-sm font-semibold text-slate-700">{label}</label>
    {children}
    {hint && <p className="text-xs text-slate-400">{hint}</p>}
  </div>
);

const inputCls = (disabled: boolean) =>
  `w-full rounded-lg border px-4 py-2.5 text-sm outline-none transition ${
    disabled
      ? "border-slate-200 bg-slate-50 text-slate-500 cursor-not-allowed"
      : "border-slate-300 bg-white text-slate-800 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
  }`;

const selectCls = (disabled: boolean) =>
  `w-full rounded-lg border px-4 py-2.5 text-sm outline-none transition appearance-none ${
    disabled
      ? "border-slate-200 bg-slate-50 text-slate-500 cursor-not-allowed"
      : "border-slate-300 bg-white text-slate-800 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
  }`;

const ChevronIcon = () => (
  <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
    <svg
      className="h-4 w-4 text-slate-400"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  </div>
);

export default UserDetailModal;

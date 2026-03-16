import { useEffect, useRef, useState } from "react";
import { fetchRoles, type RoleSelectItem } from "../../../services/user.service";
import { showError } from "../../../utils";

const getRoleBadge = (code: string) => {
  switch (code?.toUpperCase()) {
    case "ADMIN":
      return { cls: "bg-red-500/20 text-red-300 border border-red-500/40", dot: "bg-red-400", iconBg: "bg-red-500/15" };
    case "MANAGER":
      return { cls: "bg-amber-500/20 text-amber-300 border border-amber-500/40", dot: "bg-amber-400", iconBg: "bg-amber-500/15" };
    case "STAFF":
      return { cls: "bg-blue-500/20 text-blue-300 border border-blue-500/40", dot: "bg-blue-400", iconBg: "bg-blue-500/15" };
    case "SHIPPER":
      return { cls: "bg-violet-500/20 text-violet-300 border border-violet-500/40", dot: "bg-violet-400", iconBg: "bg-violet-500/15" };
    case "USER":
      return { cls: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40", dot: "bg-emerald-400", iconBg: "bg-emerald-500/15" };
    default:
      return { cls: "bg-slate-500/20 text-slate-300 border border-slate-500/40", dot: "bg-slate-400", iconBg: "bg-slate-500/15" };
  }
};

const getScopeBadge = (scope: string) => {
  switch (scope?.toUpperCase()) {
    case "GLOBAL":
      return "bg-blue-500/20 text-blue-300 border border-blue-500/40";
    case "FRANCHISE":
      return "bg-amber-500/20 text-amber-300 border border-amber-500/40";
    default:
      return "bg-slate-500/20 text-slate-300 border border-slate-500/40";
  }
};

const getRoleIcon = (code: string) => {
  switch (code?.toUpperCase()) {
    case "ADMIN":   return "🛡️";
    case "MANAGER": return "👔";
    case "STAFF":   return "👤";
    case "SHIPPER": return "🚚";
    case "USER":    return "🏠";
    default:        return "🔑";
  }
};

const RoleListPage = () => {
  const [roles, setRoles] = useState<RoleSelectItem[]>([]);
  const [loading, setLoading] = useState(false);
  const hasRun = useRef(false);

  const loadRoles = async () => {
    setLoading(true);
    try {
      const data = await fetchRoles();
      setRoles(data);
    } catch (err) {
      console.error("[RoleList] error:", err);
      showError("Lấy danh sách role thất bại");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;
    loadRoles();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Quản lý Roles</h1>
          <p className="mt-1 text-sm text-slate-500">
            Danh sách các vai trò trong hệ thống ({roles.length} roles)
          </p>
        </div>
        <button
          onClick={loadRoles}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
        >
          <svg
            className={`size-4 ${loading ? "animate-spin" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Tải lại
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-3">
            <span className="size-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-500" />
            <p className="text-sm text-slate-500">Đang tải danh sách role...</p>
          </div>
        </div>
      )}

      {/* Table */}
      {!loading && roles.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">#</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Role</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Code</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Scope</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {roles.map((role, index) => {
                const badge = getRoleBadge(role.code);
                return (
                  <tr key={role.value} className="transition-colors hover:bg-slate-50/80">
                    <td className="px-6 py-4 text-sm text-slate-500">{index + 1}</td>

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <span className={`flex size-9 items-center justify-center rounded-xl text-lg ${badge.iconBg}`}>
                          {getRoleIcon(role.code)}
                        </span>
                        <span className="text-sm font-semibold text-slate-900">{role.name}</span>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${badge.cls}`}>
                        <span className={`size-1.5 rounded-full shrink-0 ${badge.dot}`} />
                        {role.code}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${getScopeBadge(role.scope)}`}>
                        {role.scope}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty state */}
      {!loading && roles.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 py-16">
          <svg className="mb-4 size-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
            />
          </svg>
          <p className="text-sm font-medium text-slate-500">Không có role nào</p>
          <p className="mt-1 text-xs text-slate-400">Hệ thống chưa có dữ liệu role</p>
        </div>
      )}
    </div>
  );
};

export default RoleListPage;

import { useEffect, useRef, useState } from "react";
import { fetchRoles, type RoleSelectItem } from "../../../services/user.service";
import { showError } from "../../../utils";

const RoleListPage = () => {
  const [roles, setRoles] = useState<RoleSelectItem[]>([]);
  const [loading, setLoading] = useState(false);
  const hasRun = useRef(false);

  const loadRoles = async () => {
    setLoading(true);
    try {
      const data = await fetchRoles();
      console.log("[RoleList] fetched roles:", data);
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

  const getScopeColor = (scope: string) => {
    switch (scope.toUpperCase()) {
      case "GLOBAL":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "FRANCHISE":
        return "bg-amber-100 text-amber-700 border-amber-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const getRoleIcon = (code: string) => {
    switch (code.toUpperCase()) {
      case "ADMIN":
        return "🛡️";
      case "MANAGER":
        return "👔";
      case "STAFF":
        return "👤";
      case "SHIPPER":
        return "🚚";
      case "USER":
        return "🏠";
      default:
        return "🔑";
    }
  };

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
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Tải lại
        </button>
      </div>

      {/* Loading state */}
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
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  #
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Role
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Code
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Scope
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  ID
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {roles.map((role, index) => (
                <tr
                  key={role.value}
                  className="transition-colors hover:bg-slate-50/80"
                >
                  <td className="px-6 py-4 text-sm text-slate-500">
                    {index + 1}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{getRoleIcon(role.code)}</span>
                      <span className="text-sm font-semibold text-slate-900">
                        {role.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <code className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                      {role.code}
                    </code>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getScopeColor(role.scope)}`}
                    >
                      {role.scope}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-mono text-xs text-slate-400">
                      {role.value}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty state */}
      {!loading && roles.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 py-16">
          <svg
            className="mb-4 size-12 text-slate-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
            />
          </svg>
          <p className="text-sm font-medium text-slate-500">Không có role nào</p>
          <p className="mt-1 text-xs text-slate-400">
            Hệ thống chưa có dữ liệu role
          </p>
        </div>
      )}
    </div>
  );
};

export default RoleListPage;

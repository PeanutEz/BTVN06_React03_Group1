import { useState } from "react";
import type { RoleInfo } from "../../services/auth.service";

interface FranchisePickerModalProps {
  roles: RoleInfo[];
  onSelect: (role: RoleInfo) => void;
  onClose: () => void;
  loading?: boolean;
}

export default function FranchisePickerModal({
  roles,
  onSelect,
  onClose,
  loading = false,
}: FranchisePickerModalProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const handleConfirm = () => {
    if (selectedIndex !== null) {
      onSelect(roles[selectedIndex]);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={!loading ? onClose : undefined}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-slide-in mx-4">
        {/* Header */}
        <div className="mb-5">
          <h2 className="text-xl font-bold text-slate-900">Chọn chi nhánh</h2>
          <p className="mt-1 text-sm text-slate-500">
            Bạn có quyền truy cập nhiều chi nhánh. Vui lòng chọn chi nhánh để tiếp tục.
          </p>
        </div>

        {/* Role / Franchise list */}
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {roles.map((role, index) => (
            <button
              key={`${role.franchise_id}-${role.role}`}
              type="button"
              disabled={loading}
              onClick={() => setSelectedIndex(index)}
              className={`w-full flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition-all duration-200 ${
                selectedIndex === index
                  ? "border-primary-500 bg-primary-50 ring-2 ring-primary-500/20"
                  : "border-slate-200 bg-white hover:border-primary-300 hover:bg-slate-50"
              } ${loading ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
            >
              {/* Icon */}
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-lg ${
                  selectedIndex === index
                    ? "bg-primary-500 text-white"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                🏪
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-900 truncate">
                  {role.franchise_name || "Hệ thống (Global)"}
                </p>
                <p className="text-xs text-slate-500">
                  Role: <span className="font-medium text-slate-700">{role.role}</span>
                  {" · "}
                  Scope: <span className="font-medium text-slate-700">{role.scope}</span>
                </p>
              </div>

              {/* Check mark */}
              {selectedIndex === index && (
                <svg
                  className="h-5 w-5 shrink-0 text-primary-500"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
          >
            Huỷ
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={selectedIndex === null || loading}
            className="flex-1 rounded-lg bg-primary-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-600 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading && (
              <span className="size-4 animate-spin rounded-full border-2 border-white/60 border-t-white" />
            )}
            {loading ? "Đang xử lý..." : "Xác nhận"}
          </button>
        </div>
      </div>
    </div>
  );
}

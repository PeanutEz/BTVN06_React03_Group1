import { useState } from "react";
import type { RoleInfo } from "../../services/auth.service";

interface FranchisePickerModalProps {
  roles: RoleInfo[];
  onSelect: (role: RoleInfo) => void;
  onClose: () => void;
  loading?: boolean;
  currentFranchiseId?: string | null;
}

export default function FranchisePickerModal({
  roles,
  onSelect,
  onClose,
  loading = false,
  currentFranchiseId,
}: FranchisePickerModalProps) {
  const getInitialIndex = () => {
    if (currentFranchiseId === undefined || currentFranchiseId === null) return null;
    const idx = roles.findIndex((r) => r.franchise_id === currentFranchiseId);
    return idx >= 0 ? idx : null;
  };
  const [selectedIndex, setSelectedIndex] = useState<number | null>(getInitialIndex);

  const handleConfirm = () => {
    if (selectedIndex !== null) {
      onSelect(roles[selectedIndex]);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop — nhạt để màu nền admin hiện qua, tạo hiệu ứng glassmorphism */}
      <div
        className="absolute inset-0 bg-black/25"
        onClick={!loading ? onClose : undefined}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-md rounded-2xl p-6 animate-slide-in mx-4"
        style={{
          background: "rgba(255, 255, 255, 0.12)",
          backdropFilter: "blur(40px) saturate(200%)",
          WebkitBackdropFilter: "blur(40px) saturate(200%)",
          border: "1px solid rgba(255, 255, 255, 0.25)",
          boxShadow: "0 25px 60px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)",
        }}
      >
        {/* Header */}
        <div className="mb-5">
          <h2 className="text-xl font-bold text-white/95">Chọn chi nhánh</h2>
          <p className="mt-1 text-sm text-white/50">
            Bạn có quyền truy cập nhiều chi nhánh. Vui lòng chọn chi nhánh để tiếp tục.
          </p>
        </div>        {/* Role / Franchise list */}
        <div className="space-y-2 max-h-60 overflow-y-auto pr-0.5">
          {roles.map((role, index) => {
            const isSelected = selectedIndex === index;
            const isCurrent = role.franchise_id === currentFranchiseId;
            return (
              <button
                key={`${role.franchise_id}-${role.role}`}
                type="button"
                disabled={loading}
                onClick={() => setSelectedIndex(index)}
                className={`w-full flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition-all duration-200 ${
                  isSelected
                    ? "border-primary-400/70 bg-primary-400/20 ring-2 ring-primary-400/30"
                    : isCurrent
                    ? "border-emerald-400/50 bg-emerald-400/10"
                    : "border-white/[0.12] bg-white/[0.06] hover:border-primary-300/40 hover:bg-white/[0.1]"
                } ${loading ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
              >
                {/* Icon */}
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-lg ${
                    isSelected
                      ? "bg-primary-500/80 text-white"
                      : isCurrent
                      ? "bg-emerald-500/30 text-emerald-300"
                      : "bg-white/[0.1] text-white/50"
                  }`}
                >
                  🏪
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-white/90 truncate">
                      {role.franchise_name || "Hệ thống (Global)"}
                    </p>
                    {isCurrent && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.5 text-[10px] font-semibold text-emerald-300 shrink-0">
                        <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Hiện tại
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-white/50">
                    Role: <span className="font-medium text-white/70">{role.role}</span>
                    {" · "}
                    Scope: <span className="font-medium text-white/70">{role.scope}</span>
                  </p>
                </div>

                {/* Check mark */}
                {isSelected && (
                  <svg
                    className="h-5 w-5 shrink-0 text-primary-400"
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
            );
          })}
        </div>

        {/* Actions */}
        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 rounded-xl border border-white/[0.15] px-4 py-2.5 text-sm font-semibold text-white/70 transition hover:bg-white/[0.1] hover:text-white disabled:opacity-60"
          >
            Huỷ
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={selectedIndex === null || loading}
            className="flex-1 rounded-xl bg-primary-500/80 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary-500/30 transition hover:bg-primary-500 hover:scale-[1.02] active:scale-100 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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

import { createContext, useContext, useRef, useState, useCallback, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface ConfirmOptions {
  message: string;
  title?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "info";
}

type ConfirmFn = (options: ConfirmOptions | string) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn>(() => Promise.resolve(false));

export const useConfirm = () => useContext(ConfirmContext);

interface DialogState extends ConfirmOptions {
  resolve: (value: boolean) => void;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const resolveRef = useRef<((v: boolean) => void) | null>(null);

  const showConfirm = useCallback((options: ConfirmOptions | string): Promise<boolean> => {
    const opts: ConfirmOptions = typeof options === "string" ? { message: options } : options;
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setDialog({ ...opts, resolve });
    });
  }, []);

  const handleConfirm = () => {
    resolveRef.current?.(true);
    setDialog(null);
  };

  const handleCancel = () => {
    resolveRef.current?.(false);
    setDialog(null);
  };

  const variant = dialog?.variant ?? "danger";
  const title = dialog?.title ?? (variant === "danger" ? "Xác nhận xóa" : "Xác nhận");
  const confirmText = dialog?.confirmText ?? (variant === "danger" ? "Xóa" : "Xác nhận");
  const cancelText = dialog?.cancelText ?? "Hủy";

  const iconMap = {
    danger: (
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-red-500/20 border border-red-400/30">
        <svg className="h-7 w-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </div>
    ),
    warning: (
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-amber-500/20 border border-amber-400/30">
        <svg className="h-7 w-7 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
    ),
    info: (
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-blue-500/20 border border-blue-400/30">
        <svg className="h-7 w-7 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
    ),
  };

  const confirmBtnMap = {
    danger: "bg-red-500/80 hover:bg-red-500 shadow-red-500/30",
    warning: "bg-amber-500/80 hover:bg-amber-500 shadow-amber-500/30",
    info: "bg-blue-500/80 hover:bg-blue-500 shadow-blue-500/30",
  };

  const accentMap = {
    danger: "bg-red-400/80",
    warning: "bg-amber-400/80",
    info: "bg-blue-400/80",
  };

  return (
    <ConfirmContext.Provider value={showConfirm}>
      {children}
      {dialog && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          {/* Backdrop — nhạt để màu nền admin hiện qua, tạo hiệu ứng glassmorphism */}
          <div
            className="absolute inset-0 bg-black/25"
            onClick={handleCancel}
          />

          {/* Dialog box */}
          <div
            className="relative w-full max-w-sm overflow-hidden rounded-2xl p-6"
            style={{
              background: "rgba(255, 255, 255, 0.12)",
              backdropFilter: "blur(40px) saturate(200%)",
              WebkitBackdropFilter: "blur(40px) saturate(200%)",
              border: "1px solid rgba(255, 255, 255, 0.25)",
              boxShadow: "0 25px 60px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)",
            }}
          >
            {/* Top accent line */}
            <div className={`absolute inset-x-0 top-0 h-0.5 ${accentMap[variant]}`} />

            <div className="flex gap-4">
              {iconMap[variant]}

              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-white/95">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-white/60">{dialog.message}</p>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={handleCancel}
                className="flex-1 rounded-xl border border-white/[0.15] px-4 py-2.5 text-sm font-medium text-white/70 transition hover:bg-white/[0.1] hover:text-white focus:outline-none"
              >
                {cancelText}
              </button>
              <button
                onClick={handleConfirm}
                className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:scale-[1.02] active:scale-100 focus:outline-none ${confirmBtnMap[variant]}`}
              >
                {confirmText}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </ConfirmContext.Provider>
  );
}

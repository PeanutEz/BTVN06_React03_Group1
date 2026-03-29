import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useDeliveryStore } from "@/store/delivery.store";
import { clientService } from "@/services/client.service";
import type { ClientFranchiseItem } from "@/models/store.model";

interface BranchPickerModalProps {
  onClose: () => void;
  /** Nếu true thì không hiện nút X — bắt buộc phải chọn chi nhánh */
  required?: boolean;
}

export default function BranchPickerModal({ onClose, required = false }: BranchPickerModalProps) {
  const { setOrderMode, setSelectedFranchiseId, selectedFranchiseId } = useDeliveryStore();

  const [franchises, setFranchises] = useState<ClientFranchiseItem[]>([]);
  const [loadingFranchises, setLoadingFranchises] = useState(false);
  const [franchiseError, setFranchiseError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let alive = true;
    setLoadingFranchises(true);
    setFranchiseError(null);
    clientService
      .getAllFranchises()
      .then((data) => { if (alive) setFranchises(data); })
      .catch((e: unknown) => {
        if (!alive) return;
        setFranchiseError(e instanceof Error ? e.message : "Không tải được danh sách chi nhánh");
        setFranchises([]);
      })
      .finally(() => { if (alive) setLoadingFranchises(false); });
    return () => { alive = false; };
  }, []);

  function handleSelectFranchise(id: string, name: string) {
    setSelectedFranchiseId(id, name);
    setOrderMode("PICKUP");
    onClose();
  }

  const filtered = franchises.filter(
    (f) =>
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      (f.code ?? "").toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      {/* Backdrop — chỉ đóng khi không required */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={required ? undefined : onClose}
      />

      {/* Panel */}
      <div
        data-allow-overlay-scroll="true"
        className="relative bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85dvh]"
      >

        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center text-2xl shrink-0">
                🏪
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900 leading-tight">Chi nhánh</h2>
                <p className="text-xs text-gray-500">Chọn chi nhánh để xem thực đơn</p>
              </div>
            </div>
            {!required && (
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 transition-colors shrink-0"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Search */}
          <div className="mt-3 relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 105 11a6 6 0 0012 0z" />
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm tên hoặc mã chi nhánh..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 bg-gray-50"
            />
          </div>
        </div>

        {/* Body — danh sách chi nhánh */}
        <div
          data-allow-overlay-scroll="true"
          className="flex-1 overflow-y-auto min-h-0 p-4 space-y-2"
        >
          {loadingFranchises && franchises.length === 0 ? (
            <div className="flex justify-center py-10">
              <svg className="w-7 h-7 animate-spin text-amber-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          ) : franchiseError ? (
            <p className="text-center text-sm text-red-500 py-8">{franchiseError}</p>
          ) : filtered.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-8">
              {search ? "Không tìm thấy chi nhánh phù hợp" : "Không có chi nhánh nào"}
            </p>
          ) : (
            filtered.map((f) => {
              const isSelected =
                selectedFranchiseId !== null &&
                String(selectedFranchiseId) === String(f.id);
              return (
                <button
                  key={String(f.id)}
                  onClick={() => handleSelectFranchise(String(f.id), f.name)}
                  className={cn(
                    "w-full text-left rounded-xl border px-4 py-3.5 transition-all active:scale-[0.99]",
                    isSelected
                      ? "border-amber-500 bg-amber-50 ring-2 ring-amber-200"
                      : "border-gray-200 hover:border-amber-300 hover:bg-amber-50/40 bg-white",
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-9 h-9 rounded-lg flex items-center justify-center text-lg shrink-0",
                      isSelected ? "bg-amber-100" : "bg-gray-100",
                    )}>
                      🏠
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{f.name}</p>
                      {f.code && <p className="text-xs text-gray-400 mt-0.5">{f.code}</p>}
                    </div>
                    {isSelected ? (
                      <span className="flex items-center gap-1 text-xs font-semibold text-amber-600 shrink-0">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                        Đang chọn
                      </span>
                    ) : (
                      <svg className="w-4 h-4 text-gray-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer hint khi required */}
        {required && (
          <div className="px-5 py-3 border-t border-gray-100 bg-amber-50/60">
            <p className="text-xs text-amber-700 text-center font-medium">
              Vui lòng chọn một chi nhánh để tiếp tục xem thực đơn
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

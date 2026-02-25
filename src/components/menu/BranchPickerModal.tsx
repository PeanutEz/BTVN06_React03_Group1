import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import type { Branch, OrderMode } from "@/types/delivery.types";
import { branches, isBranchOpen } from "@/services/branch.service";
import { useDeliveryStore } from "@/store/delivery.store";
import { useMenuCartStore } from "@/store/menu-cart.store";

const fmt = (n: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n);

interface BranchPickerModalProps {
  onClose: () => void;
}

export default function BranchPickerModal({ onClose }: BranchPickerModalProps) {
  const {
    orderMode,
    selectedBranch,
    deliveryAddress,
    validationResult,
    isValidating,
    setOrderMode,
    setSelectedBranch,
    setDeliveryAddress,
    validateAddress,
  } = useDeliveryStore();

  const clearCart = useMenuCartStore((s) => s.clearCart);

  const [activeTab, setActiveTab] = useState<OrderMode>(orderMode);
  const [addressInput, setAddressInput] = useState(deliveryAddress.rawAddress);
  const [cityFilter, setCityFilter] = useState("all");
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus address input when switching to delivery tab
  useEffect(() => {
    if (activeTab === "DELIVERY") {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [activeTab]);

  const cities = Array.from(new Set(branches.map((b) => b.city)));
  const filteredBranches = branches.filter(
    (b) => cityFilter === "all" || b.city === cityFilter,
  );

  function handleTabChange(tab: OrderMode) {
    setActiveTab(tab);
    setOrderMode(tab);
  }

  function handleValidate() {
    setDeliveryAddress(addressInput);
    setTimeout(() => validateAddress(), 0);
  }

  function handleSelectBranch(branch: Branch) {
    setSelectedBranch(branch, clearCart);
    setOrderMode(activeTab);
    onClose();
  }

  function handleConfirmDelivery() {
    if (validationResult?.isValid && validationResult.nearestBranch) {
      setSelectedBranch(validationResult.nearestBranch, clearCart);
      onClose();
    }
  }

  const isOpen = isBranchOpen;

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90dvh]">
        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Chọn phương thức đặt hàng</h2>
              <p className="text-xs text-gray-500 mt-0.5">Giao hàng hoặc đến lấy tại cửa hàng</p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2">
            {(
              [
                { tab: "DELIVERY" as OrderMode, icon: "🛵", label: "Giao hàng" },
                { tab: "PICKUP" as OrderMode, icon: "🏪", label: "Lấy tại cửa hàng" },
              ] as const
            ).map(({ tab, icon, label }) => (
              <button
                key={tab}
                onClick={() => handleTabChange(tab)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all duration-200",
                  activeTab === tab
                    ? "bg-amber-500 text-white shadow-sm shadow-amber-200"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200",
                )}
              >
                <span>{icon}</span>
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {/* ── DELIVERY TAB ── */}
          {activeTab === "DELIVERY" && (
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  📍 Địa chỉ giao hàng
                </label>
                <div className="flex gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={addressInput}
                    onChange={(e) => setAddressInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleValidate()}
                    placeholder="VD: 45 Nguyễn Huệ, Quận 1, TP.HCM"
                    className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-400 transition-all"
                  />
                  <button
                    onClick={handleValidate}
                    disabled={isValidating || !addressInput.trim()}
                    className={cn(
                      "shrink-0 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all",
                      isValidating || !addressInput.trim()
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                        : "bg-amber-500 hover:bg-amber-600 text-white active:scale-95",
                    )}
                  >
                    {isValidating ? (
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : (
                      "Kiểm tra"
                    )}
                  </button>
                </div>

                {/* Address hint */}
                <p className="text-xs text-gray-400 mt-1.5">
                  Hỗ trợ: Hà Nội · TP. Hồ Chí Minh · Đà Nẵng
                </p>
              </div>

              {/* Validation result */}
              {validationResult && (
                <div
                  className={cn(
                    "rounded-2xl border p-4 transition-all",
                    validationResult.isValid
                      ? "bg-emerald-50 border-emerald-200"
                      : "bg-red-50 border-red-200",
                  )}
                >
                  {validationResult.isValid && validationResult.nearestBranch ? (
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <span className="text-2xl shrink-0">✅</span>
                        <div>
                          <p className="font-semibold text-emerald-800 text-sm">Có thể giao hàng!</p>
                          <p className="text-xs text-emerald-700 mt-0.5">
                            Chi nhánh sẽ phục vụ: <strong>{validationResult.nearestBranch.name}</strong>
                          </p>
                        </div>
                      </div>

                      {/* Branch info card */}
                      <div className="bg-white rounded-xl p-3 border border-emerald-100 space-y-2">
                        <div className="flex items-center gap-2">
                          <img
                            src={validationResult.nearestBranch.imageUrl}
                            alt=""
                            className="w-10 h-10 rounded-lg object-cover"
                          />
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{validationResult.nearestBranch.name}</p>
                            <p className="text-xs text-gray-500">{validationResult.nearestBranch.address}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className="bg-gray-50 rounded-lg p-2">
                            <p className="text-xs text-gray-500">Khoảng cách</p>
                            <p className="text-sm font-bold text-gray-900">{validationResult.distanceKm?.toFixed(1)} km</p>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-2">
                            <p className="text-xs text-gray-500">Phí giao hàng</p>
                            <p className="text-sm font-bold text-amber-600">
                              {validationResult.estimatedDeliveryFee === 0
                                ? "Miễn phí"
                                : fmt(validationResult.estimatedDeliveryFee ?? 0)}
                            </p>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-2">
                            <p className="text-xs text-gray-500">Thời gian</p>
                            <p className="text-sm font-bold text-gray-900">
                              ~{validationResult.nearestBranch.prepTimeMins + validationResult.nearestBranch.deliveryTimeMins} phút
                            </p>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={handleConfirmDelivery}
                        className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-semibold text-sm transition-all active:scale-[0.98]"
                      >
                        Xác nhận địa chỉ này →
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3">
                      <span className="text-2xl shrink-0">🚫</span>
                      <div>
                        <p className="font-semibold text-red-800 text-sm">Ngoài vùng giao hàng</p>
                        <p className="text-xs text-red-600 mt-0.5">{validationResult.message}</p>
                        {validationResult.nearestBranch && (
                          <p className="text-xs text-red-500 mt-1">
                            Bạn có thể chọn lấy tại cửa hàng tại{" "}
                            <button
                              onClick={() => handleTabChange("PICKUP")}
                              className="font-semibold underline"
                            >
                              {validationResult.nearestBranch.name}
                            </button>
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Free shipping hint */}
              <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-xl p-3">
                <span className="text-lg">🎁</span>
                <p className="text-xs text-amber-800">
                  Miễn phí giao hàng cho đơn từ{" "}
                  <strong>{fmt(150000)}</strong> trở lên
                </p>
              </div>
            </div>
          )}

          {/* ── PICKUP TAB ── */}
          {activeTab === "PICKUP" && (
            <div className="p-5 space-y-4">
              {/* City filter */}
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                <button
                  onClick={() => setCityFilter("all")}
                  className={cn(
                    "shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all",
                    cityFilter === "all"
                      ? "bg-amber-500 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200",
                  )}
                >
                  Tất cả
                </button>
                {cities.map((city) => (
                  <button
                    key={city}
                    onClick={() => setCityFilter(city)}
                    className={cn(
                      "shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all",
                      cityFilter === city
                        ? "bg-amber-500 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200",
                    )}
                  >
                    {city}
                  </button>
                ))}
              </div>

              {/* Branch list */}
              <div className="space-y-3">
                {filteredBranches.map((branch) => {
                  const open = isOpen(branch);
                  const isSelected = selectedBranch?.id === branch.id;
                  return (
                    <button
                      key={branch.id}
                      onClick={() => open && handleSelectBranch(branch)}
                      disabled={!open}
                      className={cn(
                        "w-full text-left rounded-2xl border p-4 transition-all duration-150",
                        !open && "opacity-50 cursor-not-allowed",
                        open && isSelected && "border-amber-500 bg-amber-50 ring-2 ring-amber-200",
                        open && !isSelected && "border-gray-200 hover:border-amber-300 hover:bg-amber-50/50 bg-white",
                      )}
                    >
                      <div className="flex gap-3">
                        <img
                          src={branch.imageUrl}
                          alt={branch.name}
                          className="w-14 h-14 rounded-xl object-cover shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-semibold text-sm text-gray-900 leading-tight">{branch.name}</p>
                            <span
                              className={cn(
                                "shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full",
                                open
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-gray-100 text-gray-500",
                              )}
                            >
                              {open ? "Đang mở" : "Đã đóng"}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5 truncate">{branch.address}, {branch.district}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            {branch.openingHours.days} · {branch.openingHours.open}–{branch.openingHours.close}
                          </p>
                          <div className="flex items-center gap-3 mt-1.5">
                            <span className="text-xs text-amber-600 font-medium">☕ ~{branch.prepTimeMins} phút pha chế</span>
                            {isSelected && (
                              <span className="text-xs text-amber-600 font-semibold">✓ Đã chọn</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

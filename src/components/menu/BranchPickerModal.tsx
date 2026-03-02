import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import type { Branch, OrderMode } from "@/types/delivery.types";
import { branches, isBranchOpen } from "@/services/branch.service";
import { useDeliveryStore } from "@/store/delivery.store";
import { useMenuCartStore } from "@/store/menu-cart.store";
import { useAddressStore } from "@/store/address.store";

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
  const { addresses, add: addAddress } = useAddressStore();

  const [activeTab, setActiveTab] = useState<OrderMode>(orderMode);
  const [addressInput, setAddressInput] = useState(deliveryAddress.rawAddress);
  const [cityFilter, setCityFilter] = useState("all");
  const pendingConfirm = useRef(false);
  const [loadingAddrId, setLoadingAddrId] = useState<number | null>(null);

  // Add-new-address form state
  const [showNewAddressForm, setShowNewAddressForm] = useState(false);
  const [newAddrForm, setNewAddrForm] = useState({ name: "", phone: "", address: "" });

  // Auto-confirm after validation when triggered by address selection
  useEffect(() => {
    if (!isValidating && pendingConfirm.current) {
      pendingConfirm.current = false;
      setLoadingAddrId(null);
      if (validationResult?.isValid && validationResult.nearestBranch) {
        setSelectedBranch(validationResult.nearestBranch, clearCart);
        onClose();
      }
    }
  }, [isValidating, validationResult]);

  const cities = Array.from(new Set(branches.map((b) => b.city)));
  const filteredBranches = branches.filter(
    (b) => cityFilter === "all" || b.city === cityFilter,
  );

  function handleTabChange(tab: OrderMode) {
    setActiveTab(tab);
    setOrderMode(tab);
  }

  function handleSelectDeliveryAddr(address: string, addrId?: number) {
    setAddressInput(address);
    setDeliveryAddress(address);
    if (addrId !== undefined) setLoadingAddrId(addrId);
    pendingConfirm.current = true;
    setTimeout(() => validateAddress(), 0);
  }

  function handleSelectBranch(branch: Branch) {
    setSelectedBranch(branch, clearCart);
    setOrderMode(activeTab);
    onClose();
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

              {/* Saved addresses */}
              {addresses.length > 0 ? (
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">📋 Địa chỉ của tôi</p>
                  <div className="space-y-2">
                    {addresses.map((addr) => {
                      const isLoading = loadingAddrId === addr.id;
                      const isSelected = addressInput === addr.address && orderMode === "DELIVERY" && selectedBranch !== null;
                      return (
                        <button
                          key={addr.id}
                          disabled={isLoading}
                          onClick={() => handleSelectDeliveryAddr(addr.address, addr.id)}
                          className={cn(
                            "w-full text-left rounded-xl border px-4 py-3 transition-all",
                            isSelected
                              ? "border-amber-500 bg-amber-50 ring-2 ring-amber-200"
                              : "border-gray-200 hover:border-amber-300 hover:bg-amber-50/40 bg-white",
                            isLoading && "opacity-70 cursor-not-allowed",
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-900 truncate">{addr.name}</p>
                              <p className="text-xs text-gray-500 mt-0.5 truncate">{addr.address}</p>
                              <p className="text-xs text-gray-400">{addr.phone}</p>
                            </div>
                            <div className="flex flex-col items-end gap-1 shrink-0">
                              {addr.isDefault && (
                                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Mặc định</span>
                              )}
                              {isLoading && (
                                <svg className="w-4 h-4 animate-spin text-amber-500" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                              )}
                              {isSelected && !isLoading && (
                                <span className="text-xs font-semibold text-amber-600">✓ Đã chọn</span>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <span className="text-3xl mb-2">📍</span>
                  <p className="text-sm text-gray-500">Bạn chưa có địa chỉ nào</p>
                  <p className="text-xs text-gray-400 mt-1">Thêm địa chỉ bên dưới để đặt hàng</p>
                </div>
              )}

              {/* Add new address form */}
              {!showNewAddressForm ? (
                <button
                  onClick={() => setShowNewAddressForm(true)}
                  className="w-full py-2.5 rounded-xl border-2 border-dashed border-gray-300 text-sm text-gray-500 hover:border-amber-400 hover:text-amber-600 transition-all"
                >
                  + Thêm địa chỉ mới
                </button>
              ) : (
                <div className="rounded-xl border-2 border-amber-200 bg-amber-50/30 p-4 space-y-3">
                  <p className="text-sm font-semibold text-gray-800">Thêm địa chỉ mới</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Họ tên</label>
                      <input
                        value={newAddrForm.name}
                        onChange={(e) => setNewAddrForm({ ...newAddrForm, name: e.target.value })}
                        placeholder="Nguyễn Văn A"
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Số điện thoại</label>
                      <input
                        value={newAddrForm.phone}
                        onChange={(e) => setNewAddrForm({ ...newAddrForm, phone: e.target.value })}
                        placeholder="0901234567"
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Địa chỉ</label>
                    <input
                      value={newAddrForm.address}
                      onChange={(e) => setNewAddrForm({ ...newAddrForm, address: e.target.value })}
                      placeholder="123 Đường ABC, Quận 1, TP. HCM"
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => { setShowNewAddressForm(false); setNewAddrForm({ name: "", phone: "", address: "" }); }}
                      className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50"
                    >Hủy</button>
                    <button
                      disabled={!newAddrForm.name || !newAddrForm.phone || !newAddrForm.address}
                      onClick={() => {
                        addAddress(newAddrForm);
                        const saved = { ...newAddrForm };
                        setShowNewAddressForm(false);
                        setNewAddrForm({ name: "", phone: "", address: "" });
                        handleSelectDeliveryAddr(saved.address);
                      }}
                      className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    >Lưu &amp; Chọn</button>
                  </div>
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
              {/* Selected branch address banner */}
              {selectedBranch && (
                <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4">
                  <img
                    src={selectedBranch.imageUrl}
                    alt={selectedBranch.name}
                    className="w-12 h-12 rounded-xl object-cover shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-0.5">🏪 Cửa hàng đã chọn</p>
                    <p className="text-sm font-bold text-gray-900 leading-tight">{selectedBranch.name}</p>
                    <p className="text-xs text-gray-600 mt-0.5">
                      {selectedBranch.address}, {selectedBranch.district}, {selectedBranch.city}
                    </p>
                    <p className="text-xs text-amber-600 font-medium mt-1">
                      {selectedBranch.openingHours.days} · {selectedBranch.openingHours.open}–{selectedBranch.openingHours.close}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                    ✓ Đã chọn
                  </span>
                </div>
              )}

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

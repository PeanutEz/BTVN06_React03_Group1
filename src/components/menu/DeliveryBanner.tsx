import { cn } from "@/lib/utils";
import { useDeliveryStore } from "@/store/delivery.store";
import { isBranchOpen } from "@/services/branch.service";

const fmt = (n: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n);

interface DeliveryBannerProps {
  onOpenPicker: () => void;
}

export default function DeliveryBanner({ onOpenPicker }: DeliveryBannerProps) {
  const {
    orderMode,
    selectedBranch,
    deliveryAddress,
    currentDeliveryFee,
    estimatedPrepMins,
    estimatedDeliveryMins,
    isReadyToOrder,
  } = useDeliveryStore();

  const branchOpen = selectedBranch ? isBranchOpen(selectedBranch) : false;

  return (
    <button
      onClick={onOpenPicker}
      className={cn(
        "w-full text-left rounded-2xl border transition-all duration-200 hover:shadow-md active:scale-[0.99] overflow-hidden group",
        !selectedBranch
          ? "border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50"
          : isReadyToOrder
          ? "border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50"
          : "border-red-200 bg-gradient-to-r from-red-50 to-orange-50",
      )}
    >
      <div className="px-4 py-3 flex items-center gap-3">
        {/* Mode icon */}
        <div
          className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 transition-transform group-hover:scale-110",
            !selectedBranch
              ? "bg-amber-100"
              : isReadyToOrder
              ? "bg-emerald-100"
              : "bg-red-100",
          )}
        >
          {!selectedBranch ? "📍" : orderMode === "DELIVERY" ? "🛵" : "🏪"}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {!selectedBranch ? (
            <div>
              <p className="text-sm font-semibold text-amber-900">Chọn phương thức đặt hàng</p>
              <p className="text-xs text-amber-700 mt-0.5">Nhấn để chọn giao hàng hoặc lấy tại cửa hàng</p>
            </div>
          ) : (
            <div>
              {/* Mode label */}
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={cn(
                    "text-xs font-bold px-2 py-0.5 rounded-full",
                    orderMode === "DELIVERY"
                      ? "bg-amber-200 text-amber-800"
                      : "bg-blue-100 text-blue-700",
                  )}
                >
                  {orderMode === "DELIVERY" ? "🛵 Giao hàng" : "🏪 Lấy tại quán"}
                </span>
                <span
                  className={cn(
                    "text-xs font-semibold px-2 py-0.5 rounded-full",
                    branchOpen
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-red-100 text-red-700",
                  )}
                >
                  {branchOpen ? "● Đang mở" : "● Đã đóng cửa"}
                </span>
              </div>

              {/* Branch name & address */}
              <p className="text-sm font-semibold text-gray-900 mt-1 truncate">
                {selectedBranch.name}
              </p>

              {/* Delivery address or branch address */}
              <p className="text-xs text-gray-500 truncate">
                {orderMode === "DELIVERY" && deliveryAddress.rawAddress
                  ? `📍 ${deliveryAddress.rawAddress}`
                  : `📌 ${selectedBranch.address}`}
              </p>

              {/* Estimates row */}
              {isReadyToOrder && (
                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                  <span className="text-xs text-gray-500">
                    ⏱ ~{estimatedPrepMins + estimatedDeliveryMins} phút
                  </span>
                  {orderMode === "DELIVERY" && (
                    <span className="text-xs text-amber-700 font-medium">
                      {currentDeliveryFee === 0
                        ? "🎁 Miễn phí giao hàng"
                        : `🛵 Phí: ${fmt(currentDeliveryFee)}`}
                    </span>
                  )}
                </div>
              )}

              {/* Closed warning */}
              {!branchOpen && (
                <p className="text-xs text-red-600 mt-1 font-medium">
                  Chi nhánh đang đóng cửa. Vui lòng chọn chi nhánh khác.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Arrow */}
        <div className="shrink-0 text-gray-400 group-hover:text-gray-600 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </div>
      </div>
    </button>
  );
}

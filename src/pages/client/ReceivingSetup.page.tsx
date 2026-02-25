
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useDeliveryStore } from "@/store/delivery.store";
import BranchPickerModal from "@/components/menu/BranchPickerModal";
import { ROUTER_URL } from "@/routes/router.const";

/**
 * Mandatory full-page receiving setup screen.
 * Users cannot skip this – closing without selecting shows an error toast.
 * After selecting a branch/address the user is sent back to where they came from.
 */
export default function ReceivingSetupPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? ROUTER_URL.MENU;

  // If the store was already hydrated (e.g. user navigated directly), redirect
  // as soon as we have a branch — but still render the modal on first paint
  // so there's no flash; the navigate fires on the next tick if branch is set.
  const handleClose = () => {
    const { selectedBranch: current } = useDeliveryStore.getState();
    if (current) {
      navigate(from, { replace: true });
    } else {
      toast.error("Vui lòng chọn phương thức nhận hàng trước khi tiếp tục.");
    }
  };

  return (
    <div className="fixed inset-0 z-[200]">
      {/* Blurred background with branding */}
      <div className="absolute inset-0 bg-gradient-to-br from-amber-900/60 via-stone-900/70 to-gray-900/80 backdrop-blur-md" />

      {/* Centered heading above the modal */}
      <div className="absolute inset-x-0 top-0 z-10 flex flex-col items-center pt-8 px-4 text-center pointer-events-none">
        <div className="bg-amber-500/90 backdrop-blur-sm text-white px-5 py-2.5 rounded-full text-sm font-bold shadow-lg shadow-amber-900/30 flex items-center gap-2">
          <span>🛵</span>
          <span>Chọn phương thức nhận hàng để tiếp tục</span>
        </div>
        <p className="text-white/60 text-xs mt-2">
          Bạn cần chọn Giao hàng hoặc Lấy tại quán trước khi xem sản phẩm.
        </p>
      </div>

      {/* The picker modal – rendered on top */}
      <BranchPickerModal onClose={handleClose} />
    </div>
  );
}

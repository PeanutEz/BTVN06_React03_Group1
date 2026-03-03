import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useFranchiseStore } from "../../store/franchise.store";
import { useAuthStore } from "../../store/auth.store";
import { ROLE_CODE } from "../../models/role.model";
import { ROUTER_URL } from "../router.const";
import { useEffect, useRef, useState } from "react";
import { switchContext } from "../../services/auth.service";
import LoadingLayout from "../../layouts/Loading.layout";

/**
 * Admin và Manager bắt buộc phải chọn franchise trước khi vào dashboard.
 * Sau khi chọn (hoặc hydrate từ localStorage), gọi POST /api/auth/switch-context
 * để backend biết franchise context hiện tại (kể cả khi refresh trang).
 */
const FranchiseGuard = () => {
  const location = useLocation();
  const { user } = useAuthStore();
  const { selectedFranchise, setSelectedFranchise } = useFranchiseStore();
  const [contextReady, setContextReady] = useState(false);
  // Track franchise ID đã switch để tránh gọi lại khi cùng 1 franchise
  const switchedForId = useRef<string | null>(null);

  const needsFranchiseSelect = user?.roles?.some(
    (r) => r.role?.toUpperCase() === ROLE_CODE.ADMIN || r.role?.toUpperCase() === ROLE_CODE.MANAGER
  );

  // Tính danh sách franchise từ profile (không gọi API)
  const franchiseList = (() => {
    const seen = new Set<string>();
    const list: { value: string; code: string; name: string }[] = [];
    for (const r of user?.roles ?? []) {
      if (r.franchise_id && !seen.has(r.franchise_id)) {
        seen.add(r.franchise_id);
        list.push({ value: r.franchise_id, code: "", name: r.franchise_name ?? r.franchise_id });
      }
    }
    return list;
  })();

  // Nếu chỉ có đúng 1 franchise → tự động chọn luôn không cần vào select page
  useEffect(() => {
    if (needsFranchiseSelect && !selectedFranchise && franchiseList.length === 1) {
      setSelectedFranchise(franchiseList[0]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needsFranchiseSelect, selectedFranchise, franchiseList.length]);

  // Gọi switch-context khi franchise thay đổi — dùng ref để đảm bảo chỉ 1 lần / franchise
  useEffect(() => {
    if (!selectedFranchise) {
      setContextReady(false);
      switchedForId.current = null;
      return;
    }
    // Đã switch cho franchise này rồi → không gọi lại
    if (switchedForId.current === selectedFranchise.value) {
      setContextReady(true);
      return;
    }
    switchedForId.current = selectedFranchise.value;
    setContextReady(false);
    switchContext({ franchise_id: selectedFranchise.value })
      .then(() => setContextReady(true))
      .catch(() => setContextReady(true));
  }, [selectedFranchise]);

  // Admin và Manager phải chọn franchise; các role khác bỏ qua bước này
  if (needsFranchiseSelect && !selectedFranchise && franchiseList.length !== 1) {
    return (
      <Navigate
        to={ROUTER_URL.ADMIN_SELECT_FRANCHISE}
        replace
        state={{ from: location }}
      />
    );
  }

  // Chờ switch-context hoàn thành trước khi render dashboard
  if (needsFranchiseSelect && selectedFranchise && !contextReady) {
    return <LoadingLayout />;
  }

  return <Outlet />;
};

export default FranchiseGuard;

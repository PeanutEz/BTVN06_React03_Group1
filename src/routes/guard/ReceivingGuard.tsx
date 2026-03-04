import { Navigate, Outlet, useLocation } from "react-router-dom";
import LoadingLayout from "../../layouts/Loading.layout";
import { useDeliveryStore } from "@/store/delivery.store";
import { ROUTER_URL } from "../router.const";

/**
 * Requires a receiving method (branch) to be selected before allowing access.
 * The delivery store is pre-populated from localStorage synchronously, so
 * there is no hydration delay on first render.
 *
 * This guard must be nested inside AuthGuard — auth is a prerequisite.
 */
export default function ReceivingGuard() {
  const { selectedBranch, isInitialized } = useDeliveryStore();
  const location = useLocation();

  if (!isInitialized) {
    return <LoadingLayout />;
  }

  if (!selectedBranch) {
    return (
      <Navigate
        to={ROUTER_URL.RECEIVING_SETUP}
        state={{ from: location.pathname }}
        replace
      />
    );
  }

  return <Outlet />;
}

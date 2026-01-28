import { Navigate, Outlet, useLocation } from "react-router-dom";
import LoadingLayout from "../../layouts/Loading.layout";
import { useAuthStore } from "../../store";
import { ROUTER_URL } from "../router.const";

const ClientGuard = () => {
  const location = useLocation();
  const { user, isInitialized } = useAuthStore();

  if (!isInitialized) {
    return <LoadingLayout />;
  }

  if (!user) {
    return <Navigate to={ROUTER_URL.LOGIN} replace state={{ from: location }} />;
  }

  return <Outlet />;
};

export default ClientGuard;

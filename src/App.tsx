import { useEffect } from "react";
import { Toaster } from "sonner";
import AppRoutes from "./routes";
import { useAuthStore, useCartStore, useFranchiseStore } from "./store";
import { useMenuCartStore } from "./store/menu-cart.store";
import { useNotificationStore } from "./store/notification.store";

export default function App() {
  const hydrate = useAuthStore((s) => s.hydrate);
  const hydrateCart = useCartStore((s) => s.hydrate);
  const hydrateMenuCart = useMenuCartStore((s) => s.hydrate);
  const hydrateNotifications = useNotificationStore((s) => s.hydrate);
  const hydrateFranchises = useFranchiseStore((s) => s.hydrate);

  useEffect(() => {
    hydrate();
    hydrateCart();
    hydrateMenuCart();
    hydrateNotifications();
    hydrateFranchises();
  }, [hydrate, hydrateCart, hydrateMenuCart, hydrateNotifications, hydrateFranchises]);

  return (
    <>
      <AppRoutes />      <Toaster
        position="top-right"
        richColors
        expand={false}
        closeButton
        toastOptions={{
          duration: 3000,
          style: {
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: '500',
          },
        }}
      />
    </>
  );
}

import { useEffect } from "react";
import { Toaster } from "sonner";
import AppRoutes from "./routes";
import { useAuthStore, useCartStore } from "./store";
import { useMenuCartStore } from "./store/menu-cart.store";

export default function App() {
  const hydrate = useAuthStore((s) => s.hydrate);
  const hydrateCart = useCartStore((s) => s.hydrate);
  const hydrateMenuCart = useMenuCartStore((s) => s.hydrate);

  useEffect(() => {
    hydrate();
    hydrateCart();
    hydrateMenuCart();
  }, [hydrate, hydrateCart, hydrateMenuCart]);

  return (
    <>
      <AppRoutes />
      <Toaster 
        position="top-right" 
        richColors 
        expand={true}
        toastOptions={{
          style: {
            background: 'white',
            border: '1px solid #e5e7eb',
            padding: '16px',
            borderRadius: '12px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            fontSize: '14px',
            fontWeight: '500',
          },
          className: 'toast-slide-left',
        }}
      />
    </>
  );
}

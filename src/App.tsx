import { useEffect } from "react";
import { Toaster } from "sonner";
import AppRoutes from "./routes";
import { useAuthStore } from "./store";

export default function App() {
  const hydrate = useAuthStore((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <>
      <AppRoutes />
      <Toaster position="top-right" richColors />
    </>
  );
}

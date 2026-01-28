import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { useAuthStore } from "./store";
import "./index.css";
import AppRoutes from "./routes";

const Bootstrap = () => {
  const hydrate = useAuthStore((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return <AppRoutes />;
};

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Bootstrap />
  </StrictMode>,
);

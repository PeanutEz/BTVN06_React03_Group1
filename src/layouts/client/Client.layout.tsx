import { Outlet } from "react-router-dom";
import ClientHeader from "./ClientHeader.layout";
import ClientFooter from "./ClientFooter.layout";

const ClientLayout = () => {
  return (
    <div className="min-h-screen bg-[#f8f1ea] text-[#2f1a12] flex flex-col">
      <ClientHeader />
      <main className="mx-auto max-w-6xl px-4 py-8 flex-1">
        <Outlet />
      </main>
      <ClientFooter />
    </div>
  );
};

export default ClientLayout;

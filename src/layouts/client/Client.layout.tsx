import { Outlet } from "react-router-dom";
import ClientHeader from "./ClientHeader.layout";
import ClientFooter from "./ClientFooter.layout";
import ScrollToTopButton from "@/components/ui/ScrollToTopButton";

const ClientLayout = () => {
  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col antialiased">
      <ClientHeader />

      <main className="flex w-full flex-1">
        <div className="mx-auto flex w-full max-w-[1280px] flex-1 flex-col px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
          <Outlet />
        </div>
      </main>

      <ClientFooter />
      <ScrollToTopButton />
    </div>
  );
};

export default ClientLayout;

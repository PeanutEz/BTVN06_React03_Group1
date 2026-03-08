import { Outlet } from "react-router-dom";
import ClientHeader from "./ClientHeader.layout";
import ClientFooter from "./ClientFooter.layout";
import ScrollToTopButton from "@/components/ui/ScrollToTopButton";

const ClientLayout = () => {
  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col antialiased">
      <ClientHeader />

      <main className="flex-1 w-full">
        <div className="mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-8 py-8 sm:py-10 lg:py-12">
          <Outlet />
        </div>
      </main>

      <ClientFooter />
      <ScrollToTopButton />
    </div>
  );
};

export default ClientLayout;

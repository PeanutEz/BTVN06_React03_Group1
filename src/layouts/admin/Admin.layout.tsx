import { Outlet } from "react-router-dom";
import AdminHeader from "./AdminHeader.layout";
import AdminSidebar from "./AdminSidebar.layout";
import AdminFooter from "./AdminFooter.layout";

const AdminLayout = () => {
  return (
    <div className="min-h-screen bg-[#f8f1ea] text-[#2f1a12]">
      <AdminHeader />
      <div className="flex">
        <AdminSidebar />
        <div className="ml-20 flex flex-1 flex-col transition-all duration-300 peer-hover:ml-60">
          <main className="flex-1 px-6 py-6">
            <Outlet />
          </main>
          <AdminFooter />
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;

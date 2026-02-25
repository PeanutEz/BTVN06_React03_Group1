import { useState } from "react";
import { Outlet } from "react-router-dom";
import AdminHeader from "./AdminHeader.layout";
import AdminSidebar from "./AdminSidebar.layout";
import AdminFooter from "./AdminFooter.layout";

const AdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100 text-slate-900 flex flex-col">
      <AdminHeader />
      <div className="flex flex-1">
        <AdminSidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen((v) => !v)} />
        <div
          className="flex flex-1 flex-col transition-all duration-300"
          style={{ marginLeft: sidebarOpen ? 240 : 80 }}
        >
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

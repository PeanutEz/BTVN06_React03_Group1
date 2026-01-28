import { Outlet } from "react-router-dom";
import AdminHeader from "./AdminHeader.layout";
import AdminSidebar from "./AdminSidebar.layout";
import AdminFooter from "./AdminFooter.layout";

const AdminLayout = () => {
  return (
    <div className="grid min-h-screen grid-cols-[240px_1fr] bg-slate-50 text-slate-900">
      <AdminSidebar />
      <div className="flex min-h-screen flex-col">
        <AdminHeader />
        <main className="flex-1 px-6 py-6">
          <Outlet />
        </main>
        <AdminFooter />
      </div>
    </div>
  );
};

export default AdminLayout;

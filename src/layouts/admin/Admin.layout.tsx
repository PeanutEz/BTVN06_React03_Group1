import { useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import AdminHeader from "./AdminHeader.layout";
import AdminSidebar from "./AdminSidebar.layout";
import AdminFooter from "./AdminFooter.layout";
import AdminBreadcrumb from "../../components/ui/AdminBreadcrumb";

const AdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const location = useLocation();

  // Detect mobile breakpoint
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) setSidebarOpen(false);
      else setSidebarOpen(true);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Auto-close sidebar on mobile when navigating
  useEffect(() => {
    if (isMobile) setSidebarOpen(false);
  }, [location.pathname, isMobile]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100 text-slate-900 flex flex-col">
      <AdminHeader onMenuToggle={() => setSidebarOpen((v) => !v)} isMobile={isMobile} />
      <div className="flex flex-1">
        {/* Mobile overlay backdrop */}
        {isMobile && sidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/40 transition-opacity"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        <AdminSidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen((v) => !v)} isMobile={isMobile} />
        <div
          className="flex flex-1 flex-col transition-all duration-300"
          style={{ marginLeft: isMobile ? 0 : sidebarOpen ? 240 : 80 }}
        >
          <main className="flex-1 px-3 py-4 sm:px-6 sm:py-6">
            <AdminBreadcrumb />
            <Outlet />
          </main>
          <AdminFooter />
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;

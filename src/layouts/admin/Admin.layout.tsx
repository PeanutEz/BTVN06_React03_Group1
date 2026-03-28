import { useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import AdminHeader from "./AdminHeader.layout";
import AdminSidebar from "./AdminSidebar.layout";
import AdminBreadcrumb from "../../components/ui/AdminBreadcrumb";
import { ConfirmProvider } from "../../components/ui";
import dbaVideo from "../../assets/dba.mp4";

const glassPanel: React.CSSProperties = {
  background: "rgba(15, 23, 42, 0.22)",
  backdropFilter: "blur(16px) saturate(140%)",
  WebkitBackdropFilter: "blur(16px) saturate(140%)",
  border: "1px solid rgba(255, 255, 255, 0.09)",
  borderRadius: "20px",
  boxShadow: "0 8px 40px rgba(0, 0, 0, 0.15)",
};

const AdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const location = useLocation();

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

  useEffect(() => {
    if (isMobile) setSidebarOpen(false);
  }, [location.pathname, isMobile]);

  return (
    <ConfirmProvider>
    <div
      className="admin-glass-theme min-h-screen text-white"
      style={{ position: "relative", isolation: "isolate" }}
    >
      {/* Video background */}
      <video
        className="fixed inset-0 w-full h-full object-cover"
        style={{ zIndex: -2 }}
        src={dbaVideo}
        autoPlay
        muted
        loop
        playsInline
      />
      <div className="fixed inset-0 admin-video-overlay" style={{ zIndex: -1 }} />

      {/* Layout: vertical stack with padding */}
      <div className="flex flex-col h-screen p-3 gap-3">
        {/* Mobile overlay */}
        {isMobile && sidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/60 transition-opacity"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Row 1: Header — full width glass panel */}
        <AdminHeader
          onMenuToggle={() => setSidebarOpen((v) => !v)}
          isMobile={isMobile}
        />

        {/* Row 2: Sidebar + Content — same height, aligned */}
        <div className="flex flex-1 gap-3 min-h-0">
          {/* Sidebar glass panel */}
          {(!isMobile || sidebarOpen) && (
            <aside
              className={`${isMobile ? "fixed left-3 top-[72px] bottom-3 z-40" : "relative"} flex flex-col shrink-0 overflow-hidden`}
              style={{ ...glassPanel, width: 300 }}
            >
              <AdminSidebar isMobile={isMobile} />
            </aside>
          )}

          {/* Content glass panel */}
          <main
            data-scroll-lock-root="admin-main"
            className="flex-1 overflow-y-auto px-6 py-4 min-w-0 flex flex-col"
            style={glassPanel}
          >
            <AdminBreadcrumb />
            <div className="flex-1 min-h-0">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
    </ConfirmProvider>
  );
};

export default AdminLayout;

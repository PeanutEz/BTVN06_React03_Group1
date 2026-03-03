import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "../../../components";
import { loginAndGetProfile, switchContextAndGetProfile, type UserProfile, type RoleInfo } from "../../../services/auth.service";
import { useAuthStore } from "../../../store";
import type { AuthCredentials } from "../../../models";
import { ROUTER_URL } from "../../../routes/router.const";
import { showSuccess, showError } from "../../../utils";
import bgAdminLogin from "../../../assets/bg-admin-login.jpg";
import FranchisePickerModal from "../../../components/admin/FranchisePickerModal";

const AdminLoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, login } = useAuthStore();

  // State cho franchise picker modal
  const [pendingProfile, setPendingProfile] = useState<UserProfile | null>(null);
  const [showFranchisePicker, setShowFranchisePicker] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AuthCredentials>();
  useEffect(() => {
    // Kiểm tra user có role admin/system/manager/staff không
    const allowedRoles = ["admin", "system", "manager", "staff"];
    const hasAdminRole = user?.roles?.some(r => {
      const role = (r.role ?? "").toString().toLowerCase();
      return allowedRoles.includes(role);
    });
    
    if (user && hasAdminRole) {
      navigate(`${ROUTER_URL.ADMIN}/${ROUTER_URL.ADMIN_ROUTES.DASHBOARD}`, { replace: true });
    }
  }, [user, navigate]);

  const handleSwitchContextAndNavigate = async (_profile: UserProfile, role: RoleInfo) => {
    try {
      setIsSwitching(true);
      // Gọi API Switch Context với franchise_id của role được chọn
      const updatedProfile = await switchContextAndGetProfile(role.franchise_id);
      login(updatedProfile);

      setShowFranchisePicker(false);
      setPendingProfile(null);
      showSuccess("Đăng nhập thành công");

      const redirectTo = (location.state as { from?: Location })?.from?.pathname;
      navigate(redirectTo || `${ROUTER_URL.ADMIN}/${ROUTER_URL.ADMIN_ROUTES.DASHBOARD}`, { replace: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Chuyển context thất bại";
      showError(msg);
    } finally {
      setIsSwitching(false);
    }
  };

  const onSubmit = async (values: AuthCredentials) => {
    try {
      const profile = await loginAndGetProfile(values);      // Kiểm tra xem user có quyền truy cập admin không
      const allowedRoles = ["admin", "system", "manager", "staff"];
      const hasAdminAccess = profile.roles?.some(r => {
        const role = (r.role ?? "").toString().toLowerCase();
        return allowedRoles.includes(role);
      });

      if (!hasAdminAccess) {
        const rolesList = profile.roles?.map(r => r.role).join(", ") || "không có";
        showError(`Bạn không có quyền truy cập admin. Role hiện tại: ${rolesList}`);
        return;
      }

      const allRoles = profile.roles || [];

      if (allRoles.length === 1) {
        // Chỉ có 1 role → tự động switch context
        await handleSwitchContextAndNavigate(profile, allRoles[0]);
      } else {
        // Có 2+ roles → hiện popup cho user chọn franchise
        setPendingProfile(profile);
        setShowFranchisePicker(true);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Đăng nhập thất bại";
      showError(msg);
    }
  };

  const handleQuickLogin = (role: "admin" | "client") => {
    const mockProfile: UserProfile = role === "admin"
      ? {
          user: { id: "mock-admin", email: "admin@gmail.com", name: "Admin", phone: "", avatar_url: "" },
          roles: [{ role: "ADMIN", scope: "GLOBAL", franchise_id: null, franchise_name: null }],
          active_context: null,
          id: "mock-admin",
          name: "Admin",
          email: "admin@gmail.com",
          role: "admin",
          avatar: ""
        }
      : {
          user: { id: "mock-client", email: "user@gmail.com", name: "Client User", phone: "", avatar_url: "" },
          roles: [{ role: "USER", scope: "GLOBAL", franchise_id: null, franchise_name: null }],
          active_context: null,
          id: "mock-client",
          name: "Client User",
          email: "user@gmail.com",
          role: "user",
          avatar: ""
        };

    login(mockProfile);
    showSuccess(`Đăng nhập nhanh (${mockProfile.email})`);

    if (role === "admin") {
      navigate(`${ROUTER_URL.ADMIN}/${ROUTER_URL.ADMIN_ROUTES.DASHBOARD}`, { replace: true });
    } else {
      navigate(ROUTER_URL.HOME, { replace: true });
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-cover bg-center bg-no-repeat px-4" style={{ backgroundImage: `url(${bgAdminLogin})` }}>
      <div className="absolute inset-0 bg-black/20" />
      <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white/95 backdrop-blur-xl p-8 shadow-2xl shadow-primary-500/10 animate-slide-in">
        <h1 className="text-3xl font-bold text-center bg-gradient-to-r from-primary-600 to-primary-500 bg-clip-text text-transparent mb-6">Đăng nhập</h1>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Email</label>
            <input
              type="email"
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition-all duration-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 placeholder:text-slate-600 placeholder:font-normal"
              placeholder="Email của bạn"
              {...register("email", { required: "Email không được để trống" })}
            />
            {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Mật khẩu</label>
            <input
              type="password"
              className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900 outline-none ring-primary-200 transition focus:ring placeholder:text-slate-600 placeholder:font-normal"
              placeholder="Mật khẩu của bạn"
              {...register("password", { required: "Mật khẩu không được để trống" })}
            />
            {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
          </div>

          <Button type="submit" className="w-full" loading={isSubmitting}>
            {isSubmitting ? "Đang đăng nhập..." : "Đăng nhập"}
          </Button>
        </form>

        <div className="mt-6 space-y-3">
          <p className="text-center text-xs font-medium text-slate-500 uppercase tracking-wide">Đăng nhập nhanh</p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => handleQuickLogin("client")}
              className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-primary-400 hover:bg-primary-50 hover:text-primary-700"
            >
              🏠 Client
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin("admin")}
              className="flex-1 rounded-lg border border-primary-500 bg-gradient-to-r from-primary-500 to-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-primary-500/30 transition hover:from-primary-600 hover:to-primary-700"
            >
              🛡️ Admin
            </button>
          </div>
        </div>
      </div>

      {/* Franchise Picker Modal */}      {showFranchisePicker && pendingProfile && (
        <FranchisePickerModal
          roles={pendingProfile.roles}
          loading={isSwitching}
          onSelect={(role) => handleSwitchContextAndNavigate(pendingProfile, role)}
          onClose={() => {
            setShowFranchisePicker(false);
            setPendingProfile(null);
          }}
        />
      )}
    </div>
  );
};

export default AdminLoginPage;

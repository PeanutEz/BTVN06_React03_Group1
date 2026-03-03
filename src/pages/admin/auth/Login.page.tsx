import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { Button } from "../../../components";
import { loginAndGetProfile } from "../../../services/auth.service";
import { useAuthStore } from "../../../store";
import type { AuthCredentials } from "../../../models";
import { ROLE_CODE } from "../../../models/role.model";

const STAFF_ROLES = new Set<string>([
  ROLE_CODE.ADMIN,
  ROLE_CODE.MANAGER,
  ROLE_CODE.STAFF,
  ROLE_CODE.SHIPPER,
]);

const hasStaffRole = (roles?: { role: string }[], topRole?: string) =>
  roles?.some(r => STAFF_ROLES.has(r.role?.toUpperCase()))
  || STAFF_ROLES.has(topRole?.toUpperCase() ?? "");
import { ROUTER_URL } from "../../../routes/router.const";
import { showSuccess, showError } from "../../../utils";
import bgAdminLogin from "../../../assets/bg-admin-login.jpg";

const AdminLoginPage = () => {
  const navigate = useNavigate();
  const { user, login } = useAuthStore();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AuthCredentials>();

  useEffect(() => {
    // Kiểm tra user có role admin không
    const hasAdminRole = hasStaffRole(user?.roles, user?.role);

    if (user && hasAdminRole) {
      const isAdmin = user.roles?.some(
        r => r.role?.toUpperCase() === ROLE_CODE.ADMIN || r.role?.toUpperCase() === ROLE_CODE.MANAGER
      );
      navigate(
        isAdmin ? ROUTER_URL.ADMIN_SELECT_FRANCHISE : `${ROUTER_URL.ADMIN}/${ROUTER_URL.ADMIN_ROUTES.DASHBOARD}`,
        { replace: true }
      );
    }
  }, [user, navigate]);

  const onSubmit = async (values: AuthCredentials) => {
    try {
      const profile = await loginAndGetProfile(values);

      // Kiểm tra xem user có role admin không (từ roles array)
      const hasAdminAccess = hasStaffRole(profile.roles, profile.role);
      
      if (!hasAdminAccess) {
        const rolesList = profile.roles?.map(r => r.role).join(", ") || "không có";
        showError(`Bạn không có quyền truy cập admin. Role hiện tại: ${rolesList}`);
        return;
      }

      login(profile);

      showSuccess("Đăng nhập thành công");
      const isAdminRoleUser = profile.roles?.some(
        r => r.role?.toUpperCase() === ROLE_CODE.ADMIN || r.role?.toUpperCase() === ROLE_CODE.MANAGER
      );
      navigate(
        isAdminRoleUser ? ROUTER_URL.ADMIN_SELECT_FRANCHISE : `${ROUTER_URL.ADMIN}/${ROUTER_URL.ADMIN_ROUTES.DASHBOARD}`,
        { replace: true }
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Đăng nhập thất bại";
      showError(msg);
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

      </div>
    </div>
  );
};

export default AdminLoginPage;

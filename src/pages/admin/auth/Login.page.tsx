import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "../../../components";
import { loginUser } from "../../../services/auth.service";
import { useAuthStore } from "../../../store";
import type { AuthCredentials } from "../../../models";
import { isAdminRole } from "../../../models";
import { ROUTER_URL } from "../../../routes/router.const";
import { showSuccess, showError } from "../../../utils";

const AdminLoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, login } = useAuthStore();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AuthCredentials>({
    defaultValues: {
      email: "admin@gmail.com",
      password: "12345",
    },
  });

  useEffect(() => {
    if (user && isAdminRole(user.role)) {
      navigate(`${ROUTER_URL.ADMIN}/${ROUTER_URL.ADMIN_ROUTES.DASHBOARD}`, { replace: true });
    }
  }, [user, navigate]);

  const onSubmit = async (values: AuthCredentials) => {
    const found = await loginUser(values);
    if (!found || !isAdminRole(found.role)) {
      showError("Bạn không có quyền truy cập admin hoặc thông tin đăng nhập sai");
      return;
    }

    login(found);
    showSuccess("Đăng nhập thành công");
    const redirectTo = (location.state as { from?: Location })?.from?.pathname;
    navigate(redirectTo || `${ROUTER_URL.ADMIN}/${ROUTER_URL.ADMIN_ROUTES.DASHBOARD}`, { replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#f7e9dc] via-white to-[#f0e1d3] px-4">
      <div className="w-full max-w-md rounded-2xl border border-primary-200/60 bg-white/90 p-8 shadow-xl shadow-primary-900/15">
        <div className="space-y-2 text-center">
          <p className="text-sm font-semibold text-primary-600">Admin Portal</p>
          <h1 className="text-2xl font-bold text-slate-900">Đăng nhập Admin</h1>
          <p className="text-xs text-slate-500">Chỉ tài khoản có role Admin mới vào được.</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Email</label>
            <input
              type="email"
              className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm outline-none ring-primary-200 transition focus:ring"
              placeholder="admin@gmail.com"
              {...register("email", { required: "Email không được để trống" })}
            />
            {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Mật khẩu</label>
            <input
              type="password"
              className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm outline-none ring-primary-200 transition focus:ring"
              placeholder="••••••••"
              {...register("password", { required: "Mật khẩu không được để trống" })}
            />
            {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
          </div>

          <Button type="submit" className="w-full" loading={isSubmitting}>
            {isSubmitting ? "Đang đăng nhập..." : "Đăng nhập"}
          </Button>
        </form>

        <p className="mt-4 text-center text-xs text-slate-500">Mock API user role: Admin</p>
      </div>
    </div>
  );
};

export default AdminLoginPage;

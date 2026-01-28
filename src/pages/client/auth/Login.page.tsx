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

const LoginPage = () => {
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
    if (user) {
      if (isAdminRole(user.role)) {
        navigate(`${ROUTER_URL.ADMIN}/${ROUTER_URL.ADMIN_ROUTES.DASHBOARD}`, { replace: true });
      } else {
        navigate(ROUTER_URL.HOME, { replace: true });
      }
    }
  }, [user, navigate]);

  const onSubmit = async (values: AuthCredentials) => {
    const found = await loginUser(values);
    if (!found) {
      showError("Sai email hoặc mật khẩu");
      return;
    }

    login(found);
    showSuccess("Đăng nhập thành công");
    const redirectTo = (location.state as { from?: Location })?.from?.pathname;
    if (redirectTo) {
      navigate(redirectTo, { replace: true });
      return;
    }

    if (isAdminRole(found.role)) {
      navigate(`${ROUTER_URL.ADMIN}/${ROUTER_URL.ADMIN_ROUTES.DASHBOARD}`, { replace: true });
    } else {
      navigate(ROUTER_URL.HOME, { replace: true });
    }
  };

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      <div className="relative hidden bg-gradient-to-br from-[#3d1d12] via-primary-600 to-[#1c100b] lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(240,201,135,0.16),transparent_25%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_0%,rgba(188,112,65,0.18),transparent_25%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_80%,rgba(159,92,54,0.15),transparent_25%)]" />
        <div className="relative flex h-full flex-col justify-between px-12 py-12 text-white">
          <div className="space-y-4">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold">
              Mock API • Admin/User
            </span>
            <h2 className="text-4xl font-bold leading-tight">BTVN06 Group1</h2>
            <p className="max-w-md text-sm text-white/80">
              Đăng nhập bằng tài khoản trong mock API để xem trang Home, Admin và User Management. Hỗ trợ tự động điều
              hướng theo role.
            </p>
          </div>
          <div className="space-y-4 text-sm text-white/80">
            <p className="font-semibold text-white">Tài khoản mẫu</p>
            <ul className="space-y-2">
              <li className="flex items-center justify-between rounded-lg bg-white/10 px-4 py-3">
                <span>Admin</span>
                <span className="text-white/80">admin@gmail.com / 12345</span>
              </li>
              <li className="flex items-center justify-between rounded-lg bg-white/10 px-4 py-3">
                <span>User</span>
                <span className="text-white/80">user@gmail.com / 12345</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center bg-white px-6 py-12">
        <div className="w-full max-w-md space-y-8">
          <div className="space-y-2 text-center">
            <p className="text-sm font-semibold text-primary-600">Welcome back</p>
            <h1 className="text-3xl font-bold text-slate-900">Đăng nhập</h1>
            <p className="text-sm text-slate-500">Sử dụng tài khoản từ mock API</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Email</label>
              <input
                type="email"
                className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm outline-none ring-primary-200 transition focus:ring"
                placeholder="you@example.com"
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

          <p className="text-center text-xs text-slate-500">
            Lưu ý: Mật khẩu đang kiểm tra trực tiếp trên mock API, chưa mã hóa.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

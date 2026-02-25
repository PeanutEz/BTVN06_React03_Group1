import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "../../../components";
import { loginUser } from "../../../services/auth.service";
import { useAuthStore } from "../../../store";
import type { AuthCredentials } from "../../../models";
import { isAdminRole, ROLE } from "../../../models";
import { ROUTER_URL } from "../../../routes/router.const";
import { showSuccess, showError } from "../../../utils";
import bgAdminLogin from "../../../assets/bg-admin-login.jpg";

const AdminLoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, login, loginWithTokens } = useAuthStore();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AuthCredentials>();

  useEffect(() => {
    if (user && isAdminRole(user.role)) {
      navigate(`${ROUTER_URL.ADMIN}/${ROUTER_URL.ADMIN_ROUTES.DASHBOARD}`, { replace: true });
    }
  }, [user, navigate]);

  const handleMockLogin = (role: typeof ROLE[keyof typeof ROLE]) => {
    const mockUser = {
      id: `mock-${role.toLowerCase()}-id`,
      name: role === ROLE.ADMIN ? "Admin Demo" : "Client Demo",
      email: role === ROLE.ADMIN ? "admin@demo.com" : "client@demo.com",
      password: "",
      role,
      avatar: "",
      createDate: new Date().toISOString(),
      updateDate: new Date().toISOString(),
    };
    login(mockUser);
    showSuccess(`Đăng nhập nhanh với quyền ${role}`);
    if (role === ROLE.ADMIN) {
      navigate(`${ROUTER_URL.ADMIN}/${ROUTER_URL.ADMIN_ROUTES.DASHBOARD}`, { replace: true });
    } else {
      navigate(ROUTER_URL.HOME, { replace: true });
    }
  };

  const onSubmit = async (values: AuthCredentials) => {
    try {
      const tokens = await loginUser(values);
      loginWithTokens(tokens);
      showSuccess("Đăng nhập thành công");
      const redirectTo = (location.state as { from?: Location })?.from?.pathname;
      navigate(redirectTo || `${ROUTER_URL.ADMIN}/${ROUTER_URL.ADMIN_ROUTES.DASHBOARD}`, { replace: true });
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { message?: string }; status?: number } };
      const status = axiosError?.response?.status;
      if (status === 400 || status === 401) {
        showError("Sai email hoặc mật khẩu");
      } else if (status === 403) {
        showError("Tài khoản không có quyền truy cập admin");
      } else {
        showError(axiosError?.response?.data?.message ?? "Đăng nhập thất bại. Vui lòng thử lại");
      }
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
          <div className="relative flex items-center">
            <div className="flex-grow border-t border-slate-200" />
            <span className="mx-3 shrink text-xs text-slate-400">Đăng nhập nhanh (API chưa hoạt động)</span>
            <div className="flex-grow border-t border-slate-200" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleMockLogin(ROLE.USER)}
              className="w-full rounded-lg border border-primary-300 bg-primary-50 px-4 py-2.5 text-sm font-semibold text-primary-700 transition hover:bg-primary-100 active:scale-95"
            >
              Client
            </button>
            <button
              type="button"
              onClick={() => handleMockLogin(ROLE.ADMIN)}
              className="w-full rounded-lg border border-slate-300 bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 active:scale-95"
            >
              Admin
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLoginPage;

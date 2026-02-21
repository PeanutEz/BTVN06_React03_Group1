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
import bgUserLogin from "../../../assets/bg-user-login.jpg";

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, login } = useAuthStore();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AuthCredentials>();

  useEffect(() => {
    if (user) {
      if (isAdminRole(user.role)) {
        navigate(`${ROUTER_URL.ADMIN}/${ROUTER_URL.ADMIN_ROUTES.DASHBOARD}`, { replace: true });
      } else {
        navigate(ROUTER_URL.ORDER, { replace: true });
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
      navigate(ROUTER_URL.ORDER, { replace: true });
    }
  };

  return (
    <div className="relative min-h-screen bg-cover bg-center bg-no-repeat overflow-hidden" style={{ backgroundImage: `url(${bgUserLogin})` }}>
      <div className="absolute inset-0 bg-black/20" />
      
      <div className="absolute right-0 top-0 h-full w-full lg:w-1/2 flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-6 py-12 animate-slide-in-right">
        <div className="w-full max-w-md space-y-8 animate-fade-in">
          <h1 className="text-3xl font-bold text-center bg-gradient-to-r from-primary-600 to-primary-500 bg-clip-text text-transparent">Đăng nhập</h1>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Email</label>
              <input
                type="email"
                className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900 outline-none ring-primary-200 transition focus:ring placeholder:text-slate-600 placeholder:font-normal"
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

          <div className="text-center space-y-2">
            <p className="text-sm text-slate-600">
              Chưa có tài khoản?{" "}
              <button
                type="button"
                onClick={() => navigate(ROUTER_URL.REGISTER)}
                className="font-semibold text-primary-600 hover:text-primary-700 transition-colors"
              >
                Đăng ký ngay
              </button>
            </p>
            <button
              type="button"
              onClick={() => navigate(ROUTER_URL.RESET_PASSWORD)}
              className="text-sm font-semibold text-slate-600 hover:text-primary-600 transition-colors"
            >
              Quên mật khẩu?
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

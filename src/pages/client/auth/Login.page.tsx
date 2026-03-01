import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "../../../components";
import { customerLoginAndGetProfile, loginAndGetProfile, resendToken } from "../../../services/auth.service";
import { useAuthStore } from "../../../store";
import type { AuthCredentials } from "../../../models";
import { ROUTER_URL } from "../../../routes/router.const";
import { showSuccess, showError } from "../../../utils";
import bgUserLogin from "../../../assets/bg-user-login.jpg";

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, login } = useAuthStore();
  const [notVerifiedEmail, setNotVerifiedEmail] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);

  const {    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AuthCredentials>();
  useEffect(() => {
    if (user) {
      const role = (user.role ?? "").toString().toLowerCase();
      if (role === "admin" || role === "system") {
        navigate(`${ROUTER_URL.ADMIN}/${ROUTER_URL.ADMIN_ROUTES.DASHBOARD}`, { replace: true });
      } else {
        navigate(ROUTER_URL.MENU, { replace: true });
      }
    }
  }, [user, navigate]);  const onSubmit = async (values: AuthCredentials) => {
    try {
      // Client login page — dùng CUSTOMER-AUTH-01: POST /api/customer-auth
      const profile = await customerLoginAndGetProfile(values);

      login(profile);
      showSuccess("Đăng nhập thành công");
      const redirectTo = (location.state as { from?: Location })?.from?.pathname;
      if (redirectTo) {
        navigate(redirectTo, { replace: true });
        return;
      }

      const role = (profile.role ?? "").toString().toLowerCase();
      if (role === "admin" || role === "system") {
        navigate(`${ROUTER_URL.ADMIN}/${ROUTER_URL.ADMIN_ROUTES.DASHBOARD}`, { replace: true });
      } else {
        navigate(ROUTER_URL.MENU, { replace: true });
      }    } catch (error) {
      const msg = error instanceof Error ? error.message : "Sai email hoặc mật khẩu";
      if (msg.toLowerCase().includes("not verified") || msg.toLowerCase().includes("chưa xác thực")) {
        setNotVerifiedEmail(values.email);
      }
      showError(msg);
    }
  };  const handleResendVerification = async () => {
    if (!notVerifiedEmail) return;
    setIsResending(true);
    try {
      await resendToken(notVerifiedEmail);
      showSuccess("Email xác thực đã được gửi lại. Vui lòng kiểm tra hộp thư.");
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Gửi lại email thất bại";
      showError(msg);
    } finally {
      setIsResending(false);
    }
  };  const handleQuickLogin= async (role: "admin" | "client") => {
    const credentials = role === "admin"
      ? { email: "admin@gmail.com", password: "123456" }
      : { email: "user@gmail.com", password: "123456" };

    try {
      // Admin dùng AUTH-01 (/api/auth), Client dùng CUSTOMER-AUTH-01 (/api/customer-auth)
      const profile = role === "admin"
        ? await loginAndGetProfile(credentials)
        : await customerLoginAndGetProfile(credentials);
      login(profile);
      showSuccess(`Đăng nhập nhanh (${credentials.email})`);

      const userRole = (profile.role ?? "").toString().toLowerCase();
      if (userRole === "admin" || userRole === "system") {
        navigate(`${ROUTER_URL.ADMIN}/${ROUTER_URL.ADMIN_ROUTES.DASHBOARD}`, { replace: true });
      } else {
        navigate(ROUTER_URL.HOME, { replace: true });
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Đăng nhập nhanh thất bại";
      showError(msg);
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
            </div>            <Button type="submit" className="w-full" loading={isSubmitting}>
              {isSubmitting ? "Đang đăng nhập..." : "Đăng nhập"}
            </Button>
          </form>

          {/* Not verified banner */}
          {notVerifiedEmail && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-2">
              <p className="text-sm text-amber-800 font-medium">
                ⚠️ Tài khoản chưa được xác thực. Vui lòng kiểm tra email để xác thực.
              </p>
              <button
                type="button"
                onClick={handleResendVerification}
                disabled={isResending}
                className="text-sm font-semibold text-primary-600 hover:text-primary-700 transition-colors disabled:opacity-50"
              >
                {isResending ? "Đang gửi..." : "Gửi lại email xác thực →"}
              </button>
            </div>
          )}

          <div className="space-y-3">
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
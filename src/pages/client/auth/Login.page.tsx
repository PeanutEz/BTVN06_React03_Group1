import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { customerLoginAndGetProfile, resendToken } from "../../../services/auth.service";
import { useAuthStore } from "../../../store";
import { useLoadingStore } from "../../../store/loading.store";
import { useMenuCartStore } from "../../../store/menu-cart.store";
import { cartClient, type CartApiData } from "../../../services/cart.client";
import type { AuthCredentials } from "../../../models";
import { ROUTER_URL } from "../../../routes/router.const";
import { showSuccess } from "../../../utils";
import logoHylux from "../../../assets/logo-hylux.png";

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, login } = useAuthStore();
  const showLoading = useLoadingStore((s) => s.show);
  const hideLoading = useLoadingStore((s) => s.hide);
  const [notVerifiedEmail, setNotVerifiedEmail] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [apiErrors, setApiErrors] = useState<{ email?: string; password?: string; general?: string }>({});

  const { register, handleSubmit, formState: { isSubmitting } } = useForm<AuthCredentials>();

  useEffect(() => {
    if (user) {
      const role = (user.role ?? "").toString().toLowerCase();
      if (role === "admin") {
        navigate(`${ROUTER_URL.ADMIN}/${ROUTER_URL.ADMIN_ROUTES.DASHBOARD}`, { replace: true });
      } else {
        navigate(ROUTER_URL.MENU, { replace: true });
      }
    }
  }, [user, navigate]);

  const onSubmit = async (values: AuthCredentials) => {
    setApiErrors({});
    showLoading("Đang đăng nhập...");
    try {
      const profile = await customerLoginAndGetProfile(values);
      login(profile);

      // Restore cart from API after login
      const customerId = String(
        (profile as any)?.user?.id ?? (profile as any)?.user?._id ?? (profile as any)?.id ?? ""
      );
      if (customerId) {
        try {
          const carts = await cartClient.getCartsByCustomerId(customerId, { status: "ACTIVE" });
          const entries = (carts as CartApiData[]).map((c) => ({
            cartId: String(c._id ?? c.id ?? ""),
            franchise_id: c.franchise_id,
            franchise_name: c.franchise_name ?? (c as any)?.franchise?.name,
          })).filter((e) => e.cartId);
          if (entries.length) useMenuCartStore.getState().setCarts(entries);
        } catch { /* cart restore is best-effort */ }
      }

      showSuccess("Đăng nhập thành công");
      const redirectTo = (location.state as { from?: Location })?.from?.pathname;
      if (redirectTo) { navigate(redirectTo, { replace: true }); return; }
      const role = (profile.role ?? "").toString().toLowerCase();
      if (role === "admin") {
        navigate(`${ROUTER_URL.ADMIN}/${ROUTER_URL.ADMIN_ROUTES.DASHBOARD}`, { replace: true });
      } else {
        navigate(ROUTER_URL.MENU, { replace: true });
      }
    } catch (error) {
      hideLoading();
      const errData = (error as { response?: { data?: { message?: string; errors?: Array<{ field?: string; message?: string }> } } })?.response?.data;
      if (errData?.errors?.length) {
        const mapped: { email?: string; password?: string; general?: string } = {};
        const pickMsg = (field: string) => {
          const fieldErrs = errData.errors!.filter(e => e.field === field);
          return (fieldErrs.find(e => e.message?.toLowerCase().includes("empty")) ?? fieldErrs[0])?.message;
        };
        mapped.email = pickMsg("email");
        mapped.password = pickMsg("password");
        const other = errData.errors!.find(e => e.field !== "email" && e.field !== "password");
        if (other) mapped.general = other.message;
        setApiErrors(mapped);
      } else {
        const msg = errData?.message || (error instanceof Error ? error.message : "Sai email hoặc mật khẩu");
        if (msg.toLowerCase().includes("not verified") || msg.toLowerCase().includes("chưa xác thực")) {
          setNotVerifiedEmail(values.email);
        }
        setApiErrors({ general: msg });
      }
    }
  };

  const handleResendVerification = async () => {
    if (!notVerifiedEmail) return;
    setIsResending(true);
    try {
      await resendToken(notVerifiedEmail);
      showSuccess("Email xác thực đã được gửi lại. Vui lòng kiểm tra hộp thư.");
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Gửi lại email thất bại";
      setApiErrors({ general: msg });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-red-950 to-slate-900 px-4 py-12">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl p-8 sm:p-10">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <img
              src={logoHylux}
              alt="HyLux Coffee"
              className="w-24 h-24 object-contain drop-shadow-lg"
            />
          </div>

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-amber-400/60 to-transparent mb-6" />

          {/* Title */}
          <h2 className="text-center text-xl font-bold text-amber-200 tracking-wide mb-8">
            Đăng nhập vào HyLux
          </h2>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Email */}
            <div>
              <input
                type="email"
                placeholder="Email"
                autoComplete="email"
                className={`w-full px-5 py-3 rounded-xl bg-white/5 border text-amber-100 placeholder-amber-200/40 text-sm outline-none transition-all focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400/60 ${
                  apiErrors.email ? "border-red-400/70" : "border-white/15"
                }`}
                {...register("email")}
              />
              {apiErrors.email && (
                <p className="mt-1 pl-3 text-xs text-red-300">{apiErrors.email}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Mật khẩu"
                  autoComplete="current-password"
                  className={`w-full px-5 py-3 pr-12 rounded-xl bg-white/5 border text-amber-100 placeholder-amber-200/40 text-sm outline-none transition-all focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400/60 ${
                    apiErrors.password ? "border-red-400/70" : "border-white/15"
                  }`}
                  {...register("password")}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-400/50 hover:text-amber-300 transition-colors"
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
              </div>
              {apiErrors.password && (
                <p className="mt-1 pl-3 text-xs text-red-300">{apiErrors.password}</p>
              )}
            </div>

            {/* General error */}
            {apiErrors.general && (
              <div className="px-4 py-2.5 rounded-xl bg-red-500/15 border border-red-400/30 text-center text-sm text-red-300">
                {apiErrors.general}
              </div>
            )}

            {/* Resend verification */}
            {notVerifiedEmail && (
              <div className="text-center text-sm text-amber-300">
                <p>Tài khoản chưa xác thực.</p>
                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={isResending}
                  className="font-semibold underline hover:text-amber-200 transition-colors disabled:opacity-50"
                >
                  {isResending ? "Đang gửi..." : "Gửi lại email →"}
                </button>
              </div>
            )}

            {/* Login button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-400 to-amber-600 text-slate-900 font-bold text-sm tracking-widest uppercase hover:from-amber-300 hover:to-amber-500 transition-all duration-200 hover:shadow-lg hover:shadow-amber-500/30 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
            >
              {isSubmitting ? "···" : "ĐĂNG NHẬP"}
            </button>
          </form>

          {/* Links */}
          <div className="mt-6 flex flex-col items-center gap-3 text-sm">
            <Link
              to={ROUTER_URL.REGISTER}
              className="text-amber-300/80 hover:text-amber-200 transition-colors"
            >
              Chưa có tài khoản? <span className="font-semibold underline">Đăng ký</span>
            </Link>
            <Link
              to={ROUTER_URL.RESET_PASSWORD}
              className="text-amber-300/60 hover:text-amber-200 transition-colors text-xs"
            >
              Quên mật khẩu?
            </Link>
          </div>
        </div>

        {/* Back to home */}
        <div className="mt-6 text-center">
          <Link
            to={ROUTER_URL.HOME}
            className="text-sm text-white/40 hover:text-white/70 transition-colors"
          >
            ← Về trang chủ
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
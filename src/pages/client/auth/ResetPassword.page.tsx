import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { Button } from "../../../components";
import { resetPasswordByEmail } from "../../../services/auth.service";
import { ROUTER_URL } from "../../../routes/router.const";
import { showError, showSuccess } from "../../../utils";
import bgUserLogin from "../../../assets/bg-user-login.jpg";

type ResetPasswordFormValues = {
  email: string;
  newPassword: string;
  confirmPassword: string;
};

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormValues>();

  const onSubmit = async (values: ResetPasswordFormValues) => {
    if (values.newPassword !== values.confirmPassword) {
      showError("Mật khẩu xác nhận không khớp");
      return;
    }

    const updated = await resetPasswordByEmail(values.email, values.newPassword);
    if (!updated) {
      showError("Email không tồn tại trong hệ thống");
      return;
    }
    showSuccess("Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại");
    navigate(ROUTER_URL.LOGIN, { replace: true });
  };

  return (
    <div className="relative min-h-screen bg-cover bg-center bg-no-repeat overflow-hidden" style={{ backgroundImage: `url(${bgUserLogin})` }}>
      <div className="absolute inset-0 bg-black/20" />

      <div className="absolute right-0 top-0 h-full w-full lg:w-1/2 flex items-center justify-center bg-gradient-to-br from-white via-slate-50 to-slate-100 px-6 py-12 animate-slide-in-right">
        <div className="w-full max-w-md space-y-8 animate-fade-in">
          <div className="space-y-3 text-center">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-primary-500 bg-clip-text text-transparent">Đặt lại mật khẩu</h1>
            <p className="text-sm text-slate-600">Nhập email để nhận liên kết đặt lại mật khẩu của bạn.</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Email</label>
              <input
                type="email"
                className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900 outline-none ring-primary-200 transition focus:ring placeholder:text-slate-600 placeholder:font-normal"
                placeholder="Nhập email của bạn"
                {...register("email", {
                  required: "Email không được để trống",
                  pattern: {
                    value: /\S+@\S+\.\S+/,
                    message: "Email không hợp lệ",
                  },
                })}
              />
              {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Mật khẩu mới</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  className="w-full rounded-lg border border-slate-200 px-4 py-3 pr-12 text-sm font-semibold text-slate-900 outline-none ring-primary-200 transition focus:ring placeholder:text-slate-600 placeholder:font-normal"
                  placeholder="Nhập mật khẩu mới"
                  maxLength={5}
                  {...register("newPassword", {
                    required: "Mật khẩu không được để trống",
                    maxLength: { value: 5, message: "Mật khẩu tối đa 5 ký tự" },
                  })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-primary-600"
                  aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                >
                  {showPassword ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path d="M3 3l18 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                      <path d="M10.58 10.58a2 2 0 002.84 2.84" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                      <path
                        d="M9.88 5.09A9.77 9.77 0 0112 5c5.2 0 9.23 3.62 11 7-1.02 2.01-2.76 4.12-5.13 5.54"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                      />
                      <path
                        d="M6.11 6.11C4.09 7.31 2.62 9.05 1 12c1.77 3.38 5.8 7 11 7 1.12 0 2.2-.17 3.22-.49"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                      />
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path
                        d="M1 12c1.77-3.38 5.8-7 11-7s9.23 3.62 11 7c-1.77 3.38-5.8 7-11 7S2.77 15.38 1 12z"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      />
                      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
                    </svg>
                  )}
                </button>
              </div>
              {errors.newPassword && <p className="text-xs text-red-500">{errors.newPassword.message}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Xác nhận mật khẩu</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  className="w-full rounded-lg border border-slate-200 px-4 py-3 pr-12 text-sm font-semibold text-slate-900 outline-none ring-primary-200 transition focus:ring placeholder:text-slate-600 placeholder:font-normal"
                  placeholder="Nhập lại mật khẩu mới"
                  maxLength={5}
                  {...register("confirmPassword", {
                    required: "Vui lòng xác nhận mật khẩu",
                    maxLength: { value: 5, message: "Mật khẩu tối đa 5 ký tự" },
                    validate: (value) => value === watch("newPassword") || "Mật khẩu xác nhận không khớp",
                  })}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-primary-600"
                  aria-label={showConfirmPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                >
                  {showConfirmPassword ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path d="M3 3l18 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                      <path d="M10.58 10.58a2 2 0 002.84 2.84" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                      <path
                        d="M9.88 5.09A9.77 9.77 0 0112 5c5.2 0 9.23 3.62 11 7-1.02 2.01-2.76 4.12-5.13 5.54"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                      />
                      <path
                        d="M6.11 6.11C4.09 7.31 2.62 9.05 1 12c1.77 3.38 5.8 7 11 7 1.12 0 2.2-.17 3.22-.49"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                      />
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path
                        d="M1 12c1.77-3.38 5.8-7 11-7s9.23 3.62 11 7c-1.77 3.38-5.8 7-11 7S2.77 15.38 1 12z"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      />
                      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
                    </svg>
                  )}
                </button>
              </div>
              {errors.confirmPassword && <p className="text-xs text-red-500">{errors.confirmPassword.message}</p>}
            </div>

            <Button type="submit" className="w-full" loading={isSubmitting}>
              {isSubmitting ? "Đang cập nhật..." : "Cập nhật mật khẩu"}
            </Button>
          </form>

          <div className="text-center space-y-2">
            <button
              type="button"
              onClick={() => navigate(ROUTER_URL.LOGIN)}
              className="text-sm font-semibold text-primary-600 hover:text-primary-700 transition-colors"
            >
              Quay lại đăng nhập
            </button>
            <p className="text-xs text-slate-500">Vui lòng dùng mật khẩu tối đa 5 ký tự theo quy định hệ thống.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;

import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { Button } from "../../../components";
import { forgotPassword } from "../../../services/auth.service";
import { ROUTER_URL } from "../../../routes/router.const";
import { showError, showSuccess } from "../../../utils";
import bgUserLogin from "../../../assets/bg-user-login.jpg";

type ResetPasswordFormValues = {
  email: string;
};

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormValues>();

  const onSubmit = async (values: ResetPasswordFormValues) => {
    try {
      await forgotPassword(values.email);
      showSuccess("Mật khẩu mới đã được gửi vào email của bạn. Vui lòng kiểm tra hộp thư");
      navigate(ROUTER_URL.LOGIN, { replace: true });
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { message?: string }; status?: number } };
      const status = axiosError?.response?.status;
      if (status === 400) {
        showError("Email không tồn tại, chưa xác thực hoặc đã bị khóa");
      } else if (status === 500) {
        showError("Không thể gửi email. Vui lòng thử lại sau");
      } else {
        showError(axiosError?.response?.data?.message ?? "Có lỗi xảy ra. Vui lòng thử lại");
      }
    }
  };

  return (
    <div className="relative min-h-screen bg-cover bg-center bg-no-repeat overflow-hidden" style={{ backgroundImage: `url(${bgUserLogin})` }}>
      <div className="absolute inset-0 bg-black/20" />
      <div className="absolute right-0 top-0 h-full w-full lg:w-1/2 flex items-center justify-center bg-gradient-to-br from-white via-slate-50 to-slate-100 px-6 py-12 animate-slide-in-right">
        <div className="w-full max-w-md space-y-8 animate-fade-in">
          <div className="space-y-3 text-center">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-primary-500 bg-clip-text text-transparent">Quên mật khẩu</h1>
            <p className="text-sm text-slate-600">Nhập email để nhận mật khẩu mới qua email của bạn.</p>
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
                  pattern: { value: /\S+@\S+\.\S+/, message: "Email không hợp lệ" },
                })}
              />
              {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
            </div>
            <Button type="submit" className="w-full" loading={isSubmitting}>
              {isSubmitting ? "Đang gửi..." : "Gửi mật khẩu mới"}
            </Button>
          </form>
          <div className="text-center">
            <button
              type="button"
              onClick={() => navigate(ROUTER_URL.LOGIN)}
              className="text-sm font-semibold text-primary-600 hover:text-primary-700 transition-colors"
            >
              Quay lại đăng nhập
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;

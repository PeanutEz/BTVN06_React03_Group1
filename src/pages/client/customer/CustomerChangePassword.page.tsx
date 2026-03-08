import { useState } from "react";
import { useForm } from "react-hook-form";
import { customerChangePassword } from "../../../services/auth.service";
import { showError, showSuccess } from "../../../utils";

type ChangePasswordForm = {
  old_password: string;
  new_password: string;
  confirm_password: string;
};

export default function CustomerChangePasswordPage() {
  const [saving, setSaving] = useState(false);
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordForm>();

  const onSubmit = async (values: ChangePasswordForm) => {
    try {
      setSaving(true);
      await customerChangePassword({
        old_password: values.old_password,
        new_password: values.new_password,
      });
      showSuccess("Đổi mật khẩu thành công");
      reset();
    } catch (err) {
      console.error("Failed to change password:", err);
      showError(err instanceof Error ? err.message : "Đổi mật khẩu thất bại");
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    "w-full h-11 border border-gray-200 rounded-xl px-4 text-sm text-gray-900 bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-150 hover:border-gray-300";

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-7 sm:p-9">
      {/* Card header */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-primary-800 tracking-tight">
          Đổi mật khẩu
        </h2>
        <p className="text-sm text-gray-400 mt-1">
          Để bảo mật tài khoản, vui lòng không chia sẻ mật khẩu cho người khác
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="max-w-md space-y-5">
        {/* Old password */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            Mật khẩu hiện tại
          </label>
          <div className="relative">
            <input
              type={showOld ? "text" : "password"}
              placeholder="Nhập mật khẩu hiện tại"
              className={inputCls + " pr-11"}
              {...register("old_password", {
                required: "Vui lòng nhập mật khẩu hiện tại",
              })}
            />
            <button
              type="button"
              onClick={() => setShowOld(!showOld)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              tabIndex={-1}
            >
              {showOld ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" /></svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
              )}
            </button>
          </div>
          {errors.old_password && (
            <p className="text-xs text-red-500 mt-1">{errors.old_password.message}</p>
          )}
        </div>

        {/* New password */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            Mật khẩu mới
          </label>
          <div className="relative">
            <input
              type={showNew ? "text" : "password"}
              placeholder="Nhập mật khẩu mới"
              className={inputCls + " pr-11"}
              {...register("new_password", {
                required: "Vui lòng nhập mật khẩu mới",
                minLength: {
                  value: 6,
                  message: "Mật khẩu phải có ít nhất 6 ký tự",
                },
              })}
            />
            <button
              type="button"
              onClick={() => setShowNew(!showNew)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              tabIndex={-1}
            >
              {showNew ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" /></svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
              )}
            </button>
          </div>
          {errors.new_password && (
            <p className="text-xs text-red-500 mt-1">{errors.new_password.message}</p>
          )}
        </div>

        {/* Confirm password */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            Xác nhận mật khẩu mới
          </label>
          <div className="relative">
            <input
              type={showConfirm ? "text" : "password"}
              placeholder="Nhập lại mật khẩu mới"
              className={inputCls + " pr-11"}
              {...register("confirm_password", {
                required: "Vui lòng xác nhận mật khẩu mới",
                validate: (val) =>
                  val === watch("new_password") || "Mật khẩu xác nhận không khớp",
              })}
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              tabIndex={-1}
            >
              {showConfirm ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" /></svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
              )}
            </button>
          </div>
          {errors.confirm_password && (
            <p className="text-xs text-red-500 mt-1">{errors.confirm_password.message}</p>
          )}
        </div>

        {/* Divider */}
        <div className="pt-3">
          <div className="h-px bg-gray-100" />
        </div>

        {/* Submit */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 bg-primary-700 hover:bg-primary-800 active:bg-primary-900 text-white text-sm font-semibold px-7 py-2.5 rounded-xl shadow-sm hover:shadow transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
            {saving ? "Đang lưu..." : "Đổi mật khẩu"}
          </button>
        </div>
      </form>
    </div>
  );
}

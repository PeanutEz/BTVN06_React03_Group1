import { useState } from "react";
import { useForm } from "react-hook-form";
import { useAuthStore } from "../../../store";
import { getProfile, changePassword } from "../../../services/auth.service";
import { updateUserProfile } from "../../../services/user.service";
import { showSuccess, showError } from "../../../utils";
import { Button } from "../../../components";

interface ProfileFormData {
  name: string;
  phone: string;
  avatar_url: string;
}

interface PasswordFormData {
  old_password: string;
  new_password: string;
  confirm_password: string;
}

const AdminProfilePage = () => {
  const { user, setUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState<"profile" | "password">("profile");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const userId = user?.user?.id || user?.id || "";
  const currentName = user?.user?.name || user?.name || "";
  const currentEmail = user?.user?.email || user?.email || "";
  const currentPhone = (user?.user?.phone as string) || "";
  const currentAvatar = user?.user?.avatar_url || user?.avatar || "";
  const activeContext = user?.active_context as { franchise_name?: string; role?: string } | null;
  const currentRole = activeContext?.role || user?.role || "";
  const currentFranchise = activeContext?.franchise_name || "";

  const {
    register: registerProfile,
    handleSubmit: handleSubmitProfile,
    formState: { errors: profileErrors },
  } = useForm<ProfileFormData>({
    defaultValues: {
      name: currentName,
      phone: currentPhone,
      avatar_url: currentAvatar,
    },
  });

  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    formState: { errors: passwordErrors },
    watch,
    reset: resetPassword,
  } = useForm<PasswordFormData>();

  const newPassword = watch("new_password");

  const onSubmitProfile = async (data: ProfileFormData) => {
    if (!userId) {
      showError("Không tìm thấy thông tin người dùng");
      return;
    }
    setSavingProfile(true);
    try {
      await updateUserProfile(userId, {
        name: data.name,
        phone: data.phone,
        avatar_url: data.avatar_url,
      });
      // Refresh profile from server
      const updated = await getProfile();
      setUser(updated);
      showSuccess("Cập nhật hồ sơ thành công");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Cập nhật hồ sơ thất bại";
      showError(msg);
    } finally {
      setSavingProfile(false);
    }
  };

  const onSubmitPassword = async (data: PasswordFormData) => {
    setSavingPassword(true);
    try {
      await changePassword({
        old_password: data.old_password,
        new_password: data.new_password,
      });
      showSuccess("Đổi mật khẩu thành công");
      resetPassword();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Đổi mật khẩu thất bại";
      showError(msg);
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Hồ sơ cá nhân</h1>
        <p className="text-xs sm:text-sm text-slate-500">Quản lý thông tin tài khoản và mật khẩu</p>
      </div>

      {/* Profile Card */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6 flex items-center gap-5">
        <img
          src={currentAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentEmail}`}
          alt={currentName}
          className="size-20 rounded-full object-cover border-4 border-primary-100 shadow"
        />
        <div>
          <p className="text-lg font-bold text-slate-900">{currentName}</p>
          <p className="text-sm text-slate-500">{currentEmail}</p>
          <div className="mt-1 flex flex-wrap gap-2">
            {currentRole && (
              <span className="inline-flex items-center rounded-full bg-primary-100 px-2.5 py-0.5 text-xs font-semibold text-primary-700 capitalize">
                {currentRole}
              </span>
            )}
            {currentFranchise && (
              <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                {currentFranchise}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          onClick={() => setActiveTab("profile")}
          className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === "profile"
              ? "border-primary-500 text-primary-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          Thông tin cá nhân
        </button>
        <button
          onClick={() => setActiveTab("password")}
          className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === "password"
              ? "border-primary-500 text-primary-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          Đổi mật khẩu
        </button>
      </div>

      {/* Tab: Profile */}
      {activeTab === "profile" && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6 max-w-lg">
          <form onSubmit={handleSubmitProfile(onSubmitProfile)} className="space-y-5">
            {/* Email (read-only) */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input
                type="text"
                value={currentEmail}
                readOnly
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 cursor-not-allowed outline-none"
              />
            </div>

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Họ và tên <span className="text-red-500">*</span>
              </label>
              <input
                {...registerProfile("name", { required: "Vui lòng nhập họ tên" })}
                type="text"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              />
              {profileErrors.name && (
                <p className="mt-1 text-xs text-red-500">{profileErrors.name.message}</p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Số điện thoại</label>
              <input
                {...registerProfile("phone")}
                type="tel"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              />
            </div>

            {/* Avatar URL */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">URL ảnh đại diện</label>
              <input
                {...registerProfile("avatar_url")}
                type="text"
                placeholder="https://..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              />
            </div>

            <div className="pt-1">
              <Button type="submit" loading={savingProfile}>
                Lưu thay đổi
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Tab: Password */}
      {activeTab === "password" && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6 max-w-lg">
          <form onSubmit={handleSubmitPassword(onSubmitPassword)} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Mật khẩu hiện tại <span className="text-red-500">*</span>
              </label>
              <input
                {...registerPassword("old_password", { required: "Vui lòng nhập mật khẩu hiện tại" })}
                type="password"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              />
              {passwordErrors.old_password && (
                <p className="mt-1 text-xs text-red-500">{passwordErrors.old_password.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Mật khẩu mới <span className="text-red-500">*</span>
              </label>
              <input
                {...registerPassword("new_password", {
                  required: "Vui lòng nhập mật khẩu mới",
                  minLength: { value: 6, message: "Mật khẩu tối thiểu 6 ký tự" },
                })}
                type="password"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              />
              {passwordErrors.new_password && (
                <p className="mt-1 text-xs text-red-500">{passwordErrors.new_password.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Xác nhận mật khẩu mới <span className="text-red-500">*</span>
              </label>
              <input
                {...registerPassword("confirm_password", {
                  required: "Vui lòng xác nhận mật khẩu",
                  validate: (value) => value === newPassword || "Mật khẩu xác nhận không khớp",
                })}
                type="password"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              />
              {passwordErrors.confirm_password && (
                <p className="mt-1 text-xs text-red-500">{passwordErrors.confirm_password.message}</p>
              )}
            </div>

            <div className="pt-1">
              <Button type="submit" loading={savingPassword}>
                Đổi mật khẩu
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default AdminProfilePage;

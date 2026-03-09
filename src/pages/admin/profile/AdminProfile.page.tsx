import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { useAuthStore } from "../../../store";
import { getProfile, changePassword } from "../../../services/auth.service";
import { updateUserProfile } from "../../../services/user.service";
import { showSuccess, showError } from "../../../utils";
import { Button } from "../../../components";

const CLOUDINARY_CLOUD_NAME = "dn2xh5rxe";
const CLOUDINARY_UPLOAD_PRESET = "btvn06_upload";

async function uploadImageToCloudinary(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    { method: "POST", body: formData }
  );
  if (!res.ok) throw new Error("Upload ảnh lên Cloudinary thất bại");
  const data = await res.json() as { secure_url: string };
  return data.secure_url;
}

interface ProfileFormData {
  name: string;
  phone: string;
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
  const pendingAvatarFileRef = useRef<File | null>(null);
  const [pendingAvatarPreview, setPendingAvatarPreview] = useState<string>("");

  const userId = user?.user?.id || user?.id || "";
  const currentName = user?.user?.name || user?.name || "";
  const currentEmail = user?.user?.email || user?.email || "";
  const currentPhone = (user?.user?.phone as string) || "";
  const currentAvatar = user?.user?.avatar_url || user?.avatar || "";

  const {
    register: registerProfile,
    handleSubmit: handleSubmitProfile,
    formState: { errors: profileErrors },
  } = useForm<ProfileFormData>({
    defaultValues: {
      name: currentName,
      phone: currentPhone,
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
      let avatarUrl = currentAvatar;
      if (pendingAvatarFileRef.current) {
        avatarUrl = await uploadImageToCloudinary(pendingAvatarFileRef.current);
        pendingAvatarFileRef.current = null;
        setPendingAvatarPreview("");
      }
      await updateUserProfile(userId, {
        email: currentEmail,
        name: data.name,
        phone: data.phone,
        avatar_url: avatarUrl,
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
            {/* Avatar upload */}
            <div>
              <div className="flex items-center gap-4">
                <div className="relative flex-shrink-0">
                  <div className="w-20 h-20 rounded-full overflow-hidden bg-slate-100 border-2 border-slate-200">
                    {(pendingAvatarPreview || currentAvatar) ? (
                      <img
                        src={pendingAvatarPreview || currentAvatar}
                        alt="Ảnh đại diện"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400">
                        <svg className="w-9 h-9" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  {savingProfile && (
                    <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                    </div>
                  )}
                </div>
                <div>
                  <label className="cursor-pointer inline-flex items-center gap-2 bg-white border border-slate-200 hover:border-primary-400 hover:text-primary-700 text-sm font-medium text-slate-700 px-3 py-1.5 rounded-lg transition-all shadow-sm">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Thay đổi ảnh
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={savingProfile}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          pendingAvatarFileRef.current = file;
                          setPendingAvatarPreview(URL.createObjectURL(file));
                        }
                        e.target.value = "";
                      }}
                    />
                  </label>
                  <p className="text-xs text-slate-400 mt-1">PNG, JPG tối đa 5MB</p>
                </div>
              </div>
            </div>

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

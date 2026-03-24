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

// ── Avatar Modal ──────────────────────────────────────────────────────────────
function AvatarModal({
  currentUrl,
  uploading,
  onSave,
  onClose,
}: {
  currentUrl?: string;
  uploading: boolean;
  onSave: (file: File) => Promise<void>;
  onClose: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string>(currentUrl ?? "");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFileChange = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    if (file.size > 5 * 1024 * 1024) return;
    setSelectedFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileChange(file);
  };

  const handleSave = async () => {
    if (!selectedFile) return;
    await onSave(selectedFile);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900">Thay đổi ảnh đại diện</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Preview */}
        <div className="flex justify-center">
          <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-slate-100 bg-slate-50 shadow-inner">
            {preview ? (
              <img src={preview} alt="Preview" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-300">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            )}
          </div>
        </div>

        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`cursor-pointer border-2 border-dashed rounded-xl px-4 py-5 text-center transition-colors ${
            dragOver ? "border-primary-500 bg-primary-50" : "border-slate-200 hover:border-primary-400 hover:bg-slate-50"
          }`}
        >
          <svg className="w-7 h-7 mx-auto mb-2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          <p className="text-sm font-medium text-slate-600">Kéo thả hoặc <span className="text-primary-600">chọn ảnh</span></p>
          <p className="text-xs text-slate-400 mt-1">PNG, JPG tối đa 5MB</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileChange(file);
              e.target.value = "";
            }}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <button
            onClick={onClose}
            disabled={uploading}
            className="flex-1 h-10 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition disabled:opacity-50"
          >
            Hủy
          </button>
          <button
            onClick={handleSave}
            disabled={!selectedFile || uploading}
            className="flex-1 h-10 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {uploading ? (
              <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />Đang lưu...</>
            ) : (
              <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>Lưu ảnh</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
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
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);

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
      await updateUserProfile(userId, {
        email: currentEmail,
        name: data.name,
        phone: data.phone,
        avatar_url: currentAvatar,
      });
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

  const handleAvatarSave = async (file: File) => {
    if (!userId) { showError("Không tìm thấy thông tin người dùng"); return; }
    setUploadingAvatar(true);
    try {
      const avatarUrl = await uploadImageToCloudinary(file);
      await updateUserProfile(userId, {
        email: currentEmail,
        name: currentName,
        phone: currentPhone,
        avatar_url: avatarUrl,
      });
      const updated = await getProfile();
      setUser(updated);
      showSuccess("Cập nhật ảnh đại diện thành công");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload ảnh thất bại";
      showError(msg);
    } finally {
      setUploadingAvatar(false);
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
          <form onSubmit={handleSubmitProfile(onSubmitProfile)} className="space-y-5">            {/* Avatar upload */}
            <div>
              <div className="flex items-center gap-4">
                <div className="relative flex-shrink-0">
                  <div className="w-20 h-20 rounded-full overflow-hidden bg-slate-100 border-2 border-slate-200">
                    {currentAvatar ? (
                      <img
                        src={currentAvatar}
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
                  {uploadingAvatar && (
                    <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                    </div>
                  )}
                </div>
                <div>
                  <button
                    type="button"
                    disabled={uploadingAvatar}
                    onClick={() => setShowAvatarModal(true)}
                    className="inline-flex items-center gap-2 bg-white border border-slate-200 hover:border-primary-400 hover:text-primary-700 text-sm font-medium text-slate-700 px-3 py-1.5 rounded-lg transition-all shadow-sm disabled:opacity-50"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {uploadingAvatar ? "Đang lưu..." : "Thay đổi ảnh"}
                  </button>
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
            </div>            <div className="pt-1">
              <Button type="submit" loading={savingPassword}>
                Đổi mật khẩu
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Avatar Modal */}
      {showAvatarModal && (
        <AvatarModal
          currentUrl={currentAvatar}
          uploading={uploadingAvatar}
          onSave={handleAvatarSave}
          onClose={() => setShowAvatarModal(false)}
        />
      )}
    </div>
  );
};

export default AdminProfilePage;

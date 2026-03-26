import { useRef, useState } from "react";

type PersonalInfoForm = {
  name: string;
  phone: string;
  email: string;
  address: string;
};

type PersonalInfoProps = {
  form: PersonalInfoForm;
  onFieldChange: (field: keyof PersonalInfoForm, value: string) => void;
  onSubmit?: () => void;
  saving?: boolean;
  avatarUrl?: string;
  onAvatarSave?: (file: File) => Promise<void>;
  uploadingAvatar?: boolean;
};

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
      {children}
    </label>
  );
}

const inputCls =
  "w-full h-11 border border-gray-200 rounded-xl px-4 text-sm text-gray-900 bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-150 hover:border-gray-300";

const inputDisabledCls =
  "w-full h-11 border border-gray-100 rounded-xl px-4 text-sm text-gray-400 bg-gray-50 cursor-not-allowed select-none";

// ── Avatar Change Modal ───────────────────────────────────────────────────────
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
    try {
      await onSave(selectedFile);
      onClose();
    } catch {
      // lỗi đã được xử lý bên ngoài (showError), không đóng modal
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-gray-900">Thay đổi ảnh đại diện</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Preview */}
        <div className="flex justify-center">
          <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-gray-100 bg-gray-50 shadow-inner">
            {preview ? (
              <img src={preview} alt="Preview" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-300">
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
            dragOver ? "border-primary-500 bg-primary-50" : "border-gray-200 hover:border-primary-400 hover:bg-gray-50"
          }`}
        >
          <svg className="w-7 h-7 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          <p className="text-sm font-medium text-gray-600">Kéo thả hoặc <span className="text-primary-600">chọn ảnh</span></p>
          <p className="text-xs text-gray-400 mt-1">PNG, JPG tối đa 5MB</p>
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
            className="flex-1 h-10 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition disabled:opacity-50"
          >
            Hủy
          </button>
          <button
            onClick={handleSave}
            disabled={!selectedFile || uploading}
            className="flex-1 h-10 rounded-xl bg-primary-700 hover:bg-primary-800 text-white text-sm font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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

// ── Main Component ────────────────────────────────────────────────────────────
export default function PersonalInfo({
  form,
  onFieldChange,
  onSubmit,
  saving = false,
  avatarUrl,
  onAvatarSave,
  uploadingAvatar = false,
}: PersonalInfoProps) {
  const [showAvatarModal, setShowAvatarModal] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit?.();
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-7 sm:p-9">
      {/* Card header */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-primary-800 tracking-tight">Thông tin cá nhân</h2>
        <p className="text-sm text-gray-400 mt-1">Quản lý thông tin hồ sơ của bạn</p>
      </div>

      {/* Avatar section */}
      <div className="flex items-center gap-6 mb-8 pb-8 border-b border-gray-100">
        <div className="relative flex-shrink-0">
          <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-100 border-2 border-gray-200">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Ảnh đại diện" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
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
            className="cursor-pointer inline-flex items-center gap-2 bg-white border border-gray-200 hover:border-primary-400 hover:text-primary-700 text-sm font-medium text-gray-700 px-4 py-2 rounded-xl transition-all duration-150 shadow-sm disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {uploadingAvatar ? "Đang lưu..." : "Thay đổi ảnh"}
          </button>
          <p className="text-xs text-gray-400 mt-1.5">PNG, JPG tối đa 5MB</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
          <div>
            <FieldLabel>Họ &amp; tên</FieldLabel>
            <input
              type="text"
              placeholder="Nhập họ và tên"
              value={form.name}
              onChange={(e) => onFieldChange("name", e.target.value)}
              className={inputCls}
            />
          </div>

          <div>
            <FieldLabel>Số điện thoại</FieldLabel>
            <input
              type="tel"
              placeholder="Nhập số điện thoại"
              value={form.phone}
              onChange={(e) => onFieldChange("phone", e.target.value)}
              className={inputCls}
            />
          </div>

          <div>
            <FieldLabel>Email</FieldLabel>
            <input
              type="email"
              value={form.email}
              disabled
              readOnly
              className={inputDisabledCls}
              title="Email không thể thay đổi"
            />
            <p className="text-xs text-gray-400 mt-1">Email không thể thay đổi</p>
          </div>

          <div>
            <FieldLabel>Địa chỉ</FieldLabel>
            <input
              type="text"
              placeholder="Số nhà, tên đường..."
              value={form.address}
              onChange={(e) => onFieldChange("address", e.target.value)}
              className={inputCls}
            />
          </div>
        </div>

        <div className="mt-8 mb-6 h-px bg-gray-100" />

        <div className="flex justify-end">
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
            {saving ? "Đang lưu..." : "Lưu thay đổi"}
          </button>
        </div>
      </form>

      {/* Avatar Modal */}      {showAvatarModal && (
        <AvatarModal
          currentUrl={avatarUrl}
          uploading={uploadingAvatar}
          onSave={onAvatarSave ?? (() => Promise.resolve())}
          onClose={() => setShowAvatarModal(false)}
        />
      )}
    </div>
  );
}

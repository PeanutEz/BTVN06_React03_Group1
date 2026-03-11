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
  onAvatarSelect?: (file: File) => void;
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

export default function PersonalInfo({
  form,
  onFieldChange,
  onSubmit,
  saving = false,
  avatarUrl,
  onAvatarSelect,
}: PersonalInfoProps) {
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

      {/* Avatar upload section */}
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
          {saving && (
            <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
            </div>
          )}
        </div>
        <div>
          <label className="cursor-pointer inline-flex items-center gap-2 bg-white border border-gray-200 hover:border-primary-400 hover:text-primary-700 text-sm font-medium text-gray-700 px-4 py-2 rounded-xl transition-all duration-150 shadow-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Thay đổi ảnh
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={saving}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onAvatarSelect?.(file);
                e.target.value = "";
              }}
            />
          </label>
          <p className="text-xs text-gray-400 mt-1.5">PNG, JPG tối đa 5MB</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
          {/* Row 1 */}
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

          {/* Row 2 */}
          <div>
            <FieldLabel>Email</FieldLabel>
            <input
              type="email"
              placeholder="Nhập địa chỉ email"
              value={form.email}
              onChange={(e) => onFieldChange("email", e.target.value)}
              className={inputCls}
            />
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

        {/* Divider */}
        <div className="mt-8 mb-6 h-px bg-gray-100" />

        {/* Save button */}
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
    </div>
  );
}

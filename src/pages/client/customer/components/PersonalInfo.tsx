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

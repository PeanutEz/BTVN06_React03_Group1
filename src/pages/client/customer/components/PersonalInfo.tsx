type PersonalInfoForm = {
  name: string;
  phone: string;
  gender: string;
  idCard: string;
  birthday: string;
  email: string;
  province: string;
  district: string;
  ward: string;
  address: string;
};

type PersonalInfoProps = {
  form: PersonalInfoForm;
  provinces: string[];
  onFieldChange: (field: keyof PersonalInfoForm, value: string) => void;
  onSubmit?: () => void;
};

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
      {children}
    </label>
  );
}

const inputCls =
  "w-full h-11 border border-gray-200 rounded-xl px-4 text-sm text-gray-900 bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-150 hover:border-gray-300";

export default function PersonalInfo({
  form,
  provinces,
  onFieldChange,
  onSubmit,
}: PersonalInfoProps) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit?.();
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-7 sm:p-9">
      {/* Card header */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-green-800 tracking-tight">Thông tin cá nhân</h2>
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
            <FieldLabel>Giới tính</FieldLabel>
            <select
              value={form.gender}
              onChange={(e) => onFieldChange("gender", e.target.value)}
              className={inputCls}
            >
              <option value="">Chọn giới tính</option>
              <option value="male">Nam</option>
              <option value="female">Nữ</option>
              <option value="other">Khác</option>
            </select>
          </div>

          <div>
            <FieldLabel>Số CMND / CCCD</FieldLabel>
            <input
              type="text"
              placeholder="Nhập số CMND hoặc CCCD"
              value={form.idCard}
              onChange={(e) => onFieldChange("idCard", e.target.value)}
              className={inputCls}
            />
          </div>

          {/* Row 3 */}
          <div>
            <FieldLabel>Ngày sinh</FieldLabel>
            <div className="relative">
              <input
                type="date"
                value={form.birthday}
                onChange={(e) => onFieldChange("birthday", e.target.value)}
                className={inputCls}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </span>
            </div>
          </div>

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

          {/* Row 4 */}
          <div>
            <FieldLabel>Tỉnh / Thành phố</FieldLabel>
            <select
              value={form.province}
              onChange={(e) => onFieldChange("province", e.target.value)}
              className={inputCls}
            >
              <option value="">Chọn Tỉnh/Thành phố</option>
              {provinces.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div>
            <FieldLabel>Quận / Huyện</FieldLabel>
            <select
              value={form.district}
              onChange={(e) => onFieldChange("district", e.target.value)}
              className={inputCls}
            >
              <option value="">Chọn Quận/Huyện</option>
            </select>
          </div>

          {/* Row 5 */}
          <div>
            <FieldLabel>Phường / Xã</FieldLabel>
            <select
              value={form.ward}
              onChange={(e) => onFieldChange("ward", e.target.value)}
              className={inputCls}
            >
              <option value="">Chọn Phường/Xã</option>
            </select>
          </div>

          <div>
            <FieldLabel>Địa chỉ cụ thể</FieldLabel>
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
            className="inline-flex items-center gap-2 bg-green-700 hover:bg-green-800 active:bg-green-900 text-white text-sm font-semibold px-7 py-2.5 rounded-xl shadow-sm hover:shadow transition-all duration-150"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Lưu thay đổi
          </button>
        </div>
      </form>
    </div>
  );
}

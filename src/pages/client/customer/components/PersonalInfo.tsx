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

const inputClassName =
  "w-full h-10 border border-gray-300 rounded-md px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-400";

export default function PersonalInfo({
  form,
  provinces,
  onFieldChange,
  onSubmit,
}: PersonalInfoProps) {
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit?.();
  };

  return (
    <main className="flex-1 border border-gray-200 rounded-lg bg-white p-6">
      <h2 className="text-2xl font-bold text-green-700 mb-6">Thông tin cá nhân</h2>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Họ &amp; tên</label>
            <input
              value={form.name}
              onChange={(event) => onFieldChange("name", event.target.value)}
              className={inputClassName}
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Số điện thoại</label>
            <input
              value={form.phone}
              onChange={(event) => onFieldChange("phone", event.target.value)}
              className={inputClassName}
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Giới tính</label>
            <select
              value={form.gender}
              onChange={(event) => onFieldChange("gender", event.target.value)}
              className={inputClassName}
            >
              <option value="">Chọn giới tính</option>
              <option value="male">Nam</option>
              <option value="female">Nữ</option>
              <option value="other">Khác</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Số CMND/CCCD</label>
            <input
              value={form.idCard}
              onChange={(event) => onFieldChange("idCard", event.target.value)}
              className={inputClassName}
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Ngày sinh</label>
            <input
              type="date"
              value={form.birthday}
              onChange={(event) => onFieldChange("birthday", event.target.value)}
              className={inputClassName}
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(event) => onFieldChange("email", event.target.value)}
              className={inputClassName}
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Tỉnh/Thành phố</label>
            <select
              value={form.province}
              onChange={(event) => onFieldChange("province", event.target.value)}
              className={inputClassName}
            >
              <option value="">Chọn Tỉnh/Thành phố</option>
              {provinces.map((province) => (
                <option key={province} value={province}>
                  {province}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Quận/Huyện</label>
            <select
              value={form.district}
              onChange={(event) => onFieldChange("district", event.target.value)}
              className={inputClassName}
            >
              <option value="">Chọn Quận/Huyện</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Phường/Xã</label>
            <select
              value={form.ward}
              onChange={(event) => onFieldChange("ward", event.target.value)}
              className={inputClassName}
            >
              <option value="">Chọn Phường/Xã</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Địa chỉ</label>
            <input
              value={form.address}
              onChange={(event) => onFieldChange("address", event.target.value)}
              className={inputClassName}
            />
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <button
            type="submit"
            className="bg-green-700 hover:bg-green-800 text-white font-semibold px-6 py-2 rounded-md transition-colors"
          >
            Lưu thay đổi
          </button>
        </div>
      </form>
    </main>
  );
}

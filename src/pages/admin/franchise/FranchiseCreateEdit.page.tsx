import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../../components";
import type { Store } from "../../../models/store.model";
import { ROUTER_URL } from "../../../routes/router.const";

const emptyStore: Store = {
  id: "",
  name: "",
  code: "",
  address: "",
  city: "",
  phone: "",
  email: "",
  manager: "",
  status: "ACTIVE",
  openingHours: "07:00 - 22:00",
  createDate: new Date().toISOString(),
};

const FranchiseCreateEditPage = () => {
  const [form, setForm] = useState<Store>(emptyStore);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  const handleChange = (field: keyof Store, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      // TODO: tích hợp API thật. Hiện tại chỉ demo form nên điều hướng về danh sách.
      await new Promise((resolve) => setTimeout(resolve, 500));
      navigate(`/${ROUTER_URL.ADMIN}/${ROUTER_URL.ADMIN_ROUTES.FRANCHISE_LIST}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tạo Franchise</h1>
          <p className="text-sm text-slate-600">Form demo mock, chưa lưu vào backend.</p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Tên chi nhánh
              <input
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                value={form.name}
                onChange={(e) => handleChange("name", e.target.value)}
                required
              />
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Mã chi nhánh
              <input
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                value={form.code}
                onChange={(e) => handleChange("code", e.target.value)}
                required
              />
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Thành phố
              <input
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                value={form.city}
                onChange={(e) => handleChange("city", e.target.value)}
              />
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Địa chỉ
              <input
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                value={form.address}
                onChange={(e) => handleChange("address", e.target.value)}
              />
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Điện thoại
              <input
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                value={form.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
              />
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Email
              <input
                type="email"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                value={form.email}
                onChange={(e) => handleChange("email", e.target.value)}
              />
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Quản lý
              <input
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                value={form.manager}
                onChange={(e) => handleChange("manager", e.target.value)}
              />
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Giờ mở cửa
              <input
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                value={form.openingHours}
                onChange={(e) => handleChange("openingHours", e.target.value)}
              />
            </label>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(`/${ROUTER_URL.ADMIN}/${ROUTER_URL.ADMIN_ROUTES.FRANCHISE_LIST}`)}
          >
            Hủy
          </Button>
          <Button type="submit" loading={saving}>
            Lưu (demo)
          </Button>
        </div>
      </form>
    </div>
  );
};

export default FranchiseCreateEditPage;


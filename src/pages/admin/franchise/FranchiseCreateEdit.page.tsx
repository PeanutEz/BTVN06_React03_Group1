import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "../../../components";
import { createFranchise, updateFranchise, getFranchiseById } from "../../../services/store.service";
import type { CreateFranchisePayload } from "../../../services/store.service";
import { ROUTER_URL } from "../../../routes/router.const";
import { showSuccess, showError } from "../../../utils";

const emptyForm: CreateFranchisePayload = {
  code: "",
  name: "",
  opened_at: "10:00",
  closed_at: "23:30",
  hotline: "",
  logo_url: "",
  address: "",
};

const FranchiseCreateEditPage = () => {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const [form, setForm] = useState<CreateFranchisePayload>({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (isEdit && id) {
      setLoadingData(true);
      getFranchiseById(id)
        .then((data) => {
          setForm({
            code: data.code,
            name: data.name,
            opened_at: data.opened_at,
            closed_at: data.closed_at,
            hotline: data.hotline,
            logo_url: data.logo_url || "",
            address: data.address || "",
          });
        })
        .catch((err) => {
          showError(err instanceof Error ? err.message : "Không thể tải thông tin franchise");
        })
        .finally(() => setLoadingData(false));
    }
  }, [id, isEdit]);

  const handleChange = (field: keyof CreateFranchisePayload, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (isEdit && id) {
        await updateFranchise(id, form);
        showSuccess("Cập nhật franchise thành công");
      } else {
        await createFranchise(form);
        showSuccess("Tạo franchise thành công");
      }
      navigate(`/${ROUTER_URL.ADMIN}/${ROUTER_URL.ADMIN_ROUTES.FRANCHISE_LIST}`);
    } catch (error) {
      showError(error instanceof Error ? error.message : (isEdit ? "Cập nhật" : "Tạo") + " franchise thất bại");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{isEdit ? "Chỉnh sửa Franchise" : "Tạo Franchise"}</h1>
          <p className="text-sm text-slate-600">{isEdit ? "Cập nhật thông tin chi nhánh" : "Tạo chi nhánh mới"}</p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Mã chi nhánh *
              <input
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                value={form.code}
                onChange={(e) => handleChange("code", e.target.value)}
                placeholder="HL008"
                required
              />
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Tên chi nhánh *
              <input
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                value={form.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="High Land 008"
                required
              />
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Giờ mở cửa *
              <input
                type="time"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                value={form.opened_at}
                onChange={(e) => handleChange("opened_at", e.target.value)}
                required
              />
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Giờ đóng cửa *
              <input
                type="time"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                value={form.closed_at}
                onChange={(e) => handleChange("closed_at", e.target.value)}
                required
              />
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Hotline *
              <input
                type="tel"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                value={form.hotline}
                onChange={(e) => handleChange("hotline", e.target.value)}
                placeholder="0123456789"
                required
              />
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Logo URL
              <input
                type="url"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                value={form.logo_url}
                onChange={(e) => handleChange("logo_url", e.target.value)}
                placeholder="https://example.com/logo.png"
              />
            </label>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700">
              Địa chỉ
              <input
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                value={form.address}
                onChange={(e) => handleChange("address", e.target.value)}
                placeholder="123 Nguyễn Huệ, Quận 1, TP.HCM"
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
          <Button type="submit" loading={saving} disabled={loadingData}>
            {isEdit ? "Cập nhật" : "Tạo franchise"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default FranchiseCreateEditPage;


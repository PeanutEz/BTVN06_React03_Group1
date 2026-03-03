import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "../../../store/auth.store";
import { fetchCustomerProfileData, updateCustomerProfile } from "../../../services/auth.service";
import { showError, showSuccess } from "../../../utils";
import PersonalInfo from "./components/PersonalInfo";

const PROVINCES = ["Hà Nội", "TP. Hồ Chí Minh", "Đà Nẵng", "Cần Thơ", "Hải Phòng"];

export default function CustomerProfilePage() {
  const { user } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const customerIdRef = useRef<string>("");
  const [form, setForm] = useState({
    name: user?.name ?? "",
    phone: "",
    email: user?.email ?? "",
    address: "",
  });

  // Gọi API CUSTOMER-AUTH-02 để lấy thông tin profile mới nhất
  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true);
        const profile = await fetchCustomerProfileData();
        customerIdRef.current = profile.id;
        setForm((prev) => ({
          ...prev,
          name: profile.name ?? prev.name,
          phone: profile.phone ?? "",
          email: profile.email ?? prev.email,
          address: profile.address ?? "",
        }));
      } catch (err) {
        console.error("Failed to fetch customer profile:", err);
        showError("Không thể tải thông tin cá nhân");
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, []);

  const handleFieldChange = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // Gọi API CUSTOMER-05: PUT /api/customers/:id
  const handleSubmit = async () => {
    if (!customerIdRef.current) {
      showError("Không tìm thấy thông tin khách hàng");
      return;
    }
    if (!form.email || !form.phone) {
      showError("Email và số điện thoại là bắt buộc");
      return;
    }
    try {
      setSaving(true);
      await updateCustomerProfile(customerIdRef.current, {
        email: form.email,
        phone: form.phone,
        name: form.name || undefined,
        address: form.address || undefined,
      });
      showSuccess("Cập nhật thông tin thành công");
    } catch (err) {
      console.error("Failed to update customer profile:", err);
      showError(err instanceof Error ? err.message : "Cập nhật thông tin thất bại");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <PersonalInfo
      form={form}
      onFieldChange={handleFieldChange}
      onSubmit={handleSubmit}
      saving={saving}
    />
  );
}

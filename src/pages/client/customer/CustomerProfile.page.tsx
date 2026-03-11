import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "../../../store/auth.store";
import { fetchCustomerProfileData, updateCustomerProfile } from "../../../services/auth.service";
import { showError, showInfo, showSuccess } from "../../../utils";
import PersonalInfo from "./components/PersonalInfo";

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

export default function CustomerProfilePage() {
  const { user } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const pendingAvatarFileRef = useRef<File | null>(null);
  const [pendingAvatarPreview, setPendingAvatarPreview] = useState<string>("");
  const customerIdRef = useRef<string>("");
  const hasFetched = useRef(false);
  const [form, setForm] = useState({
    name: user?.name ?? "",
    phone: "",
    email: user?.email ?? "",
    address: "",
    avatar_url: "",
  });

  // Gọi API CUSTOMER-AUTH-02 để lấy thông tin profile mới nhất
  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
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
          avatar_url: profile.avatar_url ?? "",
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

  const handleAvatarSelect = (file: File) => {
    pendingAvatarFileRef.current = file;
    setPendingAvatarPreview(URL.createObjectURL(file));
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
      let avatarUrl = form.avatar_url;
      if (pendingAvatarFileRef.current) {
        avatarUrl = await uploadImageToCloudinary(pendingAvatarFileRef.current);
        pendingAvatarFileRef.current = null;
        setPendingAvatarPreview("");
        setForm((prev) => ({ ...prev, avatar_url: avatarUrl }));
      }
      await updateCustomerProfile(customerIdRef.current, {
        email: form.email,
        phone: form.phone,
        name: form.name || undefined,
        address: form.address || undefined,
        avatar_url: avatarUrl || undefined,
      });
      showSuccess("Cập nhật thông tin thành công");
    } catch (err) {
      console.error("Failed to update customer profile:", err);
      const msg = err instanceof Error ? err.message : "Cập nhật thông tin thất bại";
      if (msg.toLowerCase().includes("no data to update")) {
        showInfo("Không có thay đổi nào để lưu");
      } else {
        showError(msg);
      }
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
      avatarUrl={pendingAvatarPreview || form.avatar_url}
      onAvatarSelect={handleAvatarSelect}
    />
  );
}

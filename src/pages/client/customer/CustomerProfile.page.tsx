import { useState } from "react";
import { useAuthStore } from "../../../store/auth.store";
import PersonalInfo from "./components/PersonalInfo";

const PROVINCES = ["Hà Nội", "TP. Hồ Chí Minh", "Đà Nẵng", "Cần Thơ", "Hải Phòng"];

export default function CustomerProfilePage() {
  const { user } = useAuthStore();

  const [form, setForm] = useState({
    name: user?.name ?? "",
    phone: "",
    gender: "",
    idCard: "",
    birthday: "",
    email: user?.email ?? "",
    province: "",
    district: "",
    ward: "",
    address: "",
  });

  const handleFieldChange = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <PersonalInfo
      form={form}
      provinces={PROVINCES}
      onFieldChange={handleFieldChange}
    />
  );
}

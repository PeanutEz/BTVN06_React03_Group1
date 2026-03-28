import { useEffect, useRef, useState } from "react";
import { Button } from "../../../components";
import type { CustomerDisplay } from "../../../models/customer.model";
import { fetchCustomerById, updateCustomer } from "../../../services/customer.service";
import { showSuccess, showError } from "../../../utils";

interface CustomerDetailModalProps {
  customerId: string;
  onClose: () => void;
  onUpdated?: () => void;
}

type EditFormData = {
  name: string;
  email: string;
  phone: string;
  is_active: boolean;
};

const emptyForm: EditFormData = {
  name: "",
  email: "",
  phone: "",
  is_active: true,
};

export default function CustomerDetailModal({
  customerId,
  onClose,
  onUpdated,
}: CustomerDetailModalProps) {
  const [customer, setCustomer] = useState<CustomerDisplay | null>(null);
  const [formData, setFormData] = useState<EditFormData>(emptyForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    (async () => {
      try {
        const data = await fetchCustomerById(customerId);
        if (!data || controller.signal.aborted) return;
        setCustomer(data);
        setFormData({
          name: data.name ?? "",
          email: data.email ?? "",
          phone: data.phone ?? "",
          is_active: data.is_active,
        });
      } catch (err) {
        if (!controller.signal.aborted) {
          const msg = err instanceof Error ? err.message : "Không thể tải thông tin khách hàng";
          setFormErrors({ general: msg });
          showError(msg);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [customerId]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!customer) return;

    const nextErrors: Record<string, string> = {};
    if (!formData.name.trim()) nextErrors.name = "Vui lòng nhập họ tên";
    if (!formData.phone.trim()) nextErrors.phone = "Vui lòng nhập số điện thoại";
    if (Object.keys(nextErrors).length > 0) {
      setFormErrors(nextErrors);
      return;
    }

    setFormErrors({});
    setSaving(true);
    try {
      const updated = await updateCustomer(customer.id, {
        name: formData.name.trim(),
        email: formData.email.trim() || undefined,
        phone: formData.phone.trim(),
        is_active: formData.is_active,
      });

      if (updated) {
        setCustomer(updated);
      }

      showSuccess("Cập nhật khách hàng thành công");
      onUpdated?.();
      onClose();
    } catch (err) {
      const responseData = (err as any)?.responseData ?? (err as any)?.response?.data;
      const apiErrors: Array<{ field?: string; message?: string }> = responseData?.errors ?? [];
      if (apiErrors.length > 0) {
        const fieldErrors: Record<string, string> = {};
        apiErrors.forEach((item) => {
          if (item.field && item.message) {
            fieldErrors[item.field] = item.message;
          }
        });
        if (Object.keys(fieldErrors).length > 0) {
          setFormErrors(fieldErrors);
          return;
        }
      }

      const msg = responseData?.message || (err instanceof Error ? err.message : "Cập nhật khách hàng thất bại");
      setFormErrors({ general: msg });
      showError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === overlayRef.current && !saving && onClose()}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      <div
        className="relative w-full max-w-lg rounded-2xl animate-slide-in overflow-hidden max-h-[90vh] overflow-y-auto"
        style={{
          background: "rgba(15,23,42,0.85)",
          backdropFilter: "blur(40px) saturate(180%)",
          WebkitBackdropFilter: "blur(40px) saturate(180%)",
          border: "1px solid rgba(255,255,255,0.12)",
          boxShadow: "0 32px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.12)",
        }}
      >
        <div className="h-0.5 w-full shrink-0" style={{ background: "linear-gradient(90deg, #6366f1, #8b5cf6, #06b6d4)" }} />
        <div className="flex items-center justify-between border-b border-white/[0.12] px-6 py-4">
          <h2 className="text-lg font-bold text-white/95">Chỉnh sửa khách hàng</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg p-1.5 text-white/40 hover:bg-white/[0.1] hover:text-white transition disabled:opacity-50"
          >
            <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="h-10 animate-pulse rounded-lg bg-white/[0.08]" />
            ))}
          </div>
        ) : !customer ? (
          <div className="p-6 space-y-4">
            <p className="text-sm text-white/70">Không tìm thấy thông tin khách hàng.</p>
            <Button type="button" onClick={onClose} className="w-full">
              Đóng
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {formErrors.general && (
              <p className="!text-[#f87171] rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2" style={{ fontSize: 12 }}>
                {formErrors.general}
              </p>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-white/80">
                Họ tên <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                className={`w-full rounded-lg border bg-white/[0.08] px-4 py-2.5 text-sm text-white/90 placeholder-white/30 outline-none transition focus:ring-2 focus:ring-primary-500/20 ${formErrors.name ? "border-red-400 focus:border-red-400" : "border-white/[0.15] focus:border-primary-500"}`}
                placeholder="Nguyễn Văn A"
              />
              {formErrors.name && <p className="!text-[#f87171]" style={{ fontSize: 11, marginTop: 4 }}>{formErrors.name}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-white/80">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                className={`w-full rounded-lg border bg-white/[0.08] px-4 py-2.5 text-sm text-white/90 placeholder-white/30 outline-none transition focus:ring-2 focus:ring-primary-500/20 ${formErrors.email ? "border-red-400 focus:border-red-400" : "border-white/[0.15] focus:border-primary-500"}`}
                placeholder="email@example.com"
              />
              {formErrors.email && <p className="!text-[#f87171]" style={{ fontSize: 11, marginTop: 4 }}>{formErrors.email}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-white/80">
                Số điện thoại <span className="text-red-400">*</span>
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                className={`w-full rounded-lg border bg-white/[0.08] px-4 py-2.5 text-sm text-white/90 placeholder-white/30 outline-none transition focus:ring-2 focus:ring-primary-500/20 ${formErrors.phone ? "border-red-400 focus:border-red-400" : "border-white/[0.15] focus:border-primary-500"}`}
                placeholder="09xxxxxxxx"
              />
              {formErrors.phone && <p className="!text-[#f87171]" style={{ fontSize: 11, marginTop: 4 }}>{formErrors.phone}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-white/80">Trạng thái</label>
              <div className="flex gap-3">
                {[{ val: true, label: "Hoạt động" }, { val: false, label: "Ngưng hoạt động" }].map(({ val, label }) => (
                  <label key={String(val)} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="is_active"
                      checked={formData.is_active === val}
                      onChange={() => setFormData((prev) => ({ ...prev, is_active: val }))}
                      className="accent-primary-500"
                    />
                    <span className="text-sm text-white/80">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-white/[0.15] bg-white/[0.04] px-3 py-2 text-xs text-white/65">
              <div>Ngày tạo: {new Date(customer.created_at).toLocaleDateString("vi-VN")}</div>
              <div>Cập nhật: {new Date(customer.updated_at).toLocaleDateString("vi-VN")}</div>
              <div>Xác thực email: {customer.is_verified ? "Đã xác thực" : "Chưa xác thực"}</div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" loading={saving} disabled={saving} className="flex-1">
                Cập nhật
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={saving}
                onClick={onClose}
                className="flex-1 border border-white/[0.15] text-white/70 hover:bg-white/[0.1] hover:text-white"
              >
                Hủy
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

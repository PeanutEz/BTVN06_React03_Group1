import React, { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { voucherService } from "@/services/voucher.service";
import type { Voucher, UpdateVoucherDto } from "@/models/voucher.model";
import { fetchFranchiseSelect } from "@/services/store.service";
import type { FranchiseSelectItem } from "@/services/store.service";
import { adminProductFranchiseService } from "@/services/product-franchise.service";
import type { ProductFranchiseApiResponse } from "@/models/product.model";

interface VoucherModalProps {
  voucher: Voucher | null;
  onClose: () => void;
  onSave: () => void;
}

export function VoucherModal({ voucher, onClose, onSave }: VoucherModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    type: "FIXED" as "PERCENT" | "FIXED",
    value: 0,
    quota_total: 1,
    start_date: "",
    end_date: "",
    franchise_id: "",
    product_franchise_id: ""
  });

  const [franchises, setFranchises] = useState<FranchiseSelectItem[]>([]);
  const [productFranchises, setProductFranchises] = useState<ProductFranchiseApiResponse[]>([]);
  const [loadingFranchises, setLoadingFranchises] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);

  // Fetch Franchises
  useEffect(() => {
    setLoadingFranchises(true);
    fetchFranchiseSelect()
      .then((data) => setFranchises(data || []))
      .catch((err) => {
        console.error(err);
        toast.error("Không thể tải danh sách chi nhánh");
      })
      .finally(() => setLoadingFranchises(false));
  }, []);

  // Fetch Product Franchises when a branch varies
  useEffect(() => {
    if (formData.franchise_id) {
      setLoadingProducts(true);
      adminProductFranchiseService.getProductsByFranchise(formData.franchise_id, true)
        .then((data) => setProductFranchises(data || []))
        .catch((err) => {
          console.error(err);
          toast.error("Không thể tải sản phẩm của chi nhánh");
        })
        .finally(() => setLoadingProducts(false));
    } else {
      setProductFranchises([]);
      setFormData((prev) => ({ ...prev, product_franchise_id: "" }));
    }
  }, [formData.franchise_id]);


  useEffect(() => {
    if (voucher) {
      setFormData({
        name: voucher.name,
        type: voucher.type,
        value: voucher.value,
        quota_total: voucher.quota_total,
        start_date: voucher.start_date ? voucher.start_date.substring(0, 16) : "", // Format for datetime-local
        end_date: voucher.end_date ? voucher.end_date.substring(0, 16) : "",
        franchise_id: voucher.franchise_id || "",
        product_franchise_id: voucher.product_franchise_id || ""
      });
    } else {
      // Defaults for new voucher
      setFormData({
        name: "",
        type: "FIXED",
        value: 0,
        quota_total: 10,
        start_date: "",
        end_date: "",
        franchise_id: "",
        product_franchise_id: ""
      });
    }
  }, [voucher]);

  const startDateRef = useRef<HTMLInputElement>(null);
  const endDateRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "value" || name === "quota_total" ? Number(value) : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return toast.error("Vui lòng nhập tên voucher");
    if (!formData.start_date || !formData.end_date) return toast.error("Vui lòng chọn thời gian áp dụng");
    if (new Date(formData.end_date) <= new Date(formData.start_date)) return toast.error("Ngày kết thúc phải sau ngày bắt đầu");
    if (formData.value <= 0) return toast.error("Giá trị voucher phải lớn hơn 0");
    if (formData.type === "PERCENT" && formData.value > 100) return toast.error("Phần trăm không được vượt quá 100");
    if (!voucher && !formData.franchise_id) return toast.error("Vui lòng chọn chi nhánh áp dụng");

    setLoading(true);
    try {
      const payloadDateFormatted = {
        ...formData,
        start_date: new Date(formData.start_date).toISOString(),
        end_date: new Date(formData.end_date).toISOString()
      };

      if (voucher) {
        const updateDto: UpdateVoucherDto = {
          name: payloadDateFormatted.name,
          type: payloadDateFormatted.type,
          value: payloadDateFormatted.value,
          quota_total: payloadDateFormatted.quota_total,
          start_date: payloadDateFormatted.start_date,
          end_date: payloadDateFormatted.end_date
        };
        await voucherService.updateVoucher(voucher.id, updateDto);
        toast.success("Cập nhật voucher thành công");
      } else {
        const createDto: any = {
           ...payloadDateFormatted,
        };
        // Strict adherence to backend payload requirements
        createDto.franchise_id = formData.franchise_id; // Always send since it's required
        
        if (formData.product_franchise_id) {
          createDto.product_franchise_id = formData.product_franchise_id;
        }

        await voucherService.createVoucher(createDto);
        toast.success("Tạo voucher thành công");
      }
      onSave();
    } catch (error) {
      toast.error(voucher ? "Lỗi cập nhật voucher" : "Lỗi tạo voucher");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-slate-50">
          <h2 className="text-xl font-bold text-gray-800">
            {voucher ? "Chỉnh sửa Voucher" : "Tạo Voucher mới"}
          </h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto">
          <form id="voucher-form" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Tên Voucher <span className="text-red-500">*</span></label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none"
                placeholder="VD: Voucher Giảm 10K Tháng 5"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Loại giảm giá <span className="text-red-500">*</span></label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none"
                >
                  <option value="PERCENT">Phần trăm (%)</option>
                  <option value="FIXED">Giá tiền cố định (VNĐ)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Giá trị giảm <span className="text-red-500">*</span></label>
                <input
                  type="number"
                  name="value"
                  min={1}
                  value={formData.value}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Tổng số lượng (Quota) <span className="text-red-500">*</span></label>
              <input
                type="number"
                name="quota_total"
                min={1}
                value={formData.quota_total}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Thời gian bắt đầu <span className="text-red-500">*</span></label>
                <div className="relative">
                  <input
                    ref={startDateRef}
                    type="datetime-local"
                    name="start_date"
                    value={formData.start_date}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 pr-9 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 [&::-webkit-calendar-picker-indicator]:hidden"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => startDateRef.current?.showPicker()}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary-500 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <circle cx="12" cy="12" r="10" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" />
                    </svg>
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Thời gian kết thúc <span className="text-red-500">*</span></label>
                <div className="relative">
                  <input
                    ref={endDateRef}
                    type="datetime-local"
                    name="end_date"
                    value={formData.end_date}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 pr-9 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 [&::-webkit-calendar-picker-indicator]:hidden"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => endDateRef.current?.showPicker()}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary-500 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <circle cx="12" cy="12" r="10" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {!voucher && (
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Chi nhánh áp dụng <span className="text-red-500">*</span></label>
                  <select
                    name="franchise_id"
                    value={formData.franchise_id}
                    onChange={handleChange}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none"
                    disabled={loadingFranchises}
                    required
                  >
                    <option value="">-- Chọn chi nhánh --</option>
                    {franchises.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.name} ({f.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-500 mb-1">Sản phẩm áp dụng (Tùy chọn)</label>
                  <select
                    name="product_franchise_id"
                    value={formData.product_franchise_id}
                    onChange={handleChange}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none"
                    disabled={!formData.franchise_id || loadingProducts}
                  >
                    <option value="">-- Chọn sản phẩm (Áp dụng tất cả) --</option>
                    {productFranchises.map((pf) => (
                      <option key={pf.id} value={pf.id}>
                         Size {pf.size} - {pf.price_base.toLocaleString("vi-VN")}đ
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-5 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Hủy
          </button>
          <button
            form="voucher-form"
            type="submit"
            disabled={loading}
            className="flex items-center justify-center gap-2 px-5 py-2 text-sm font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-600 focus:ring-4 focus:ring-primary-500/20 transition-all disabled:opacity-50"
          >
            {loading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {voucher ? "Cập nhật" : "Tạo mới"}
          </button>
        </div>
      </div>
    </div>
  );
}

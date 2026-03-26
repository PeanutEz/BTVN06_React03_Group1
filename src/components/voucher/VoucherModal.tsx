import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import ReactDOM from "react-dom";
import { toast } from "sonner";
import { TimeSelect } from "@/components/ui/TimeSelect";
import { voucherService } from "@/services/voucher.service";
import type { Voucher, UpdateVoucherDto } from "@/models/voucher.model";
import { fetchFranchiseSelect } from "@/services/store.service";
import type { FranchiseSelectItem } from "@/services/store.service";
import { adminProductFranchiseService } from "@/services/product-franchise.service";
import type { ProductFranchiseApiResponse } from "@/models/product.model";
import { useManagerFranchiseId } from "@/hooks/useManagerFranchiseId";

interface VoucherModalProps {
  voucher: Voucher | null;
  onClose: () => void;
  onSave: () => void;
}

export function VoucherModal({ voucher, onClose, onSave }: VoucherModalProps) {
  const managerFranchiseId = useManagerFranchiseId();
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
  // Combobox states cho franchise
  const [franchiseOpen, setFranchiseOpen] = useState(false);
  const [franchiseKeyword, setFranchiseKeyword] = useState("");
  const franchiseComboRef = useRef<HTMLDivElement>(null);
  const franchiseTriggerRef = useRef<HTMLButtonElement>(null);
  const [dropdownRect, setDropdownRect] = useState<DOMRect | null>(null);

  const openFranchiseDropdown = useCallback(() => {
    if (franchiseTriggerRef.current) {
      setDropdownRect(franchiseTriggerRef.current.getBoundingClientRect());
    }
    setFranchiseOpen(true);
  }, []);

  const closeFranchiseDropdown = useCallback(() => {
    setFranchiseOpen(false);
    setFranchiseKeyword("");
  }, []);
  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    if (!franchiseOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const isInsideTrigger = franchiseTriggerRef.current?.contains(target);
      const isInsideCombo = franchiseComboRef.current?.contains(target);
      if (!isInsideTrigger && !isInsideCombo) {
        closeFranchiseDropdown();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [franchiseOpen, closeFranchiseDropdown]);

  // Filter franchise theo keyword
  const franchiseOptions = useMemo(() => {
    if (!franchiseKeyword.trim()) return franchises;
    const k = franchiseKeyword.trim().toLowerCase();
    return franchises.filter(
      (f) => f.name.toLowerCase().includes(k) || f.code.toLowerCase().includes(k)
    );
  }, [franchises, franchiseKeyword]);

  const selectedFranchise = franchises.find((f) => f.value === formData.franchise_id);

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
        franchise_id: managerFranchiseId ?? "",
        product_franchise_id: ""
      });
    }  }, [voucher, managerFranchiseId]);

  // Sync franchise_id when managerFranchiseId hydrates late (store)
  useEffect(() => {
    if (!managerFranchiseId || voucher) return;
    setFormData((prev) => ({ ...prev, franchise_id: managerFranchiseId }));
  }, [managerFranchiseId, voucher]);

  // Split datetime-local into date + time parts for display
  const startDatePart = formData.start_date ? formData.start_date.substring(0, 10) : "";
  const startTimePart = formData.start_date ? formData.start_date.substring(11, 16) : "";
  const endDatePart = formData.end_date ? formData.end_date.substring(0, 10) : "";
  const endTimePart = formData.end_date ? formData.end_date.substring(11, 16) : "";

  const handleDateTimePart = (field: "start_date" | "end_date", part: "date" | "time", val: string) => {
    setFormData((prev) => {
      const current = prev[field] || "T";
      const [d, t] = current.includes("T") ? current.split("T") : [current.substring(0, 10), current.substring(11, 16)];
      const newDate = part === "date" ? val : (d || "");
      const newTime = part === "time" ? val : (t || "00:00");
      return { ...prev, [field]: newDate && newTime ? `${newDate}T${newTime}` : newDate ? `${newDate}T00:00` : "" };
    });
  };

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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50">
      <div className="flex min-h-full items-center justify-center p-4">
      <div className="w-full max-w-xl my-4 rounded-2xl bg-white shadow-2xl flex flex-col">
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
        <div className="p-6">
          <form id="voucher-form" onSubmit={handleSubmit} className="space-y-4">
            {!voucher && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-3">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">🏪 Phạm vi áp dụng</p>
                <div className="grid grid-cols-2 gap-4">
                  {/* Chi nhánh áp dụng */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Chi nhánh áp dụng <span className="text-red-500">*</span>
                    </label>
                    {managerFranchiseId ? (
                      <div className="flex w-full items-center justify-between rounded-lg border border-primary-500/50 bg-primary-50 px-3 py-2 text-sm cursor-not-allowed select-none">
                        <span className="truncate font-medium text-primary-700">
                          {selectedFranchise
                            ? `${selectedFranchise.name} (${selectedFranchise.code})`
                            : managerFranchiseId}
                        </span>
                        <svg className="ml-2 size-4 flex-shrink-0 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </div>
                    ) : (
                      <div className="relative">
                        {/* Trigger button */}
                        <button
                          ref={franchiseTriggerRef}
                          type="button"
                          disabled={loadingFranchises}
                          onClick={() => {
                            if (franchiseOpen) {
                              closeFranchiseDropdown();
                            } else {
                              openFranchiseDropdown();
                            }
                          }}
                          style={{
                            display: "flex", alignItems: "center", justifyContent: "space-between",
                            width: "100%", padding: "8px 12px",
                            background: "#1e293b", border: "1px solid #475569", borderRadius: 8,
                            color: "#f1f5f9", fontSize: 14, cursor: "pointer", outline: "none",
                            opacity: loadingFranchises ? 0.5 : 1,
                          }}
                        >
                          <span style={{
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                            color: selectedFranchise ? "#f1f5f9" : "#94a3b8",
                          }}>
                            {loadingFranchises
                              ? "Đang tải..."
                              : selectedFranchise
                                ? `${selectedFranchise.name} (${selectedFranchise.code})`
                                : "-- Chọn chi nhánh --"}
                          </span>
                          <svg style={{ width: 16, height: 16, flexShrink: 0, marginLeft: 8, color: "#94a3b8",
                            transform: franchiseOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
                            fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>

                        {/* Dropdown — render qua portal ra document.body */}
                        {franchiseOpen && dropdownRect && ReactDOM.createPortal(
                          <div
                            ref={franchiseComboRef}
                            style={{
                              position: "fixed",
                              top: dropdownRect.bottom + 4,
                              left: dropdownRect.left,
                              width: dropdownRect.width,
                              zIndex: 99999,
                              background: "#1e293b",
                              border: "1px solid #475569",
                              borderRadius: 8,
                              boxShadow: "0 10px 40px rgba(0,0,0,0.7)",
                              overflow: "hidden",
                            }}
                          >
                            {/* Search */}
                            <div style={{ padding: "8px 10px", borderBottom: "1px solid #334155" }}>
                              <input
                                autoFocus
                                value={franchiseKeyword}
                                onChange={(e) => setFranchiseKeyword(e.target.value)}
                                placeholder="Tìm theo tên hoặc mã..."
                                style={{
                                  width: "100%", boxSizing: "border-box",
                                  background: "#0f172a", border: "1px solid #475569",
                                  borderRadius: 6, padding: "5px 10px",
                                  fontSize: 12, color: "#f1f5f9", outline: "none",
                                }}
                              />
                            </div>
                            {/* List */}
                            <div style={{ maxHeight: 220, overflowY: "auto" }}>
                              {/* Reset option */}
                              <button
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => {
                                  setFormData((prev) => ({ ...prev, franchise_id: "", product_franchise_id: "" }));
                                  closeFranchiseDropdown();
                                }}
                                style={{
                                  display: "flex", width: "100%", padding: "8px 12px",
                                  background: !formData.franchise_id ? "#334155" : "transparent",
                                  color: !formData.franchise_id ? "#f1f5f9" : "#94a3b8",
                                  fontSize: 12, fontWeight: 600, border: "none", cursor: "pointer",
                                  textAlign: "left", boxSizing: "border-box",
                                }}
                              >
                                -- Chọn chi nhánh --
                              </button>
                              {franchiseOptions.map((f) => (
                                <button
                                  key={f.value}
                                  type="button"
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() => {
                                    setFormData((prev) => ({ ...prev, franchise_id: f.value, product_franchise_id: "" }));
                                    closeFranchiseDropdown();
                                  }}
                                  style={{
                                    display: "flex", alignItems: "center", gap: 8,
                                    width: "100%", padding: "8px 12px", boxSizing: "border-box",
                                    background: formData.franchise_id === f.value ? "#334155" : "transparent",
                                    color: formData.franchise_id === f.value ? "#f1f5f9" : "#cbd5e1",
                                    fontSize: 13, border: "none", cursor: "pointer", textAlign: "left",
                                  }}
                                >
                                  <span style={{ fontFamily: "monospace", color: "#64748b", fontSize: 10, flexShrink: 0 }}>{f.code}</span>
                                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</span>
                                </button>
                              ))}
                              {franchiseOptions.length === 0 && !loadingFranchises && (
                                <div style={{ padding: "10px 12px", fontSize: 12, color: "#64748b", textAlign: "center" }}>
                                  Không tìm thấy chi nhánh
                                </div>
                              )}
                              {loadingFranchises && (
                                <div style={{ padding: "10px 12px", fontSize: 12, color: "#64748b", textAlign: "center" }}>
                                  Đang tải...
                                </div>
                              )}
                            </div>
                          </div>,
                          document.body
                        )}
                      </div>
                    )}
                  </div>

                  {/* Sản phẩm áp dụng */}
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
              </div>
            )}

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
            </div>            {/* DATE RANGE */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-3">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">⏱ Thời gian áp dụng</p>

              {/* Start */}
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-gray-700">
                  Bắt đầu <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {/* Date picker */}
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                      <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                    </span>                    <input
                      type="date"
                      value={startDatePart}
                      onChange={(e) => handleDateTimePart("start_date", "date", e.target.value)}
                      max={endDatePart || undefined}
                      className="w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 py-2 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                      required
                    />
                  </div>                  {/* Time picker */}
                  <TimeSelect
                    value={startTimePart}
                    onChange={(val) => handleDateTimePart("start_date", "time", val)}
                  />
                </div>
                {startDatePart && (
                  <p className="text-xs text-primary-600 font-medium pl-1">
                    ✓ {new Date(`${startDatePart}T${startTimePart || "00:00"}`).toLocaleString("vi-VN", { dateStyle: "full", timeStyle: "short" })}
                  </p>
                )}
              </div>

              {/* Arrow */}
              <div className="flex items-center gap-2 px-1">
                <div className="h-px flex-1 bg-slate-200" />
                <span className="text-xs font-semibold text-slate-400">đến</span>
                <div className="h-px flex-1 bg-slate-200" />
              </div>

              {/* End */}
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-gray-700">
                  Kết thúc <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                      <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                    </span>                    <input
                      type="date"
                      value={endDatePart}
                      onChange={(e) => handleDateTimePart("end_date", "date", e.target.value)}
                      min={startDatePart || undefined}
                      className="w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 py-2 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                      required
                    />
                  </div>                  <TimeSelect
                    value={endTimePart}
                    onChange={(val) => handleDateTimePart("end_date", "time", val)}
                  />
                </div>
                {endDatePart && (
                  <p className="text-xs text-primary-600 font-medium pl-1">
                    ✓ {new Date(`${endDatePart}T${endTimePart || "00:00"}`).toLocaleString("vi-VN", { dateStyle: "full", timeStyle: "short" })}
                  </p>
                )}
              </div>

              {/* Duration preview */}
              {startDatePart && endDatePart && new Date(formData.end_date) > new Date(formData.start_date) && (
                <div className="rounded-lg bg-primary-50 border border-primary-200 px-3 py-2 text-xs text-primary-700 font-medium">
                  🗓 Thời gian hiệu lực:{" "}
                  {(() => {
                    const diff = new Date(formData.end_date).getTime() - new Date(formData.start_date).getTime();
                    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                    return days > 0 ? `${days} ngày${hours > 0 ? ` ${hours} giờ` : ""}` : `${hours} giờ`;
                  })()}
                </div>
              )}
              {startDatePart && endDatePart && new Date(formData.end_date) <= new Date(formData.start_date) && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-600 font-medium">
                  ⚠ Ngày kết thúc phải sau ngày bắt đầu
                </div>
              )}
            </div>
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
    </div>
  );
}

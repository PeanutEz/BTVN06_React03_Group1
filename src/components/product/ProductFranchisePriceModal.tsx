import { useEffect, useState } from "react";
import { adminProductFranchiseService } from "@/services/product-franchise.service";
import { fetchFranchiseSelect, type FranchiseSelectItem } from "@/services/store.service";
import type { ProductFranchiseApiResponse } from "@/models/product.model";

interface ProductFranchisePriceModalProps {
  productId: string;
  productName: string;
  defaultFranchiseId?: string;
  onClose: () => void;
}

export function ProductFranchisePriceModal({
  productId,
  productName,
  defaultFranchiseId,
  onClose,
}: ProductFranchisePriceModalProps) {
  const [franchises, setFranchises] = useState<FranchiseSelectItem[]>([]);
  const [franchiseId, setFranchiseId] = useState<string>(defaultFranchiseId ?? "");
  const [loadingFranchises, setLoadingFranchises] = useState(false);

  const [currentItem, setCurrentItem] = useState<ProductFranchiseApiResponse | null>(null);
  const [price, setPrice] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const loadFranchises = async () => {
      if (defaultFranchiseId) return; // không cần load list nếu đã cố định
      setLoadingFranchises(true);
      try {
        const data = await fetchFranchiseSelect();
        setFranchises(data);
      } catch {
        setError("Không thể tải danh sách franchise");
      } finally {
        setLoadingFranchises(false);
      }
    };
    loadFranchises();
  }, [defaultFranchiseId]);

  const loadCurrentPrice = async (fid: string) => {
    if (!fid) return;
    setSearching(true);
    setError(null);
    try {
      const result = await adminProductFranchiseService.searchProductFranchises({
        searchCondition: {
          franchise_id: fid,
          product_id: productId,
          is_deleted: false,
        },
        pageInfo: { pageNum: 1, pageSize: 1 },
      });
      const item = result.data[0] ?? null;
      setCurrentItem(item);
      setPrice(item ? String(item.price_base) : "");
    } catch {
      setError("Không thể tải giá hiện tại");
      setCurrentItem(null);
      setPrice("");
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    if (defaultFranchiseId) {
      setFranchiseId(defaultFranchiseId);
      void loadCurrentPrice(defaultFranchiseId);
    }
  }, [defaultFranchiseId]);

  const handleFranchiseChange = (value: string) => {
    setFranchiseId(value);
    setCurrentItem(null);
    setPrice("");
    if (value) {
      void loadCurrentPrice(value);
    }
  };

  const handleSave = async () => {
    if (!franchiseId) {
      setError("Vui lòng chọn franchise");
      return;
    }
    const num = Number(price);
    if (!Number.isFinite(num) || num <= 0) {
      setError("Giá phải là số dương");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (currentItem) {
        const updated = await adminProductFranchiseService.updateProductFranchise(
          currentItem.id,
          { price_base: num },
        );
        setCurrentItem(updated);
        setPrice(String(updated.price_base));
      } else {
        const created = await adminProductFranchiseService.createProductFranchise({
          franchise_id: franchiseId,
          product_id: productId,
          size: "DEFAULT",
          price_base: num,
        });
        setCurrentItem(created);
        setPrice(String(created.price_base));
      }
    } catch (e) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (e instanceof Error ? e.message : null) ||
        "Lưu giá thất bại";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!currentItem) return;
    setStatusSaving(true);
    setError(null);
    try {
      await adminProductFranchiseService.changeProductFranchiseStatus({
        id: currentItem.id,
        is_active: !currentItem.is_active,
      });
      setCurrentItem((prev) =>
        prev ? { ...prev, is_active: !prev.is_active } : prev,
      );
    } catch {
      setError("Thay đổi trạng thái thất bại");
    } finally {
      setStatusSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Giá theo chi nhánh
            </p>
            <p className="text-sm font-semibold text-slate-900 truncate">
              {productName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {!defaultFranchiseId && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">
                Chọn franchise <span className="text-red-500">*</span>
              </label>
              <select
                value={franchiseId}
                onChange={(e) => handleFranchiseChange(e.target.value)}
                disabled={loadingFranchises}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 disabled:opacity-60"
              >
                <option value="">-- Chọn franchise --</option>
                {franchises.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.name} ({f.code})
                  </option>
                ))}
              </select>
            </div>
          )}

          {defaultFranchiseId && (
            <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-600">
              Franchise ID: <span className="font-mono">{defaultFranchiseId}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">
              Giá cơ bản (đ) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Nhập giá bán tại chi nhánh"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
            />
            {currentItem && (
              <p className="text-xs text-slate-500">
                Đã có cấu hình giá cho franchise này (size DEFAULT).
              </p>
            )}
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>
              Trạng thái:&nbsp;
              {currentItem ? (
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                    currentItem.is_active
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {currentItem.is_active ? "Đang áp dụng" : "Tạm tắt"}
                </span>
              ) : (
                "Chưa cấu hình"
              )}
            </span>
            {searching && (
              <span className="flex items-center gap-1">
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-300 border-t-primary-500" />
                Đang tải...
              </span>
            )}
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 border-t border-slate-200 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Đóng
          </button>
          <div className="flex gap-2">
            {currentItem && (
              <button
                type="button"
                onClick={handleToggleStatus}
                disabled={statusSaving}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                {statusSaving
                  ? "Đang cập nhật..."
                  : currentItem.is_active
                  ? "Tạm tắt giá"
                  : "Kích hoạt giá"}
              </button>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-600 disabled:opacity-60"
            >
              {saving ? "Đang lưu..." : "Lưu giá"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


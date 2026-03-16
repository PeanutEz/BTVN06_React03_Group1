import { useState } from "react";
import { useForm } from "react-hook-form";
import type { Product, ProductFormData } from "@/models/product.model";
import { adminProductService } from "@/services/product.service";
import { toast } from "sonner";

interface ProductModalProps {
  product: Product | null;
  onClose: () => void;
  onSave: () => void;
}

const glassStyle = {
  background: "rgba(15, 23, 42, 0.58)",
  backdropFilter: "blur(28px) saturate(140%)",
  WebkitBackdropFilter: "blur(28px) saturate(140%)",
  border: "1px solid rgba(255, 255, 255, 0.16)",
  boxShadow: "0 22px 44px rgba(2, 6, 23, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.12)",
};

export default function ProductModal({ product, onClose, onSave }: ProductModalProps) {
  const [loading, setLoading] = useState(false);
  const isEditMode = !!product;
  const [imagesUrl, setImagesUrl] = useState<string[]>(
    product ? (product as unknown as { images_url?: string[] }).images_url ?? [] : []
  );
  const [imagesUrlInput, setImagesUrlInput] = useState("");

  const handleAddImageUrl = () => {
    const url = imagesUrlInput.trim();
    if (!url) return;
    if (!/^https?:\/\/.+/.test(url)) { toast.error("URL không hợp lệ"); return; }
    if (imagesUrl.includes(url)) { toast.error("URL đã được thêm"); return; }
    setImagesUrl((prev) => [...prev, url]);
    setImagesUrlInput("");
  };

  const handleRemoveImageUrl = (index: number) => {
    setImagesUrl((prev) => prev.filter((_, i) => i !== index));
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<ProductFormData>({
    defaultValues: product
      ? {
          sku: product.sku,
          name: product.name,
          description: product.description,
          content: product.content,
          min_price: product.min_price,
          max_price: product.max_price,
          image_url: product.image_url || product.image || "",
        }
      : { min_price: 0, max_price: 0 },
  });

  const minPrice = watch("min_price");
  const maxPrice = watch("max_price");

  const onSubmit = async (data: ProductFormData) => {
    if (data.max_price <= data.min_price) {
      toast.error("Giá cao nhất phải lớn hơn giá thấp nhất");
      return;
    }
    setLoading(true);
    try {
      const dto = {
        SKU: data.sku,
        name: data.name,
        description: data.description,
        content: data.content,
        image_url: data.image_url,
        images_url: imagesUrl,
        min_price: data.min_price,
        max_price: data.max_price,
      };
      if (isEditMode) {
        await adminProductService.updateProduct(product.id.toString(), dto);
      } else {
        await adminProductService.createProduct(dto);
      }
      onSave();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Lưu sản phẩm thất bại";
      toast.error(errorMessage);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const inputCls = (hasError: boolean) =>
    `w-full rounded-xl border px-3 py-2 text-sm text-white/90 outline-none transition placeholder:text-white/35 focus:border-primary-400 focus:ring-2 focus:ring-primary-500/20 ${
      hasError ? "border-red-400/60 bg-red-500/10" : "border-white/[0.18] bg-white/[0.08]"
    }`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      <div
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        className="relative flex max-h-[78vh] w-full max-w-[600px] flex-col overflow-hidden rounded-2xl shadow-2xl"
        style={glassStyle}
      >

        {/* Header */}
        <div className="flex items-start justify-between border-b border-white/[0.14] px-5 py-3.5 sm:px-6">
          <div>
            <h2 className="text-lg font-bold text-white/95 sm:text-xl">
              {isEditMode ? "Chỉnh sửa sản phẩm" : "Tạo sản phẩm mới"}
            </h2>
            <p className="mt-0.5 text-xs text-white/55 sm:text-sm">
              {isEditMode ? "Cập nhật thông tin sản phẩm" : "Vui lòng điền các trường bắt buộc"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-white/50 transition hover:bg-white/[0.1] hover:text-white/80"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5 overflow-y-auto px-5 py-4 sm:px-6">

          {/* SKU + Name */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-white/85">
                SKU <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                {...register("sku", {
                  required: "SKU là bắt buộc",
                  pattern: {
                    value: /^[A-Z0-9_-]+$/,
                    message: "Chỉ gồm chữ in hoa, số, dấu - và _",
                  },
                })}
                placeholder="Ví dụ: COFFEE_5"
                className={`${inputCls(!!errors.sku)} font-mono`}
              />
              {errors.sku && <p className="text-xs text-red-400">{errors.sku.message}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-white/85">
                Tên sản phẩm <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                {...register("name", {
                  required: "Tên sản phẩm là bắt buộc",
                  minLength: { value: 3, message: "Tối thiểu 3 ký tự" },
                })}
                placeholder="Ví dụ: Cà Phê Sữa Đá"
                className={inputCls(!!errors.name)}
              />
              {errors.name && <p className="text-xs text-red-400">{errors.name.message}</p>}
            </div>
          </div>

          {/* Min Price + Max Price */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-white/85">
                Giá thấp nhất (VNĐ) <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                {...register("min_price", {
                  required: "Giá thấp nhất là bắt buộc",
                  valueAsNumber: true,
                  min: { value: 1000, message: "Tối thiểu 1.000 VNĐ" },
                })}
                placeholder="30000"
                className={inputCls(!!errors.min_price)}
              />
              {errors.min_price && <p className="text-xs text-red-400">{errors.min_price.message}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-white/85">
                Giá cao nhất (VNĐ) <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                {...register("max_price", {
                  required: "Giá cao nhất là bắt buộc",
                  valueAsNumber: true,
                  min: { value: 1000, message: "Tối thiểu 1.000 VNĐ" },
                  validate: (value) =>
                    value > (watch("min_price") ?? 0) || "Phải lớn hơn giá thấp nhất",
                })}
                placeholder="50000"
                className={inputCls(!!errors.max_price)}
              />
              {errors.max_price && <p className="text-xs text-red-400">{errors.max_price.message}</p>}
              {minPrice > 0 && maxPrice > minPrice && (
                <p className="text-xs text-emerald-300">
                  Khoảng giá: {minPrice.toLocaleString("vi-VN")} – {maxPrice.toLocaleString("vi-VN")} đ
                </p>
              )}
            </div>
          </div>

          {/* Image URL */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-white/85">
              URL ảnh chính <span className="text-red-400">*</span>
            </label>
            <input
              type="url"
              {...register("image_url", {
                required: "URL ảnh chính là bắt buộc",
                pattern: { value: /^https?:\/\/.+/, message: "URL không hợp lệ" },
              })}
              placeholder="https://example.com/image.jpg"
              className={inputCls(!!errors.image_url)}
            />
            {errors.image_url && <p className="text-xs text-red-400">{errors.image_url.message}</p>}
            {watch("image_url") && (
              <img
                src={watch("image_url")}
                alt="Xem trước"
                className="mt-1 h-20 w-20 rounded-lg border border-white/[0.16] object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "https://placehold.co/96x96?text=Loi";
                }}
              />
            )}
          </div>

          {/* Extra Images */}
          <div className="space-y-2.5 rounded-xl border border-white/[0.14] bg-white/[0.05] p-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-white/85">
                Ảnh phụ (có thể thêm nhiều ảnh)
              </label>
              <span className="rounded-full bg-primary-500/20 px-2 py-0.5 text-xs font-semibold text-primary-200">
                {imagesUrl.length} ảnh
              </span>
            </div>
            <div className="flex gap-2">
              <input
                type="url"
                value={imagesUrlInput}
                onChange={(e) => setImagesUrlInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddImageUrl(); } }}
                placeholder="Dán URL ảnh vào đây rồi nhấn + Thêm"
                className="flex-1 rounded-xl border border-white/[0.18] bg-white/[0.08] px-3 py-2 text-sm text-white/90 outline-none transition placeholder:text-white/35 focus:border-primary-400 focus:ring-2 focus:ring-primary-500/20"
              />
              <button
                type="button"
                onClick={handleAddImageUrl}
                className="whitespace-nowrap rounded-xl bg-primary-500/85 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-primary-500"
              >
                + Thêm
              </button>
            </div>
            {imagesUrl.length > 0 ? (
              <div className="flex max-h-24 flex-wrap gap-2 overflow-y-auto pr-1">
                {imagesUrl.map((url, idx) => (
                  <div key={idx} className="group relative">
                    <img
                      src={url}
                      alt={`extra-${idx}`}
                      className="h-14 w-14 rounded-lg border border-white/[0.16] object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).src = "https://placehold.co/80x80?text=Err"; }}
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveImageUrl(idx)}
                      className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white shadow transition hover:bg-red-600"
                    >
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-1 text-center text-xs text-white/45">Chưa có ảnh phụ nào · Nhập URL và nhấn + Thêm</p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {/* Mô tả ngắn */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-white/85">
                Mô tả ngắn <span className="text-red-400">*</span>
              </label>
              <textarea
                {...register("description", {
                  required: "Mô tả ngắn là bắt buộc",
                })}
                rows={2}
                placeholder="Mô tả ngắn hiển thị ở danh sách sản phẩm"
                className={`${inputCls(!!errors.description)} resize-none`}
              />
              {errors.description && <p className="text-xs text-red-400">{errors.description.message}</p>}
            </div>

            {/* Nội dung chi tiết */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-white/85">
                Nội dung chi tiết <span className="text-red-400">*</span>
              </label>
              <textarea
                {...register("content", {
                  required: "Nội dung chi tiết là bắt buộc",
                })}
                rows={3}
                placeholder="Thông tin chi tiết sản phẩm, thành phần, ghi chú..."
                className={`${inputCls(!!errors.content)} resize-none`}
              />
              {errors.content && <p className="text-xs text-red-400">{errors.content.message}</p>}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 border-t border-white/[0.14] pt-3.5">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-xl border border-white/[0.2] px-4.5 py-2 text-sm font-medium text-white/70 transition hover:bg-white/[0.1] hover:text-white disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 rounded-xl bg-primary-500/85 px-4.5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-primary-500 active:translate-y-[1px] disabled:opacity-60"
            >
              {loading && (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              )}
              {loading ? "Đang lưu..." : isEditMode ? "Cập nhật sản phẩm" : "Tạo sản phẩm"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

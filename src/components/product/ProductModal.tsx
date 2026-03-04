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
    if (!/^https?:\/\/.+/.test(url)) { toast.error("Invalid URL"); return; }
    if (imagesUrl.includes(url)) { toast.error("URL already added"); return; }
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
      toast.error("Max price must be greater than min price");
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
        images_url: [],
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
      const errorMessage = error instanceof Error ? error.message : "Failed to save product";
      toast.error(errorMessage);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const inputCls = (hasError: boolean) =>
    `w-full rounded-lg border px-4 py-2.5 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 ${
      hasError ? "border-red-400 bg-red-50" : "border-slate-300 bg-white"
    }`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-2xl max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-2xl border-b border-slate-100 bg-white px-6 py-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              {isEditMode ? "Edit Product" : "Create New Product"}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {isEditMode ? "Update product information" : "Fill in the required fields below"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 p-6">

          {/* SKU + Name */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">
                SKU <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                {...register("sku", {
                  required: "SKU is required",
                  pattern: {
                    value: /^[A-Z0-9_-]+$/,
                    message: "Uppercase letters, numbers, - and _ only",
                  },
                })}
                placeholder="e.g., COFFEE_5"
                className={`${inputCls(!!errors.sku)} font-mono`}
              />
              {errors.sku && <p className="text-xs text-red-600">{errors.sku.message}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">
                Product Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                {...register("name", {
                  required: "Product name is required",
                  minLength: { value: 3, message: "At least 3 characters" },
                })}
                placeholder="e.g., Cà Phê Sữa Đá"
                className={inputCls(!!errors.name)}
              />
              {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
            </div>
          </div>

          {/* Min Price + Max Price */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">
                Min Price (VNĐ) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                {...register("min_price", {
                  required: "Min price is required",
                  valueAsNumber: true,
                  min: { value: 1000, message: "At least 1,000 VNĐ" },
                })}
                placeholder="30000"
                className={inputCls(!!errors.min_price)}
              />
              {errors.min_price && <p className="text-xs text-red-600">{errors.min_price.message}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">
                Max Price (VNĐ) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                {...register("max_price", {
                  required: "Max price is required",
                  valueAsNumber: true,
                  min: { value: 1000, message: "At least 1,000 VNĐ" },
                  validate: (value) =>
                    value > (watch("min_price") ?? 0) || "Must be greater than min price",
                })}
                placeholder="50000"
                className={inputCls(!!errors.max_price)}
              />
              {errors.max_price && <p className="text-xs text-red-600">{errors.max_price.message}</p>}
              {minPrice > 0 && maxPrice > minPrice && (
                <p className="text-xs text-green-600">
                  Range: {minPrice.toLocaleString("vi-VN")} – {maxPrice.toLocaleString("vi-VN")} đ
                </p>
              )}
            </div>
          </div>

          {/* Image URL */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">
              Image URL <span className="text-red-500">*</span>
            </label>
            <input
              type="url"
              {...register("image_url", {
                required: "Image URL is required",
                pattern: { value: /^https?:\/\/.+/, message: "Must be a valid URL" },
              })}
              placeholder="https://example.com/image.jpg"
              className={inputCls(!!errors.image_url)}
            />
            {errors.image_url && <p className="text-xs text-red-600">{errors.image_url.message}</p>}
            {watch("image_url") && (
              <img
                src={watch("image_url")}
                alt="Preview"
                className="mt-2 h-24 w-24 rounded-lg border border-slate-200 object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "https://placehold.co/96x96?text=Error";
                }}
              />
            )}
          </div>

          {/* Extra Images */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-slate-700">
                🖼️ Ảnh phụ (có thể thêm nhiều ảnh)
              </label>
              <span className="rounded-full bg-primary-100 px-2 py-0.5 text-xs font-semibold text-primary-600">
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
                className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              />
              <button
                type="button"
                onClick={handleAddImageUrl}
                className="whitespace-nowrap rounded-lg bg-primary-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-600"
              >
                + Thêm
              </button>
            </div>
            {imagesUrl.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {imagesUrl.map((url, idx) => (
                  <div key={idx} className="group relative">
                    <img
                      src={url}
                      alt={`extra-${idx}`}
                      className="h-20 w-20 rounded-lg border-2 border-slate-200 object-cover"
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
              <p className="text-center text-xs text-slate-400 py-2">Chưa có ảnh phụ nào · Nhập URL và nhấn + Thêm</p>
            )}
          </div>

          {/* Short Description */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">
              Short Description <span className="text-red-500">*</span>
            </label>
            <textarea
              {...register("description", {
                required: "Description is required",
              })}
              rows={2}
              placeholder="Brief description for product listing"
              className={`${inputCls(!!errors.description)} resize-none`}
            />
            {errors.description && <p className="text-xs text-red-600">{errors.description.message}</p>}
          </div>

          {/* Detailed Content */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">
              Detailed Content <span className="text-red-500">*</span>
            </label>
            <textarea
              {...register("content", {
                required: "Content is required",
              })}
              rows={4}
              placeholder="Detailed product information, ingredients, etc."
              className={`${inputCls(!!errors.content)} resize-none`}
            />
            {errors.content && <p className="text-xs text-red-600">{errors.content.message}</p>}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 rounded-lg bg-primary-500 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-primary-600 disabled:opacity-60"
            >
              {loading && (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              )}
              {loading ? "Saving..." : isEditMode ? "Update Product" : "Create Product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

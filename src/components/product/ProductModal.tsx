import { useState, useRef } from "react";
import ReactDOM from "react-dom";
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

const CLOUDINARY_CLOUD_NAME = "dn2xh5rxe";
const CLOUDINARY_UPLOAD_PRESET = "btvn06_upload";

const MAX_SECONDARY = 4;

async function uploadToCloudinary(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    { method: "POST", body: formData }
  );
  if (!res.ok) throw new Error("Upload ảnh lên Cloudinary thất bại");
  const json = await res.json();
  return json.secure_url as string;
}

function fileToPreview(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function ProductModal({ product, onClose, onSave }: ProductModalProps) {
  const [loading, setLoading] = useState(false);
  const isEditMode = !!product;

  // Main image
  const [mainImageFile, setMainImageFile] = useState<File | null>(null);
  const [mainImagePreview, setMainImagePreview] = useState<string>(
    product?.image_url || (product as unknown as { image?: string })?.image || ""
  );
  const [mainDragOver, setMainDragOver] = useState(false);

  // Secondary images: store File or existing URL
  const [secondarySlots, setSecondarySlots] = useState<Array<{ file: File | null; preview: string }>>(() => {
    const existingUrls: string[] = product
      ? (product as unknown as { images_url?: string[] }).images_url ?? []
      : [];
    return Array.from({ length: MAX_SECONDARY }, (_, i) => ({
      file: null,
      preview: existingUrls[i] ?? "",
    }));
  });
  const [secondaryDragOver, setSecondaryDragOver] = useState(false);
  const mainFileInputRef = useRef<HTMLInputElement>(null);

  const applyMainFile = async (file: File) => {
    setMainImageFile(file);
    setMainImagePreview(await fileToPreview(file));
    setValue("image_url", "__pending__", { shouldValidate: true });
  };

  const handleMainImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await applyMainFile(file);
  };

  const handleMainDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setMainDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    await applyMainFile(file);
  };

  const applySecondaryFiles = async (files: File[]) => {
    const imageFiles = files.filter((f) => f.type.startsWith("image/")).slice(0, MAX_SECONDARY);
    setSecondarySlots((prev) => {
      // fill empty slots first, then overwrite from the start if all full
      const next = [...prev];
      let fileIdx = 0;
      for (let i = 0; i < MAX_SECONDARY && fileIdx < imageFiles.length; i++) {
        if (!next[i].preview) {
          next[i] = { file: imageFiles[fileIdx], preview: "" };
          fileIdx++;
        }
      }
      // if remaining files, overwrite from start
      for (let i = 0; i < MAX_SECONDARY && fileIdx < imageFiles.length; i++) {
        next[i] = { file: imageFiles[fileIdx], preview: "" };
        fileIdx++;
      }
      return next;
    });
    // generate previews
    const previews = await Promise.all(imageFiles.map(fileToPreview));
    setSecondarySlots((prev) => {
      const next = [...prev];
      let pIdx = 0;
      for (let i = 0; i < MAX_SECONDARY && pIdx < previews.length; i++) {
        if (next[i].file === imageFiles[pIdx]) {
          next[i] = { file: imageFiles[pIdx], preview: previews[pIdx] };
          pIdx++;
        }
      }
      return next;
    });
  };

  const handleSecondaryImageChange = async (e: React.ChangeEvent<HTMLInputElement>, idx: number) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const preview = await fileToPreview(file);
    setSecondarySlots((prev) => {
      const next = [...prev];
      next[idx] = { file, preview };
      return next;
    });
  };

  const handleSecondaryDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setSecondaryDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    await applySecondaryFiles(files);
  };

  const handleRemoveSecondary = (idx: number) => {
    setSecondarySlots((prev) => {
      const next = [...prev];
      next[idx] = { file: null, preview: "" };
      return next;
    });
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<ProductFormData>({
    defaultValues: product
      ? {
          sku: product.sku,
          name: product.name,
          description: product.description,
          content: product.content,
          min_price: product.min_price,
          max_price: product.max_price,
          image_url: product.image_url || product.image || "__pending__",
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
    // Validate ảnh chính
    if (!mainImageFile && !mainImagePreview) {
      toast.error("Vui lòng chọn ảnh chính");
      return;
    }
    setLoading(true);
    try {
      toast.loading("Đang upload ảnh...", { id: "upload" });

      // Upload ảnh chính nếu là file mới
      let finalMainUrl = mainImagePreview;
      if (mainImageFile) {
        finalMainUrl = await uploadToCloudinary(mainImageFile);
      }

      // Upload ảnh phụ (chỉ các slot có file mới)
      const finalImagesUrl = await Promise.all(
        secondarySlots.map(async (slot) => {
          if (slot.file) return uploadToCloudinary(slot.file);
          return slot.preview; // giữ URL cũ khi edit
        })
      );

      toast.dismiss("upload");

      const dto = {
        SKU: data.sku,
        name: data.name,
        description: data.description,
        content: data.content,
        image_url: finalMainUrl,
        images_url: finalImagesUrl.filter(Boolean),
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
      toast.dismiss("upload");
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

  return ReactDOM.createPortal(
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

          {/* Image chính */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-white/85">
              Ảnh chính <span className="text-red-400">*</span>
            </label>
            <div
              className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-5 transition ${
                mainDragOver
                  ? "border-primary-400 bg-primary-500/10 scale-[1.01]"
                  : "border-white/[0.22] bg-white/[0.05] hover:border-primary-400 hover:bg-white/[0.09]"
              }`}
              onClick={() => mainFileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setMainDragOver(true); }}
              onDragEnter={(e) => { e.preventDefault(); setMainDragOver(true); }}
              onDragLeave={() => setMainDragOver(false)}
              onDrop={handleMainDrop}
            >
              <input
                ref={mainFileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleMainImageChange}
              />
              {mainImagePreview ? (
                <img
                  src={mainImagePreview}
                  alt="Ảnh chính"
                  className="h-24 w-24 rounded-xl border border-white/[0.18] object-cover shadow"
                />
              ) : (
                <>
                  <svg className="h-8 w-8 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-xs text-white/45">
                    {mainDragOver ? "Thả ảnh vào đây" : "Kéo thả hoặc nhấn để chọn ảnh chính"}
                  </span>
                </>
              )}
              {mainImagePreview && (
                <span className="text-xs text-primary-300">{mainDragOver ? "Thả để thay ảnh" : "Nhấn hoặc kéo thả để thay ảnh"}</span>
              )}
            </div>
            {/* hidden field để validate */}
            <input type="hidden" {...register("image_url", { required: "Ảnh chính là bắt buộc" })} />
            {errors.image_url && <p className="text-xs text-red-400">{errors.image_url.message}</p>}
          </div>

          {/* Ảnh phụ (tối đa 4) */}
          <div
            className={`space-y-2.5 rounded-xl border p-3 transition ${
              secondaryDragOver
                ? "border-primary-400 bg-primary-500/10"
                : "border-white/[0.14] bg-white/[0.05]"
            }`}
            onDragOver={(e) => { e.preventDefault(); setSecondaryDragOver(true); }}
            onDragEnter={(e) => { e.preventDefault(); setSecondaryDragOver(true); }}
            onDragLeave={() => setSecondaryDragOver(false)}
            onDrop={handleSecondaryDrop}
          >
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-white/85">
                Ảnh phụ{" "}
                <span className="text-white/45 font-normal">
                  {secondaryDragOver ? "— Thả ảnh vào đây" : `(tối đa ${MAX_SECONDARY}, kéo thả nhiều ảnh 1 lúc)`}
                </span>
              </label>
              <span className="rounded-full bg-primary-500/20 px-2 py-0.5 text-xs font-semibold text-primary-200">
                {secondarySlots.filter((s) => s.preview).length}/{MAX_SECONDARY}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {secondarySlots.map((slot, idx) => (
                <div key={idx} className="relative">
                  <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-white/[0.18] bg-white/[0.05] aspect-square transition hover:border-primary-400 hover:bg-white/[0.09] overflow-hidden">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleSecondaryImageChange(e, idx)}
                    />
                    {slot.preview ? (
                      <img
                        src={slot.preview}
                        alt={`Ảnh phụ ${idx + 1}`}
                        className="h-full w-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).src = "https://placehold.co/80x80?text=Err"; }}
                      />
                    ) : (
                      <svg className="h-6 w-6 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                      </svg>
                    )}
                  </label>
                  {slot.preview && (
                    <button
                      type="button"
                      onClick={() => handleRemoveSecondary(idx)}
                      className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white shadow transition hover:bg-red-600 z-10"
                    >
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
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
  , document.body);
}

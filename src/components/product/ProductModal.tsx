import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import type { Product, ProductFormData } from "@/models/product.model";
import { adminProductService, categories } from "@/services/product.service";
import { toast } from "sonner";

interface ProductModalProps {
  product: Product | null;
  onClose: () => void;
  onSave: () => void;
}

export default function ProductModal({
  product,
  onClose,
  onSave,
}: ProductModalProps) {
  const [loading, setLoading] = useState(false);
  const isEditMode = !!product;

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
          categoryId: product.categoryId,
          isActive: product.isActive,
        }
      : {
          isActive: true,
          min_price: 0,
          max_price: 0,
        },
  });

  const minPrice = watch("min_price");
  const maxPrice = watch("max_price");

  // Validate price range
  useEffect(() => {
    if (maxPrice && minPrice && maxPrice <= minPrice) {
      // Will be caught by form validation
    }
  }, [minPrice, maxPrice]);

  const onSubmit = async (data: ProductFormData) => {
    // Additional validation
    if (data.max_price <= data.min_price) {
      toast.error("Max price must be greater than min price");
      return;
    }

    setLoading(true);
    try {
      if (isEditMode) {
        await adminProductService.updateProduct(product.id, data);
      } else {
        await adminProductService.createProduct(data);
      }
      onSave();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to save product";
      toast.error(errorMessage);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">
            {isEditMode ? "Edit Product" : "Create New Product"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* SKU */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                SKU <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                {...register("sku", {
                  required: "SKU is required",
                  pattern: {
                    value: /^[A-Z0-9-_]+$/,
                    message:
                      "SKU must contain only uppercase letters, numbers, hyphens, and underscores",
                  },
                })}
                placeholder="e.g., CF001"
                className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono ${
                  errors.sku ? "border-red-500" : "border-gray-300"
                }`}
              />
              {errors.sku && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.sku.message}
                </p>
              )}
            </div>

            {/* Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Product Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                {...register("name", {
                  required: "Product name is required",
                  minLength: {
                    value: 3,
                    message: "Name must be at least 3 characters",
                  },
                })}
                placeholder="e.g., Cà Phê Sữa Đá"
                className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.name ? "border-red-500" : "border-gray-300"
                }`}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.name.message}
                </p>
              )}
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                {...register("categoryId", {
                  required: "Category is required",
                  valueAsNumber: true,
                })}
                className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.categoryId ? "border-red-500" : "border-gray-300"
                }`}
              >
                <option value="">Select a category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              {errors.categoryId && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.categoryId.message}
                </p>
              )}
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Status
              </label>
              <div className="flex items-center h-[42px]">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    {...register("isActive")}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  <span className="ml-3 text-sm font-medium text-gray-700">
                    {watch("isActive") ? "Active" : "Inactive"}
                  </span>
                </label>
              </div>
            </div>

            {/* Min Price */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Minimum Price (VNĐ) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                {...register("min_price", {
                  required: "Minimum price is required",
                  valueAsNumber: true,
                  min: {
                    value: 1000,
                    message: "Price must be at least 1,000 VNĐ",
                  },
                })}
                placeholder="25000"
                className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.min_price ? "border-red-500" : "border-gray-300"
                }`}
              />
              {errors.min_price && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.min_price.message}
                </p>
              )}
            </div>

            {/* Max Price */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Maximum Price (VNĐ) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                {...register("max_price", {
                  required: "Maximum price is required",
                  valueAsNumber: true,
                  min: {
                    value: 1000,
                    message: "Price must be at least 1,000 VNĐ",
                  },
                  validate: (value) => {
                    const min = watch("min_price");
                    return (
                      value > min || "Max price must be greater than min price"
                    );
                  },
                })}
                placeholder="35000"
                className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.max_price ? "border-red-500" : "border-gray-300"
                }`}
              />
              {errors.max_price && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.max_price.message}
                </p>
              )}
              {minPrice && maxPrice && maxPrice > minPrice && (
                <p className="mt-1 text-sm text-green-600">
                  Franchise price range: {minPrice.toLocaleString("vi-VN")} -{" "}
                  {maxPrice.toLocaleString("vi-VN")} VNĐ
                </p>
              )}
            </div>
          </div>

          {/* Image URL */}
          <div className="mt-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Image URL <span className="text-red-500">*</span>
            </label>
            <input
              type="url"
              {...register("image_url", {
                required: "Image URL is required",
                pattern: {
                  value: /^https?:\/\/.+/,
                  message: "Must be a valid URL",
                },
              })}
              placeholder="https://example.com/image.jpg"
              className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.image_url ? "border-red-500" : "border-gray-300"
              }`}
            />
            {errors.image_url && (
              <p className="mt-1 text-sm text-red-600">
                {errors.image_url.message}
              </p>
            )}
            {watch("image_url") && (
              <div className="mt-3">
                <img
                  src={watch("image_url")}
                  alt="Preview"
                  className="w-32 h-32 object-cover rounded-lg border border-gray-300"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      "https://via.placeholder.com/128?text=Invalid+URL";
                  }}
                />
              </div>
            )}
          </div>

          {/* Description */}
          <div className="mt-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Short Description <span className="text-red-500">*</span>
            </label>
            <textarea
              {...register("description", {
                required: "Description is required",
                minLength: {
                  value: 10,
                  message: "Description must be at least 10 characters",
                },
              })}
              rows={2}
              placeholder="Brief description for product listing"
              className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none ${
                errors.description ? "border-red-500" : "border-gray-300"
              }`}
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600">
                {errors.description.message}
              </p>
            )}
          </div>

          {/* Content */}
          <div className="mt-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Detailed Content <span className="text-red-500">*</span>
            </label>
            <textarea
              {...register("content", {
                required: "Content is required",
                minLength: {
                  value: 20,
                  message: "Content must be at least 20 characters",
                },
              })}
              rows={4}
              placeholder="Detailed product information, ingredients, etc."
              className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none ${
                errors.content ? "border-red-500" : "border-gray-300"
              }`}
            />
            {errors.content && (
              <p className="mt-1 text-sm text-red-600">
                {errors.content.message}
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="mt-8 flex justify-end gap-3 border-t border-gray-200 pt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {loading && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              )}
              {loading
                ? "Saving..."
                : isEditMode
                  ? "Update Product"
                  : "Create Product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

import { useNavigate } from "react-router-dom";
import type { Product } from "@/models/product.model";

interface ProductCardProps {
  product: Product;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n);

export default function ProductCard({ product }: ProductCardProps) {
  const navigate = useNavigate();
  const imageUrl = product.image_url || product.image || "/placeholder-product.png";
  const displayPrice = product.price ?? product.min_price;
  const originalPrice = product.originalPrice;
  const hasDiscount = originalPrice && originalPrice > displayPrice;

  return (
    <div
      className="group bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden cursor-pointer border border-gray-100 hover:-translate-y-1"
      onClick={() => navigate(`/products/${product.id}`)}
    >
      {/* Image */}
      <div className="relative overflow-hidden aspect-[4/3] bg-gray-50">
        <img
          src={imageUrl}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = "/placeholder-product.png";
          }}
        />
        {product.isFeatured && (
          <span className="absolute top-3 left-3 bg-amber-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow">
            Nổi bật
          </span>
        )}
        {hasDiscount && (
          <span className="absolute top-3 right-3 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow">
            -{Math.round(((originalPrice - displayPrice) / originalPrice) * 100)}%
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 text-base leading-snug line-clamp-2 mb-1 group-hover:text-amber-600 transition-colors">
          {product.name}
        </h3>
        {product.description && (
          <p className="text-gray-500 text-sm line-clamp-2 mb-3">{product.description}</p>
        )}

        {/* Rating */}
        {product.rating !== undefined && (
          <div className="flex items-center gap-1 mb-3">
            <svg className="w-4 h-4 text-amber-400 fill-current" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span className="text-sm font-medium text-gray-700">{product.rating.toFixed(1)}</span>
            {product.reviewCount !== undefined && (
              <span className="text-xs text-gray-400">({product.reviewCount})</span>
            )}
          </div>
        )}

        {/* Price */}
        <div className="flex items-end justify-between mt-auto">
          <div>
            <span className="text-lg font-bold text-amber-600">{fmt(displayPrice)}</span>
            {hasDiscount && (
              <span className="text-sm text-gray-400 line-through ml-2">{fmt(originalPrice)}</span>
            )}
          </div>
          <button
            className="bg-amber-500 hover:bg-amber-600 active:scale-95 text-white text-sm font-semibold px-3 py-1.5 rounded-full transition-all duration-200 shadow-sm"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/products/${product.id}`);
            }}
          >
            Chọn mua
          </button>
        </div>
      </div>
    </div>
  );
}

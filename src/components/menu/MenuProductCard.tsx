import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import type { MenuProduct } from "@/types/menu.types";

interface MenuProductCardProps {
  product: MenuProduct;
  onAdd: (product: MenuProduct) => void;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n);

export default function MenuProductCard({ product, onAdd }: MenuProductCardProps) {
  const discount =
    product.originalPrice && product.originalPrice > product.price
      ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
      : 0;

  return (
    <div className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:border-amber-200 hover:shadow-lg transition-all duration-200">
      <Link to={`/menu/${product.id}`} className="block">
        <div className="relative aspect-[4/3] overflow-hidden bg-gray-50">
          <img
            src={product.image}
            alt={product.name}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />

          {discount > 0 && (
            <span className="absolute top-2.5 left-2.5 bg-red-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-full">
              -{discount}%
            </span>
          )}

          {product.tags?.includes("new") && (
            <span className="absolute top-2.5 right-2.5 bg-emerald-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-full">
              Mới
            </span>
          )}
          {product.tags?.includes("bestseller") && !product.tags?.includes("new") && (
            <span className="absolute top-2.5 right-2.5 bg-amber-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-full">
              Hot
            </span>
          )}
          {product.tags?.includes("trending") && (
            <span className="absolute top-2.5 right-2.5 bg-purple-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-full">
              Trending
            </span>
          )}

          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200" />
        </div>

        <div className="p-3.5">
          <div className="flex items-center gap-1 mb-1.5">
            <svg className="w-3.5 h-3.5 text-amber-400 fill-current shrink-0" viewBox="0 0 20 20">
              <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
            </svg>
            <span className="text-xs font-semibold text-gray-700">{product.rating.toFixed(1)}</span>
            <span className="text-xs text-gray-400">({product.reviewCount})</span>
          </div>

          <h3 className="font-semibold text-gray-900 text-sm leading-snug line-clamp-1 mb-1">
            {product.name}
          </h3>
          <p className="text-xs text-gray-500 line-clamp-1 mb-3 leading-relaxed">
            {product.description}
          </p>

          <div className="flex items-center gap-1.5">
            <span className="text-sm font-bold text-gray-900">{fmt(product.price)}</span>
            {product.originalPrice && (
              <span className="text-xs text-gray-400 line-through">{fmt(product.originalPrice)}</span>
            )}
          </div>
        </div>
      </Link>

      <div className="px-3.5 pb-3.5">
        <button
          onClick={() => onAdd(product)}
          className={cn(
            "w-full flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold transition-all duration-150",
            product.isAvailable
              ? "bg-amber-500 hover:bg-amber-600 text-white active:scale-95"
              : "bg-gray-100 text-gray-400 cursor-not-allowed",
          )}
          disabled={!product.isAvailable}
        >
          {product.isAvailable ? (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Thêm vào giỏ
            </>
          ) : (
            "Hết hàng"
          )}
        </button>
      </div>
    </div>
  );
}

import { Link } from "react-router-dom";
import type { Product } from "../types/product.type";
import { useCartStore } from "@/store";
import { toast } from "sonner";

interface ProductCardProps {
    product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
    const addToCart = useCartStore((s) => s.addToCart);
    const formatPrice = (price: number) => {
        return new Intl.NumberFormat("vi-VN", {
            style: "currency",
            currency: "VND",
        }).format(price);
    };

    const hasDiscount = product.originalPrice && product.originalPrice > product.price;
    const discountPercent = hasDiscount
        ? Math.round(((product.originalPrice! - product.price) / product.originalPrice!) * 100)
        : 0;

    return (
        <div className="group bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
            {/* Image Container */}
            <div className="relative aspect-square overflow-hidden">
                <Link to={`/products/${product.id}`}>
                    <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                </Link>

                {/* Discount Badge */}
                {hasDiscount && (
                    <div className="absolute top-3 left-3 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                        -{discountPercent}%
                    </div>
                )}

                {/* Featured Badge */}
                {product.isFeatured && (
                    <div className="absolute top-3 right-3 bg-amber-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                        Nổi bật
                    </div>
                )}

                {/* Quick View Overlay */}
                <Link
                    to={`/products/${product.id}`}
                    className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center"
                >
                    <span className="bg-white text-gray-900 px-4 py-2 rounded-full font-medium text-sm transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                        Xem chi tiết
                    </span>
                </Link>
            </div>

            {/* Content */}
            <div className="p-4">
                {/* Rating */}
                {product.rating && (
                    <div className="flex items-center gap-1 mb-2">
                        <svg className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20">
                            <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                        </svg>
                        <span className="text-sm font-medium text-gray-700">{product.rating}</span>
                        <span className="text-xs text-gray-400">({product.reviewCount})</span>
                    </div>
                )}

                {/* Product Name */}
                <Link to={`/products/${product.id}`} className="block">
                    <h3 className="font-semibold text-gray-900 mb-1 line-clamp-1 group-hover:text-amber-600 transition-colors">
                        {product.name}
                    </h3>
                </Link>

                {/* Description */}
                <p className="text-sm text-gray-500 mb-3 line-clamp-2">{product.description}</p>

                {/* Price */}
                <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-amber-600">{formatPrice(product.price)}</span>
                    {hasDiscount && (
                        <span className="text-sm text-gray-400 line-through">
                            {formatPrice(product.originalPrice!)}
                        </span>
                    )}
                </div>

                {/* Add to cart */}
                <button
                    onClick={() => {
                        addToCart(product, 1);
                        toast.success("Đã thêm vào giỏ hàng");
                    }}
                    disabled={product.stock <= 0}
                    className={`mt-4 w-full rounded-xl px-4 py-2.5 font-semibold transition-colors ${
                        product.stock <= 0
                            ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                            : "bg-amber-500 hover:bg-amber-600 text-white"
                    }`}
                >
                    {product.stock <= 0 ? "Hết hàng" : "Thêm vào giỏ"}
                </button>

                {/* Stock Status */}
                {product.stock < 10 && (
                    <p className="text-xs text-red-500 mt-2">Chỉ còn {product.stock} sản phẩm</p>
                )}
            </div>
        </div>
    );
}

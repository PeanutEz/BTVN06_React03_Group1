import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useProductStore } from "@/store/product.store";
import { useCartStore } from "@/store";
import ProductCard from "../components/ProductCard";
import { toast } from "sonner";

export default function ProductDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [quantity, setQuantity] = useState(1);
    const [selectedImage, setSelectedImage] = useState(0);

    const addToCart = useCartStore((s) => s.addToCart);

    const {
        selectedProduct,
        products,
        categories,
        isLoading,
        error,
        fetchProductById,
        fetchProducts,
        fetchCategories,
        clearSelectedProduct
    } = useProductStore();

    useEffect(() => {
        if (id) {
            fetchProductById(Number(id));
            fetchProducts();
            fetchCategories();
        }
        return () => {
            clearSelectedProduct();
        };
    }, [id, fetchProductById, fetchProducts, fetchCategories, clearSelectedProduct]);

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat("vi-VN", {
            style: "currency",
            currency: "VND",
        }).format(price);
    };

    const category = categories.find((c) => c.id === selectedProduct?.categoryId);
    const relatedProducts = products
        .filter((p) => p.categoryId === selectedProduct?.categoryId && p.id !== selectedProduct?.id)
        .slice(0, 4);

    const hasDiscount = selectedProduct?.originalPrice && selectedProduct.originalPrice > selectedProduct.price;
    const discountPercent = hasDiscount
        ? Math.round(((selectedProduct!.originalPrice! - selectedProduct!.price) / selectedProduct!.originalPrice!) * 100)
        : 0;

    if (isLoading) {
        return (
            <div className="animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-48 mb-8" />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    <div className="aspect-square bg-gray-200 rounded-2xl" />
                    <div className="space-y-4">
                        <div className="h-10 bg-gray-200 rounded w-3/4" />
                        <div className="h-6 bg-gray-200 rounded w-1/2" />
                        <div className="h-24 bg-gray-200 rounded" />
                        <div className="h-12 bg-gray-200 rounded w-1/3" />
                    </div>
                </div>
            </div>
        );
    }

    if (error || !selectedProduct) {
        return (
            <div className="text-center py-16">
                <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{error || "Không tìm thấy sản phẩm"}</h3>
                <p className="text-gray-600 mb-6">Sản phẩm bạn tìm kiếm không tồn tại hoặc đã bị xóa</p>
                <button
                    onClick={() => navigate("/products")}
                    className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-6 py-3 rounded-full font-medium transition-colors"
                >
                    Quay lại danh sách
                </button>
            </div>
        );
    }

    const images = selectedProduct.images?.length
        ? selectedProduct.images
        : [selectedProduct.image];

    return (
        <div>
            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 text-sm mb-8 flex-wrap">
                <Link to="/" className="text-gray-500 hover:text-amber-600 transition-colors">
                    Trang chủ
                </Link>
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <Link to="/products" className="text-gray-500 hover:text-amber-600 transition-colors">
                    Sản phẩm
                </Link>
                {category && (
                    <>
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        <Link
                            to={`/products?category=${category.code}`}
                            className="text-gray-500 hover:text-amber-600 transition-colors"
                        >
                            {category.name}
                        </Link>
                    </>
                )}
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <span className="text-gray-900 font-medium line-clamp-1">{selectedProduct.name}</span>
            </nav>

            {/* Product Details */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
                {/* Images */}
                <div className="space-y-4">
                    <div className="aspect-square rounded-2xl overflow-hidden bg-white shadow-lg">
                        <img
                            src={images[selectedImage]}
                            alt={selectedProduct.name}
                            className="w-full h-full object-cover"
                        />
                    </div>
                    {images.length > 1 && (
                        <div className="flex gap-3">
                            {images.map((img, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setSelectedImage(idx)}
                                    className={`w-20 h-20 rounded-xl overflow-hidden border-2 transition-all ${selectedImage === idx ? "border-amber-500 shadow-md" : "border-transparent opacity-70 hover:opacity-100"
                                        }`}
                                >
                                    <img src={img} alt="" className="w-full h-full object-cover" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Info */}
                <div>
                    {/* Badges */}
                    <div className="flex gap-2 mb-4">
                        {hasDiscount && (
                            <span className="bg-red-500 text-white text-sm font-bold px-3 py-1 rounded-full">
                                -{discountPercent}%
                            </span>
                        )}
                        {selectedProduct.isFeatured && (
                            <span className="bg-amber-500 text-white text-sm font-bold px-3 py-1 rounded-full">
                                Nổi bật
                            </span>
                        )}
                    </div>

                    {/* Title */}
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">{selectedProduct.name}</h1>

                    {/* SKU */}
                    <p className="text-sm text-gray-500 mb-4">SKU: {selectedProduct.sku}</p>

                    {/* Rating */}
                    {selectedProduct.rating && (
                        <div className="flex items-center gap-2 mb-6">
                            <div className="flex">
                                {[...Array(5)].map((_, i) => (
                                    <svg
                                        key={i}
                                        className={`w-5 h-5 ${i < Math.floor(selectedProduct.rating!) ? "text-yellow-400" : "text-gray-300"
                                            } fill-current`}
                                        viewBox="0 0 20 20"
                                    >
                                        <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                                    </svg>
                                ))}
                            </div>
                            <span className="font-medium">{selectedProduct.rating}</span>
                            <span className="text-gray-500">({selectedProduct.reviewCount} đánh giá)</span>
                        </div>
                    )}

                    {/* Description */}
                    <p className="text-gray-600 mb-6">{selectedProduct.description}</p>

                    {/* Price */}
                    <div className="flex items-center gap-4 mb-8">
                        <span className="text-4xl font-bold text-amber-600">
                            {formatPrice(selectedProduct.price)}
                        </span>
                        {hasDiscount && (
                            <span className="text-xl text-gray-400 line-through">
                                {formatPrice(selectedProduct.originalPrice!)}
                            </span>
                        )}
                    </div>

                    {/* Quantity */}
                    <div className="flex items-center gap-4 mb-6">
                        <span className="font-medium text-gray-700">Số lượng:</span>
                        <div className="flex items-center border border-gray-300 rounded-xl overflow-hidden">
                            <button
                                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                className="px-4 py-2 hover:bg-gray-100 transition-colors"
                            >
                                -
                            </button>
                            <span className="px-6 py-2 font-medium">{quantity}</span>
                            <button
                                onClick={() => setQuantity(Math.min(selectedProduct.stock, quantity + 1))}
                                className="px-4 py-2 hover:bg-gray-100 transition-colors"
                            >
                                +
                            </button>
                        </div>
                        <span className="text-sm text-gray-500">
                            Còn {selectedProduct.stock} sản phẩm
                        </span>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-4 mb-8">
                        <button
                            onClick={() => {
                                addToCart(selectedProduct, quantity);
                                toast.success("Đã thêm vào giỏ hàng");
                            }}
                            className="flex-1 bg-amber-500 hover:bg-amber-600 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all transform hover:scale-[1.02] shadow-lg flex items-center justify-center gap-2"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            Thêm vào giỏ
                        </button>
                        <button className="px-4 py-4 border-2 border-gray-300 hover:border-amber-500 rounded-xl transition-colors">
                            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                            </svg>
                        </button>
                    </div>

                    {/* Content */}
                    <div className="bg-white rounded-2xl p-6 shadow-md">
                        <h3 className="font-semibold text-lg mb-3">Mô tả chi tiết</h3>
                        <p className="text-gray-600 leading-relaxed">{selectedProduct.content}</p>
                    </div>
                </div>
            </div>

            {/* Related Products */}
            {relatedProducts.length > 0 && (
                <section>
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Sản Phẩm Liên Quan</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {relatedProducts.map((product) => (
                            <ProductCard key={product.id} product={product} />
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}

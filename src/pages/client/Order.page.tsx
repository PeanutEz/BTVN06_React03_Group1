import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useProductStore } from "@/store/product.store";
import ProductCard from "@/components/product/ProductCard";
import type { Product } from "@/models/product.model";

const OrderPage = () => {
    const {
        products,
        categories,
        isLoading,
        fetchProducts,
        fetchCategories,
    } = useProductStore();
    
    const [bestSellersByCategory, setBestSellersByCategory] = useState<{ [key: number]: Product[] }>({});

    useEffect(() => {
        fetchCategories();
        fetchProducts();
    }, [fetchCategories, fetchProducts]);
    
    useEffect(() => {
        if (products.length > 0 && categories.length > 0) {
            // Group best seller products by category (take top 4 per category)
            const grouped = categories.reduce((acc, category) => {
                const categoryProducts = products
                    .filter(p => p.categoryId === category.id && (p.isFeatured || p.rating && p.rating >= 4))
                    .slice(0, 4);
                if (categoryProducts.length > 0) {
                    acc[category.id] = categoryProducts;
                }
                return acc;
            }, {} as { [key: number]: Product[] });
            setBestSellersByCategory(grouped);
        }
    }, [products, categories]);

    return (
        <div className="space-y-12">
            {/* Hero Banner */}
            <section className="relative -mx-4 -mt-8 bg-gradient-to-br from-red-900 via-red-800 to-red-900 text-white py-16 overflow-hidden">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDE0YzAgMS4xLS45IDItMiAycy0yLS45LTItMiAuOS0yIDItMiAyIC45IDIgMnptLTIgMThjLTEuMSAwLTIgLjktMiAyczEuMSAyIDIgMiAyLS45IDItMi0uOS0yLTItMnptLTE4LTJjLTEuMSAwLTIgLjktMiAyczEuMSAyIDIgMiAyLS45IDItMi0uOS0yLTItMnptMC0xNmMtMS4xIDAtMiAuOS0yIDJzMS4xIDIgMiAyIDItLjkgMi0yLS45LTItMi0yeiIvPjwvZz48L2c+PC9zdmc+')] opacity-50"></div>
                <div className="container mx-auto px-4 relative z-10">
                    <div className="max-w-3xl mx-auto text-center">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-sm font-medium mb-6 border border-white/20">
                            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                            <span>Đặt hàng trực tuyến - Giao nhanh trong 30 phút</span>
                        </div>
                        <h1 className="text-4xl sm:text-5xl font-bold mb-4 leading-tight">
                            Đặt Đồ Uống Yêu Thích <br />
                            <span className="text-red-300">Ngay Hôm Nay</span>
                        </h1>
                        <p className="text-lg text-red-100 mb-8">
                            Thưởng thức hương vị tuyệt hảo từ Hylux Coffee
                        </p>
                        <Link
                            to="/menu"
                            className="inline-flex items-center gap-2 bg-white text-red-900 px-8 py-3.5 rounded-lg font-bold shadow-2xl hover:shadow-xl hover:scale-105 transition-all"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                            </svg>
                            Đặt hàng ngay
                        </Link>
                    </div>
                </div>
            </section>

            {/* Best Sellers by Category */}
            {categories.map((category) => {
                const categoryBestSellers = bestSellersByCategory[category.id];
                if (!categoryBestSellers || categoryBestSellers.length === 0) return null;
                
                return (
                    <section key={category.id} className="px-4">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <img src={category.image} alt={category.name} className="w-12 h-12 rounded-lg object-cover" />
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900">{category.name}</h2>
                                    <p className="text-sm text-gray-600">Best Seller</p>
                                </div>
                            </div>
                            <Link
                                to={`/products?category=${category.code}`}
                                className="text-red-600 hover:text-red-700 font-semibold text-sm flex items-center gap-1.5 group"
                            >
                                Xem tất cả
                                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                </svg>
                            </Link>
                        </div>

                        {isLoading ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                                {[...Array(4)].map((_, i) => (
                                    <div key={i} className="bg-gray-200 rounded-xl h-80 animate-pulse" />
                                ))}
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                                {categoryBestSellers.map((product) => (
                                    <ProductCard key={product.id} product={product} />
                                ))}
                            </div>
                        )}
                    </section>
                );
            })}
        </div>
    );
};

export default OrderPage;

import { useEffect } from "react";
import { useProductStore } from "@/store/product.store";
import CategoryCard from "../components/CategoryCard";

export default function CategoryList() {
    const { categories, isLoading, fetchCategories } = useProductStore();

    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

    return (
        <div>
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-4xl font-bold text-gray-900 mb-2">Danh Mục Sản Phẩm</h1>
                <p className="text-gray-600 text-lg">Khám phá các loại đồ uống và bánh ngọt của chúng tôi</p>
            </div>

            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 text-sm mb-8">
                <a href="/" className="text-gray-500 hover:text-amber-600 transition-colors">
                    Trang chủ
                </a>
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <span className="text-gray-900 font-medium">Danh mục</span>
            </nav>

            {/* Categories Grid */}
            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="aspect-[4/3] bg-gray-200 rounded-2xl animate-pulse" />
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {categories.map((category) => (
                        <CategoryCard key={category.id} category={category} />
                    ))}
                </div>
            )}

            {/* Empty State */}
            {!isLoading && categories.length === 0 && (
                <div className="text-center py-16">
                    <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                            />
                        </svg>
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Chưa có danh mục nào</h3>
                    <p className="text-gray-600">Vui lòng quay lại sau</p>
                </div>
            )}
        </div>
    );
}

import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useProductStore } from "@/store/product.store";
import ProductCard from "../components/ProductCard";
import ProductFilter from "../components/ProductFilter";

export default function ProductList() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedQuery, setDebouncedQuery] = useState("");

    const {
        products,
        categories,
        isLoading,
        fetchProducts,
        fetchCategories,
        searchProducts
    } = useProductStore();

    const categoryCode = searchParams.get("category");

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedQuery(searchQuery);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Fetch categories on mount
    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

    // Fetch products based on category or search
    useEffect(() => {
        if (debouncedQuery) {
            searchProducts(debouncedQuery);
        } else if (categoryCode) {
            const category = categories.find((c) => c.code === categoryCode);
            if (category) {
                fetchProducts(category.id);
            } else {
                fetchProducts();
            }
        } else {
            fetchProducts();
        }
    }, [categoryCode, debouncedQuery, categories, fetchProducts, searchProducts]);

    const handleCategoryChange = (code: string | null) => {
        if (code) {
            setSearchParams({ category: code });
        } else {
            setSearchParams({});
        }
        setSearchQuery("");
    };

    const handleSearch = (query: string) => {
        setSearchQuery(query);
        if (query) {
            setSearchParams({});
        }
    };

    const currentCategory = useMemo(() => {
        return categories.find((c) => c.code === categoryCode);
    }, [categories, categoryCode]);

    return (
        <div>
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-4xl font-bold text-gray-900 mb-2">
                    {currentCategory ? currentCategory.name : "Tất Cả Sản Phẩm"}
                </h1>
                <p className="text-gray-600 text-lg">
                    {currentCategory
                        ? currentCategory.description
                        : "Khám phá bộ sưu tập đồ uống và bánh ngọt tuyệt vời của chúng tôi"}
                </p>
            </div>

            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 text-sm mb-8">
                <a href="/" className="text-gray-500 hover:text-amber-600 transition-colors">
                    Trang chủ
                </a>
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <a href="/menu" className="text-gray-500 hover:text-amber-600 transition-colors">
                    Menu
                </a>
                {currentCategory && (
                    <>
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        <span className="text-gray-900 font-medium">{currentCategory.name}</span>
                    </>
                )}
            </nav>

            {/* Filter */}
            <ProductFilter
                categories={categories}
                selectedCategoryCode={categoryCode}
                onCategoryChange={handleCategoryChange}
                onSearch={handleSearch}
                searchQuery={searchQuery}
            />

            {/* Results Count */}
            {!isLoading && (
                <p className="text-gray-600 mb-6">
                    Hiển thị <span className="font-semibold text-gray-900">{products.length}</span> sản phẩm
                    {searchQuery && (
                        <span>
                            {" "}cho "{searchQuery}"
                        </span>
                    )}
                </p>
            )}

            {/* Products Grid */}
            {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {[...Array(8)].map((_, i) => (
                        <div key={i} className="bg-gray-200 rounded-2xl h-80 animate-pulse" />
                    ))}
                </div>
            ) : products.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {products.map((product) => (
                        <ProductCard key={product.id} product={product} />
                    ))}
                </div>
            ) : (
                /* Empty State */
                <div className="text-center py-16 bg-white rounded-2xl shadow-md">
                    <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                        </svg>
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Không tìm thấy sản phẩm</h3>
                    <p className="text-gray-600 mb-6">
                        {searchQuery
                            ? `Không có sản phẩm nào phù hợp với "${searchQuery}"`
                            : "Danh mục này chưa có sản phẩm"}
                    </p>
                    <button
                        onClick={() => {
                            setSearchQuery("");
                            setSearchParams({});
                        }}
                        className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-6 py-3 rounded-full font-medium transition-colors"
                    >
                        Xem tất cả sản phẩm
                    </button>
                </div>
            )}
        </div>
    );
}

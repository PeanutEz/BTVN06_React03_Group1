import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useProductStore } from "@/store/product.store";
import ProductCard from "@/components/product/ProductCard";
import ProductFilter from "@/components/product/ProductFilter";
import type { Category, Product } from "@/models/product.model";

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

    // Group products by category when "All" is selected
    const groupedByCategory = useMemo<{ category: Category; products: Product[] }[]>(() => {
        if (categoryCode || debouncedQuery) return [];
        const map = new Map<number, { category: Category; products: Product[] }>();
        for (const product of products) {
            const cat = categories.find((c) => c.id === product.categoryId);
            if (!cat) continue;
            if (!map.has(cat.id)) {
                map.set(cat.id, { category: cat, products: [] });
            }
            map.get(cat.id)!.products.push(product);
        }
        return Array.from(map.values());
    }, [products, categories, categoryCode, debouncedQuery]);

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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="bg-gray-200 rounded-2xl h-80 animate-pulse" />
                    ))}
                </div>
            ) : products.length > 0 ? (
                /* All Products — grouped by category */
                groupedByCategory.length > 0 ? (
                    <div className="space-y-10">
                        {groupedByCategory.map(({ category, products: catProducts }) => (
                            <section key={category.id}>
                                {/* Category Header */}
                                <div className="flex items-center gap-3 mb-4">
                                    <h2 className="text-2xl font-bold text-green-600">
                                        {category.name}
                                    </h2>
                                    <span className="bg-green-100 text-green-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                                        {catProducts.length} sản phẩm
                                    </span>
                                    <div className="flex-1 h-px bg-green-100" />
                                </div>
                                {/* Product grid — 3 columns */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {catProducts.map((product) => (
                                        <ProductCard key={product.id} product={product} />
                                    ))}
                                </div>
                            </section>
                        ))}
                    </div>
                ) : (
                    /* Specific category or search — flat grid */
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {products.map((product) => (
                            <ProductCard key={product.id} product={product} />
                        ))}
                    </div>
                )
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

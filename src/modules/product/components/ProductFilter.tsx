import type { Category } from "../types/product.type";

interface ProductFilterProps {
    categories: Category[];
    selectedCategoryCode: string | null;
    onCategoryChange: (code: string | null) => void;
    onSearch: (query: string) => void;
    searchQuery: string;
}

export default function ProductFilter({
    categories,
    selectedCategoryCode,
    onCategoryChange,
    onSearch,
    searchQuery,
}: ProductFilterProps) {
    return (
        <div className="bg-white rounded-2xl shadow-md p-6 mb-8">
            <div className="flex flex-col lg:flex-row gap-6">
                {/* Search */}
                <div className="flex-1">
                    <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
                        Tìm kiếm sản phẩm
                    </label>
                    <div className="relative">
                        <input
                            type="text"
                            id="search"
                            value={searchQuery}
                            onChange={(e) => onSearch(e.target.value)}
                            placeholder="Nhập tên sản phẩm..."
                            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                        />
                        <svg
                            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                            />
                        </svg>
                    </div>
                </div>

                {/* Category Filter */}
                <div className="lg:w-72">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Danh mục</label>
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => onCategoryChange(null)}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${selectedCategoryCode === null
                                    ? "bg-amber-500 text-white shadow-md"
                                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                }`}
                        >
                            Tất cả
                        </button>
                        {categories.map((category) => (
                            <button
                                key={category.id}
                                onClick={() => onCategoryChange(category.code)}
                                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${selectedCategoryCode === category.code
                                        ? "bg-amber-500 text-white shadow-md"
                                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                    }`}
                            >
                                {category.name}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

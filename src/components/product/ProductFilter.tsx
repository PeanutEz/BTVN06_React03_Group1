import type { Category } from "@/models/product.model";

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
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6 space-y-4">
      {/* Search */}
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
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
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Tìm kiếm sản phẩm..."
          className="w-full pl-9 pr-9 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition"
        />
        {searchQuery && (
          <button
            onClick={() => onSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Category Pills */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onCategoryChange(null)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
              selectedCategoryCode === null
                ? "bg-amber-500 text-white shadow"
                : "bg-gray-100 text-gray-600 hover:bg-amber-50 hover:text-amber-600"
            }`}
          >
            Tất cả
          </button>
          {categories
            .filter((c) => c.isActive)
            .map((category) => (
              <button
                key={category.id}
                onClick={() => onCategoryChange(category.code)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                  selectedCategoryCode === category.code
                    ? "bg-amber-500 text-white shadow"
                    : "bg-gray-100 text-gray-600 hover:bg-amber-50 hover:text-amber-600"
                }`}
              >
                {category.name}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}

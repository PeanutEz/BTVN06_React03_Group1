import { cn } from "@/lib/utils";
import type { MenuCategory } from "@/types/menu.types";

interface MenuSidebarProps {
  categories: MenuCategory[];
  activeId: number;
  productCounts: Record<number, number>;
  onSelect: (id: number) => void;
}

export default function MenuSidebar({
  categories,
  activeId,
  productCounts,
  onSelect,
}: MenuSidebarProps) {
  const totalCount = Object.values(productCounts).reduce((s, n) => s + n, 0);

  return (
    <aside className="w-60 shrink-0">
      <div className="sticky top-24">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3 px-3">
          Danh mục
        </p>
        <nav className="space-y-0.5">
          {/* Tất cả */}
          <button
            onClick={() => onSelect(0)}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 text-left group",
              activeId === 0
                ? "bg-amber-50 text-amber-700 shadow-sm"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
            )}
          >
            <span className={cn("text-xl shrink-0 transition-transform duration-150", activeId === 0 ? "scale-110" : "group-hover:scale-105")}>
              🍽️
            </span>
            <span className="flex-1 truncate">Tất cả</span>
            <span
              className={cn(
                "text-xs px-1.5 py-0.5 rounded-full font-semibold tabular-nums shrink-0",
                activeId === 0
                  ? "bg-amber-600 text-white"
                  : "bg-gray-100 text-gray-500 group-hover:bg-gray-200",
              )}
            >
              {totalCount}
            </span>
          </button>

          {categories.map((cat) => {
            const isActive = cat.id === activeId;
            return (
              <button
                key={cat.id}
                onClick={() => onSelect(cat.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 text-left group",
                  isActive
                    ? "bg-amber-50 text-amber-700 shadow-sm"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                )}
              >
                <span className={cn("text-xl shrink-0 transition-transform duration-150", isActive ? "scale-110" : "group-hover:scale-105")}>
                  {cat.icon}
                </span>
                <span className="flex-1 truncate">{cat.name}</span>
                <span
                  className={cn(
                    "text-xs px-1.5 py-0.5 rounded-full font-semibold tabular-nums shrink-0",
                    isActive
                      ? "bg-amber-600 text-white"
                      : "bg-gray-100 text-gray-500 group-hover:bg-gray-200",
                  )}
                >
                  {productCounts[cat.id] ?? 0}
                </span>
              </button>
            );
          })}
        </nav>

        <div className="mt-6 mx-3 p-4 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 text-white">
          <p className="text-xs font-semibold uppercase tracking-wider opacity-80 mb-1">
            Ưu đãi hôm nay
          </p>
          <p className="text-sm font-bold leading-snug">Giảm 15% đơn từ 150k</p>
          <p className="text-xs opacity-75 mt-1">Code: HYLUX15</p>
        </div>
      </div>
    </aside>
  );
}

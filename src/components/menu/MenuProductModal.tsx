import { useState, useEffect } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { menuCategories } from "@/services/menu.service";
import { useMenuCartStore } from "@/store/menu-cart.store";
import {
  MENU_SIZES,
  SUGAR_LEVELS,
  ICE_LEVELS,
  TOPPINGS,
  type MenuProduct,
  type MenuSize,
  type SugarLevel,
  type IceLevel,
  type Topping,
} from "@/types/menu.types";

const fmt = (n: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n);

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-2.5">
      {children}
    </p>
  );
}

interface MenuProductModalProps {
  product: MenuProduct | null;
  onClose: () => void;
}

export default function MenuProductModal({ product, onClose }: MenuProductModalProps) {
  const addItem = useMenuCartStore((s) => s.addItem);

  const [size, setSize] = useState<MenuSize>("M");
  const [sugar, setSugar] = useState<SugarLevel>("100%");
  const [ice, setIce] = useState<IceLevel>("Đá vừa");
  const [selectedToppings, setSelectedToppings] = useState<Topping[]>([]);
  const [quantity, setQuantity] = useState(1);

  // Reset state when product changes
  useEffect(() => {
    if (product) {
      setSize("M");
      setSugar("100%");
      setIce("Đá vừa");
      setSelectedToppings([]);
      setQuantity(1);
    }
  }, [product?.id]);

  // Lock body scroll
  useEffect(() => {
    if (product) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [product]);

  if (!product) return null;

  const sizeDelta = MENU_SIZES.find((s) => s.value === size)?.priceDelta ?? 0;
  const toppingTotal = selectedToppings.reduce((s, t) => s + t.price, 0);
  const unitPrice = product.price + sizeDelta + toppingTotal;
  const totalPrice = unitPrice * quantity;

  const category = menuCategories.find((c) => c.id === product.categoryId);

  function toggleTopping(topping: Topping) {
    setSelectedToppings((prev) =>
      prev.find((t) => t.id === topping.id)
        ? prev.filter((t) => t.id !== topping.id)
        : [...prev, topping],
    );
  }

  function handleAddToCart() {    if (!product) return;    addItem(product, { size, sugar, ice, toppings: selectedToppings }, quantity);
    toast.success(`Đã thêm "${product.name}" vào giỏ!`, {
      description: `Size ${size} • ${sugar} đường • ${ice}${
        selectedToppings.length ? ` • ${selectedToppings.map((t) => t.name).join(", ")}` : ""
      }`,
    });
    onClose();
  }

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-full sm:max-w-lg bg-white sm:rounded-2xl shadow-2xl overflow-hidden max-h-[92dvh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header + image */}
        <div className="relative shrink-0">
          <div className="h-44 sm:h-52 overflow-hidden bg-gray-100">
            <img
              src={product.image}
              alt={product.name}
              className="w-full h-full object-cover"
            />
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          </div>

          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/40 flex items-center justify-center text-white hover:bg-black/60 transition-colors"
            aria-label="Đóng"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Tags */}
          <div className="absolute top-3 left-3 flex gap-1.5">
            {product.tags?.includes("bestseller") && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500 text-white">🔥 Bestseller</span>
            )}
            {product.tags?.includes("new") && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500 text-white">✨ Mới</span>
            )}
          </div>

          {/* Product info overlay */}
          <div className="absolute bottom-0 left-0 right-0 px-4 pb-3">
            {category && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/20 text-white backdrop-blur-sm">
                {category.icon} {category.name}
              </span>
            )}
            <h2 className="text-lg font-bold text-white mt-1 tracking-tight leading-tight">
              {product.name}
            </h2>
            <div className="flex items-center gap-2 mt-0.5">
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <svg key={i} className={cn("w-3 h-3", i < Math.floor(product.rating) ? "text-amber-400 fill-current" : "text-white/40 fill-current")} viewBox="0 0 20 20">
                    <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                  </svg>
                ))}
              </div>
              <span className="text-xs text-white/80">{product.rating.toFixed(1)} ({product.reviewCount})</span>
            </div>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-4 py-4 space-y-4">
          {/* Description */}
          {product.content && (
            <p className="text-sm text-gray-500 leading-relaxed">{product.content}</p>
          )}

          {/* Size */}
          <div>
            <SectionLabel>Chọn size</SectionLabel>
            <div className="flex gap-2">
              {MENU_SIZES.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setSize(s.value)}
                  className={cn(
                    "flex-1 py-2.5 rounded-xl border text-sm font-semibold transition-all duration-150",
                    size === s.value
                      ? "border-amber-500 bg-amber-50 text-amber-700 ring-2 ring-amber-200"
                      : "border-gray-200 text-gray-600 hover:border-gray-300 bg-white",
                  )}
                >
                  <div>{s.value}</div>
                  <div className="text-[10px] font-normal mt-0.5 opacity-70">
                    {s.priceDelta > 0 ? `+${fmt(s.priceDelta)}` : "Cơ bản"}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Sugar */}
          <div>
            <SectionLabel>Lượng đường</SectionLabel>
            <div className="flex flex-wrap gap-2">
              {SUGAR_LEVELS.map((level) => (
                <button
                  key={level}
                  onClick={() => setSugar(level)}
                  className={cn(
                    "px-3 py-1.5 rounded-xl border text-xs font-medium transition-all duration-150",
                    sugar === level
                      ? "border-amber-500 bg-amber-50 text-amber-700"
                      : "border-gray-200 text-gray-600 hover:border-gray-300 bg-white",
                  )}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          {/* Ice */}
          <div>
            <SectionLabel>Lượng đá</SectionLabel>
            <div className="flex flex-wrap gap-2">
              {ICE_LEVELS.map((level) => (
                <button
                  key={level}
                  onClick={() => setIce(level)}
                  className={cn(
                    "px-3 py-1.5 rounded-xl border text-xs font-medium transition-all duration-150",
                    ice === level
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-gray-200 text-gray-600 hover:border-gray-300 bg-white",
                  )}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          {/* Toppings */}
          <div>
            <SectionLabel>Topping (tuỳ chọn)</SectionLabel>
            <div className="grid grid-cols-2 gap-2">
              {TOPPINGS.map((topping) => {
                const selected = selectedToppings.some((t) => t.id === topping.id);
                return (
                  <button
                    key={topping.id}
                    onClick={() => toggleTopping(topping)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-xl border text-xs transition-all duration-150 text-left",
                      selected
                        ? "border-amber-500 bg-amber-50 text-amber-800"
                        : "border-gray-200 text-gray-600 hover:border-gray-300 bg-white",
                    )}
                  >
                    <span
                      className={cn(
                        "w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-all",
                        selected ? "bg-amber-500 border-amber-500" : "border-gray-300",
                      )}
                    >
                      {selected && (
                        <svg className="w-2 h-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </span>
                    <span className="shrink-0">{topping.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{topping.name}</div>
                      <div className="text-[10px] text-gray-400">+{fmt(topping.price)}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer: qty + total + CTA */}
        <div className="shrink-0 border-t border-gray-100 bg-white px-4 py-3">
          <div className="flex items-center gap-3">
            {/* Quantity */}
            <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden shrink-0">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1}
                className="w-9 h-10 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-40"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </button>
              <span className="w-8 text-center text-sm font-semibold select-none">{quantity}</span>
              <button
                onClick={() => setQuantity((q) => q + 1)}
                className="w-9 h-10 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>

            {/* Add to cart */}
            <button
              onClick={handleAddToCart}
              className="flex-1 flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-white py-2.5 rounded-xl font-semibold transition-all duration-150 text-sm shadow-sm shadow-amber-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Thêm vào giỏ · {fmt(totalPrice)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

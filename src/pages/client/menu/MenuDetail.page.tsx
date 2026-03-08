import { useState, useMemo } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getProductById, menuCategories } from "@/services/menu.service";
import { useMenuCartStore } from "@/store/menu-cart.store";
import {
  MENU_SIZES,
  SUGAR_LEVELS,
  ICE_LEVELS,
  TOPPINGS,
  type MenuSize,
  type SugarLevel,
  type IceLevel,
  type Topping,
} from "@/types/menu.types";

const fmt = (n: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n);

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
      {children}
    </p>
  );
}

export default function MenuDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const addItem = useMenuCartStore((s) => s.addItem);

  const product = getProductById(Number(id));

  const [size, setSize] = useState<MenuSize>("M");
  const [sugar, setSugar] = useState<SugarLevel>("100%");
  const [ice, setIce] = useState<IceLevel>("Đá vừa");
  const [selectedToppings, setSelectedToppings] = useState<Topping[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(0);

  const sizeDelta = MENU_SIZES.find((s) => s.value === size)?.priceDelta ?? 0;
  const toppingTotal = selectedToppings.reduce((s, t) => s + t.price, 0);
  const unitPrice = (product?.price ?? 0) + sizeDelta + toppingTotal;
  const totalPrice = unitPrice * quantity;

  const category = useMemo(
    () => menuCategories.find((c) => c.id === product?.categoryId),
    [product?.categoryId],
  );

  function toggleTopping(topping: Topping) {
    setSelectedToppings((prev) =>
      prev.find((t) => t.id === topping.id)
        ? prev.filter((t) => t.id !== topping.id)
        : [...prev, topping],
    );
  }

  function handleAddToCart() {
    if (!product) return;
    addItem(product, { size, sugar, ice, toppings: selectedToppings }, quantity);
    toast.success(`Đã thêm "${product.name}" vào giỏ!`, {
      description: `Size ${size} • ${sugar} đường • ${ice}${selectedToppings.length ? ` • ${selectedToppings.map((t) => t.name).join(", ")}` : ""}`,
      action: { label: "Xem giỏ", onClick: () => navigate("/menu/checkout") },
    });
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">😕</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Không tìm thấy sản phẩm</h2>
          <Link to="/menu" className="text-amber-600 hover:text-amber-700 font-medium text-sm">
            ← Quay lại Menu
          </Link>
        </div>
      </div>
    );
  }

  const images = product.images?.length ? product.images : [product.image];

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-400 mb-8">
          <Link to="/" className="hover:text-gray-600 transition-colors">Trang chủ</Link>
          <span>/</span>
          <Link to="/menu" className="hover:text-gray-600 transition-colors">Menu</Link>
          {category && (
            <>
              <span>/</span>
              <Link
                to={`/menu?category=${category.id}`}
                className="hover:text-gray-600 transition-colors"
              >
                {category.name}
              </Link>
            </>
          )}
          <span>/</span>
          <span className="text-gray-900 font-medium truncate max-w-[180px]">{product.name}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 xl:gap-16">
          {/* ── Left: Images ── */}
          <div className="space-y-3">
            <div className="relative aspect-square rounded-3xl overflow-hidden bg-gray-50 border border-gray-100">
              <img
                src={images[activeImage]}
                alt={product.name}
                className="w-full h-full object-cover"
              />
              {product.tags?.includes("bestseller") && (
                <span className="absolute top-4 left-4 bg-amber-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                  🔥 Bestseller
                </span>
              )}
              {product.tags?.includes("new") && (
                <span className="absolute top-4 left-4 bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                  ✨ Mới
                </span>
              )}
            </div>
            {images.length > 1 && (
              <div className="flex gap-2">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImage(i)}
                    className={cn(
                      "w-16 h-16 rounded-xl overflow-hidden border-2 transition-all duration-150",
                      i === activeImage ? "border-amber-500 ring-2 ring-amber-200" : "border-gray-100 hover:border-gray-300",
                    )}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Right: Options ── */}
          <div className="flex flex-col gap-6">
            {/* Product info */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                {category && (
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700">
                    {category.icon} {category.name}
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight mb-2">
                {product.name}
              </h1>
              <p className="text-gray-500 text-sm leading-relaxed mb-4">{product.content}</p>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <svg key={i} className={cn("w-4 h-4", i < Math.floor(product.rating) ? "text-amber-400 fill-current" : "text-gray-200 fill-current")} viewBox="0 0 20 20">
                      <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                    </svg>
                  ))}
                </div>
                <span className="text-sm font-semibold text-gray-700">{product.rating.toFixed(1)}</span>
                <span className="text-sm text-gray-400">({product.reviewCount} đánh giá)</span>
              </div>
            </div>

            <div className="h-px bg-gray-100" />

            {/* Size selection */}
            <div>
              <SectionLabel>Chọn size</SectionLabel>
              <div className="flex gap-2.5">
                {MENU_SIZES.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => setSize(s.value)}
                    className={cn(
                      "flex-1 py-3 rounded-xl border text-sm font-semibold transition-all duration-150",
                      size === s.value
                        ? "border-amber-500 bg-amber-50 text-amber-700 ring-2 ring-amber-200"
                        : "border-gray-200 text-gray-600 hover:border-gray-300 bg-white",
                    )}
                  >
                    <div>{s.value}</div>
                    <div className="text-xs font-normal mt-0.5 opacity-70">
                      {s.priceDelta > 0 ? `+${fmt(s.priceDelta)}` : "Cơ bản"}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Sugar level */}
            <div>
              <SectionLabel>Lượng đường</SectionLabel>
              <div className="flex flex-wrap gap-2">
                {SUGAR_LEVELS.map((level) => (
                  <button
                    key={level}
                    onClick={() => setSugar(level)}
                    className={cn(
                      "px-4 py-2 rounded-xl border text-sm font-medium transition-all duration-150",
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

            {/* Ice level */}
            <div>
              <SectionLabel>Lượng đá</SectionLabel>
              <div className="flex flex-wrap gap-2">
                {ICE_LEVELS.map((level) => (
                  <button
                    key={level}
                    onClick={() => setIce(level)}
                    className={cn(
                      "px-4 py-2 rounded-xl border text-sm font-medium transition-all duration-150",
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
                        "flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-sm transition-all duration-150 text-left",
                        selected
                          ? "border-amber-500 bg-amber-50 text-amber-800"
                          : "border-gray-200 text-gray-600 hover:border-gray-300 bg-white",
                      )}
                    >
                      <span
                        className={cn(
                          "w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all",
                          selected ? "bg-amber-500 border-amber-500" : "border-gray-300",
                        )}
                      >
                        {selected && (
                          <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </span>
                      <span className="shrink-0">{topping.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{topping.name}</div>
                        <div className="text-xs text-gray-400">+{fmt(topping.price)}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="h-px bg-gray-100" />

            {/* Price + Quantity + CTA */}
            <div className="space-y-4">
              {/* Price breakdown */}
              <div className="bg-gray-50 rounded-2xl p-4 space-y-2 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Giá cơ bản</span>
                  <span>{fmt(product.price)}</span>
                </div>
                {sizeDelta > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Size {size}</span>
                    <span>+{fmt(sizeDelta)}</span>
                  </div>
                )}
                {selectedToppings.map((t) => (
                  <div key={t.id} className="flex justify-between text-gray-600">
                    <span>{t.emoji} {t.name}</span>
                    <span>+{fmt(t.price)}</span>
                  </div>
                ))}
                <div className="h-px bg-gray-200" />
                <div className="flex justify-between font-bold text-gray-900 text-base">
                  <span>Đơn giá</span>
                  <span className="text-amber-600">{fmt(unitPrice)}</span>
                </div>
              </div>

              {/* Qty + Add */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 border border-gray-200 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="w-10 h-11 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-40"
                    disabled={quantity <= 1}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                    </svg>
                  </button>
                  <span className="w-10 text-center font-semibold text-sm select-none">{quantity}</span>
                  <button
                    onClick={() => setQuantity((q) => q + 1)}
                    className="w-10 h-11 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </div>

                <button
                  onClick={handleAddToCart}
                  className="flex-1 flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-white py-3 rounded-xl font-semibold transition-all duration-150 shadow-sm shadow-amber-200"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Thêm vào giỏ • {fmt(totalPrice)}
                </button>
              </div>

              <Link
                to="/menu/checkout"
                className="block w-full text-center bg-gray-900 hover:bg-gray-800 active:scale-[0.98] text-white py-3 rounded-xl font-semibold transition-all duration-150 text-sm"
              >
                Thanh toán ngay
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

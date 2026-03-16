import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import { clientService } from "@/services/client.service";
import { useDeliveryStore } from "@/store/delivery.store";
import MenuProductModal from "@/components/menu/MenuProductModal";
import type { MenuProduct } from "@/types/menu.types";
import type { ClientProductDetailResponse } from "@/models/product.model";
import { ROUTER_URL } from "@/routes/router.const";

const fmt = (n: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n);

function toMenuProduct(detail: ClientProductDetailResponse, franchiseId: string): MenuProduct {
  const hashStr = (str: string) =>
    (str.split("").reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) | 0, 0) >>> 0);
  const available = detail.sizes.filter((s) => s.is_available);
  const baseSize = available[0] ?? detail.sizes[0];
  return Object.assign(
    {
      id: hashStr(detail.product_id),
      sku: "",
      name: detail.name,
      description: detail.description ?? "",
      content: detail.content ?? "",
      price: baseSize?.price ?? 0,
      image: detail.image_url,
      images: detail.images_url ?? [],
      categoryId: hashStr(detail.category_id ?? ""),
      rating: 0,
      reviewCount: 0,
      isAvailable: available.length > 0,
      isFeatured: false,
    } as MenuProduct,
    { _apiFranchiseId: franchiseId, _apiProductId: detail.product_id, _apiCategoryName: detail.category_name },
  );
}

export default function MenuDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { selectedFranchiseId } = useDeliveryStore();

  const [detail, setDetail] = useState<ClientProductDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    if (!id || !selectedFranchiseId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    clientService
      .getProductDetail(String(selectedFranchiseId), id)
      .then((data) => { setDetail(data); setActiveImage(0); })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Không tải được sản phẩm"))
      .finally(() => setLoading(false));
  }, [id, selectedFranchiseId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!selectedFranchiseId) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center text-center">
        <div>
          <div className="text-5xl mb-4">🏪</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Chưa chọn cửa hàng</h2>
          <p className="text-sm text-gray-500 mb-4">Vui lòng chọn phương thức đặt hàng trước.</p>
          <Link to={ROUTER_URL.MENU} className="text-amber-600 hover:text-amber-700 font-medium text-sm">← Quay lại Menu</Link>
        </div>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center text-center">
        <div>
          <div className="text-5xl mb-4">😕</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Không tìm thấy sản phẩm</h2>
          {error && <p className="text-sm text-red-500 mb-2">{error}</p>}
          <Link to={ROUTER_URL.MENU} className="text-amber-600 hover:text-amber-700 font-medium text-sm">← Quay lại Menu</Link>
        </div>
      </div>
    );
  }

  const available = detail.sizes.filter((s) => s.is_available);
  const menuProduct = toMenuProduct(detail, String(selectedFranchiseId));
  const images = [detail.image_url, ...(detail.images_url ?? [])].filter(Boolean);

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-400 mb-8">
          <Link to="/" className="hover:text-gray-600 transition-colors">Trang chủ</Link>
          <span>/</span>
          <Link to={ROUTER_URL.MENU} className="hover:text-gray-600 transition-colors">Menu</Link>
          <span>/</span>
          <span className="text-gray-900 font-medium truncate max-w-[180px]">{detail.name}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 xl:gap-16">
          {/* ── Left: Images ── */}
          <div className="space-y-3">
            <div className="relative aspect-square rounded-3xl overflow-hidden bg-gray-50 border border-gray-100">
              <img
                src={images[activeImage] ?? detail.image_url}
                alt={detail.name}
                className="w-full h-full object-cover"
              />
            </div>
            {images.length > 1 && (
              <div className="flex gap-2">
                {images.slice(0, 5).map((img, i) => (
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

          {/* ── Right: Info ── */}
          <div className="flex flex-col gap-6">
            <div>
              {detail.category_name && (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700">
                  {detail.category_name}
                </span>
              )}
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight mb-2 mt-2">
                {detail.name}
              </h1>
              {detail.description && (
                <p className="text-gray-500 text-sm leading-relaxed">{detail.description}</p>
              )}
              {detail.content && (
                <p className="text-gray-400 text-sm leading-relaxed mt-2">{detail.content}</p>
              )}
            </div>

            <div className="h-px bg-gray-100" />

            {/* Sizes & Prices */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Sizes & Giá</p>
              <div className="flex gap-3 flex-wrap">
                {detail.sizes.map((s) => (
                  <div
                    key={s.product_franchise_id}
                    className={cn(
                      "px-4 py-3 rounded-xl border text-sm font-semibold text-center min-w-[72px]",
                      s.is_available
                        ? "border-amber-200 bg-amber-50 text-amber-700"
                        : "border-gray-100 bg-gray-50 text-gray-400 line-through",
                    )}
                  >
                    <div>{s.size}</div>
                    <div className="text-xs font-normal mt-0.5">{fmt(s.price)}</div>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => setShowModal(true)}
              disabled={available.length === 0}
              className="flex items-center justify-center gap-2 w-full bg-amber-500 hover:bg-amber-600 disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold py-4 rounded-2xl transition-all active:scale-[0.98] text-base shadow-sm shadow-amber-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              {available.length === 0 ? "Hết hàng" : "Thêm vào giỏ hàng"}
            </button>

            <Link
              to={ROUTER_URL.MENU_CHECKOUT}
              className="block w-full text-center bg-gray-900 hover:bg-gray-800 active:scale-[0.98] text-white py-3 rounded-xl font-semibold transition-all text-sm"
            >
              Thanh toán ngay
            </Link>
          </div>
        </div>
      </div>

      {showModal && (
        <MenuProductModal product={menuProduct} onClose={() => setShowModal(false)} />
      )}
    </div>
  );
}

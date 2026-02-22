import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { toast } from "react-toastify";

import { useProductStore } from "@/store/product.store";
import { useCartStore } from "@/store";
import { useAuthStore } from "@/store/auth.store";
import { ROUTER_URL } from "@/routes/router.const";
import ProductCard from "@/components/product/ProductCard";

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);

  const addToCart = useCartStore((s) => s.addToCart);
  const { user } = useAuthStore();

  const {
    selectedProduct,
    products,
    categories,
    isLoading,
    error,
    fetchProductById,
    fetchProducts,
    fetchCategories,
    clearSelectedProduct,
  } = useProductStore();

  useEffect(() => {
    if (id) {
      fetchProductById(Number(id));
      fetchProducts();
      fetchCategories();
    }

    return () => {
      clearSelectedProduct();
    };
  }, [id, fetchProductById, fetchProducts, fetchCategories, clearSelectedProduct]);

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(price);

  if (isLoading) return <div>Loading...</div>;

  if (error || !selectedProduct) {
    return (
      <div className="text-center py-16">
        <h3 className="text-xl font-semibold mb-4">
          {error || "Không tìm thấy sản phẩm"}
        </h3>
        <button
          onClick={() => navigate(ROUTER_URL.PRODUCTS)}
          className="bg-amber-500 text-white px-6 py-3 rounded-full"
        >
          Quay lại danh sách
        </button>
      </div>
    );
  }

  const images =
    selectedProduct.images?.length
      ? selectedProduct.images
      : [selectedProduct.image];

  const category = categories.find(
    (c) => c.id === selectedProduct.categoryId,
  );

  const relatedProducts = products
    .filter(
      (p) =>
        p.categoryId === selectedProduct.categoryId &&
        p.id !== selectedProduct.id,
    )
    .slice(0, 4);

  return (
    <div>
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm mb-8 flex-wrap">
        <Link to="/order" className="text-gray-500 hover:text-amber-600">
          Đặt hàng
        </Link>
        <span>/</span>
        <Link
          to={ROUTER_URL.PRODUCTS}
          className="text-gray-500 hover:text-amber-600"
        >
          Sản phẩm
        </Link>
        {category && (
          <>
            <span>/</span>
            <Link
              to={`/products?category=${category.code}`}
              className="text-gray-500 hover:text-amber-600"
            >
              {category.name}
            </Link>
          </>
        )}
        <span>/</span>
        <span className="font-medium">
          {selectedProduct.name}
        </span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
        {/* Images */}
        <div>
          <img
            src={images[selectedImage]}
            alt={selectedProduct.name}
            className="w-full rounded-2xl"
          />

          {/* Thumbnail */}
          {images.length > 1 && (
            <div className="flex gap-3 mt-4">
              {images.map((img, index) => (
                <img
                  key={index}
                  src={img}
                  alt="thumbnail"
                  onClick={() => setSelectedImage(index)}
                  className={`w-20 h-20 object-cover rounded-lg cursor-pointer border ${
                    selectedImage === index
                      ? "border-amber-500"
                      : "border-transparent"
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          <h1 className="text-3xl font-bold mb-4">
            {selectedProduct.name}
          </h1>

          <p className="text-2xl font-bold text-amber-600 mb-4">
            {formatPrice(selectedProduct.price || 0)}
          </p>

          <p className="mb-6">
            {selectedProduct.description}
          </p>

          {/* Quantity */}
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() =>
                setQuantity(Math.max(1, quantity - 1))
              }
              className="px-4 py-2 border rounded-lg"
            >
              -
            </button>

            <span className="text-lg font-semibold">
              {quantity}
            </span>

            <button
              onClick={() =>
                setQuantity(
                  Math.min(
                    selectedProduct.stock || 999,
                    quantity + 1,
                  ),
                )
              }
              className="px-4 py-2 border rounded-lg"
            >
              +
            </button>
          </div>

          {/* Add to cart */}
          <button
            onClick={() => {
              if (!user) {
                toast.error(
                  "Vui lòng đăng nhập để thêm vào giỏ hàng",
                );
                navigate(ROUTER_URL.LOGIN);
                return;
              }

              addToCart(selectedProduct, quantity);
              toast.success("Đã thêm vào giỏ hàng");
            }}
            className="bg-amber-500 hover:bg-amber-600 text-white px-8 py-4 rounded-xl font-semibold"
          >
            Thêm vào giỏ
          </button>
        </div>
      </div>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold mb-6">
            Sản Phẩm Liên Quan
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {relatedProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

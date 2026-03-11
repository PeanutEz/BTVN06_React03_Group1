import { useState, useEffect, useRef } from "react";
import { adminProductService, categories } from "@/services/product.service";
import type { Product, ProductQueryParams } from "@/models/product.model";
import { toast } from "sonner";
import { ProductModal } from "@/components/product";

export default function ProductListPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);
  const [detailSaving, setDetailSaving] = useState(false);
  const [detailForm, setDetailForm] = useState<{
    name: string;
    description: string;
    min_price: number;
    max_price: number;
  } | null>(null);
  const [pagination, setPagination] = useState({

    page: 1,
    limit: 10,
    total: 0,
  });

  // Filters
  const [searchQuery, setSearchQuery] = useState("");       // input display value
  const [appliedSearch, setAppliedSearch] = useState("");   // committed to API on Search click
  const [minPriceInput, setMinPriceInput] = useState("");   // input display value
  const [maxPriceInput, setMaxPriceInput] = useState("");   // input display value
  const [appliedMinPrice, setAppliedMinPrice] = useState(""); // committed to API on Search click
  const [appliedMaxPrice, setAppliedMaxPrice] = useState(""); // committed to API on Search click
  const [categoryFilter, setCategoryFilter] = useState<number | undefined>();
  const [statusFilter, setStatusFilter] = useState<boolean | undefined>();
  const lastParamsRef = useRef<string | null>(null);

  // Fetch products
  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params: ProductQueryParams = {
        page: pagination.page,
        limit: pagination.limit,
        search: appliedSearch || undefined,
        categoryId: categoryFilter,
        isActive: statusFilter,
        minPrice: appliedMinPrice || undefined,
        maxPrice: appliedMaxPrice || undefined,
      };

      const response = await adminProductService.getProducts(params);
      setProducts(response.data);
      setPagination((prev) => ({
        ...prev,
        total: response.total,
      }));
    } catch (error) {
      toast.error("Failed to load products");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const key = JSON.stringify([pagination.page, appliedSearch, appliedMinPrice, appliedMaxPrice, categoryFilter, statusFilter]);
    if (key === lastParamsRef.current) return;
    lastParamsRef.current = key;
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page, appliedSearch, appliedMinPrice, appliedMaxPrice, categoryFilter, statusFilter]);

  // Handle create/edit
  const handleOpenModal = (product?: Product) => {
    setEditingProduct(product || null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
  };

  const handleSaveProduct = () => {
    handleCloseModal();
    fetchProducts();
    toast.success(
      editingProduct
        ? "Product updated successfully"
        : "Product created successfully",
    );
  };

  // Handle delete
  const openViewingProduct = (product: Product) => {
    setViewingProduct(product);
    setDetailForm({
      name: product.name,
      description: product.description,
      min_price: product.min_price,
      max_price: product.max_price,
    });
  };

  const handleDetailSave = async () => {
    if (!viewingProduct || !detailForm) return;
    if (!detailForm.name.trim()) { toast.error("Tên sản phẩm không được để trống"); return; }
    if (!detailForm.description.trim()) { toast.error("Mô tả không được để trống"); return; }
    if (detailForm.min_price < 1000) { toast.error("Giá thấp nhất phải ít nhất 1.000 đ"); return; }
    if (detailForm.max_price <= detailForm.min_price) { toast.error("Giá cao nhất phải lớn hơn giá thấp nhất"); return; }
    setDetailSaving(true);
    try {
      await adminProductService.updateProduct(viewingProduct.id.toString(), {
        SKU: viewingProduct.sku,
        name: detailForm.name,
        description: detailForm.description,
        content: viewingProduct.content,
        image_url: viewingProduct.image_url || viewingProduct.image || "",
        images_url: viewingProduct.images ?? [],
        min_price: detailForm.min_price,
        max_price: detailForm.max_price,
      });
      toast.success("Cập nhật sản phẩm thành công");
      setViewingProduct((prev) =>
        prev ? { ...prev, ...detailForm } : null
      );
      setProducts((prev) =>
        prev.map((p) => (p.id === viewingProduct.id ? { ...p, ...detailForm } : p))
      );
    } catch (err) {
      toast.error("Cập nhật thất bại");
      console.error(err);
    } finally {
      setDetailSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this product?"))
      return;

    try {
      await adminProductService.deleteProduct(id.toString());
      toast.success("Product deleted successfully");
      fetchProducts();
    } catch (error) {
      toast.error("Failed to delete product");
      console.error(error);
    }
  };

  // Handle toggle status
  const handleToggleStatus = async (id: number) => {
    try {
      const updatedProduct = await adminProductService.toggleProductStatus(id.toString());

      // Update local state without reloading
      setProducts((prevProducts) =>
        prevProducts.map((p) =>
          p.id === id ? { ...p, isActive: updatedProduct.isActive } : p,
        ),
      );

      toast.success(
        `Product ${updatedProduct.isActive ? "activated" : "deactivated"} successfully`,
      );
    } catch (error) {
      toast.error("Failed to update status");
      console.error(error);
    }
  };

  // Get category name
  const getCategoryName = (categoryId: number) => {
    return categories.find((c) => c.id === categoryId)?.name || "Unknown";
  };

  // Calculate total pages
  const totalPages = Math.ceil(pagination.total / pagination.limit);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
            Product Management
          </h1>
          <p className="text-gray-600 mt-1 text-sm">
            Manage global product catalog (HQ)
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="bg-primary-500 hover:bg-primary-600 text-white px-6 py-2.5 rounded-lg font-medium shadow-md transition-colors"
        >
          + Create Product
        </button>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm mb-6 space-y-3">
        {/* Search row */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <svg
              className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search by SKU or Name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { setAppliedSearch(e.currentTarget.value); setPagination((prev) => ({ ...prev, page: 1 })); } }}
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-4 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
            />
          </div>
          {/* Min Price */}
          <input
            type="number"
            placeholder="Min price"
            value={minPriceInput}
            onChange={(e) => setMinPriceInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setAppliedSearch(searchQuery);
                setAppliedMinPrice(minPriceInput);
                setAppliedMaxPrice(maxPriceInput);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }
            }}
            className="w-32 rounded-lg border border-slate-300 bg-white py-2 px-3 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
          />
          <span className="text-slate-400 text-sm self-center">–</span>
          {/* Max Price */}
          <input
            type="number"
            placeholder="Max price"
            value={maxPriceInput}
            onChange={(e) => setMaxPriceInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setAppliedSearch(searchQuery);
                setAppliedMinPrice(minPriceInput);
                setAppliedMaxPrice(maxPriceInput);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }
            }}
            className="w-32 rounded-lg border border-slate-300 bg-white py-2 px-3 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
          />
          <button
            onClick={() => {
              setAppliedSearch(searchQuery);
              setAppliedMinPrice(minPriceInput);
              setAppliedMaxPrice(maxPriceInput);
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            disabled={loading}
            className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-600 disabled:opacity-60"
          >
            Search
          </button>
        </div>

        {/* Status chips */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide mr-1">Status:</span>
          {[
            { label: "All", value: undefined },
            { label: "Active", value: true },
            { label: "Inactive", value: false },
          ].map((opt) => {
            const isSelected = statusFilter === opt.value;
            return (
              <button
                key={String(opt.value)}
                onClick={() => { setStatusFilter(opt.value); setPagination((prev) => ({ ...prev, page: 1 })); }}
                className={`rounded-full px-3 py-1 text-xs font-medium transition border ${
                  isSelected
                    ? "bg-primary-500 text-white border-primary-500 shadow-sm"
                    : "bg-white text-slate-600 border-slate-300 hover:border-primary-400 hover:text-primary-600"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {/* Category chips */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide mr-1">Category:</span>
          <button
            onClick={() => { setCategoryFilter(undefined); setPagination((prev) => ({ ...prev, page: 1 })); }}
            className={`rounded-full px-3 py-1 text-xs font-medium transition border ${
              categoryFilter === undefined
                ? "bg-primary-500 text-white border-primary-500 shadow-sm"
                : "bg-white text-slate-600 border-slate-300 hover:border-primary-400 hover:text-primary-600"
            }`}
          >
            All
          </button>
          {categories.map((cat) => {
            const isSelected = categoryFilter === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => { setCategoryFilter(cat.id); setPagination((prev) => ({ ...prev, page: 1 })); }}
                className={`rounded-full px-3 py-1 text-xs font-medium transition border ${
                  isSelected
                    ? "bg-primary-500 text-white border-primary-500 shadow-sm"
                    : "bg-white text-slate-600 border-slate-300 hover:border-primary-400 hover:text-primary-600"
                }`}
              >
                {cat.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <svg
              className="mx-auto h-12 w-12 text-gray-400 mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
              />
            </svg>
            <p className="text-lg font-medium">No products found</p>
            <p className="text-sm mt-1">
              Try adjusting your filters or create a new product
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Image
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      SKU
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Price Range
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {products.map((product) => (
                    <tr
                      key={product.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <img
                          src={product.image_url || product.image}
                          alt={product.name}
                          className="w-16 h-16 object-cover rounded-lg"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono text-sm text-gray-900">
                          {product.sku}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium text-gray-900">
                            {product.name}
                          </div>
                          <div className="text-sm text-gray-500 truncate max-w-xs">
                            {product.description}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-900">
                          {getCategoryName(product.categoryId)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <div className="text-gray-900 font-medium">
                            {product.min_price.toLocaleString("vi-VN")} đ
                          </div>
                          <div className="text-gray-500">
                            to {product.max_price.toLocaleString("vi-VN")} đ
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleToggleStatus(product.id)}
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                            product.isActive
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {product.isActive ? "Active" : "Inactive"}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            title="Xem chi tiết"
                            onClick={() => openViewingProduct(product)}
                            className="inline-flex items-center justify-center size-8 rounded-lg border border-slate-200 bg-white text-slate-500 hover:border-primary-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                          <button
                            title="Xóa sản phẩm"
                            onClick={() => handleDelete(product.id)}
                            className="inline-flex items-center justify-center size-8 rounded-lg border border-red-200 bg-white text-red-500 hover:border-red-400 hover:bg-red-50 transition-colors"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-4 sm:px-6 py-4 border-t border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="text-sm text-slate-500">
                Hiển thị{" "}
                <span className="font-semibold text-slate-700">
                  {(pagination.page - 1) * pagination.limit + 1}
                </span>{" "}
                –{" "}
                <span className="font-semibold text-slate-700">
                  {Math.min(
                    pagination.page * pagination.limit,
                    pagination.total,
                  )}
                </span>{" "}
                trong <span className="font-semibold text-slate-700">{pagination.total}</span>{" "}
                kết quả
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() =>
                    setPagination((prev) => ({ ...prev, page: prev.page - 1 }))
                  }
                  disabled={pagination.page === 1}
                  className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-primary-400 hover:bg-primary-50 hover:text-primary-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Trước
                </button>

                <div className="flex gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    (page) => (
                      <button
                        key={page}
                        onClick={() =>
                          setPagination((prev) => ({ ...prev, page }))
                        }
                        className={`min-w-[38px] rounded-lg border px-3 py-2 text-sm font-medium transition ${
                          pagination.page === page
                            ? "border-primary-500 bg-gradient-to-b from-primary-500 to-primary-600 text-white shadow-sm shadow-primary-500/40"
                            : "border-slate-200 bg-white text-slate-600 hover:border-primary-400 hover:bg-primary-50 hover:text-primary-700"
                        }`}
                      >
                        {page}
                      </button>
                    ),
                  )}
                </div>

                <button
                  onClick={() =>
                    setPagination((prev) => ({ ...prev, page: prev.page + 1 }))
                  }
                  disabled={pagination.page === totalPages}
                  className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-primary-400 hover:bg-primary-50 hover:text-primary-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Sau
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <ProductModal
          product={editingProduct}
          onClose={handleCloseModal}
          onSave={handleSaveProduct}
        />
      )}

      {/* Product Detail Modal */}
      {viewingProduct && detailForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Sticky Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-2xl border-b border-slate-100 bg-white px-6 py-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Chi tiết sản phẩm</h2>
                <p className="mt-0.5 text-xs text-slate-500 font-mono">{viewingProduct.sku}</p>
              </div>
              <div className="flex items-center gap-2">
                {viewingProduct.isActive ? (
                  <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700">Active</span>
                ) : (
                  <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">Inactive</span>
                )}
                <button
                  onClick={() => setViewingProduct(null)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="space-y-5 p-6">
              {/* Main image */}
              <div className="flex items-center gap-4 rounded-xl bg-slate-50 p-4">
                <img
                  src={viewingProduct.image_url || viewingProduct.image}
                  alt={viewingProduct.name}
                  className="h-24 w-24 rounded-xl object-cover ring-2 ring-primary-200 flex-shrink-0"
                  onError={(e) => { (e.target as HTMLImageElement).src = "https://placehold.co/96x96?text=No+Image"; }}
                />
                <div className="leading-tight min-w-0">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Danh mục</p>
                  <p className="text-sm text-slate-700">{getCategoryName(viewingProduct.categoryId)}</p>
                </div>
              </div>

              {/* Extra images */}
              {viewingProduct.images && viewingProduct.images.length > 0 && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">🖼️ Ảnh phụ ({viewingProduct.images.length})</p>
                  <div className="flex flex-wrap gap-2">
                    {viewingProduct.images.map((url, idx) => (
                      <img
                        key={idx}
                        src={url}
                        alt={`extra-${idx}`}
                        className="h-16 w-16 rounded-lg border-2 border-slate-200 object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).src = "https://placehold.co/64x64?text=Err"; }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Editable: Name */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Tên sản phẩm <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={detailForm.name}
                  onChange={(e) => setDetailForm((prev) => prev ? { ...prev, name: e.target.value } : prev)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                />
              </div>

              {/* Editable: Prices */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Giá thấp nhất (đ) <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    value={detailForm.min_price}
                    onChange={(e) => setDetailForm((prev) => prev ? { ...prev, min_price: Number(e.target.value) } : prev)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Giá cao nhất (đ) <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    value={detailForm.max_price}
                    onChange={(e) => setDetailForm((prev) => prev ? { ...prev, max_price: Number(e.target.value) } : prev)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                  />
                </div>
              </div>

              {/* Editable: Description */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Mô tả ngắn <span className="text-red-500">*</span></label>
                <textarea
                  rows={2}
                  value={detailForm.description}
                  onChange={(e) => setDetailForm((prev) => prev ? { ...prev, description: e.target.value } : prev)}
                  className="w-full resize-none rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                />
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-3 border-t border-slate-100 pt-4">
                <button
                  onClick={handleDetailSave}
                  disabled={detailSaving}
                  className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-primary-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-600 disabled:opacity-60"
                >
                  {detailSaving && <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
                  {detailSaving ? "Đang lưu..." : "💾 Lưu thay đổi"}
                </button>
                <button
                  type="button"
                  onClick={() => setViewingProduct(null)}
                  disabled={detailSaving}
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

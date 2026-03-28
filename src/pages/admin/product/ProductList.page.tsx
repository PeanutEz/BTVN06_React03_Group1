import { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import { adminProductService } from "@/services/product.service";
import type { Product, ProductQueryParams } from "@/models/product.model";
import { toast } from "sonner";
import { ProductModal } from "@/components/product";
import { GlassSelect } from "@/components/ui";
import { useConfirm } from "@/components/ui";
import { useLoadingStore } from "@/store/loading.store";

const CLOUDINARY_CLOUD_NAME = "dn2xh5rxe";
const CLOUDINARY_UPLOAD_PRESET = "btvn06_upload";
const MAX_SECONDARY = 4;

async function uploadToCloudinary(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    { method: "POST", body: formData }
  );
  if (!res.ok) throw new Error("Upload ảnh lên Cloudinary thất bại");
  const json = await res.json();
  return json.secure_url as string;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function ProductListPage() {
  const showConfirm = useConfirm();
  const { show: showPageLoading, hide: hidePageLoading } = useLoadingStore();
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
  const [statusFilter, setStatusFilter] = useState<boolean | undefined>();
  const [isDeletedFilter, setIsDeletedFilter] = useState<boolean>(false);
  const lastParamsRef = useRef<string | null>(null);

  // Image state for edit modal
  const [editMainImageFile, setEditMainImageFile] = useState<File | null>(null);
  const [editMainImagePreview, setEditMainImagePreview] = useState<string>("");
  const [editMainDragOver, setEditMainDragOver] = useState(false);
  const [editSecondarySlots, setEditSecondarySlots] = useState<Array<{ file: File | null; preview: string }>>([]);
  const [editSecondaryDragOver, setEditSecondaryDragOver] = useState(false);
  const editMainFileInputRef = useRef<HTMLInputElement>(null);

  const applyEditMainFile = async (file: File) => {
    setEditMainImageFile(file);
    setEditMainImagePreview(await fileToDataUrl(file));
  };
  const handleEditMainImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await applyEditMainFile(file);
  };
  const handleEditMainDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setEditMainDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    await applyEditMainFile(file);
  };
  const handleEditSecondaryImageChange = async (e: React.ChangeEvent<HTMLInputElement>, idx: number) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const preview = await fileToDataUrl(file);
    setEditSecondarySlots((prev) => { const next = [...prev]; next[idx] = { file, preview }; return next; });
  };
  const handleEditRemoveSecondary = (idx: number) => {
    setEditSecondarySlots((prev) => { const next = [...prev]; next[idx] = { file: null, preview: "" }; return next; });
  };

  // Fetch products
  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params: ProductQueryParams = {
        page: pagination.page,
        limit: pagination.limit,
        search: appliedSearch || undefined,
        isActive: statusFilter,
        isDeleted: isDeletedFilter,
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
    const key = JSON.stringify([pagination.page, appliedSearch, appliedMinPrice, appliedMaxPrice, statusFilter, isDeletedFilter]);
    if (key === lastParamsRef.current) return;
    lastParamsRef.current = key;
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page, appliedSearch, appliedMinPrice, appliedMaxPrice, statusFilter, isDeletedFilter]);

  // Handle create/edit
  const handleOpenModal = (product?: Product) => {
    setEditingProduct(product || null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
  };

  const handleSaveProduct = async () => {
    handleCloseModal();
    showPageLoading(editingProduct ? "Đang cập nhật sản phẩm..." : "Đang tạo sản phẩm...");
    try {
      lastParamsRef.current = null;
      await fetchProducts();
      toast.success(
        editingProduct
          ? "Product updated successfully"
          : "Product created successfully",
      );
    } finally {
      hidePageLoading();
    }
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
    setEditMainImageFile(null);
    setEditMainImagePreview(product.image_url || product.image || "");
    const existingUrls: string[] = (product as unknown as { images_url?: string[] }).images_url ?? product.images ?? [];
    setEditSecondarySlots(
      Array.from({ length: MAX_SECONDARY }, (_, i) => ({ file: null, preview: existingUrls[i] ?? "" }))
    );
  };

  const handleDetailSave = async () => {
    if (!viewingProduct || !detailForm) return;
    if (!detailForm.name.trim()) { toast.error("Tên sản phẩm không được để trống"); return; }
    if (!detailForm.description.trim()) { toast.error("Mô tả không được để trống"); return; }
    if (detailForm.min_price < 1000) { toast.error("Giá thấp nhất phải ít nhất 1.000 đ"); return; }
    if (detailForm.max_price <= detailForm.min_price) { toast.error("Giá cao nhất phải lớn hơn giá thấp nhất"); return; }
    setViewingProduct(null);
    showPageLoading("Đang cập nhật sản phẩm...");
    setDetailSaving(true);
    try {
      toast.loading("Đang upload ảnh...", { id: "upload" });
      let finalMainUrl = editMainImagePreview;
      if (editMainImageFile) finalMainUrl = await uploadToCloudinary(editMainImageFile);
      const finalImagesUrl = await Promise.all(
        editSecondarySlots.map(async (slot) => slot.file ? uploadToCloudinary(slot.file) : slot.preview)
      );
      toast.dismiss("upload");
      await adminProductService.updateProduct(viewingProduct.id.toString(), {
        SKU: viewingProduct.sku,
        name: detailForm.name,
        description: detailForm.description,
        content: viewingProduct.content,
        image_url: finalMainUrl,
        images_url: finalImagesUrl.filter(Boolean),
        min_price: detailForm.min_price,
        max_price: detailForm.max_price,
      });
      toast.success("Cập nhật sản phẩm thành công");
      lastParamsRef.current = null;
      fetchProducts();
    } catch (err) {
      toast.dismiss("upload");
      toast.error("Cập nhật thất bại");
      console.error(err);
    } finally {
      setDetailSaving(false);
      hidePageLoading();
    }
  };

  const handleDelete = async (id: number) => {
    if (!await showConfirm({ message: "Are you sure you want to delete this product?", variant: "danger" }))
      return;

    try {
      await adminProductService.deleteProduct(id.toString());
      toast.success("Product deleted successfully");
      if (products.length <= 1 && pagination.page > 1) {
        lastParamsRef.current = null;
        setPagination((prev) => ({ ...prev, page: prev.page - 1 }));
      } else {
        lastParamsRef.current = null;
        fetchProducts();
      }
    } catch (error) {
      toast.error("Failed to delete product");
      console.error(error);
    }
  };

  const handleRestore = async (id: number) => {
    if (!await showConfirm({ message: "Bạn có chắc muốn khôi phục sản phẩm này?", variant: "warning" })) return;
    try {
      await adminProductService.restoreProduct(id.toString());
      toast.success("Khôi phục sản phẩm thành công");
      fetchProducts();
    } catch (error) {
      toast.error("Khôi phục sản phẩm thất bại");
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
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm mb-6">
        <div className="flex flex-wrap gap-2">
          {/* Search */}
          <div className="relative flex-1 min-w-48">
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
              onKeyDown={(e) => { if (e.key === "Enter") { setAppliedSearch(e.currentTarget.value); setAppliedMinPrice(minPriceInput); setAppliedMaxPrice(maxPriceInput); setPagination((prev) => ({ ...prev, page: 1 })); } }}
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-4 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
            />
          </div>
          {/* Min Price */}
          <input
            type="number"
            placeholder="Min price"
            value={minPriceInput}
            onChange={(e) => setMinPriceInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { setAppliedSearch(searchQuery); setAppliedMinPrice(minPriceInput); setAppliedMaxPrice(maxPriceInput); setPagination((prev) => ({ ...prev, page: 1 })); } }}
            className="w-32 rounded-lg border border-slate-300 bg-white py-2 px-3 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
          />
          <span className="text-slate-400 text-sm self-center">–</span>
          {/* Max Price */}
          <input
            type="number"
            placeholder="Max price"
            value={maxPriceInput}
            onChange={(e) => setMaxPriceInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { setAppliedSearch(searchQuery); setAppliedMinPrice(minPriceInput); setAppliedMaxPrice(maxPriceInput); setPagination((prev) => ({ ...prev, page: 1 })); } }}
            className="w-32 rounded-lg border border-slate-300 bg-white py-2 px-3 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
          />
          {/* Status dropdown */}
          <GlassSelect
            value={statusFilter === undefined ? "" : String(statusFilter)}
            onChange={(v) => { setStatusFilter(v === "" ? undefined : v === "true"); setPagination((prev) => ({ ...prev, page: 1 })); }}
            options={[
              { value: "", label: "Tất cả trạng thái" },
              { value: "true", label: "Active" },
              { value: "false", label: "Inactive" },
            ]}
          />
          {/* Deleted filter */}
          <label className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer transition-colors select-none ${
            isDeletedFilter
              ? "border-red-400 bg-red-50 text-red-700"
              : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
          }`}>
            <input
              type="checkbox"
              checked={isDeletedFilter}
              onChange={(e) => { setIsDeletedFilter(e.target.checked); setPagination((prev) => ({ ...prev, page: 1 })); }}
              className="accent-red-500"
            />
            <span className="font-medium">Đã xóa</span>
          </label>
          {/* Search button */}
          <button
            onClick={() => { setAppliedSearch(searchQuery); setAppliedMinPrice(minPriceInput); setAppliedMaxPrice(maxPriceInput); setPagination((prev) => ({ ...prev, page: 1 })); }}
            disabled={loading}
            className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-600 disabled:opacity-60"
          >
            Search
          </button>
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
                      className={`transition-colors ${isDeletedFilter ? "bg-red-50" : "hover:bg-gray-50"}`}
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
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
                            product.isActive
                              ? "bg-green-100 text-green-700 hover:bg-green-200"
                              : "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                          }`}
                        >
                          {product.isActive ? "Active" : "Inactive"}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {isDeletedFilter ? (
                            <button
                              title="Khôi phục sản phẩm"
                              onClick={() => handleRestore(product.id)}
                              className="inline-flex items-center justify-center size-8 rounded-lg border border-emerald-200 bg-white text-emerald-600 hover:border-emerald-400 hover:bg-emerald-50 transition-colors"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                            </button>
                          ) : (
                            <>
                              <button
                                title="Chỉnh sửa"
                                onClick={() => openViewingProduct(product)}
                                className="inline-flex items-center justify-center size-8 rounded-lg border border-slate-200 bg-white text-slate-500 hover:border-primary-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
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
                            </>
                          )}
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
      {viewingProduct && detailForm && ReactDOM.createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
          <div
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-[2px]"
            onClick={() => setViewingProduct(null)}
          />
          <div
            className="relative flex max-h-[78vh] w-full max-w-[600px] flex-col overflow-hidden rounded-2xl shadow-2xl"
            style={{
              background: "rgba(15, 23, 42, 0.58)",
              backdropFilter: "blur(28px) saturate(140%)",
              WebkitBackdropFilter: "blur(28px) saturate(140%)",
              border: "1px solid rgba(255, 255, 255, 0.16)",
              boxShadow: "0 22px 44px rgba(2, 6, 23, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.12)",
            }}
          >
            {/* Header */}
            <div className="flex items-start justify-between border-b border-white/[0.14] px-5 py-3.5 sm:px-6">
              <div>
                <h2 className="text-lg font-bold text-white/95 sm:text-xl">Chỉnh sửa sản phẩm</h2>
                <p className="mt-0.5 text-xs text-white/55 sm:text-sm font-mono">{viewingProduct.sku}</p>
              </div>
              <div className="flex items-center gap-2">
                {viewingProduct.isActive ? (
                  <span className="rounded-full bg-green-500/20 px-2.5 py-1 text-xs font-semibold text-green-400">Active</span>
                ) : (
                  <span className="rounded-full bg-red-500/20 px-2.5 py-1 text-xs font-semibold text-red-400">Inactive</span>
                )}
                <button
                  onClick={() => setViewingProduct(null)}
                  className="rounded-lg p-2 text-white/50 transition hover:bg-white/[0.1] hover:text-white/80"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="space-y-3.5 overflow-y-auto px-5 py-4 sm:px-6">
              {/* Main image upload */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-white/85">Ảnh chính <span className="text-red-400">*</span></label>
                <div
                  className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-5 transition ${
                    editMainDragOver
                      ? "border-primary-400 bg-primary-500/10 scale-[1.01]"
                      : "border-white/[0.22] bg-white/[0.05] hover:border-primary-400 hover:bg-white/[0.09]"
                  }`}
                  onClick={() => editMainFileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setEditMainDragOver(true); }}
                  onDragEnter={(e) => { e.preventDefault(); setEditMainDragOver(true); }}
                  onDragLeave={() => setEditMainDragOver(false)}
                  onDrop={handleEditMainDrop}
                >
                  <input ref={editMainFileInputRef} type="file" accept="image/*" className="hidden" onChange={handleEditMainImageChange} />
                  {editMainImagePreview ? (
                    <img src={editMainImagePreview} alt="Ảnh chính" className="h-24 w-24 rounded-xl border border-white/[0.18] object-cover shadow" onError={(e) => { (e.target as HTMLImageElement).src = "https://placehold.co/96x96?text=Err"; }} />
                  ) : (
                    <>
                      <svg className="h-8 w-8 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-xs text-white/45">Kéo thả hoặc nhấn để chọn ảnh chính</span>
                    </>
                  )}
                  {editMainImagePreview && (
                    <span className="text-xs text-primary-300">{editMainDragOver ? "Thả để thay ảnh" : "Nhấn hoặc kéo thả để thay ảnh"}</span>
                  )}
                </div>
              </div>

              {/* Secondary images */}
              <div
                className={`space-y-2.5 rounded-xl border p-3 transition ${
                  editSecondaryDragOver ? "border-primary-400 bg-primary-500/10" : "border-white/[0.14] bg-white/[0.05]"
                }`}
                onDragOver={(e) => { e.preventDefault(); setEditSecondaryDragOver(true); }}
                onDragEnter={(e) => { e.preventDefault(); setEditSecondaryDragOver(true); }}
                onDragLeave={() => setEditSecondaryDragOver(false)}
                onDrop={async (e) => {
                  e.preventDefault(); setEditSecondaryDragOver(false);
                  const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith("image/")).slice(0, MAX_SECONDARY);
                  for (const file of files) {
                    const preview = await fileToDataUrl(file);
                    setEditSecondarySlots(prev => {
                      const next = [...prev];
                      const emptyIdx = next.findIndex(s => !s.preview);
                      const idx = emptyIdx >= 0 ? emptyIdx : 0;
                      next[idx] = { file, preview };
                      return next;
                    });
                  }
                }}
              >
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-white/85">
                    Ảnh phụ <span className="text-white/45 font-normal">(tối đa {MAX_SECONDARY})</span>
                  </label>
                  <span className="rounded-full bg-primary-500/20 px-2 py-0.5 text-xs font-semibold text-primary-200">
                    {editSecondarySlots.filter(s => s.preview).length}/{MAX_SECONDARY}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {editSecondarySlots.map((slot, idx) => (
                    <div key={idx} className="relative">
                      <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-white/[0.18] bg-white/[0.05] aspect-square transition hover:border-primary-400 hover:bg-white/[0.09] overflow-hidden">
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleEditSecondaryImageChange(e, idx)} />
                        {slot.preview ? (
                          <img src={slot.preview} alt={`Ảnh phụ ${idx + 1}`} className="h-full w-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = "https://placehold.co/80x80?text=Err"; }} />
                        ) : (
                          <svg className="h-6 w-6 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                          </svg>
                        )}
                      </label>
                      {slot.preview && (
                        <button type="button" onClick={() => handleEditRemoveSecondary(idx)}
                          className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white shadow transition hover:bg-red-600 z-10">
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Name */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-white/85">
                  Tên sản phẩm <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={detailForm.name}
                  onChange={(e) => setDetailForm((prev) => prev ? { ...prev, name: e.target.value } : prev)}
                  className="w-full rounded-xl border border-white/[0.18] bg-white/[0.08] px-3 py-2 text-sm text-white/90 placeholder:text-white/35 outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-500/20"
                />
              </div>

              {/* Prices */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-white/85">
                    Giá thấp nhất (đ) <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    value={detailForm.min_price}
                    onChange={(e) => setDetailForm((prev) => prev ? { ...prev, min_price: Number(e.target.value) } : prev)}
                    className="w-full rounded-xl border border-white/[0.18] bg-white/[0.08] px-3 py-2 text-sm text-white/90 placeholder:text-white/35 outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-500/20"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-white/85">
                    Giá cao nhất (đ) <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    value={detailForm.max_price}
                    onChange={(e) => setDetailForm((prev) => prev ? { ...prev, max_price: Number(e.target.value) } : prev)}
                    className="w-full rounded-xl border border-white/[0.18] bg-white/[0.08] px-3 py-2 text-sm text-white/90 placeholder:text-white/35 outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-500/20"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-white/85">
                  Mô tả ngắn <span className="text-red-400">*</span>
                </label>
                <textarea
                  rows={2}
                  value={detailForm.description}
                  onChange={(e) => setDetailForm((prev) => prev ? { ...prev, description: e.target.value } : prev)}
                  className="w-full resize-none rounded-xl border border-white/[0.18] bg-white/[0.08] px-3 py-2 text-sm text-white/90 placeholder:text-white/35 outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-500/20"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 border-t border-white/[0.10] pt-3.5">
                <button
                  onClick={handleDetailSave}
                  disabled={detailSaving}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-600 disabled:opacity-60"
                >
                  {detailSaving && <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
                  {detailSaving ? "Đang lưu..." : "Lưu thay đổi"}
                </button>
                <button
                  type="button"
                  onClick={() => setViewingProduct(null)}
                  disabled={detailSaving}
                  className="flex-1 rounded-xl border border-white/[0.18] px-4 py-2.5 text-sm font-semibold text-white/70 transition hover:bg-white/[0.1] hover:text-white disabled:opacity-60"
                >
                  Hủy
                </button>
              </div>
            </div>
          </div>
        </div>
      , document.body)}
    </div>
  );
}

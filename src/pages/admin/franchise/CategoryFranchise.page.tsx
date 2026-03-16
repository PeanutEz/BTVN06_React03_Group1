import { useEffect, useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import { Button, GlassSelect, useConfirm } from "../../../components";
import { categoryFranchiseService } from "../../../services/category-franchise.service";
import { categoryService } from "../../../services/category.service";
import type { CategoryFranchiseApiResponse } from "../../../models/product.model";
import { showError, showSuccess } from "../../../utils";

export default function CategoryFranchisePage() {
    const showConfirm = useConfirm();

    const params = useParams();
    const location = useLocation();

    const franchiseName = location.state?.franchiseName;
    const franchiseId = params.franchiseId || params.id;

    const [filteredCategories, setFilteredCategories] = useState<CategoryFranchiseApiResponse[]>([]);

    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [viewingCategory, setViewingCategory] =
        useState<CategoryFranchiseApiResponse | null>(null);

    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("");
    const [isDeletedFilter, setIsDeletedFilter] = useState<boolean>(false);

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [allCategories, setAllCategories] = useState<any[]>([]);

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingDisplayOrder, setEditingDisplayOrder] = useState<number>(0);

    const [formData, setFormData] = useState({
        category_id: "",
        display_order: 1
    });

    // LOAD DATA
    const load = async () => {

        if (!franchiseId) return;

        try {

            setLoading(true);

            const res = await categoryFranchiseService.searchCategoryFranchises({
                searchCondition: {
                    franchise_id: franchiseId,
                    is_deleted: false
                },
                pageInfo: {
                    pageNum: 1,
                    pageSize: 50
                }
            });

            console.log("LOAD DATA:", res.data);

            setFilteredCategories(res.data);

        } catch (error) {

            console.error(error);
            showError("Không lấy được danh mục");

        } finally {

            setLoading(false);

        }

    };

    const loadAllCategories = async () => {

        try {

            const data = await categoryService.getSelectCategories();

            setAllCategories(data);

        } catch (error) {

            console.error(error);
            showError("Không lấy được danh sách category");

        }

    };

    const openCreateModal = async () => {

        await loadAllCategories();

        setShowCreateModal(true);

    };

    useEffect(() => {

        load();

    }, [franchiseId]);

    // SEARCH + FILTER
    const handleSearch = async () => {

        if (!franchiseId) return;

        try {

            setLoading(true);
            console.log("===== SEARCH CLICK =====");
            console.log("Search Query:", searchQuery);
            console.log("Status Filter:", statusFilter);
            console.log("Deleted Filter:", isDeletedFilter);

            const res = await categoryFranchiseService.searchCategoryFranchises({

                searchCondition: {
                    franchise_id: franchiseId,
                    ...(statusFilter !== "" && { is_active: statusFilter === "true" }),
                    ...(isDeletedFilter && { is_deleted: true })
                },

                pageInfo: {
                    pageNum: 1,
                    pageSize: 50
                }

            });

            let data: CategoryFranchiseApiResponse[] = res.data;

            if (searchQuery.trim()) {
                const keyword = searchQuery.toLowerCase();

                data = data.filter((cat) =>
                    cat.category_name?.toLowerCase().includes(keyword) ||
                    cat.category_code?.toLowerCase().includes(keyword)
                );
            }
            console.log("DATA AFTER SEARCH FILTER:", data);

            setFilteredCategories(data);

        } catch (error) {

            console.error(error);
            showError("Không tìm được danh mục");

        } finally {

            setLoading(false);

        }

    };

    // RESET FILTER
    const handleResetFilters = () => {
        setSearchQuery("");
        setStatusFilter("");
        setIsDeletedFilter(false);
        load();
    };

    // DELETE
    const handleDelete = async (cat: CategoryFranchiseApiResponse) => {

        if (!await showConfirm({ message: "Bạn có chắc muốn xóa danh mục này?", variant: "danger" })) return;

        try {

            setSubmitting(true);

            await categoryFranchiseService.deleteCategoryFranchise(cat.id);

            showSuccess("Xóa thành công");

            load();

        } catch (error) {

            console.error(error);
            showError("Xóa thất bại");

        } finally {

            setSubmitting(false);

        }

    };

    // RESTORE
    const handleRestore = async (cat: CategoryFranchiseApiResponse) => {

        console.log("Restore clicked:", cat);

        if (!await showConfirm({ message: "Khôi phục danh mục này?", variant: "warning" })) return;

        try {

            console.log("Calling restore API with id:", cat.id);

            const res = await categoryFranchiseService.restoreCategoryFranchise(cat.id);

            console.log("Restore API response:", res);

            showSuccess("Khôi phục thành công");

            load();

        } catch (error) {

            console.error("Restore error:", error);

            showError("Khôi phục thất bại");

        }

    };

    const handleChangeStatus = async (cat: CategoryFranchiseApiResponse) => {

        const newStatus = !cat.is_active;

        console.log("===== CHANGE STATUS CLICK =====");
        console.log("Category ID:", cat.id);
        console.log("Current status:", cat.is_active);
        console.log("New status:", !cat.is_active);

        if (!await showConfirm(`Bạn có muốn đổi trạng thái sang ${newStatus ? "Active" : "Inactive"}?`)) {
            console.log("User cancelled change status");
            return;
        }

        try {

            setSubmitting(true)

            console.log("Sending request to API...");
            console.log({
                id: cat.id,
                is_active: newStatus
            });

            const res = await categoryFranchiseService.changeCategoryFranchiseStatus(
                cat.id,
                newStatus
            );

            console.log("API RESPONSE:", res);

            showSuccess("Đổi trạng thái thành công");

            load();

        } catch (error: any) {

            console.error("===== CHANGE STATUS ERROR =====");
            console.error("Full error:", error);

            if (error?.response) {
                console.error("API ERROR RESPONSE:", error.response.data);
            }

            showError("Đổi trạng thái thất bại");

        } finally {

            setSubmitting(false);

            console.log("===== CHANGE STATUS END =====");

        }

    };

    const handlechangeCategoryDisplayOrder = async (cat: CategoryFranchiseApiResponse) => {

        try {

            setSubmitting(true);

            await categoryFranchiseService.changeCategoryDisplayOrder(
                cat.id,
                editingDisplayOrder
            );

            showSuccess("Cập nhật display order thành công");

            setEditingId(null);

            load();

        } catch (error) {

            console.error(error);

            showError("Cập nhật thất bại");

        } finally {

            setSubmitting(false);

        }

    };

    const handleCreateCategoryFranchise = async (e: React.FormEvent) => {

        e.preventDefault();

        if (!formData.category_id) {
            showError("Vui lòng chọn danh mục");
            return;
        }

        try {

            setSubmitting(true);

            await categoryFranchiseService.createCategoryFranchise({
                franchise_id: franchiseId!,
                category_id: formData.category_id,
                display_order: formData.display_order
            });

            showSuccess("Thêm danh mục thành công");

            setShowCreateModal(false);

            setFormData({
                category_id: "",
                display_order: 1
            });

            load();

        } catch (error) {

            console.error(error);
            showError("Thêm danh mục thất bại");

        } finally {

            setSubmitting(false);

        }

    };

    return (

        <div className="space-y-6">

            {/* HEADER */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">

                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                        Category Franchise
                    </h1>

                    <p className="text-xs sm:text-sm text-slate-600">
                        Chi Nhánh: {franchiseName || "N/A"}
                    </p>
                </div>

                <Button onClick={openCreateModal}>
                    + Thêm danh mục
                </Button>

            </div>

            {/* FILTER */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">

                <div className="flex flex-wrap gap-3">

                    <div className="relative min-w-[220px] flex-1">

                        <input
                            type="text"
                            placeholder="Tìm theo tên hoặc mã..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                            className="w-full rounded-lg border border-slate-300 py-2 px-3 text-sm"
                        />

                    </div>

                    <GlassSelect
                        value={statusFilter}
                        onChange={(v) => setStatusFilter(v)}
                        options={[
                          { value: "", label: "Tất cả trạng thái" },
                          { value: "true", label: "Active" },
                          { value: "false", label: "Inactive" },
                        ]}
                    />

                    <label className="flex items-center gap-2 border px-3 py-2 rounded-lg">

                        <input
                            type="checkbox"
                            checked={isDeletedFilter}
                            onChange={(e) => setIsDeletedFilter(e.target.checked)}
                        />

                        Đã xóa

                    </label>

                    <Button onClick={handleSearch} loading={loading}>
                        Tìm kiếm
                    </Button>

                    <button
                        onClick={handleResetFilters}
                        className="border px-4 py-2 rounded-lg text-sm"
                    >
                        Đặt lại
                    </button>

                </div>

            </div>

            {/* TABLE */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

                <table className="min-w-full divide-y divide-slate-200 text-sm">

                    <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-600">

                        <tr>

                            <th className="px-4 py-3 text-left">Mã</th>
                            <th className="px-4 py-3 text-left">Danh mục</th>
                            <th className="px-4 py-3 text-left">Display Order</th>
                            <th className="px-4 py-3 text-left">Trạng thái</th>
                            <th className="px-4 py-3 text-right">Thao tác</th>

                        </tr>

                    </thead>

                    <tbody className="divide-y divide-slate-200">

                        {loading && (

                            <tr>

                                <td colSpan={5}>

                                    <div className="flex justify-center py-20">

                                        <div className="animate-spin h-10 w-10 border-b-2 border-primary-500 rounded-full"></div>

                                    </div>

                                </td>

                            </tr>

                        )}

                        {!loading && filteredCategories.length === 0 && (

                            <tr>

                                <td colSpan={5} className="text-center py-10 text-slate-400">
                                    Không có danh mục
                                </td>

                            </tr>

                        )}

                        {!loading &&
                            filteredCategories.map((cat) => (

                                <tr
                                    key={cat.id}
                                    className={`hover:bg-slate-50 ${cat.is_deleted ? "opacity-60" : ""}`}
                                >

                                    <td className="px-4 py-3">
                                        {cat.category_code}
                                    </td>

                                    <td className="px-4 py-3 font-medium">
                                        {cat.category_name}
                                    </td>

                                    <td className="px-4 py-3">

                                        {editingId === cat.id ? (

                                            <input
                                                type="number"
                                                value={editingDisplayOrder}
                                                onChange={(e) => setEditingDisplayOrder(Number(e.target.value))}
                                                onBlur={() => handlechangeCategoryDisplayOrder(cat)}
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter") {
                                                        handlechangeCategoryDisplayOrder(cat);
                                                    }
                                                }}
                                                className="w-20 border rounded px-2 py-1 text-sm"
                                                autoFocus
                                            />

                                        ) : (

                                            cat.display_order

                                        )}

                                    </td>

                                    <td className="px-4 py-2">

                                        {cat.is_deleted ? (
                                            <span className="text-red-500 font-medium">Deleted</span>
                                        ) : cat.is_active === true ? (
                                            <span className="text-green-600 font-medium">Active</span>
                                        ) : (
                                            <span className="text-yellow-600 font-medium">Inactive</span>
                                        )}

                                    </td>

                                    <td className="px-4 py-3">
                                        <div className="flex items-center justify-end gap-2">

                                            {/* View */}
                                            <button
                                                onClick={() => setViewingCategory(cat)}
                                                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                                                title="Xem chi tiết"
                                            >
                                                <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                </svg>
                                            </button>

                                            {/* Khi chưa delete */}
                                            {!cat.is_deleted && (
                                                <>
                                                    {/* Change Status */}
                                                    <button
                                                        onClick={() => handleChangeStatus(cat)}
                                                        disabled={submitting}
                                                        className="rounded-lg p-1.5 text-purple-400 hover:bg-purple-50 hover:text-purple-600 transition-colors"
                                                        title="Đổi trạng thái"
                                                    >
                                                        <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                                d="M10 6H6a4 4 0 000 8h4m4-8h4a4 4 0 010 8h-4"
                                                            />
                                                        </svg>
                                                    </button>

                                                    {/* Edit display order */}
                                                    <button
                                                        onClick={() => {
                                                            setEditingId(cat.id);
                                                            setEditingDisplayOrder(cat.display_order);
                                                        }}
                                                        className="rounded-lg p-1.5 text-blue-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                                                        title="Chỉnh sửa display order"
                                                    >
                                                        <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5h2M12 7v10m9-5H3" />
                                                        </svg>
                                                    </button>

                                                    {/* Delete */}
                                                    <button
                                                        onClick={() => handleDelete(cat)}
                                                        disabled={submitting}
                                                        className="rounded-lg p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                                                        title="Xóa"
                                                    >
                                                        <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </button>
                                                </>
                                            )}

                                            {/* Khi đã delete */}
                                            {cat.is_deleted && (
                                                <button
                                                    onClick={() => handleRestore(cat)}
                                                    disabled={submitting}
                                                    className="rounded-lg p-1.5 text-green-400 hover:bg-green-50 hover:text-green-600 transition-colors"
                                                    title="Khôi phục"
                                                >
                                                    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                                        />
                                                    </svg>
                                                </button>
                                            )}

                                        </div>
                                    </td>

                                </tr>

                            ))}

                    </tbody>

                </table>

            </div>
            {/* ─── Detail / View Modal ─────────────────────────────────────────────── */}
            {viewingCategory && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/25" />
                    <div className="relative w-full max-w-md rounded-2xl shadow-2xl" style={{
                        background: "rgba(255, 255, 255, 0.12)",
                        backdropFilter: "blur(40px) saturate(200%)",
                        WebkitBackdropFilter: "blur(40px) saturate(200%)",
                        border: "1px solid rgba(255, 255, 255, 0.25)",
                        boxShadow: "0 25px 60px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)",
                    }}>

                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-white/[0.12] px-6 py-4">
                            <h2 className="text-lg font-semibold text-white/95">
                                Chi tiết danh mục
                            </h2>

                            <button
                                onClick={() => setViewingCategory(null)}
                                className="rounded-lg p-1.5 text-white/40 hover:bg-white/[0.1] hover:text-white transition-colors"
                            >
                                <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                        d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Body */}
                        <div className="space-y-4 px-6 py-5">

                            <div className="grid grid-cols-2 gap-4">

                                <div>
                                    <p className="text-xs font-medium uppercase tracking-wide text-white/50">
                                        Code
                                    </p>
                                    <p className="mt-1 font-mono font-semibold text-white/95">
                                        {viewingCategory.category_code}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-xs font-medium uppercase tracking-wide text-white/50">
                                        Status
                                    </p>

                                    <div className="mt-1">
                                        {viewingCategory.is_deleted ? (
                                            <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
                                                Deleted
                                            </span>
                                        ) : viewingCategory.is_active ? (
                                            <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                                                Active
                                            </span>
                                        ) : (
                                            <span className="rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-700">
                                                Inactive
                                            </span>
                                        )}
                                    </div>
                                </div>

                            </div>

                            <div>
                                <p className="text-xs font-medium uppercase tracking-wide text-white/50">
                                    Category Name
                                </p>
                                <p className="mt-1 text-white/95">
                                    {viewingCategory.category_name}
                                </p>
                            </div>

                            <div>
                                <p className="text-xs font-medium uppercase tracking-wide text-white/50">
                                    Display Order
                                </p>
                                <p className="mt-1 text-white/80">
                                    {viewingCategory.display_order}
                                </p>
                            </div>
                            <div className="grid grid-cols-2 gap-4 border-t border-white/[0.08] pt-3">

                                <div>
                                    <p className="text-xs font-medium uppercase tracking-wide text-white/50">
                                        Created At
                                    </p>
                                    <p className="mt-1 text-sm text-white/80">
                                        {viewingCategory.created_at
                                            ? new Date(viewingCategory.created_at).toLocaleString("vi-VN")
                                            : "-"}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-xs font-medium uppercase tracking-wide text-white/50">
                                        Updated At
                                    </p>
                                    <p className="mt-1 text-sm text-white/80">
                                        {viewingCategory.updated_at
                                            ? new Date(viewingCategory.updated_at).toLocaleString("vi-VN")
                                            : "-"}
                                    </p>
                                </div>

                            </div>

                            <div className="flex justify-end pt-2">
                                <button
                                    onClick={() => setViewingCategory(null)}
                                    className="rounded-lg border border-white/[0.15] px-4 py-2 text-sm font-medium text-white/70 transition hover:bg-white/[0.1] hover:text-white"
                                >
                                    Đóng
                                </button>
                            </div>

                        </div>

                    </div>
                </div>
            )}

            {/* ─── Create Category Franchise Modal ───────────────────────── */}
            {showCreateModal && (

                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/25" />

                    <div className="relative w-full max-w-md rounded-2xl shadow-2xl" style={{
                        background: "rgba(255, 255, 255, 0.12)",
                        backdropFilter: "blur(40px) saturate(200%)",
                        WebkitBackdropFilter: "blur(40px) saturate(200%)",
                        border: "1px solid rgba(255, 255, 255, 0.25)",
                        boxShadow: "0 25px 60px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)",
                    }}>

                        <div className="flex items-center justify-between border-b border-white/[0.12] px-6 py-4">

                            <h2 className="text-lg font-semibold text-white/95">
                                Thêm danh mục vào Franchise
                            </h2>

                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="text-white/40 hover:text-white transition-colors"
                            >
                                ✕
                            </button>

                        </div>

                        <form onSubmit={handleCreateCategoryFranchise} className="space-y-4 px-6 py-5">

                            <div>
                                <label className="text-sm font-medium text-white/80">
                                    Danh mục
                                </label>

                                <select
                                    value={formData.category_id}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            category_id: e.target.value
                                        })
                                    }
                                    className="w-full rounded-lg border border-white/[0.15] bg-white/[0.08] text-white/90 placeholder-white/30 px-3 py-2 text-sm"
                                >

                                    <option value="">-- Chọn danh mục --</option>

                                    {allCategories.map((cat) => (

                                        <option key={cat.value} value={cat.value}>
                                            {cat.code} - {cat.name}
                                        </option>

                                    ))}

                                </select>

                            </div>

                            <div className="flex justify-end gap-2 pt-2">

                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="rounded-lg border border-white/[0.15] px-4 py-2 text-sm text-white/70 hover:bg-white/[0.1] hover:text-white transition"
                                >
                                    Hủy
                                </button>

                                <Button type="submit" loading={submitting}>
                                    Thêm
                                </Button>

                            </div>

                        </form>

                    </div>

                </div>

            )}
        </div>

    );

}
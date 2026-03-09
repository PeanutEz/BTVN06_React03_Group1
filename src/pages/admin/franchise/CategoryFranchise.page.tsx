import { useEffect, useRef, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { Button } from "../../../components";
import Pagination from "../../../components/ui/Pagination";
import { categoryFranchiseService } from "../../../services/category-franchise.service";
import type {
    CategoryFranchiseApiResponse,
    CreateCategoryFranchiseDto,
} from "../../../models/product.model";
import { showSuccess, showError } from "../../../utils";

const ITEMS_PER_PAGE = 10;

export default function CategoryFranchisePage() {
    const { id: franchiseId } = useParams();

    const [categories, setCategories] = useState<CategoryFranchiseApiResponse[]>([]);
    const [loading, setLoading] = useState(false);

    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);

    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [isDeletedFilter, setIsDeletedFilter] = useState(false);

    const [showModal, setShowModal] = useState(false);

    const [formData, setFormData] = useState<CreateCategoryFranchiseDto>({
        franchise_id: franchiseId || "",
        category_id: "",
        display_order: 1,
    });

    const hasRun = useRef(false);

    // ───────────────── load data ─────────────────
    const load = useCallback(
        async (
            page = currentPage,
            status = statusFilter,
            isDeleted = isDeletedFilter,
        ) => {
            if (!franchiseId) return;

            setLoading(true);

            try {
                const isActive = status === "true" ? true : status === "false" ? false : "";

                const result = await categoryFranchiseService.searchCategoryFranchises({
                    searchCondition: {
                        franchise_id: franchiseId,
                        is_active: isActive,
                        is_deleted: isDeleted,
                    },
                    pageInfo: {
                        pageNum: page,
                        pageSize: ITEMS_PER_PAGE,
                    },
                });

                setCategories(result.data);
                setTotalPages(result.pageInfo.totalPages);
                setTotalItems(result.pageInfo.totalItems);
                setCurrentPage(result.pageInfo.pageNum);
            } catch {
                showError("Lấy danh sách category franchise thất bại");
            } finally {
                setLoading(false);
            }
        },
        [franchiseId, currentPage, statusFilter, isDeletedFilter],
    );

    useEffect(() => {
        if (hasRun.current) return;
        hasRun.current = true;

        load(1, "", false);
    }, [load]);

    // ───────────────── handlers ─────────────────
    const handleSearch = () => {
        setCurrentPage(1);
        load(1, statusFilter, isDeletedFilter);
    };

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
        load(page, statusFilter, isDeletedFilter);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            await categoryFranchiseService.createCategoryFranchise(formData);

            showSuccess("Thêm category vào franchise thành công");

            setShowModal(false);

            load(currentPage, statusFilter, isDeletedFilter);
        } catch {
            showError("Tạo category franchise thất bại");
        }
    };

    const handleDelete = async (cat: CategoryFranchiseApiResponse) => {
        if (!confirm(`Xóa category "${cat.category_name}"?`)) return;

        try {
            await categoryFranchiseService.deleteCategoryFranchise(cat.id);

            showSuccess("Đã xóa category");

            load(currentPage, statusFilter, isDeletedFilter);
        } catch {
            showError("Xóa thất bại");
        }
    };

    const handleRestore = async (cat: CategoryFranchiseApiResponse) => {
        try {
            await categoryFranchiseService.restoreCategoryFranchise(cat.id);

            showSuccess("Đã khôi phục");

            load(currentPage, statusFilter, isDeletedFilter);
        } catch {
            showError("Khôi phục thất bại");
        }
    };

    // ───────────────── UI ─────────────────
    return (
        <div className="space-y-6">

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold">Category Franchise</h1>
                    <p className="text-sm text-slate-500">
                        Danh mục của chi nhánh
                        {totalItems > 0 && (
                            <span className="ml-2 text-primary-600 font-medium">
                                ({totalItems})
                            </span>
                        )}
                    </p>
                </div>

                <Button onClick={() => setShowModal(true)}>
                    + Thêm category
                </Button>
            </div>

            {/* Filter */}
            <div className="rounded-xl border bg-white p-4 flex gap-3 flex-wrap">

                <input
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="border rounded-lg px-3 py-2 text-sm"
                />

                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="border rounded-lg px-3 py-2 text-sm"
                >
                    <option value="">All status</option>
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                </select>

                <label className="flex items-center gap-2 text-sm">
                    <input
                        type="checkbox"
                        checked={isDeletedFilter}
                        onChange={(e) => setIsDeletedFilter(e.target.checked)}
                    />
                    Deleted
                </label>

                <Button onClick={handleSearch} loading={loading}>
                    Search
                </Button>
            </div>

            {/* Table */}
            <div className="overflow-hidden rounded-xl border bg-white">

                <table className="min-w-full text-sm">

                    <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-600">
                        <tr>
                            <th className="px-4 py-3">Category</th>
                            <th className="px-4 py-3">Order</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3 text-right">Action</th>
                        </tr>
                    </thead>

                    <tbody>

                        {loading && (
                            <tr>
                                <td colSpan={4} className="py-16 text-center">
                                    Loading...
                                </td>
                            </tr>
                        )}

                        {!loading && categories.length === 0 && (
                            <tr>
                                <td colSpan={4} className="py-10 text-center text-slate-400">
                                    Không có category
                                </td>
                            </tr>
                        )}

                        {!loading &&
                            categories.map((cat) => (
                                <tr key={cat.id} className="border-t hover:bg-slate-50">

                                    <td className="px-4 py-3 font-medium">
                                        {cat.category_name}
                                    </td>

                                    <td className="px-4 py-3">
                                        {cat.display_order}
                                    </td>

                                    <td className="px-4 py-3">
                                        {cat.is_deleted ? (
                                            <span className="text-red-500 text-xs">Deleted</span>
                                        ) : cat.is_active ? (
                                            <span className="text-green-600 text-xs">Active</span>
                                        ) : (
                                            <span className="text-yellow-600 text-xs">Inactive</span>
                                        )}
                                    </td>

                                    <td className="px-4 py-3 text-right space-x-2">

                                        {cat.is_deleted ? (
                                            <button
                                                onClick={() => handleRestore(cat)}
                                                className="text-green-600 text-sm"
                                            >
                                                Restore
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => handleDelete(cat)}
                                                className="text-red-600 text-sm"
                                            >
                                                Delete
                                            </button>
                                        )}

                                    </td>

                                </tr>
                            ))}
                    </tbody>

                </table>

                {totalPages > 1 && (
                    <div className="border-t p-3 flex justify-end">
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={handlePageChange}
                        />
                    </div>
                )}
            </div>

            {/* Modal create */}
            {showModal && (
                <div className="fixed inset-0 flex items-center justify-center bg-black/50">

                    <div className="bg-white p-6 rounded-xl w-96">

                        <h2 className="text-lg font-semibold mb-4">
                            Add Category
                        </h2>

                        <form onSubmit={handleSubmit} className="space-y-3">

                            <input
                                placeholder="Category ID"
                                value={formData.category_id}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        category_id: e.target.value,
                                    })
                                }
                                className="border w-full p-2 rounded"
                                required
                            />

                            <input
                                type="number"
                                placeholder="Display order"
                                value={formData.display_order}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        display_order: Number(e.target.value),
                                    })
                                }
                                className="border w-full p-2 rounded"
                            />

                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="border px-3 py-1 rounded"
                                >
                                    Cancel
                                </button>

                                <Button type="submit">
                                    Create
                                </Button>
                            </div>

                        </form>

                    </div>

                </div>
            )}

        </div>
    );
}
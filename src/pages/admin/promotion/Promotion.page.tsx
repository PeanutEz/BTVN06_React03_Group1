import { useEffect, useState, useCallback, useRef } from "react";
import { Button } from "../../../components";
import Pagination from "../../../components/ui/Pagination";
import { promotionService } from "../../../services/promotion.service";
import { fetchFranchiseSelect } from "../../../services/store.service";
import { adminProductFranchiseService } from "../../../services/product-franchise.service";
import type { FranchiseSelectItem } from "../../../services/store.service";
import type {
    Promotion,
    SearchPromotionDto,
    CreatePromotionDto,
    PromotionType
} from "../../../models/promotion.model";
import { showError, showSuccess } from "../../../utils";

const ITEMS_PER_PAGE = 10;

export default function PromotionPage() {
    const [items, setItems] = useState<Promotion[]>([]);
    const [loading, setLoading] = useState(false);

    const [currentPage, setCurrentPage] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    // filters
    const [searchFranchise, setSearchFranchise] = useState("");
    const [typeFilter, setTypeFilter] = useState<PromotionType | "">("");
    const [statusFilter, setStatusFilter] = useState("");
    const [isDeletedFilter, setIsDeletedFilter] = useState(false);

    const [franchiseOptions, setFranchiseOptions] = useState<
        FranchiseSelectItem[]
    >([]);

    const [productOptions, setProductOptions] = useState<
        { value: string; label: string }[]
    >([]);

    const [franchiseKeyword, setFranchiseKeyword] = useState("");
    const [franchiseComboOpen, setFranchiseComboOpen] = useState(false);
    const franchiseComboRef = useRef<HTMLDivElement>(null);

    const hasRun = useRef(false);
    const isInitialized = useRef(false);

    // create modal
    const [createOpen, setCreateOpen] = useState(false);
    const [viewItem, setViewItem] = useState<Promotion | null>(null);
    const [editItem, setEditItem] = useState<Promotion | null>(null)

    const [editForm, setEditForm] = useState({
        name: "",
        type: "PERCENT" as PromotionType,
        value: 0,
        start_date: "",
        end_date: ""
    })
    const [createForm, setCreateForm] = useState<CreatePromotionDto>({
        name: "",
        franchise_id: "",
        product_franchise_id: "",
        type: "PERCENT",
        value: 0,
        start_date: "",
        end_date: "",
    });

    const resetCreateForm = () => {
        setCreateForm({
            name: "",
            franchise_id: "",
            product_franchise_id: "",
            type: "PERCENT",
            value: 0,
            start_date: "",
            end_date: "",
        });

        setProductOptions([]);
    };

    const loadFranchises = async () => {
        try {
            const data = await fetchFranchiseSelect();
            setFranchiseOptions(data);
        } catch { }
    };

    const load = useCallback(
        async (
            franchiseId = searchFranchise,
            page = currentPage,
            status = statusFilter,
            type = typeFilter,
            isDeleted = isDeletedFilter
        ) => {
            setLoading(true);

            const body: SearchPromotionDto = {
                searchCondition: {
                    franchise_id: franchiseId || undefined,
                    type: type === "" ? undefined : type,
                    is_active:
                        status === "true"
                            ? true
                            : status === "false"
                                ? false
                                : undefined,
                    is_deleted: isDeleted,
                },
                pageInfo: {
                    pageNum: page,
                    pageSize: ITEMS_PER_PAGE,
                },
            };

            try {
                const res = await promotionService.searchPromotions(body);

                setItems(res.data);
                setTotalItems(res.pageInfo.totalItems);
                setTotalPages(res.pageInfo.totalPages);
                setCurrentPage(res.pageInfo.pageNum);
            } catch {
                showError("Không thể tải danh sách promotion");
            } finally {
                setLoading(false);
            }
        },
        []
    );

    useEffect(() => {
        if (hasRun.current) return;
        hasRun.current = true;

        load("", 1, "", "", false).finally(() => {
            isInitialized.current = true;
        });

        loadFranchises();
    }, []);

    useEffect(() => {
        if (!isInitialized.current) return;

        setCurrentPage(1);
        load(searchFranchise, 1, statusFilter, typeFilter, isDeletedFilter);
    }, [searchFranchise, statusFilter, typeFilter, isDeletedFilter]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (
                franchiseComboRef.current &&
                !franchiseComboRef.current.contains(e.target as Node)
            ) {
                setFranchiseComboOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () =>
            document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
        load(searchFranchise, page, statusFilter, typeFilter, isDeletedFilter);
    };

    const handleResetFilters = () => {
        setSearchFranchise("");
        setFranchiseKeyword("");
        setStatusFilter("");
        setTypeFilter("");
        setIsDeletedFilter(false);
        setCurrentPage(1);
        load("", 1, "", "", false);
    };

    const handleDelete = async (p: Promotion) => {
        if (!confirm("Bạn có chắc muốn xóa promotion?")) return;

        try {
            await promotionService.deletePromotion(p.id);
            showSuccess("Đã xóa promotion");
            load(searchFranchise, currentPage, statusFilter, typeFilter, isDeletedFilter);
        } catch {
            showError("Xóa thất bại");
        }
    };

    const handleRestore = async (p: Promotion) => {

        console.log("PROMOTION CLICKED:", p)

        if (!confirm("Bạn có chắc muốn khôi phục promotion này?")) return

        try {

            console.log("RESTORE PROMOTION ID:", p.id)

            const res = await promotionService.restorePromotion(p.id)

            console.log("RESTORE RESPONSE:", res)

            showSuccess("Khôi phục promotion thành công")

            load(
                searchFranchise,
                currentPage,
                statusFilter,
                typeFilter,
                isDeletedFilter
            )

        } catch (error) {

            console.error("RESTORE ERROR:", error)

            showError("Khôi phục promotion thất bại")

        }
    }

    const handleCreateSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            const payload: CreatePromotionDto = {
                ...createForm,
                start_date: new Date(createForm.start_date).toISOString(),
                end_date: new Date(createForm.end_date).toISOString(),
            };
            await promotionService.createPromotion(payload);

            showSuccess("Tạo promotion thành công");

            setCreateForm({
                name: "",
                franchise_id: "",
                product_franchise_id: "",
                type: "PERCENT",
                value: 0,
                start_date: "",
                end_date: "",
            });

            setProductOptions([]);

            setCreateOpen(false);

            load("", 1, "", "", false);
        } catch {
            showError("Tạo promotion thất bại");
        }
    };

    const handleUpdateSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!editItem) return

        try {

            const payload = {
                name: editForm.name,
                type: editForm.type,
                value: editForm.value,
                start_date: new Date(editForm.start_date).toISOString(),
                end_date: new Date(editForm.end_date).toISOString()
            }

            await promotionService.updatePromotion(editItem.id, payload)

            showSuccess("Cập nhật promotion thành công")

            setEditItem(null)

            load(searchFranchise, currentPage, statusFilter, typeFilter, isDeletedFilter)

        } catch {
            showError("Cập nhật promotion thất bại")
        }
    }

    const formatDiscount = (p: Promotion) => {
        if (p.type === "PERCENT") return `${p.value}%`;
        return `${p.value.toLocaleString()}đ`;
    };

    const filteredFranchiseOptions = franchiseOptions.filter((f) =>
        f.name.toLowerCase().includes(franchiseKeyword.toLowerCase())
    );

    return (
        <div className="space-y-6">
            {/* HEADER */}
            <div className="flex justify-between items-start">

                <div>
                    <h1 className="text-xl font-bold">Promotion Management</h1>
                    <p className="text-sm text-slate-500">
                        Quản lý khuyến mãi toàn hệ thống
                    </p>
                </div>

                <Button
                    onClick={() => {
                        resetCreateForm();
                        setCreateOpen(true);
                    }}
                >
                    + Thêm Khuyến Mãi
                </Button>

            </div>

            {/* FILTER */}
            <div className="bg-white border rounded-xl p-4 flex gap-3 flex-wrap">
                <div ref={franchiseComboRef} className="relative min-w-[180px] flex-1">
                    <input
                        placeholder="Search franchise..."
                        value={franchiseKeyword}
                        onChange={(e) => {
                            setFranchiseKeyword(e.target.value);
                            setSearchFranchise("");
                            setFranchiseComboOpen(true);
                        }}
                        className="w-full border rounded-lg px-3 py-2 text-sm"
                    />

                    {franchiseComboOpen && (
                        <div className="absolute z-20 bg-white border rounded-lg w-full mt-1 max-h-48 overflow-y-auto">
                            <div
                                className="px-3 py-2 hover:bg-slate-100 cursor-pointer text-slate-400"
                                onMouseDown={() => {
                                    setSearchFranchise("");
                                    setFranchiseKeyword("");
                                    setFranchiseComboOpen(false);
                                }}
                            >
                                All franchise
                            </div>

                            {filteredFranchiseOptions.map((f) => (
                                <div
                                    key={f.value}
                                    onMouseDown={() => {
                                        setSearchFranchise(f.value);
                                        setFranchiseKeyword(f.name);
                                        setFranchiseComboOpen(false);
                                    }}
                                    className="px-3 py-2 hover:bg-slate-100 cursor-pointer"
                                >
                                    {f.name}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="border rounded-lg px-3 py-2 text-sm"
                >
                    <option value="">All Status</option>
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                </select>

                {/* TYPE FILTER ⭐ */}

                <select
                    value={typeFilter}
                    onChange={(e) =>
                        setTypeFilter(e.target.value as PromotionType | "")
                    }
                    className="border rounded-lg px-3 py-2 text-sm"
                >
                    <option value="">All Type</option>
                    <option value="PERCENT">Percent</option>
                    <option value="FIXED">Fixed</option>
                </select>

                <label className="flex items-center gap-2 border rounded-lg px-3 py-2 text-sm">
                    <input
                        type="checkbox"
                        checked={isDeletedFilter}
                        onChange={(e) => setIsDeletedFilter(e.target.checked)}
                    />
                    Đã xóa
                </label>

                <button
                    onClick={handleResetFilters}
                    className="border rounded-lg px-3 py-2 text-sm hover:bg-slate-100"
                >
                    Đặt lại
                </button>
            </div>

            {/* TABLE */}
            <div className="bg-white border rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-slate-100">
                        <tr>
                            <th className="px-4 py-3 text-left">Chi Nhánh</th>
                            <th className="px-4 py-3 text-left">Loại Giảm</th>
                            <th className="px-4 py-3 text-left">Giá Trị</th>
                            <th className="px-4 py-3 text-left">Ngày bắt đầu</th>
                            <th className="px-4 py-3 text-left">Ngày kết thúc</th>
                            <th className="px-4 py-3 text-left">Trạng Thái</th>
                            <th className="px-4 py-3 text-right">Thao Tác</th>
                        </tr>
                    </thead>

                    <tbody>
                        {!loading &&
                            items.map((p) => (
                                <tr key={p.id} className="border-t">
                                    <td className="px-4 py-3">{p.franchise_name}</td>

                                    <td className="px-4 py-3">
                                        {p.type === "PERCENT" ? "Percent" : "Fixed"}
                                    </td>

                                    <td className="px-4 py-3 text-green-600 font-semibold">
                                        {formatDiscount(p)}
                                    </td>

                                    <td className="px-4 py-3">
                                        {new Date(p.start_date).toLocaleDateString()}
                                    </td>

                                    <td className="px-4 py-3">
                                        {new Date(p.end_date).toLocaleDateString()}
                                    </td>

                                    <td className="px-4 py-3">
                                        {p.is_deleted ? (
                                            <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs">
                                                Deleted
                                            </span>
                                        ) : p.is_active ? (
                                            <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs">
                                                Active
                                            </span>
                                        ) : (
                                            <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs">
                                                Inactive
                                            </span>
                                        )}
                                    </td>

                                    <td className="px-4 py-3">
                                        <div className="flex items-center justify-end gap-2">

                                            {/* VIEW */}
                                            <button
                                                onClick={() => setViewItem(p)}
                                                className="inline-flex items-center justify-center size-8 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 transition"
                                                title="Xem"
                                            >
                                                <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                        d="M2.458 12C3.732 7.943 7.523 5 12 5
          c4.478 0 8.268 2.943 9.542 7
          -1.274 4.057-5.064 7-9.542 7
          -4.477 0-8.268-2.943-9.542-7z"/>
                                                </svg>
                                            </button>

                                            {/* EDIT */}
                                            {!p.is_deleted && (
                                                <button
                                                    onClick={() => {
                                                        setEditItem(p)

                                                        setEditForm({
                                                            name: p.name,
                                                            type: p.type,
                                                            value: p.value,
                                                            start_date: p.start_date.slice(0, 16),
                                                            end_date: p.end_date.slice(0, 16)
                                                        })
                                                    }}
                                                    className="inline-flex items-center justify-center size-8 rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50 transition"
                                                    title="Chỉnh sửa"
                                                >
                                                    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                            d="M11 5h2m-1-1v2m-7 7h2m-1-1v2
            m8-8l3 3m0 0l-9 9H6v-3l9-9z"/>
                                                    </svg>
                                                </button>
                                            )}

                                            {/* DELETE / RESTORE */}
                                            {p.is_deleted ? (
                                                <button
                                                    onClick={() => handleRestore(p)}
                                                    className="inline-flex items-center justify-center size-8 rounded-lg border border-green-200 text-green-600 hover:bg-green-50 transition"
                                                    title="Khôi phục"
                                                >
                                                    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                            d="M4 4v5h.582m15.356 2A8.001 8.001 0
            004.582 9m0 0H9m11 11v-5h-.581
            m0 0a8.003 8.003 0 01-15.357-2
            m15.357 2H15"/>
                                                    </svg>
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => handleDelete(p)}
                                                    className="inline-flex items-center justify-center size-8 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition"
                                                    title="Xóa"
                                                >
                                                    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                            d="M19 7l-.867 12.142A2 2 0
            0116.138 21H7.862a2 2 0
            01-1.995-1.858L5 7m5
            4v6m4-6v6m1-10V4a1 1
            0 00-1-1h-4a1 1 0
            00-1 1v3M4 7h16"/>
                                                    </svg>
                                                </button>
                                            )}

                                        </div>
                                    </td>
                                </tr>
                            ))}

                        {items.length === 0 && !loading && (
                            <tr>
                                <td colSpan={6} className="text-center py-6 text-slate-500">
                                    Không có promotion
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>

                <div className="px-4">
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={handlePageChange}
                        totalItems={totalItems}
                        itemsPerPage={ITEMS_PER_PAGE}
                    />
                </div>
            </div>
            {/* CREATE MODAL */}
            {createOpen && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl w-[500px] p-6 space-y-4">
                        <h2 className="text-lg font-bold">Create Promotion</h2>

                        <form onSubmit={handleCreateSubmit} className="space-y-3">

                            {/* NAME */}
                            <input
                                type="text"
                                placeholder="Tên khuyến mãi"
                                value={createForm.name}
                                onChange={(e) =>
                                    setCreateForm({ ...createForm, name: e.target.value })
                                }
                                className="w-full border rounded-lg px-3 py-2"
                                required
                            />

                            {/* FRANCHISE */}
                            <select
                                value={createForm.franchise_id}
                                onChange={async (e) => {

                                    const franchiseId = e.target.value;

                                    setCreateForm({
                                        ...createForm,
                                        franchise_id: franchiseId,
                                        product_franchise_id: ""
                                    });

                                    if (!franchiseId) {
                                        setProductOptions([]);
                                        return;
                                    }

                                    try {

                                        const products =
                                            await adminProductFranchiseService.getProductsByFranchise(franchiseId);

                                        const options = products.map((p) => ({
                                            value: p.id,
                                            label: `${p.product_name} (${p.size})`
                                        }));

                                        setProductOptions(options);

                                    } catch {
                                        showError("Không tải được product");
                                    }

                                }}
                                className="w-full border rounded-lg px-3 py-2"
                            >
                                <option value="">Chọn Chi Nhánh</option>

                                {franchiseOptions.map((f) => (
                                    <option key={f.value} value={f.value}>
                                        {f.name}
                                    </option>
                                ))}
                            </select>

                            {/* PRODUCT - chỉ hiện khi đã chọn franchise */}
                            {createForm.franchise_id && (

                                <select
                                    value={createForm.product_franchise_id}
                                    onChange={(e) =>
                                        setCreateForm({
                                            ...createForm,
                                            product_franchise_id: e.target.value
                                        })
                                    }
                                    className="w-full border rounded-lg px-3 py-2"
                                >
                                    <option value="">Tất Cả Sản Phẩm</option>

                                    {productOptions.map((p) => (
                                        <option key={p.value} value={p.value}>
                                            {p.label}
                                        </option>
                                    ))}

                                </select>

                            )}

                            {/* TYPE */}
                            <div className="space-y-1">

                                <label className="text-sm font-medium text-slate-600">
                                    Loại mã
                                </label>

                                <select
                                    value={createForm.type}
                                    onChange={(e) =>
                                        setCreateForm({
                                            ...createForm,
                                            type: e.target.value as PromotionType,
                                        })
                                    }
                                    className="w-full border rounded-lg px-3 py-2"
                                >
                                    <option value="PERCENT">Percent (%)</option>
                                    <option value="FIXED">Fixed (VND)</option>
                                </select>

                            </div>

                            {/* VALUE */}
                            <div className="space-y-1">

                                <label className="text-sm font-medium text-slate-600">
                                    Giá trị
                                </label>

                                <div className="relative">
                                    <input
                                        type="number"
                                        value={createForm.value}
                                        onChange={(e) =>
                                            setCreateForm({
                                                ...createForm,
                                                value: Number(e.target.value),
                                            })
                                        }
                                        className="w-full border rounded-lg px-3 py-2 pr-14"
                                        required
                                    />

                                    <span className="absolute right-3 top-2 text-gray-400 text-sm">
                                        {createForm.type === "PERCENT" ? "%" : "VND"}
                                    </span>
                                </div>

                            </div>

                            {/* START DATE */}
                            <div className="space-y-1">

                                <label className="text-sm font-medium text-slate-600">
                                    Ngày bắt đầu
                                </label>
                                <input
                                    type="datetime-local"
                                    value={createForm.start_date}
                                    onChange={(e) =>
                                        setCreateForm({
                                            ...createForm,
                                            start_date: e.target.value,
                                        })
                                    }
                                    className="w-full border rounded-lg px-3 py-2"
                                    required
                                />

                            </div>

                            {/* END DATE */}
                            <div className="space-y-1">

                                <label className="text-sm font-medium text-slate-600">
                                    Ngày kết thúc
                                </label>

                                <input
                                    type="datetime-local"
                                    value={createForm.end_date}
                                    onChange={(e) =>
                                        setCreateForm({
                                            ...createForm,
                                            end_date: e.target.value,
                                        })
                                    }
                                    className="w-full border rounded-lg px-3 py-2"
                                    required
                                />

                            </div>

                            {/* BUTTONS */}
                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        resetCreateForm();
                                        setCreateOpen(false);
                                    }}
                                    className="px-4 py-2 border rounded-lg"
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg"
                                >
                                    Create
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {viewItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">

                        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                            <h2 className="text-lg font-semibold text-slate-900">
                                Chi tiết Promotion
                            </h2>

                            <button
                                onClick={() => setViewItem(null)}
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                            >
                                <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                        d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="space-y-4 px-6 py-5">

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                                        Tên Promotion
                                    </p>
                                    <p className="mt-1 font-semibold text-slate-800">
                                        {viewItem.name}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                                        Chi Nhánh
                                    </p>
                                    <p className="mt-1 text-slate-800">
                                        {viewItem.franchise_name}
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">

                                <div>
                                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                                        Loại giảm
                                    </p>
                                    <p className="mt-1 text-lg font-semibold text-slate-900">
                                        {viewItem.type === "PERCENT" ? "Percent" : "Fixed"}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                                        Giá trị
                                    </p>
                                    <p className="mt-1 text-2xl font-bold text-green-600">
                                        {formatDiscount(viewItem)}
                                    </p>
                                </div>

                            </div>

                            <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-3">

                                <div>
                                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                                        Ngày bắt đầu
                                    </p>
                                    <p className="mt-1 text-sm text-slate-700">
                                        {new Date(viewItem.start_date).toLocaleString("vi-VN")}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                                        Ngày kết thúc
                                    </p>
                                    <p className="mt-1 text-sm text-slate-700">
                                        {new Date(viewItem.end_date).toLocaleString("vi-VN")}
                                    </p>
                                </div>

                            </div>

                            <div>
                                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                                    Trạng thái
                                </p>

                                <div className="mt-1">

                                    {viewItem.is_deleted ? (
                                        <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
                                            Deleted
                                        </span>
                                    ) : viewItem.is_active ? (
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

                            <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-3">

                                <div>
                                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                                        Ngày tạo
                                    </p>
                                    <p className="mt-1 text-sm text-slate-700">
                                        {new Date(viewItem.created_at).toLocaleString("vi-VN")}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                                        Ngày cập nhật
                                    </p>
                                    <p className="mt-1 text-sm text-slate-700">
                                        {new Date(viewItem.updated_at).toLocaleString("vi-VN")}
                                    </p>
                                </div>

                            </div>

                            <div className="flex justify-end pt-2">
                                <button
                                    onClick={() => setViewItem(null)}
                                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                                >
                                    Đóng
                                </button>
                            </div>

                        </div>
                    </div>
                </div>
            )}
            {editItem && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">

                    <div className="bg-white rounded-xl w-[500px] p-6 space-y-4">

                        <h2 className="text-lg font-bold">
                            Chỉnh sửa khuyến mãi
                        </h2>

                        <form onSubmit={handleUpdateSubmit} className="space-y-3">

                            {/* NAME */}

                            <div className="space-y-1">
                                <label className="text-sm font-medium text-slate-600">
                                    Tên
                                </label>

                                <input
                                    type="text"
                                    value={editForm.name}
                                    onChange={(e) =>
                                        setEditForm({ ...editForm, name: e.target.value })
                                    }
                                    className="w-full border rounded-lg px-3 py-2"
                                    required
                                />
                            </div>

                            {/* TYPE */}

                            <div className="space-y-1">
                                <label className="text-sm font-medium text-slate-600">
                                    Loại giảm
                                </label>

                                <select
                                    value={editForm.type}
                                    onChange={(e) =>
                                        setEditForm({
                                            ...editForm,
                                            type: e.target.value as PromotionType
                                        })
                                    }
                                    className="w-full border rounded-lg px-3 py-2"
                                >
                                    <option value="PERCENT">Percent</option>
                                    <option value="FIXED">Fixed</option>
                                </select>
                            </div>

                            {/* VALUE */}

                            <div className="space-y-1">
                                <label className="text-sm font-medium text-slate-600">
                                    Giá Trị
                                </label>

                                <div className="relative">
                                    <input
                                        type="number"
                                        value={editForm.value}
                                        onChange={(e) =>
                                            setEditForm({
                                                ...editForm,
                                                value: Number(e.target.value)
                                            })
                                        }
                                        className="w-full border rounded-lg px-3 py-2 pr-14"
                                        required
                                    />

                                    <span className="absolute right-3 top-2 text-gray-400 text-sm">
                                        {editForm.type === "PERCENT" ? "%" : "VND"}
                                    </span>
                                </div>
                            </div>

                            {/* START DATE */}

                            <div className="space-y-1">
                                <label className="text-sm font-medium text-slate-600">
                                    Ngày bắt đầu
                                </label>

                                <input
                                    type="datetime-local"
                                    value={editForm.start_date}
                                    onChange={(e) =>
                                        setEditForm({
                                            ...editForm,
                                            start_date: e.target.value
                                        })
                                    }
                                    className="w-full border rounded-lg px-3 py-2"
                                    required
                                />
                            </div>

                            {/* END DATE */}

                            <div className="space-y-1">
                                <label className="text-sm font-medium text-slate-600">
                                    Ngày kết thúc
                                </label>

                                <input
                                    type="datetime-local"
                                    value={editForm.end_date}
                                    onChange={(e) =>
                                        setEditForm({
                                            ...editForm,
                                            end_date: e.target.value
                                        })
                                    }
                                    className="w-full border rounded-lg px-3 py-2"
                                    required
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-2">

                                <button
                                    type="button"
                                    onClick={() => setEditItem(null)}
                                    className="px-4 py-2 border rounded-lg"
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg"
                                >
                                    Update
                                </button>

                            </div>

                        </form>

                    </div>

                </div>
            )}
        </div>
    );
}
import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import ReactDOM from "react-dom";
import { Button } from "../../../components";
import { TimeSelect } from "../../../components/ui/TimeSelect";
import Pagination from "../../../components/ui/Pagination";
import { promotionService } from "../../../services/promotion.service";
import { fetchFranchiseSelect } from "../../../services/store.service";
import { adminProductFranchiseService } from "../../../services/product-franchise.service";
import { DateInput } from "../../../components/ui/DateInput";
import type { FranchiseSelectItem } from "../../../services/store.service";
import type {
    Promotion,
    SearchPromotionDto,
    CreatePromotionDto,
    PromotionType
} from "../../../models/promotion.model";
import { showError, showSuccess } from "../../../utils";
import { useManagerFranchiseId } from "../../../hooks/useManagerFranchiseId";

const ITEMS_PER_PAGE = 10;

export default function PromotionPage() {
    const managerFranchiseId = useManagerFranchiseId();
    const [items, setItems] = useState<Promotion[]>([]);
    const [loading, setLoading] = useState(false);

    const [currentPage, setCurrentPage] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    // filters
    const [searchFranchise, setSearchFranchise] = useState(managerFranchiseId ?? "");
    const [typeFilter, setTypeFilter] = useState<PromotionType | "">("");
    const [statusFilter, setStatusFilter] = useState("");
    const [isDeletedFilter, setIsDeletedFilter] = useState(false);

    const [franchiseOptions, setFranchiseOptions] = useState<
        FranchiseSelectItem[]
    >([]);

    const [productOptions, setProductOptions] = useState<
        { value: string; label: string }[]
    >([]);    const [franchiseKeyword, setFranchiseKeyword] = useState("");
    const [franchiseComboOpen, setFranchiseComboOpen] = useState(false);
    const franchiseComboRef = useRef<HTMLDivElement>(null);    // create modal franchise combobox
    const [createFranchiseOpen, setCreateFranchiseOpen] = useState(false);
    const [createFranchiseKeyword, setCreateFranchiseKeyword] = useState("");    // portal refs for create modal franchise dropdown
    const createFranchiseTriggerRef = useRef<HTMLButtonElement>(null);
    const createFranchiseDropdownRef = useRef<HTMLDivElement>(null);
    const [createFranchiseRect, setCreateFranchiseRect] = useState<DOMRect | null>(null);

    const openCreateFranchise = useCallback(() => {
        if (createFranchiseTriggerRef.current)
            setCreateFranchiseRect(createFranchiseTriggerRef.current.getBoundingClientRect());
        setCreateFranchiseOpen(true);
    }, []);
    const closeCreateFranchise = useCallback(() => { setCreateFranchiseOpen(false); setCreateFranchiseKeyword(""); }, []);

    // franchise name map for display
    const franchiseNameMap = franchiseOptions.reduce<Record<string, string>>((acc, f) => {
        acc[f.value] = `${f.name} (${f.code})`;
        return acc;
    }, {});

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
        franchise_id: managerFranchiseId ?? "",
        product_franchise_id: "",
        type: "PERCENT",
        value: 0,
        start_date: "",
        end_date: "",
    });

    const resetCreateForm = () => {
        setCreateForm({
            name: "",
            franchise_id: managerFranchiseId ?? "",
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
    );    useEffect(() => {
        if (hasRun.current) return;
        hasRun.current = true;

        const initFranchise = managerFranchiseId ?? "";
        if (initFranchise) setSearchFranchise(initFranchise);
        load(initFranchise, 1, "", "", false).finally(() => {
            isInitialized.current = true;
        });

        loadFranchises();
    }, []);

    // Sync khi managerFranchiseId thay đổi (store hydrate muộn)
    useEffect(() => {
        if (!managerFranchiseId) return;
        setSearchFranchise(managerFranchiseId);
    }, [managerFranchiseId]);

    // Sync franchiseKeyword khi options load xong và đang là manager
    useEffect(() => {
        if (!managerFranchiseId || !franchiseOptions.length) return;
        const found = franchiseOptions.find(f => f.value === managerFranchiseId);
        if (found) setFranchiseKeyword(`${found.name} (${found.code})`);
    }, [managerFranchiseId, franchiseOptions]);

    useEffect(() => {
        if (!isInitialized.current) return;

        setCurrentPage(1);
        load(searchFranchise, 1, statusFilter, typeFilter, isDeletedFilter);
    }, [searchFranchise, statusFilter, typeFilter, isDeletedFilter]);useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (franchiseComboRef.current && !franchiseComboRef.current.contains(e.target as Node))
                setFranchiseComboOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // click-outside for create franchise portal dropdown
    useEffect(() => {
        if (!createFranchiseOpen) return;
        const handler = (e: MouseEvent) => {
            const t = e.target as Node;
            if (!createFranchiseTriggerRef.current?.contains(t) && !createFranchiseDropdownRef.current?.contains(t))
                closeCreateFranchise();
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [createFranchiseOpen, closeCreateFranchise]);

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
        load(searchFranchise, page, statusFilter, typeFilter, isDeletedFilter);
    };    const handleDelete= async (p: Promotion) => {
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
            await promotionService.createPromotion(payload);            showSuccess("Tạo promotion thành công");

            setCreateForm({
                name: "",
                franchise_id: managerFranchiseId ?? searchFranchise,
                product_franchise_id: "",
                type: "PERCENT",
                value: 0,
                start_date: "",
                end_date: "",
            });

            setProductOptions([]);

            setCreateOpen(false);

            load(searchFranchise, 1, statusFilter, typeFilter, isDeletedFilter);
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
    }    // helpers: split datetime string
    const getDatePart = (dt: string) => dt ? dt.substring(0, 10) : "";
    const getTimePart = (dt: string) => dt ? dt.substring(11, 16) : "";
    const mergeDatetime = (date: string, time: string) =>
        date ? `${date}T${time || "00:00"}` : "";    const handleCreateDatetime= (field: "start_date" | "end_date", part: "date" | "time", val: string) => {
        setCreateForm((prev) => {
            const date = part === "date" ? val : getDatePart(prev[field]);
            const time = part === "time" ? val : (getTimePart(prev[field]) || "00:00");
            return { ...prev, [field]: mergeDatetime(date, time) };
        });
    };

    const handleEditDatetime = (field: "start_date" | "end_date", part: "date" | "time", val: string) => {
        setEditForm((prev) => {
            const date = part === "date" ? val : getDatePart(prev[field]);
            const time = part === "time" ? val : (getTimePart(prev[field]) || "00:00");
            return { ...prev, [field]: mergeDatetime(date, time) };
        });
    };

    const formatDiscount = (p: Promotion) => {
        if (p.type === "PERCENT") return `${p.value}%`;
        return `${p.value.toLocaleString()}đ`;
    };    const filteredFranchiseOptions = franchiseOptions.filter((f) =>
        f.name.toLowerCase().includes(franchiseKeyword.toLowerCase()) ||
        (f.code || "").toLowerCase().includes(franchiseKeyword.toLowerCase())
    );

    const filteredCreateFranchiseOptions = useMemo(() =>
        franchiseOptions.filter((f) =>
            f.name.toLowerCase().includes(createFranchiseKeyword.toLowerCase()) ||
            (f.code || "").toLowerCase().includes(createFranchiseKeyword.toLowerCase())
        ),
        [franchiseOptions, createFranchiseKeyword]
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
                    onClick={async () => {
                        resetCreateForm();
                        setCreateOpen(true);
                        if (managerFranchiseId) {
                            try {
                                const products = await adminProductFranchiseService.getProductsByFranchise(managerFranchiseId);
                                setProductOptions(products.map((p) => ({ value: p.id, label: `${p.product_name} (${p.size})` })));
                            } catch { /* ignore */ }
                        }
                    }}
                >
                    + Thêm Khuyến Mãi
                </Button>

            </div>            {/* FILTER */}
            <div className="relative z-20 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap gap-3">                    {/* Franchise custom combobox */}
                    <div className="relative min-w-[200px] flex-1" ref={franchiseComboRef}>
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Franchise
                        </label>
                        {managerFranchiseId ? (
                            <div className="flex w-full items-center justify-between rounded-lg border border-primary-500/50 bg-primary-500/10 px-3 py-2 text-sm text-white cursor-not-allowed">
                                <span className="truncate font-medium">
                                    {searchFranchise ? (franchiseNameMap[searchFranchise] || searchFranchise) : "-- Tất cả --"}
                                </span>
                                <svg className="ml-2 size-4 flex-shrink-0 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={() => setFranchiseComboOpen((o) => !o)}
                                className="flex w-full items-center justify-between rounded-lg border border-white/[0.15] bg-slate-800 px-3 py-2 text-left text-sm text-white/90 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                            >
                                <span className="truncate">
                                    {searchFranchise ? (franchiseNameMap[searchFranchise] || franchiseKeyword) : "-- Tất cả --"}
                                </span>
                                <svg className="ml-2 size-4 flex-shrink-0 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>
                        )}
                        {franchiseComboOpen && (
                            <div className="absolute left-0 right-0 z-50 mt-1 rounded-lg border border-white/[0.15] bg-slate-800 shadow-lg">
                                <div className="border-b border-white/[0.12] px-3 py-2">
                                    <input
                                        autoFocus
                                        value={franchiseKeyword}
                                        onChange={(e) => setFranchiseKeyword(e.target.value)}
                                        placeholder="Tìm theo tên hoặc mã..."
                                        className="w-full rounded-md border border-white/[0.15] bg-white/[0.08] text-white/90 placeholder-white/40 px-2.5 py-1.5 text-xs outline-none transition focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30"
                                    />
                                </div>
                                <div className="max-h-56 overflow-y-auto py-1">
                                    <button
                                        type="button"
                                        onMouseDown={() => {
                                            setSearchFranchise("");
                                            setFranchiseKeyword("");
                                            setFranchiseComboOpen(false);
                                        }}
                                        className={`flex w-full items-center px-3 py-2 text-left text-xs font-semibold ${!searchFranchise ? "bg-white/[0.12] text-white" : "text-white/60 hover:bg-white/[0.08]"}`}
                                    >
                                        -- Tất cả --
                                    </button>
                                    {filteredFranchiseOptions.map((f) => (
                                        <button
                                            key={f.value}
                                            type="button"
                                            onMouseDown={() => {
                                                setSearchFranchise(f.value);
                                                setFranchiseKeyword("");
                                                setFranchiseComboOpen(false);
                                            }}
                                            className={`flex w-full items-center px-3 py-2 text-left text-xs ${searchFranchise === f.value ? "bg-white/[0.12] text-white" : "text-white/80 hover:bg-white/[0.08]"}`}
                                        >
                                            <span className="truncate">{f.name} ({f.code})</span>
                                        </button>
                                    ))}
                                    {filteredFranchiseOptions.length === 0 && (
                                        <div className="px-3 py-2 text-xs text-white/40">Không tìm thấy franchise</div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Status */}
                    <div className="min-w-[130px]">
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Trạng thái
                        </label>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="w-full rounded-lg border border-white/[0.15] bg-slate-800 px-3 py-2 text-sm text-white/90 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 [&>option]:bg-slate-900 [&>option]:text-white appearance-none"
                            style={{ colorScheme: "dark" }}
                        >
                            <option value="">-- Tất cả --</option>
                            <option value="true">Active</option>
                            <option value="false">Inactive</option>
                        </select>
                    </div>

                    {/* Type */}
                    <div className="min-w-[130px]">
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Loại
                        </label>
                        <select
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value as PromotionType | "")}
                            className="w-full rounded-lg border border-white/[0.15] bg-slate-800 px-3 py-2 text-sm text-white/90 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 [&>option]:bg-slate-900 [&>option]:text-white appearance-none"
                            style={{ colorScheme: "dark" }}
                        >
                            <option value="">-- Tất cả --</option>
                            <option value="PERCENT">Percent</option>
                            <option value="FIXED">Fixed</option>
                        </select>
                    </div>

                    {/* Đã xóa */}
                    <div className="flex flex-col justify-end">
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 invisible">
                            &nbsp;
                        </label>                        <label className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer transition-colors select-none ${isDeletedFilter ? "border-red-400 bg-red-900/40 text-red-300" : "border-white/[0.15] bg-slate-800 text-white/60 hover:bg-slate-700"}`}>
                            <input
                                type="checkbox"
                                checked={isDeletedFilter}
                                onChange={(e) => setIsDeletedFilter(e.target.checked)}
                                className="accent-red-500"
                            />
                            <span className="font-medium">Đã xóa</span>
                        </label>
                    </div>                </div>
            </div>

            {/* TABLE */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
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
                                        </td>                                        <td className="px-4 py-3 whitespace-nowrap text-xs">
                                            <div className="font-medium text-slate-700">
                                                {new Date(p.start_date).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })}
                                            </div>
                                            <div className="text-slate-400">
                                                {new Date(p.start_date).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", hour12: false })}
                                            </div>
                                        </td>

                                        <td className="px-4 py-3 whitespace-nowrap text-xs">
                                            <div className="font-medium text-slate-700">
                                                {new Date(p.end_date).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })}
                                            </div>
                                            <div className="text-slate-400">
                                                {new Date(p.end_date).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", hour12: false })}
                                            </div>
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
                </div>
            </div>
            <div className="px-4">
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                    totalItems={totalItems}
                    itemsPerPage={ITEMS_PER_PAGE}
                />
            </div>            {/* CREATE MODAL */}            {createOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40" onClick={() => { resetCreateForm(); setCreateOpen(false); }} />
                    <div className="relative w-full max-w-lg rounded-2xl p-6 shadow-2xl overflow-visible" style={{
                        background: "rgba(255,255,255,0.10)",
                        backdropFilter: "blur(40px) saturate(200%)",
                        WebkitBackdropFilter: "blur(40px) saturate(200%)",
                        border: "1px solid rgba(255,255,255,0.22)",
                        boxShadow: "0 25px 60px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.18)",
                    }}>
                        <div className="mb-5 flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-bold text-white/95">Tạo Promotion</h2>
                                <p className="text-xs text-white/50">Điền thông tin khuyến mãi mới</p>
                            </div>
                            <button type="button" onClick={() => { resetCreateForm(); setCreateOpen(false); }}
                                className="rounded-lg p-1.5 text-white/40 transition hover:bg-white/[0.1] hover:text-white/80">
                                <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>                        <form onSubmit={handleCreateSubmit} className="space-y-3 overflow-visible">

                            {/* NAME */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold uppercase tracking-wide text-white/50">Tên khuyến mãi <span className="text-red-400">*</span></label>
                                <input
                                    type="text"
                                    placeholder="VD: Giảm 20% tháng 3"
                                    value={createForm.name}
                                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                                    className="w-full rounded-lg border border-white/[0.15] bg-white/[0.08] px-3 py-2 text-sm text-white/90 placeholder-white/30 outline-none focus:border-white/40 focus:ring-2 focus:ring-white/20"
                                    required
                                />
                            </div>                            {/* FRANCHISE */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold uppercase tracking-wide text-white/50">Chi nhánh <span className="text-red-400">*</span></label>
                                <div className="relative">
                                    <button
                                        ref={createFranchiseTriggerRef}
                                        type="button"
                                        disabled={!!managerFranchiseId}
                                        onClick={() => createFranchiseOpen ? closeCreateFranchise() : openCreateFranchise()}
                                        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "8px 12px", background: "#1e293b", border: "1px solid #475569", borderRadius: 8, color: "#f1f5f9", fontSize: 14, cursor: managerFranchiseId ? "not-allowed" : "pointer", outline: "none", opacity: managerFranchiseId ? 0.7 : 1 }}
                                    >
                                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: createForm.franchise_id ? "#f1f5f9" : "#94a3b8" }}>
                                            {createForm.franchise_id
                                                ? (franchiseOptions.find(f => f.value === createForm.franchise_id)?.name || createForm.franchise_id)
                                                : "-- Chọn chi nhánh --"}
                                        </span>
                                        <svg style={{ width: 16, height: 16, flexShrink: 0, marginLeft: 8, color: "#94a3b8", transform: createFranchiseOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
                                            fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                    </button>

                                    {createFranchiseOpen && createFranchiseRect && ReactDOM.createPortal(
                                        <div ref={createFranchiseDropdownRef} style={{ position: "fixed", top: createFranchiseRect.bottom + 4, left: createFranchiseRect.left, width: createFranchiseRect.width, zIndex: 99999, background: "#1e293b", border: "1px solid #475569", borderRadius: 8, boxShadow: "0 10px 40px rgba(0,0,0,0.7)", overflow: "hidden" }}>
                                            <div style={{ padding: "8px 10px", borderBottom: "1px solid #334155" }}>
                                                <input autoFocus value={createFranchiseKeyword} onChange={(e) => setCreateFranchiseKeyword(e.target.value)} placeholder="Tìm theo tên hoặc mã..."
                                                    style={{ width: "100%", boxSizing: "border-box", background: "#0f172a", border: "1px solid #475569", borderRadius: 6, padding: "5px 10px", fontSize: 12, color: "#f1f5f9", outline: "none" }} />
                                            </div>
                                            <div style={{ maxHeight: 220, overflowY: "auto" }}>
                                                <button type="button" onMouseDown={(e) => e.preventDefault()}
                                                    onClick={() => { setCreateForm({ ...createForm, franchise_id: "", product_franchise_id: "" }); setProductOptions([]); closeCreateFranchise(); }}
                                                    style={{ display: "flex", width: "100%", padding: "8px 12px", boxSizing: "border-box", background: !createForm.franchise_id ? "#334155" : "transparent", color: !createForm.franchise_id ? "#f1f5f9" : "#94a3b8", fontSize: 12, fontWeight: 600, border: "none", cursor: "pointer", textAlign: "left" }}>
                                                    -- Chọn chi nhánh --
                                                </button>
                                                {filteredCreateFranchiseOptions.map((f) => (
                                                    <button key={f.value} type="button" onMouseDown={(e) => e.preventDefault()}
                                                        onClick={async () => {
                                                            setCreateForm({ ...createForm, franchise_id: f.value, product_franchise_id: "" });
                                                            closeCreateFranchise();
                                                            try {
                                                                const products = await adminProductFranchiseService.getProductsByFranchise(f.value);
                                                                setProductOptions(products.map((p) => ({ value: p.id, label: `${p.product_name} (${p.size})` })));
                                                            } catch { showError("Không tải được product"); }
                                                        }}
                                                        style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 12px", boxSizing: "border-box", background: createForm.franchise_id === f.value ? "#334155" : "transparent", color: createForm.franchise_id === f.value ? "#f1f5f9" : "#cbd5e1", fontSize: 13, border: "none", cursor: "pointer", textAlign: "left" }}>
                                                        <span style={{ fontFamily: "monospace", color: "#64748b", fontSize: 10, flexShrink: 0 }}>{f.code}</span>
                                                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</span>
                                                    </button>
                                                ))}
                                                {filteredCreateFranchiseOptions.length === 0 && (
                                                    <div style={{ padding: "10px 12px", fontSize: 12, color: "#64748b", textAlign: "center" }}>Không tìm thấy chi nhánh</div>
                                                )}
                                            </div>
                                        </div>,
                                        document.body
                                    )}
                                </div>
                            </div>

                            {/* PRODUCT */}
                            {createForm.franchise_id && (
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold uppercase tracking-wide text-white/50">Sản phẩm áp dụng</label>
                                    <select
                                        value={createForm.product_franchise_id}
                                        onChange={(e) => setCreateForm({ ...createForm, product_franchise_id: e.target.value })}
                                        className="w-full rounded-lg border border-white/[0.15] bg-slate-800 px-3 py-2 text-sm text-white/90 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 [&>option]:bg-slate-900 [&>option]:text-white"
                                        style={{ colorScheme: "dark" }}
                                    >
                                        <option value="">-- Tất cả sản phẩm --</option>
                                        {productOptions.map((p) => (
                                            <option key={p.value} value={p.value}>{p.label}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-3">
                                {/* TYPE */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold uppercase tracking-wide text-white/50">Loại mã</label>
                                    <select
                                        value={createForm.type}
                                        onChange={(e) => setCreateForm({ ...createForm, type: e.target.value as PromotionType })}
                                        className="w-full rounded-lg border border-white/[0.15] bg-slate-800 px-3 py-2 text-sm text-white/90 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 [&>option]:bg-slate-900 [&>option]:text-white"
                                        style={{ colorScheme: "dark" }}
                                    >
                                        <option value="PERCENT">Percent (%)</option>
                                        <option value="FIXED">Fixed (VND)</option>
                                    </select>
                                </div>

                                {/* VALUE */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold uppercase tracking-wide text-white/50">Giá trị <span className="text-red-400">*</span></label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={createForm.value}
                                            onChange={(e) => setCreateForm({ ...createForm, value: Number(e.target.value) })}
                                            className="w-full rounded-lg border border-white/[0.15] bg-white/[0.08] px-3 py-2 pr-14 text-sm text-white/90 placeholder-white/30 outline-none focus:border-white/40 focus:ring-2 focus:ring-white/20"
                                            required
                                        />
                                        <span className="absolute right-3 top-2 text-white/40 text-sm">
                                            {createForm.type === "PERCENT" ? "%" : "VND"}
                                        </span>                                    </div>
                                </div>
                            </div>                            <div className="grid grid-cols-2 gap-3">
                                {/* START DATE */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold uppercase tracking-wide text-white/50">Ngày bắt đầu <span className="text-red-400">*</span></label>
                                    <DateInput
                                        value={getDatePart(createForm.start_date)}
                                        onChange={(iso) => handleCreateDatetime("start_date", "date", iso)}
                                        darkMode
                                        required
                                    />
                                    <TimeSelect
                                        value={getTimePart(createForm.start_date)}
                                        onChange={(v) => handleCreateDatetime("start_date", "time", v)}
                                        darkMode
                                    />
                                    {getDatePart(createForm.start_date) && (
                                        <p className="text-[10px] text-white/40">
                                            {new Date(createForm.start_date).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" })}
                                        </p>
                                    )}
                                </div>

                                {/* END DATE */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold uppercase tracking-wide text-white/50">Ngày kết thúc <span className="text-red-400">*</span></label>
                                    <DateInput
                                        value={getDatePart(createForm.end_date)}
                                        onChange={(iso) => handleCreateDatetime("end_date", "date", iso)}
                                        darkMode
                                        required
                                    />
                                    <TimeSelect
                                        value={getTimePart(createForm.end_date)}
                                        onChange={(v) => handleCreateDatetime("end_date", "time", v)}
                                        darkMode
                                    />
                                    {getDatePart(createForm.end_date) && (
                                        <p className="text-[10px] text-white/40">
                                            {new Date(createForm.end_date).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" })}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* BUTTONS */}
                            <div className="flex justify-end gap-2 pt-2">
                                <Button type="button" variant="outline" onClick={() => { resetCreateForm(); setCreateOpen(false); }}
                                    className="border-white/[0.15] text-white/70 hover:bg-white/[0.1] hover:text-white">
                                    Hủy
                                </Button>
                                <Button type="submit">Tạo</Button>
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
            )}            {editItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40" onClick={() => setEditItem(null)} />
                    <div className="relative w-full max-w-lg rounded-2xl p-6 shadow-2xl" style={{
                        background: "rgba(255,255,255,0.10)",
                        backdropFilter: "blur(40px) saturate(200%)",
                        WebkitBackdropFilter: "blur(40px) saturate(200%)",
                        border: "1px solid rgba(255,255,255,0.22)",
                        boxShadow: "0 25px 60px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.18)",
                    }}>
                        <div className="mb-5 flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-bold text-white/95">Chỉnh sửa Promotion</h2>
                                <p className="text-xs text-white/50">Cập nhật thông tin khuyến mãi</p>
                            </div>
                            <button type="button" onClick={() => setEditItem(null)}
                                className="rounded-lg p-1.5 text-white/40 transition hover:bg-white/[0.1] hover:text-white/80">
                                <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <form onSubmit={handleUpdateSubmit} className="space-y-3">

                            {/* NAME */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold uppercase tracking-wide text-white/50">Tên <span className="text-red-400">*</span></label>
                                <input
                                    type="text"
                                    value={editForm.name}
                                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                    className="w-full rounded-lg border border-white/[0.15] bg-white/[0.08] px-3 py-2 text-sm text-white/90 placeholder-white/30 outline-none focus:border-white/40 focus:ring-2 focus:ring-white/20"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                {/* TYPE */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold uppercase tracking-wide text-white/50">Loại giảm</label>
                                    <select
                                        value={editForm.type}
                                        onChange={(e) => setEditForm({ ...editForm, type: e.target.value as PromotionType })}
                                        className="w-full rounded-lg border border-white/[0.15] bg-slate-800 px-3 py-2 text-sm text-white/90 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 [&>option]:bg-slate-900 [&>option]:text-white"
                                        style={{ colorScheme: "dark" }}
                                    >
                                        <option value="PERCENT">Percent (%)</option>
                                        <option value="FIXED">Fixed (VND)</option>
                                    </select>
                                </div>

                                {/* VALUE */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold uppercase tracking-wide text-white/50">Giá trị <span className="text-red-400">*</span></label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={editForm.value}
                                            onChange={(e) => setEditForm({ ...editForm, value: Number(e.target.value) })}
                                            className="w-full rounded-lg border border-white/[0.15] bg-white/[0.08] px-3 py-2 pr-14 text-sm text-white/90 outline-none focus:border-white/40 focus:ring-2 focus:ring-white/20"
                                            required
                                        />
                                        <span className="absolute right-3 top-2 text-white/40 text-sm">
                                            {editForm.type === "PERCENT" ? "%" : "VND"}
                                        </span>
                                    </div>
                                </div>
                            </div>                            <div className="grid grid-cols-2 gap-3">
                                {/* START DATE */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold uppercase tracking-wide text-white/50">Ngày bắt đầu <span className="text-red-400">*</span></label>
                                    <DateInput
                                        value={getDatePart(editForm.start_date)}
                                        onChange={(iso) => handleEditDatetime("start_date", "date", iso)}
                                        darkMode
                                        required
                                    />
                                    <TimeSelect
                                        value={getTimePart(editForm.start_date)}
                                        onChange={(v) => handleEditDatetime("start_date", "time", v)}
                                        darkMode
                                    />
                                    {getDatePart(editForm.start_date) && (
                                        <p className="text-[10px] text-white/40">
                                            {new Date(editForm.start_date).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" })}
                                        </p>
                                    )}
                                </div>

                                {/* END DATE */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold uppercase tracking-wide text-white/50">Ngày kết thúc <span className="text-red-400">*</span></label>
                                    <DateInput
                                        value={getDatePart(editForm.end_date)}
                                        onChange={(iso) => handleEditDatetime("end_date", "date", iso)}
                                        darkMode
                                        required
                                    />
                                    <TimeSelect
                                        value={getTimePart(editForm.end_date)}
                                        onChange={(v) => handleEditDatetime("end_date", "time", v)}
                                        darkMode
                                    />
                                    {getDatePart(editForm.end_date) && (
                                        <p className="text-[10px] text-white/40">
                                            {new Date(editForm.end_date).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" })}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                                <Button type="button" variant="outline" onClick={() => setEditItem(null)}
                                    className="border-white/[0.15] text-white/70 hover:bg-white/[0.1] hover:text-white">
                                    Hủy
                                </Button>
                                <Button type="submit">Cập nhật</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
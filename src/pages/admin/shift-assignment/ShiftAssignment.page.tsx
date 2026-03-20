import { useEffect, useRef, useState, useMemo } from "react";
import { Button } from "../../../components";
import Pagination from "../../../components/ui/Pagination";
import { shiftAssignmentService } from "../../../services/shift-assignment.service";
import { searchShifts } from "../../../services/shift.service";
import { fetchFranchiseSelect } from "../../../services/store.service";
import { getUsersByFranchiseId } from "../../../services/user-franchise-role.service";
import { useManagerFranchiseId } from "../../../hooks/useManagerFranchiseId";

import type {
    ShiftAssignment,
    StatusType,
    CreateShiftAssignmentDto,
} from "../../../models/shift-assignment.model";

import { showError, showSuccess } from "../../../utils";

const ITEMS_PER_PAGE = 10;

const DEFAULT_FORM: CreateShiftAssignmentDto = {
    user_id: "",
    shift_id: "",
    work_date: "",
    note: "",
};

export default function ShiftAssignmentPage() {
    const managerFranchiseId = useManagerFranchiseId();
    const [data, setData] = useState<ShiftAssignment[]>([]);
    const [loading, setLoading] = useState(false);

    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);

    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState<CreateShiftAssignmentDto>({ ...DEFAULT_FORM });

    const [viewing, setViewing] = useState<ShiftAssignment | null>(null);

    const [shifts, setShifts] = useState<any[]>([]);
    const [franchises, setFranchises] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);    const [searchName, setSearchName] = useState("");
    const [searchNameApplied, setSearchNameApplied] = useState("");
    const [filterFranchise, setFilterFranchise] = useState(managerFranchiseId ?? "");
    const [filterStatus, setFilterStatus] = useState("");

    // franchise combobox (filter)
    const [franchiseComboOpen, setFranchiseComboOpen] = useState(false);
    const [franchiseKeyword, setFranchiseKeyword] = useState("");
    const franchiseComboRef = useRef<HTMLDivElement>(null);

    const hasRun = useRef(false);

    const formatDate = (dateStr: string) => {
        if (!dateStr) return "";

        const date = new Date(dateStr);

        const day = String(date.getDate()).padStart(2, "0");
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const year = String(date.getFullYear()).slice(-2);

        return `${day}/${month}/${year}`;
    };

    const formatDateTime = (dateStr: string) => {
        if (!dateStr) return "";

        const date = new Date(dateStr);

        const day = String(date.getDate()).padStart(2, "0");
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const year = String(date.getFullYear()).slice(-2); // yy

        const hours = String(date.getHours()).padStart(2, "0");
        const minutes = String(date.getMinutes()).padStart(2, "0");

        return `${day}/${month}/${year} ${hours}:${minutes}`;
    };
    const [mode, setMode] = useState<"single" | "multiple">("single");
    const [workDates, setWorkDates] = useState<string[]>([]);
    const [tempDate, setTempDate] = useState("");

    const handleOpenModal = () => {
        setForm({ ...DEFAULT_FORM });
        setWorkDates([]);
        setMode("single");
        setUsers([]); // optional: clear user list
        setShowModal(true);
    };    // =====================
    // LOAD SHIFT ASSIGNMENT
    // =====================
    const load = async (
        page = currentPage,
        name = searchNameApplied,
        franchise = filterFranchise,
        status = filterStatus,
    ) => {
        setLoading(true);
        try {
            // Tìm shift_id theo franchise (nếu có filter franchise)
            // Backend nhận shift_id, không nhận franchise_id trực tiếp
            // → filter franchise phía client sau khi lấy data
            const res: any = await shiftAssignmentService.search(page, ITEMS_PER_PAGE, {
                status: status || undefined,
                is_deleted: false,
            });

            // Filter client-side cho name + franchise (API không hỗ trợ trực tiếp)
            const rawData: any[] = res?.data || [];
            const filtered = rawData.filter((item) => {
                const matchName = !name.trim()
                    || item.user_name?.toLowerCase().includes(name.trim().toLowerCase());
                const shift = shiftMap[item.shift_id];
                const matchFranchise = !franchise
                    || shift?.franchise_id === franchise;
                return matchName && matchFranchise;
            });

            setData(filtered);
            setTotalPages(res?.pageInfo?.totalPages || 1);
            setTotalItems(res?.pageInfo?.totalItems || 0);
            setCurrentPage(res?.pageInfo?.pageNum || 1);
        } catch (err) {
            console.log(err);
            showError("Lấy danh sách thất bại");
            setData([]);
        } finally {
            setLoading(false);
        }
    };

    // =====================
    // LOAD SHIFTS
    // =====================
    const loadShifts = async () => {
        try {
            const res: any = await searchShifts({
                searchCondition: {
                    name: "",
                    franchise_id: "",
                    start_time: "",
                    end_time: "",
                    is_active: true,
                    is_deleted: false
                },
                pageInfo: { pageNum: 1, pageSize: 1000 },
            });

            setShifts(res?.data || []);
        } catch (err) {
            console.log("load shifts error", err);
        }
    };

    // =====================
    // LOAD FRANCHISE
    // =====================
    const loadFranchises = async () => {
        try {
            const data = await fetchFranchiseSelect();
            setFranchises(data || []);
        } catch {
            console.log("load franchise error");
        }
    };

    // =====================
    // LOAD Users
    // =====================
    const loadUsers = async (franchiseId: string) => {
        try {
            const res = await getUsersByFranchiseId(franchiseId);
            console.log("=== USERS API RESPONSE ===");
            console.log(res);
            setUsers(res || []);
        } catch (err) {
            console.log("load users error", err);
        }
    };    useEffect(() => {
        if (hasRun.current) return;
        hasRun.current = true;

        const initFranchise = managerFranchiseId ?? "";
        if (initFranchise) setFilterFranchise(initFranchise);
        load(1, searchNameApplied, initFranchise, filterStatus);
        loadShifts();
        loadFranchises();
    }, []);    // Sync khi managerFranchiseId thay đổi (store hydrate muộn)
    useEffect(() => {
        if (!managerFranchiseId) return;
        setFilterFranchise(managerFranchiseId);
        load(1, searchNameApplied, managerFranchiseId, filterStatus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [managerFranchiseId]);

    // Sync franchiseKeyword khi options load xong và đang là manager
    useEffect(() => {
        if (!managerFranchiseId || !franchises.length) return;
        const found = franchises.find(f => f.value === managerFranchiseId);
        if (found) setFranchiseKeyword(`${found.name} (${found.code})`);
    }, [managerFranchiseId, franchises]);

    useEffect(() => {
        setForm(prev => ({ ...prev, work_date: "" }));
        setWorkDates([]);
    }, [mode]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchNameApplied, filterFranchise, filterStatus]);

    // click-outside franchise combobox
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (franchiseComboRef.current && !franchiseComboRef.current.contains(e.target as Node)) {
                setFranchiseComboOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    // =====================    // =====================
    // MAP DATA (TỐI ƯU)
    // =====================
    const shiftMap = useMemo(() => {
        return Object.fromEntries(shifts.map(s => [s.id, s]));
    }, [shifts]);

    const franchiseMap = useMemo(() => {
        return Object.fromEntries(franchises.map(f => [f.value, f.name]));
    }, [franchises]);

    const filteredFranchisesForCombo = useMemo(() => {
        if (!franchiseKeyword.trim()) return franchises;
        const k = franchiseKeyword.trim().toLowerCase();
        return franchises.filter(f =>
            (f.name || "").toLowerCase().includes(k) ||
            (f.code || "").toLowerCase().includes(k)
        );
    }, [franchises, franchiseKeyword]);

    const getShiftName = (shiftId: string) => {
        return shiftMap[shiftId]?.name || shiftId;
    };

    const getFranchiseName = (shiftId: string) => {
        const shift = shiftMap[shiftId];
        if (!shift) return "";

        return franchiseMap[shift.franchise_id] || shift.franchise_id;
    };

    const getStartTime = (shiftId: string) => {
        return shiftMap[shiftId]?.start_time || "";
    };

    const getEndTime = (shiftId: string) => {
        return shiftMap[shiftId]?.end_time || "";
    };
    const userMap = useMemo(() => {
        return Object.fromEntries(users.map(u => [u.value, u]));
    }, [users]);
    const getUserEmail = (userId: string) => {
        return userMap[userId]?.email || "-";
    };    const handleSearch = () => {
        setSearchNameApplied(searchName);
        setCurrentPage(1);
        load(1, searchName, filterFranchise, filterStatus);
    };    const filteredData = data; // filter đã xử lý trong load()

    const handleSelectShift = (shiftId: string) => {
        const shift = shifts.find(s => s.id === shiftId);

        setForm(prev => ({
            ...prev,
            shift_id: shiftId,
            user_id: "" // reset user
        }));

        if (shift?.franchise_id) {
            loadUsers(shift.franchise_id);
        }
    };

    // =====================
    // CREATE
    // =====================

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!form.user_id || !form.shift_id) {
            showError("Chọn user và shift");
            return;
        }

        try {
            if (mode === "single") {
                if (!form.work_date) {
                    showError("Chọn ngày");
                    return;
                }

                await shiftAssignmentService.create(form);
            } else {
                if (workDates.length === 0) {
                    showError("Chọn ít nhất 1 ngày");
                    return;
                }

                const items = workDates.map(date => ({
                    user_id: form.user_id,
                    shift_id: form.shift_id,
                    work_date: date,
                    note: form.note, // nếu backend nhận
                }));

                await shiftAssignmentService.bulkCreate({
                    items,
                });
            }

            showSuccess("Thành công");

            setForm({ ...DEFAULT_FORM });
            setWorkDates([]);
            setShowModal(false);
            load();

        } catch (err: any) {
            showError(err?.response?.data?.message || "Tạo thất bại");
        }
    };

    // =====================
    // CHANGE STATUS
    // =====================
    const handleChangeStatus = async (item: ShiftAssignment, status: StatusType) => {
        if (item.status === status) return;

        try {
            await shiftAssignmentService.changeStatus(item.id, status);

            showSuccess("Cập nhật thành công");

            setData(prev =>
                prev.map(i =>
                    i.id === item.id ? { ...i, status } : i
                )
            );
        } catch (err: any) {
            showError(err?.response?.data?.message || "Lỗi cập nhật");
        }
    };

    // =====================
    // STATUS UI
    // =====================
    const getStatusUI = (status: StatusType) => {
        switch (status) {
            case "ASSIGNED":
                return "bg-blue-50 text-blue-600";
            case "COMPLETED":
                return "bg-green-50 text-green-600";
            case "ABSENT":
                return "bg-red-50 text-red-600";
            case "CANCELED":
                return "bg-gray-100 text-gray-600";
            default:
                return "";
        }
    };

    return (
        <div className="space-y-6">

            {/* HEADER */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Shift Assignment</h1>
                    <p className="text-sm text-slate-500">
                        Quản lý phân ca nhân viên
                    </p>
                </div>

                <Button onClick={handleOpenModal}>
                    + Gán Ca Làm Việc
                </Button>
            </div>            {/* SEARCH BAR */}
            <div className="relative z-20 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap gap-3">

                    {/* 🔍 Search name */}
                    <div className="relative flex-1 min-w-48">
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Tên nhân viên
                        </label>
                        <div className="relative">
                            <svg className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>                            <input
                                type="text"
                                placeholder="Tìm theo tên..."
                                value={searchName}
                                onChange={(e) => setSearchName(e.target.value)}
                                onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
                                className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-4 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                            />
                        </div>
                    </div>

                    {/* 🏢 Filter franchise — custom combobox */}
                    <div className="min-w-[200px]" ref={franchiseComboRef}>
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Franchise
                        </label>                        <div className="relative">
                            {managerFranchiseId ? (
                                <div className="flex w-full items-center justify-between rounded-lg border border-primary-500/50 bg-primary-500/10 px-3 py-2 text-sm text-white cursor-not-allowed">
                                    <span className="truncate font-medium">
                                        {filterFranchise ? (franchiseMap[filterFranchise] || filterFranchise) : "-- Tất cả --"}
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
                                        {filterFranchise ? (franchiseMap[filterFranchise] || filterFranchise) : "-- Tất cả --"}
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
                                    <div className="max-h-56 overflow-y-auto py-1">                                        <button
                                            type="button"
                                            onMouseDown={() => {
                                                setFilterFranchise("");
                                                setFranchiseKeyword("");
                                                setFranchiseComboOpen(false);
                                                load(1, searchNameApplied, "", filterStatus);
                                            }}
                                            className={`flex w-full items-center px-3 py-2 text-left text-xs font-semibold ${!filterFranchise ? "bg-white/[0.12] text-white" : "text-white/60 hover:bg-white/[0.08]"}`}
                                        >
                                            -- Tất cả --
                                        </button>
                                        {filteredFranchisesForCombo.map((f) => (
                                            <button
                                                key={f.value}
                                                type="button"
                                                onMouseDown={() => {
                                                    setFilterFranchise(f.value);
                                                    setFranchiseKeyword("");
                                                    setFranchiseComboOpen(false);
                                                    load(1, searchNameApplied, f.value, filterStatus);
                                                }}
                                                className={`flex w-full items-center px-3 py-2 text-left text-xs ${filterFranchise === f.value ? "bg-white/[0.12] text-white" : "text-white/80 hover:bg-white/[0.08]"}`}
                                            >
                                                <span className="truncate">{f.name} ({f.code})</span>
                                            </button>
                                        ))}
                                        {filteredFranchisesForCombo.length === 0 && (
                                            <div className="px-3 py-2 text-xs text-white/40">Không tìm thấy franchise</div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 📊 Filter status */}
                    <div className="min-w-[140px]">
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Trạng thái
                        </label>                        <select
                            value={filterStatus}
                            onChange={(e) => {
                                const val = e.target.value;
                                setFilterStatus(val);
                                load(1, searchNameApplied, filterFranchise, val);
                            }}
                            className="w-full rounded-lg border border-white/[0.15] bg-slate-800 px-3 py-2 text-sm text-white/90 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 [&>option]:bg-slate-900 [&>option]:text-white appearance-none"
                            style={{ colorScheme: "dark" }}
                        >
                            <option value="">-- Tất cả --</option>
                            <option value="ASSIGNED">Assigned</option>
                            <option value="COMPLETED">Completed</option>
                            <option value="ABSENT">Absent</option>
                            <option value="CANCELED">Canceled</option>
                        </select>
                    </div>                    {/* 🔎 Tìm kiếm */}
                    <div className="flex flex-col justify-end">
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 invisible">&nbsp;</label>
                        <Button onClick={handleSearch} loading={loading}>Tìm kiếm</Button>
                    </div>
                </div>
            </div>

            {/* TABLE */}
            <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-left text-xs uppercase text-slate-600">
                            <tr>
                                <th className="p-3">User</th>
                                <th className="p-3">Ca</th>
                                <th className="p-3">Chi nhánh</th>
                                <th className="p-3">Ngày</th>
                                <th className="p-3">Giờ bắt đầu</th>
                                <th className="p-3">Giờ kết thúc</th>
                                <th className="p-3">Trạng thái</th>
                                <th className="p-3 text-right">Thao tác</th>
                            </tr>
                        </thead>

                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={8} className="text-center py-10">
                                        Loading...
                                    </td>
                                </tr>
                            ) : filteredData.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="text-center py-10">
                                        No data
                                    </td>
                                </tr>
                            ) : (
                                filteredData.map((s) => (
                                    <tr key={s.id} className="border-t hover:bg-slate-50">
                                        <td className="p-3">{s.user_name}</td>
                                        <td className="p-3">{getShiftName(s.shift_id)}</td>
                                        <td className="p-3">{getFranchiseName(s.shift_id)}</td>
                                        <td className="p-3">{formatDate(s.work_date)}</td>
                                        <td className="p-3">{getStartTime(s.shift_id)}</td>
                                        <td className="p-3">{getEndTime(s.shift_id)}</td>

                                        <td className="p-3">
                                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusUI(s.status as StatusType)}`}>
                                                {s.status}
                                            </span>
                                        </td>

                                        <td className="p-3 text-right space-x-2">
                                            <button
                                                onClick={() => {
                                                    setViewing(s);

                                                    const shift = shiftMap[s.shift_id];
                                                    if (shift?.franchise_id) {
                                                        loadUsers(shift.franchise_id);
                                                    }
                                                }}
                                                className="inline-flex items-center justify-center size-8 rounded-lg border border-slate-200 bg-white text-slate-500 hover:border-primary-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                                                title="Xem chi tiết"
                                            >
                                                <svg
                                                    className="size-4"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    stroke="currentColor"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                                    />
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                                    />
                                                </svg>
                                            </button>

                                            <select
                                                value={s.status}
                                                onChange={(e) =>
                                                    handleChangeStatus(
                                                        s,
                                                        e.target.value as StatusType
                                                    )
                                                }
                                                className="border rounded px-2 py-1"
                                            >
                                                <option value="ASSIGNED">Assigned</option>
                                                <option value="COMPLETED">Completed</option>
                                                <option value="ABSENT">Absent</option>
                                                <option value="CANCELED">Canceled</option>
                                            </select>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* PAGINATION */}
                <div className="p-4">
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        totalItems={totalItems}
                        itemsPerPage={ITEMS_PER_PAGE}                        onPageChange={(page) => {
                            setCurrentPage(page);
                            load(page, searchNameApplied, filterFranchise, filterStatus);
                        }}
                    />
                </div>
            </div>            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowModal(false)} />
                    <div className="relative w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden" style={{
                        background: "rgba(15,23,42,0.85)",
                        backdropFilter: "blur(40px) saturate(180%)",
                        WebkitBackdropFilter: "blur(40px) saturate(180%)",
                        border: "1px solid rgba(255,255,255,0.12)",
                        boxShadow: "0 32px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.12)",
                    }}>
                        {/* Gradient accent top */}
                        <div className="h-0.5 w-full" style={{ background: "linear-gradient(90deg, #6366f1, #8b5cf6, #06b6d4)" }} />

                        <div className="p-6">
                            {/* Header */}
                            <div className="mb-6 flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="flex size-10 items-center justify-center rounded-xl bg-primary-500/20">
                                        <svg className="size-5 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h2 className="text-base font-bold text-white">Gán Ca Làm Việc</h2>
                                        <p className="text-xs text-white/40">Phân công ca làm việc cho nhân viên</p>
                                    </div>
                                </div>
                                <button type="button" onClick={() => setShowModal(false)}
                                    className="rounded-lg p-1.5 text-white/30 transition hover:bg-white/[0.08] hover:text-white/70">
                                    <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <form onSubmit={handleCreate} className="space-y-4">

                                {/* SHIFT + USER — 2 cột */}
                                <div className="grid grid-cols-2 gap-3">
                                    {/* SHIFT */}
                                    <div className="space-y-1.5">
                                        <label className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-white/40">
                                            <svg className="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                            Ca làm việc <span className="text-red-400 normal-case">*</span>
                                        </label>
                                        <select
                                            value={form.shift_id}
                                            onChange={(e) => handleSelectShift(e.target.value)}
                                            className="w-full rounded-lg border border-white/[0.12] bg-white/[0.06] px-3 py-2 text-sm text-white/90 outline-none transition focus:border-primary-500/60 focus:bg-white/[0.09] focus:ring-2 focus:ring-primary-500/20 [&>option]:bg-slate-900 [&>option]:text-white"
                                            style={{ colorScheme: "dark" }}
                                        >
                                            <option value="">-- Chọn ca --</option>
                                            {shifts.map((s) => (
                                                <option key={s.id} value={s.id}>
                                                    {s.name} ({s.start_time}–{s.end_time})
                                                </option>
                                            ))}
                                        </select>
                                        {form.shift_id && (
                                            <p className="text-[10px] text-white/35 pl-0.5">
                                                📍 {franchiseMap[shiftMap[form.shift_id]?.franchise_id] || "—"}
                                            </p>
                                        )}
                                    </div>

                                    {/* USER */}
                                    <div className="space-y-1.5">
                                        <label className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-white/40">
                                            <svg className="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                            Nhân viên <span className="text-red-400 normal-case">*</span>
                                        </label>
                                        <select
                                            value={form.user_id}
                                            onChange={(e) => setForm({ ...form, user_id: e.target.value })}
                                            disabled={!form.shift_id}
                                            className="w-full rounded-lg border border-white/[0.12] bg-white/[0.06] px-3 py-2 text-sm text-white/90 outline-none transition focus:border-primary-500/60 focus:bg-white/[0.09] focus:ring-2 focus:ring-primary-500/20 [&>option]:bg-slate-900 [&>option]:text-white disabled:cursor-not-allowed disabled:opacity-40"
                                            style={{ colorScheme: "dark" }}
                                        >
                                            <option value="">
                                                {!form.shift_id ? "Chọn ca trước" : "-- Chọn nhân viên --"}
                                            </option>
                                            {users.map((u) => (
                                                <option key={u.value} value={u.value}>{u.name}</option>
                                            ))}
                                        </select>
                                        {!form.shift_id && (
                                            <p className="text-[10px] text-amber-400/60 pl-0.5">⚠ Vui lòng chọn ca trước</p>
                                        )}
                                    </div>
                                </div>

                                {/* DIVIDER */}
                                <div className="border-t border-white/[0.07]" />

                                {/* MODE SELECTOR — Segmented control */}
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold uppercase tracking-wide text-white/40">Chế độ ngày làm việc</label>
                                    <div className="flex gap-0 rounded-xl border border-white/[0.1] bg-white/[0.04] p-1">
                                        <button
                                            type="button"
                                            onClick={() => setMode("single")}
                                            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${
                                                mode === "single"
                                                    ? "bg-primary-500 text-white shadow-lg shadow-primary-500/30"
                                                    : "text-white/40 hover:text-white/70"
                                            }`}
                                        >
                                            <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                            Một ngày
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setMode("multiple")}
                                            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${
                                                mode === "multiple"
                                                    ? "bg-primary-500 text-white shadow-lg shadow-primary-500/30"
                                                    : "text-white/40 hover:text-white/70"
                                            }`}
                                        >
                                            <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                                            </svg>
                                            Nhiều ngày
                                            {mode === "multiple" && workDates.length > 0 && (
                                                <span className="flex size-5 items-center justify-center rounded-full bg-white/20 text-[10px] font-bold">
                                                    {workDates.length}
                                                </span>
                                            )}
                                        </button>
                                    </div>
                                </div>

                                {/* DATE SECTION */}
                                {mode === "single" ? (
                                    /* ── SINGLE MODE ── */
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold uppercase tracking-wide text-white/40">
                                            Ngày làm việc <span className="text-red-400 normal-case">*</span>
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="date"
                                                value={form.work_date}
                                                onChange={(e) => setForm({ ...form, work_date: e.target.value })}
                                                className="w-full rounded-lg border border-white/[0.12] bg-white/[0.06] px-3 py-2.5 text-sm text-white/90 outline-none transition focus:border-primary-500/60 focus:bg-white/[0.09] focus:ring-2 focus:ring-primary-500/20"
                                                style={{ colorScheme: "dark" }}
                                            />
                                        </div>
                                        {form.work_date && (
                                            <div className="flex items-center gap-2 rounded-lg border border-primary-500/20 bg-primary-500/10 px-3 py-2">
                                                <svg className="size-4 flex-shrink-0 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                <span className="text-sm font-medium text-primary-300">
                                                    {new Date(form.work_date + "T00:00:00").toLocaleDateString("vi-VN", {
                                                        weekday: "long", day: "2-digit", month: "2-digit", year: "numeric"
                                                    })}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    /* ── MULTIPLE MODE ── */
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-semibold uppercase tracking-wide text-white/40">
                                                Chọn các ngày làm việc <span className="text-red-400 normal-case">*</span>
                                            </label>
                                            {workDates.length > 0 && (
                                                <button
                                                    type="button"
                                                    onClick={() => setWorkDates([])}
                                                    className="flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium text-red-400/70 transition hover:bg-red-500/10 hover:text-red-400"
                                                >
                                                    <svg className="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                    Xóa tất cả
                                                </button>
                                            )}
                                        </div>

                                        {/* Input + Add button */}
                                        <div className="flex gap-2">
                                            <input
                                                type="date"
                                                value={tempDate}
                                                onChange={(e) => setTempDate(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter") {
                                                        e.preventDefault();
                                                        if (tempDate && !workDates.includes(tempDate)) {
                                                            setWorkDates(prev => [...prev, tempDate].sort());
                                                            setTempDate("");
                                                        }
                                                    }
                                                }}
                                                className="flex-1 rounded-lg border border-white/[0.12] bg-white/[0.06] px-3 py-2 text-sm text-white/90 outline-none transition focus:border-primary-500/60 focus:bg-white/[0.09] focus:ring-2 focus:ring-primary-500/20"
                                                style={{ colorScheme: "dark" }}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (tempDate && !workDates.includes(tempDate)) {
                                                        setWorkDates(prev => [...prev, tempDate].sort());
                                                        setTempDate("");
                                                    }
                                                }}
                                                disabled={!tempDate || workDates.includes(tempDate)}
                                                className="flex items-center gap-1.5 rounded-lg border border-primary-500/40 bg-primary-500/20 px-3 py-2 text-sm font-medium text-primary-300 transition hover:bg-primary-500/30 disabled:cursor-not-allowed disabled:opacity-40"
                                            >
                                                <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                                </svg>
                                                Thêm
                                            </button>
                                        </div>

                                        {/* Date chips */}
                                        {workDates.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-white/[0.1] py-5 text-white/25">
                                                <svg className="size-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                                <span className="text-xs">Chưa có ngày nào được chọn</span>
                                            </div>
                                        ) : (
                                            <div className="max-h-28 overflow-y-auto rounded-xl border border-white/[0.08] bg-white/[0.03] p-2">
                                                <div className="flex flex-wrap gap-1.5">
                                                    {workDates.map((d) => (
                                                        <span
                                                            key={d}
                                                            className="group flex items-center gap-1 rounded-full border border-primary-400/30 bg-primary-500/15 px-2.5 py-1 text-xs text-primary-300 transition hover:border-red-400/40 hover:bg-red-500/15 hover:text-red-300 cursor-pointer"
                                                            onClick={() => setWorkDates(prev => prev.filter(x => x !== d))}
                                                        >
                                                            {formatDate(d)}
                                                            <svg className="size-3 opacity-50 group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                            </svg>
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {workDates.length > 0 && (
                                            <p className="text-[10px] text-white/30 text-right">
                                                {workDates.length} ngày được chọn • Nhấn vào ngày để xóa
                                            </p>
                                        )}
                                    </div>
                                )}

                                {/* NOTE */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold uppercase tracking-wide text-white/40">Ghi chú</label>
                                    <input
                                        type="text"
                                        value={form.note}
                                        onChange={(e) => setForm({ ...form, note: e.target.value })}
                                        placeholder="Ghi chú thêm (không bắt buộc)..."
                                        className="w-full rounded-lg border border-white/[0.12] bg-white/[0.06] px-3 py-2 text-sm text-white/90 placeholder-white/20 outline-none transition focus:border-white/30 focus:bg-white/[0.09] focus:ring-2 focus:ring-white/10"
                                    />
                                </div>

                                {/* ACTION */}
                                <div className="flex justify-end gap-2 border-t border-white/[0.07] pt-4">
                                    <Button type="button" variant="outline" onClick={() => setShowModal(false)}
                                        className="border-white/[0.12] text-white/50 hover:bg-white/[0.07] hover:text-white/80">
                                        Hủy
                                    </Button>
                                    <Button type="submit">
                                        {mode === "multiple" && workDates.length > 1
                                            ? `Gán ${workDates.length} ca`
                                            : "Gán ca"}
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}{viewing && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40" onClick={() => setViewing(null)} />
                    <div className="relative w-full max-w-lg rounded-2xl p-6 shadow-2xl" style={{
                        background: "rgba(255,255,255,0.10)",
                        backdropFilter: "blur(40px) saturate(200%)",
                        WebkitBackdropFilter: "blur(40px) saturate(200%)",
                        border: "1px solid rgba(255,255,255,0.22)",
                        boxShadow: "0 25px 60px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.18)",
                    }}>
                        {/* Header */}
                        <div className="mb-5 flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-bold text-white/95">Chi tiết Shift Assignment</h2>
                                <p className="text-xs text-white/50">{getShiftName(viewing.shift_id)} — {formatDate(viewing.work_date)}</p>
                            </div>
                            <button type="button" onClick={() => setViewing(null)}
                                className="rounded-lg p-1.5 text-white/40 transition hover:bg-white/[0.1] hover:text-white/80">
                                <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Body */}
                        <div className="space-y-3 text-sm">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="rounded-lg border border-white/[0.1] bg-white/[0.06] px-3 py-2.5">
                                    <p className="text-[10px] font-semibold uppercase tracking-wide text-white/40">Nhân viên</p>
                                    <p className="mt-0.5 font-medium text-white/90">{viewing.user_name}</p>
                                </div>
                                <div className="rounded-lg border border-white/[0.1] bg-white/[0.06] px-3 py-2.5">
                                    <p className="text-[10px] font-semibold uppercase tracking-wide text-white/40">Email</p>
                                    <p className="mt-0.5 text-white/80 truncate">{getUserEmail(viewing.user_id)}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="rounded-lg border border-white/[0.1] bg-white/[0.06] px-3 py-2.5">
                                    <p className="text-[10px] font-semibold uppercase tracking-wide text-white/40">Ca làm việc</p>
                                    <p className="mt-0.5 font-medium text-white/90">{getShiftName(viewing.shift_id)}</p>
                                </div>
                                <div className="rounded-lg border border-white/[0.1] bg-white/[0.06] px-3 py-2.5">
                                    <p className="text-[10px] font-semibold uppercase tracking-wide text-white/40">Chi nhánh</p>
                                    <p className="mt-0.5 text-white/80">{getFranchiseName(viewing.shift_id)}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <div className="rounded-lg border border-white/[0.1] bg-white/[0.06] px-3 py-2.5">
                                    <p className="text-[10px] font-semibold uppercase tracking-wide text-white/40">Ngày</p>
                                    <p className="mt-0.5 font-medium text-white/90">{formatDate(viewing.work_date)}</p>
                                </div>
                                <div className="rounded-lg border border-white/[0.1] bg-white/[0.06] px-3 py-2.5">
                                    <p className="text-[10px] font-semibold uppercase tracking-wide text-white/40">Bắt đầu</p>
                                    <p className="mt-0.5 text-white/90">{getStartTime(viewing.shift_id)}</p>
                                </div>
                                <div className="rounded-lg border border-white/[0.1] bg-white/[0.06] px-3 py-2.5">
                                    <p className="text-[10px] font-semibold uppercase tracking-wide text-white/40">Kết thúc</p>
                                    <p className="mt-0.5 text-white/90">{getEndTime(viewing.shift_id)}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="rounded-lg border border-white/[0.1] bg-white/[0.06] px-3 py-2.5">
                                    <p className="text-[10px] font-semibold uppercase tracking-wide text-white/40">Trạng thái</p>
                                    <div className="mt-1">
                                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${getStatusUI(viewing.status as StatusType)}`}>
                                            {viewing.status}
                                        </span>
                                    </div>
                                </div>
                                <div className="rounded-lg border border-white/[0.1] bg-white/[0.06] px-3 py-2.5">
                                    <p className="text-[10px] font-semibold uppercase tracking-wide text-white/40">Ghi chú</p>
                                    <p className="mt-0.5 text-white/70 italic">{viewing.note || "—"}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 border-t border-white/[0.08] pt-3">
                                <div>
                                    <p className="text-[10px] font-semibold uppercase tracking-wide text-white/30">Tạo lúc</p>
                                    <p className="mt-0.5 text-xs text-white/50">{formatDateTime(viewing.created_at)}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-semibold uppercase tracking-wide text-white/30">Cập nhật</p>
                                    <p className="mt-0.5 text-xs text-white/50">{formatDateTime(viewing.updated_at)}</p>
                                </div>
                            </div>
                        </div>

                        {/* ACTION */}
                        <div className="flex justify-end pt-4">
                            <Button variant="outline" onClick={() => setViewing(null)}
                                className="border-white/[0.15] text-white/70 hover:bg-white/[0.1] hover:text-white">
                                Đóng
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
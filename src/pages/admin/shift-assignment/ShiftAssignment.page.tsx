import { useEffect, useRef, useState, useMemo } from "react";
import { Button } from "../../../components";
import Pagination from "../../../components/ui/Pagination";
import { shiftAssignmentService } from "../../../services/shift-assignment.service";
import { searchShifts } from "../../../services/shift.service";
import { fetchFranchiseSelect } from "../../../services/store.service";
import { getUsersByFranchiseId } from "../../../services/user-franchise-role.service";

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
    const [users, setUsers] = useState<any[]>([]);
    const [searchName, setSearchName] = useState("");
    const [filterFranchise, setFilterFranchise] = useState("");
    const [filterStatus, setFilterStatus] = useState("");

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
    };

    // =====================
    // LOAD SHIFT ASSIGNMENT
    // =====================
    const load = async (page = currentPage) => {
        setLoading(true);
        try {
            const res: any = await shiftAssignmentService.search(page, ITEMS_PER_PAGE);

            setData(res?.data || []);
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
            setUsers(res || []);
        } catch (err) {
            console.log("load users error", err);
        }
    };

    useEffect(() => {
        if (hasRun.current) return;
        hasRun.current = true;

        load(1);
        loadShifts();
        loadFranchises();
    }, []);
    useEffect(() => {
        setForm(prev => ({ ...prev, work_date: "" }));
        setWorkDates([]);
    }, [mode]);
    useEffect(() => {
        setCurrentPage(1);
    }, [searchName, filterFranchise, filterStatus]);

    // =====================
    // MAP DATA (TỐI ƯU)
    // =====================
    const shiftMap = useMemo(() => {
        return Object.fromEntries(shifts.map(s => [s.id, s]));
    }, [shifts]);

    const franchiseMap = useMemo(() => {
        return Object.fromEntries(franchises.map(f => [f.value, f.name]));
    }, [franchises]);

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
    const handleReset = () => {
        setSearchName("");
        setFilterFranchise("");
        setFilterStatus("");
        setCurrentPage(1);

        load(1); // reload lại data gốc
    };

    const filteredData = useMemo(() => {
        return data.filter((item) => {
            const matchName = item.user_name
                ?.toLowerCase()
                .includes(searchName.trim().toLowerCase());

            const shift = shiftMap[item.shift_id];

            const matchFranchise = !filterFranchise
                ? true
                : shift?.franchise_id === filterFranchise;

            const matchStatus = !filterStatus
                ? true
                : item.status === filterStatus;

            return matchName && matchFranchise && matchStatus;
        });
    }, [data, searchName, filterFranchise, filterStatus, shiftMap]);

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
            </div>
            {/* SEARCH BAR */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap gap-2">

                    {/* 🔍 Search name */}
                    <div className="relative flex-1 min-w-48">
                        <svg
                            className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                            />
                        </svg>

                        <input
                            type="text"
                            placeholder="Tìm theo tên nhân viên..."
                            value={searchName}
                            onChange={(e) => setSearchName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") load(1);
                            }}
                            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-4 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                        />
                    </div>

                    {/* 🏢 Filter franchise */}
                    <select
                        value={filterFranchise}
                        onChange={(e) => {
                            setFilterFranchise(e.target.value);
                        }}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                    >
                        <option value="">Tất cả franchise</option>
                        {franchises.map((f) => (
                            <option key={f.value} value={f.value}>
                                {f.name}
                            </option>
                        ))}
                    </select>
                    {/* 📊 Filter status */}
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                    >
                        <option value="">Tất cả status</option>
                        <option value="ASSIGNED">Assigned</option>
                        <option value="COMPLETED">Completed</option>
                        <option value="ABSENT">Absent</option>
                        <option value="CANCELED">Canceled</option>
                    </select>

                    {/* 🔎 Button */}
                    <Button
                        onClick={handleReset}
                    >
                        Đặt lại
                    </Button>
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
                                                onClick={() => setViewing(s)}
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
                        itemsPerPage={ITEMS_PER_PAGE}
                        onPageChange={(page) => {
                            setCurrentPage(page);
                            load(page);
                        }}
                    />
                </div>
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 w-[500px] space-y-4">
                        <h2 className="text-lg font-semibold">Assign Shift</h2>

                        <form onSubmit={handleCreate} className="space-y-4">

                            {/* SHIFT */}
                            <div>
                                <label className="block text-sm mb-1">Shift</label>
                                <select
                                    value={form.shift_id}
                                    onChange={(e) => handleSelectShift(e.target.value)}
                                    className="w-full border rounded px-3 py-2"
                                >
                                    <option value="">-- Select Shift --</option>
                                    {shifts.map((s) => (
                                        <option key={s.id} value={s.id}>
                                            {s.name} ({s.start_time} - {s.end_time}) - {franchiseMap[s.franchise_id] || s.franchise_id}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* USER */}
                            <div>
                                <label className="block text-sm mb-1">User</label>
                                <select
                                    value={form.user_id}
                                    onChange={(e) =>
                                        setForm({ ...form, user_id: e.target.value })
                                    }
                                    disabled={!form.shift_id}
                                    className="w-full border rounded px-3 py-2"
                                >
                                    <option value="">-- Select User --</option>
                                    {users.map((u) => (
                                        <option key={u.value} value={u.value}>
                                            {u.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            {/* MODE (Single / Multiple) */}
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setMode("single")}
                                    className={`px-3 py-1 rounded border ${mode === "single" ? "bg-blue-600 text-white" : ""
                                        }`}
                                >
                                    Single
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setMode("multiple")}
                                    className={`px-3 py-1 rounded border ${mode === "multiple" ? "bg-blue-600 text-white" : ""
                                        }`}
                                >
                                    Multiple
                                </button>
                            </div>
                            {/* DATE */}
                            <div>
                                <label className="block text-sm mb-1">Work Date</label>

                                {mode === "single" ? (
                                    <input
                                        type="date"
                                        value={form.work_date}
                                        onChange={(e) =>
                                            setForm({ ...form, work_date: e.target.value })
                                        }
                                        className="w-full border rounded px-3 py-2"
                                    />
                                ) : (
                                    <input
                                        type="date"
                                        value={tempDate}
                                        onChange={(e) => setTempDate(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                                e.preventDefault();

                                                if (tempDate && !workDates.includes(tempDate)) {
                                                    setWorkDates(prev => [...prev, tempDate]);
                                                    setTempDate(""); // clear input sau khi thêm
                                                }
                                            }
                                        }}
                                        className="w-full border rounded px-3 py-2"
                                    />
                                )}

                                {/* list selected dates */}
                                {mode === "multiple" && (
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {workDates.map((d) => (
                                            <span
                                                key={d}
                                                className="px-2 py-1 bg-blue-100 text-blue-600 rounded text-xs cursor-pointer"
                                                onClick={() =>
                                                    setWorkDates(prev => prev.filter(x => x !== d))
                                                }
                                            >
                                                {formatDate(d)} ✕
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* NOTE */}
                            <div>
                                <label className="block text-sm mb-1">Note</label>
                                <input
                                    type="text"
                                    value={form.note}
                                    onChange={(e) =>
                                        setForm({ ...form, note: e.target.value })
                                    }
                                    className="w-full border rounded px-3 py-2"
                                />
                            </div>

                            {/* ACTION */}
                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 border rounded"
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 text-white rounded"
                                >
                                    Assign
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {viewing && (
                <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 w-[500px] space-y-4">
                        <h2 className="text-lg font-semibold">Shift Assignment Detail</h2>

                        <div className="space-y-3 text-sm">

                            {/* USER */}
                            <div>
                                <span className="font-medium">User: </span>
                                {viewing.user_name}
                            </div>

                            {/* SHIFT */}
                            <div>
                                <span className="font-medium">Shift: </span>
                                {getShiftName(viewing.shift_id)}
                            </div>

                            {/* FRANCHISE */}
                            <div>
                                <span className="font-medium">Franchise: </span>
                                {getFranchiseName(viewing.shift_id)}
                            </div>

                            {/* DATE */}
                            <div>
                                <span className="font-medium">Date: </span>
                                {formatDate(viewing.work_date)}
                            </div>

                            {/* TIME */}
                            <div>
                                <span className="font-medium">Time: </span>
                                {getStartTime(viewing.shift_id)} - {getEndTime(viewing.shift_id)}
                            </div>

                            {/* STATUS */}
                            <div>
                                <span className="font-medium">Status: </span>
                                <span className={`ml-2 px-2 py-1 rounded text-xs ${getStatusUI(viewing.status as StatusType)}`}>
                                    {viewing.status}
                                </span>
                            </div>

                            {/* NOTE */}
                            <div>
                                <span className="font-medium">Note: </span>
                                {viewing.note || "-"}
                            </div>
                            {/* DIVIDER */}
                            <hr className="my-3 border-t" />

                            {/* CREATED & UPDATED */}
                            <div className="flex justify-between text-sm text-slate-500">
                                <div>
                                    <span className="font-medium">Created: </span>
                                    {formatDateTime(viewing.created_at)}
                                </div>

                                <div>
                                    <span className="font-medium">Updated: </span>
                                    {formatDateTime(viewing.updated_at)}
                                </div>
                            </div>
                        </div>

                        {/* ACTION */}
                        <div className="flex justify-end pt-2">
                            <button
                                onClick={() => setViewing(null)}
                                className="px-4 py-2 border rounded"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}